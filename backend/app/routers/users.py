from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.database import (
    create_user, get_user_by_id, get_user_by_username, 
    authenticate_user,  get_all_users,
    create_game_session, end_game_session, get_user_sessions,
    get_game_by_id
)
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

# ============ SCHEMAS ============

class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    cur8_multiplier: Optional[float] = 1.0

class UserLogin(BaseModel):
    username: str
    password: str

class AnonymousUserCreate(BaseModel):
    cur8_multiplier: Optional[float] = 1.0

class SteemKeychainAuth(BaseModel):
    username: str
    signature: str
    message: str
    cur8_multiplier: Optional[float] = 1.0  # Base multiplier (will be calculated based on witness vote & delegation)

class SessionStart(BaseModel):
    user_id: str
    game_id: str

class SessionEnd(BaseModel):
    session_id: str
    score: int
    duration_seconds: int

# ============ ENDPOINTS ============

@router.post("/register")
@limiter.limit("5/minute")
async def register_user(request: Request, user_data: UserRegister):
    """Register a new user with username and password."""
    try:
        user = create_user(
            username=user_data.username,
            email=user_data.email,
            password=user_data.password,
            cur8_multiplier=user_data.cur8_multiplier
        )
        return {
            "success": True,
            "message": "User registered successfully",
            "user": user
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login")
@limiter.limit("5/minute")
async def login_user(request: Request, credentials: UserLogin):
    """Login with username and password."""
    user = authenticate_user(credentials.username, credentials.password)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check Steem multiplier at login if user has steem_username
    if user.get('steem_username'):
        from app.steem_checker import update_user_multiplier
        from app.database import get_db_session
        try:
            with get_db_session() as session:
                update_user_multiplier(user['user_id'], user['steem_username'], session, force=True)
                session.commit()
                # Reload user data
                from app.models import User
                db_user = session.query(User).filter(User.user_id == user['user_id']).first()
                if db_user:
                    user = db_user.to_dict()
        except Exception as e:
            print(f"[LOGIN] Could not update multiplier from Steem: {e}")
    
    return {
        "success": True,
        "message": "Login successful",
        "user": user
    }

@router.post("/anonymous")
@limiter.limit("3/minute")
async def create_anonymous_user(request: Request, data: Optional[AnonymousUserCreate] = None):
    """Create an anonymous user for guest play."""
    multiplier = data.cur8_multiplier if data else 1.0
    
    user = create_user(cur8_multiplier=multiplier)
    
    return {
        "success": True,
        "message": "Anonymous user created",
        "user": user
    }

@router.post("/steem-auth")
async def authenticate_with_steem(auth_data: SteemKeychainAuth):
    """Authenticate user with Steem Keychain signature."""
    try:
        # Verifica che il messaggio sia valido (timestamp recente per evitare replay attacks)
        import time
        try:
            message_parts = auth_data.message.split('|')
            if len(message_parts) != 2:
                raise ValueError("Invalid message format")
            
            message_username = message_parts[0]
            timestamp = int(message_parts[1])
            
            # Verifica username
            if message_username != auth_data.username:
                raise ValueError("Username mismatch")
            
            # Verifica che il timestamp sia recente (max 5 minuti)
            current_time = int(time.time())
            if abs(current_time - timestamp) > 300:
                raise ValueError("Signature expired")
                
        except (ValueError, IndexError) as e:
            raise HTTPException(status_code=400, detail=f"Invalid message format: {str(e)}")
        
        # Verifica la firma usando la libreria steem
        # NOTA: In produzione, verifica la firma con la chiave pubblica posting di Steem
        # Per ora accettiamo la firma (da implementare con steem-python)
        
        # Cerca utente esistente o creane uno nuovo
        user = get_user_by_username(auth_data.username)
        
        if user:
            # User already exists - use ORM update via database.py
            # The authenticate_user function in database.py handles last_login update
            pass
        else:
            # Crea nuovo utente Steem usando la funzione ORM
            user = create_user(
                username=auth_data.username,
                email=f"{auth_data.username}@steem.blockchain",  # Email placeholder
                password=None,  # Nessuna password per utenti Steem
                cur8_multiplier=auth_data.cur8_multiplier
            )
            
            # Aggiungi metadata Steem usando ORM
            from app.database import get_db_session
            from app.models import User
            import json
            
            # Update Steem multiplier at Keychain login
            from app.steem_checker import update_user_multiplier
            try:
                with get_db_session() as session:
                    update_user_multiplier(user['user_id'], auth_data.username, session, force=True)
                    session.commit()
            except Exception as e:
                print(f"[STEEM AUTH] Could not update multiplier: {e}")
            
            with get_db_session() as session:
                db_user = session.query(User).filter(User.user_id == user['user_id']).first()
                if db_user:
                    extra_data = {
                        "auth_method": "steem_keychain",
                        "steem_username": auth_data.username,
                        "verified": True
                    }
                    db_user.extra_data = json.dumps(extra_data)
                    db_user.steem_username = auth_data.username
                    session.flush()
                    user = db_user.to_dict()
        
        return {
            "success": True,
            "message": f"Welcome {auth_data.username}! Authenticated via Steem Keychain",
            "user": user,
            "auth_method": "steem_keychain",
            "benefits": {
                "cur8_multiplier": auth_data.cur8_multiplier,
                "verified": True,
                "blockchain_backed": True
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Steem authentication failed: {str(e)}")

@router.get("/")
async def list_users():
    """Get all registered users (admin endpoint)."""
    users = get_all_users()
    return {
        "success": True,
        "count": len(users),
        "users": users
    }

@router.get("/{user_id}")
async def get_user(user_id: str):
    """Get user details by ID."""
    user = get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Enrich game_scores with game titles
    game_scores_enriched = []
    if user.get('game_scores'):
        for game_id, score in user['game_scores'].items():
            game = get_game_by_id(game_id)
            if game:
                game_scores_enriched.append({
                    'game_id': game_id,
                    'game_title': game['title'],
                    'high_score': score,
                    'thumbnail': game.get('thumbnail', '')
                })
        # Sort by score descending
        game_scores_enriched.sort(key=lambda x: x['high_score'], reverse=True)
    
    user['game_scores_enriched'] = game_scores_enriched
    
    return {
        "success": True,
        "user": user
    }

@router.get("/{user_id}/sessions")
async def get_user_game_sessions(user_id: str, limit: int = 10):
    """Get user's game sessions."""
    sessions = get_user_sessions(user_id, limit)
    
    return {
        "success": True,
        "count": len(sessions),
        "sessions": sessions
    }

@router.post("/sessions/start")
@limiter.limit("30/minute")
async def start_session(request: Request, session_data: SessionStart):
    """Start a new game session."""
    try:
        session = create_game_session(
            user_id=session_data.user_id,
            game_id=session_data.game_id
        )
        return {
            "success": True,
            "message": "Game session started",
            "session": session
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/sessions/end")
async def end_game(session_data: SessionEnd):
    """End a game session and calculate XP earned."""
    print(f"[DEBUG] Received session end request:")
    print(f"  - session_id: {session_data.session_id}")
    print(f"  - score: {session_data.score} (type: {type(session_data.score).__name__})")
    print(f"  - duration_seconds: {session_data.duration_seconds}")
    
    session = end_game_session(
        session_id=session_data.session_id,
        score=session_data.score,
        duration_seconds=session_data.duration_seconds
    )
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    print(f"[DEBUG] Session ended with score: {session.get('score')}")
    
    return {
        "success": True,
        "message": f"Game ended! You earned {session['xp_earned']} XP",
        "session": session
    }

@router.get("/leaderboard")
async def get_global_leaderboard(limit: int = 50):
    """Get global leaderboard reading from leaderboards table."""
    from app.database import get_db_session
    from app.models import Leaderboard, User, Game
    from sqlalchemy import func, desc
    
    with get_db_session() as session:
        # Query leaderboard table grouped by user with game info
        results = session.query(
            User.user_id,
            User.username,
            User.is_anonymous,
            User.total_xp_earned,
            func.count(Leaderboard.entry_id).label('games_played'),
            func.sum(Leaderboard.score).label('total_score')
        ).join(
            Leaderboard, User.user_id == Leaderboard.user_id
        ).group_by(
            User.user_id
        ).order_by(
            desc('total_score')
        ).limit(limit).all()
        
        leaderboard = []
        for idx, row in enumerate(results, 1):
            username = row.username
            if row.is_anonymous:
                username = f"Anonymous #{row.user_id[-6:]}"
            
            entry = {
                'rank': idx,
                'user_id': row.user_id,
                'username': username,
                'is_anonymous': bool(row.is_anonymous),
                'games_played': row.games_played or 0,
                'total_score': float(row.total_score or 0),
                'total_xp': float(row.total_xp_earned or 0)
            }
            
            leaderboard.append(entry)
    
    return {
        "success": True,
        "count": len(leaderboard),
        "leaderboard": leaderboard
    }

@router.get("/leaderboard/{game_id}")
async def get_game_leaderboard(game_id: str, limit: int = 10):
    """Get top scores for a specific game from leaderboards table."""
    from app.database import get_db_session
    from app.models import Leaderboard, User
    from sqlalchemy import desc
    
    with get_db_session() as session:
        # Query leaderboard table for this game
        results = session.query(
            Leaderboard.entry_id,
            Leaderboard.score,
            Leaderboard.rank,
            Leaderboard.created_at,
            User.username,
            User.user_id,
            User.is_anonymous
        ).join(
            User, Leaderboard.user_id == User.user_id
        ).filter(
            Leaderboard.game_id == game_id
        ).order_by(
            desc(Leaderboard.score)
        ).limit(limit).all()
        
        leaderboard = []
        for idx, row in enumerate(results, 1):
            username = row.username
            if row.is_anonymous:
                username = f"Anonymous #{row.user_id[-6:]}"
            
            entry = {
                'entry_id': row.entry_id,
                'score': row.score,
                'rank': idx,
                'created_at': row.created_at,
                'username': username,
                'user_id': row.user_id,
                'is_anonymous': bool(row.is_anonymous)
            }
            
            leaderboard.append(entry)
    
    return {
        "success": True,
        "game_id": game_id,
        "count": len(leaderboard),
        "leaderboard": leaderboard
    }


@router.post("/check-steem-multiplier/{user_id}")
async def check_steem_multiplier(user_id: str):
    """
    Check and update Steem multiplier from blockchain.
    Uses 10-minute cache - only queries Steem API if needed.
    """
    from app.database import get_db_session
    from app.models import User
    from app.steem_checker import update_user_multiplier
    
    with get_db_session() as session:
        user = session.query(User).filter(User.user_id == user_id).first()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if not user.steem_username:
            raise HTTPException(status_code=400, detail="User has no Steem account")
        
        # Check multiplier (respects 10-minute cache)
        updated = update_user_multiplier(user_id, user.steem_username, session, force=False)
        session.commit()
        session.refresh(user)
        
        return {
            "success": True,
            "user_id": user_id,
            "steem_username": user.steem_username,
            "votes_cur8_witness": bool(user.votes_cur8_witness),
            "delegation_amount": user.delegation_amount,
            "cur8_multiplier": user.cur8_multiplier,
            "updated": updated,
            "last_check": user.last_multiplier_check
        }


@router.post("/update-steem-data/{user_id}")
async def update_steem_data(user_id: str, votes_witness: bool, delegation_amount: float):
    """Update user's Steem witness vote and delegation data, recalculate multiplier."""
    from app.database import get_db_session
    from app.models import User
    from app.cur8_multiplier import calculate_cur8_multiplier
    
    with get_db_session() as session:
        user = session.query(User).filter(User.user_id == user_id).first()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update Steem data
        user.votes_cur8_witness = 1 if votes_witness else 0
        user.delegation_amount = max(0.0, delegation_amount)
        
        # Recalculate multiplier
        user.cur8_multiplier = calculate_cur8_multiplier(votes_witness, delegation_amount)
        
        session.commit()
        session.refresh(user)
        
        return {
            "success": True,
            "user_id": user_id,
            "votes_cur8_witness": bool(user.votes_cur8_witness),
            "delegation_amount": user.delegation_amount,
            "cur8_multiplier": user.cur8_multiplier
        }


@router.get("/multiplier-breakdown/{user_id}")
async def get_multiplier_breakdown(user_id: str):
    """Get detailed breakdown of user's CUR8 multiplier calculation."""
    from app.database import get_db_session
    from app.models import User
    from app.cur8_multiplier import get_multiplier_breakdown
    
    with get_db_session() as session:
        user = session.query(User).filter(User.user_id == user_id).first()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        breakdown = get_multiplier_breakdown(
            bool(user.votes_cur8_witness),
            user.delegation_amount
        )
        
        return {
            "success": True,
            "user_id": user_id,
            "breakdown": breakdown
        }
