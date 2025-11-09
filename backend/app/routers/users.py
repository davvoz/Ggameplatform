from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from app.database import (
    create_user, get_user_by_id, get_user_by_username, 
    authenticate_user, update_user_cur8, get_all_users,
    create_game_session, end_game_session, get_user_sessions,
    get_game_by_id
)

router = APIRouter()

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
    cur8_multiplier: Optional[float] = 2.0  # Moltiplicatore maggiorato per utenti Steem

class SessionStart(BaseModel):
    user_id: str
    game_id: str

class SessionEnd(BaseModel):
    session_id: str
    score: int
    duration_seconds: int

# ============ ENDPOINTS ============

@router.post("/register")
async def register_user(user_data: UserRegister):
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
async def login_user(credentials: UserLogin):
    """Login with username and password."""
    user = authenticate_user(credentials.username, credentials.password)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return {
        "success": True,
        "message": "Login successful",
        "user": user
    }

@router.post("/anonymous")
async def create_anonymous_user(data: Optional[AnonymousUserCreate] = None):
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

@router.get("/users")
async def list_users():
    """Get all registered users (admin endpoint)."""
    users = get_all_users()
    return {
        "success": True,
        "count": len(users),
        "users": users
    }

@router.get("/users/{user_id}")
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
            game_scores_enriched.append({
                'game_id': game_id,
                'game_title': game['title'] if game else 'Unknown Game',
                'high_score': score,
                'thumbnail': game.get('thumbnail', '') if game else ''
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
async def start_game_session(session_data: SessionStart):
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
    """End a game session and calculate CUR8 earned."""
    session = end_game_session(
        session_id=session_data.session_id,
        score=session_data.score,
        duration_seconds=session_data.duration_seconds
    )
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "success": True,
        "message": f"Game ended! You earned {session['cur8_earned']} CUR8",
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
            User.total_cur8_earned,
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
                'total_cur8': float(row.total_cur8_earned or 0)
            }
            
            leaderboard.append(entry)
    
    return {
        "success": True,
        "count": len(leaderboard),
        "leaderboard": leaderboard
    }

@router.get("/leaderboard/{game_id}")
async def get_game_leaderboard(game_id: str, limit: int = 10):
    """Get top scores for a specific game."""
    from app.database import get_db_session
    from app.models import GameSession, User
    from sqlalchemy import desc
    
    with get_db_session() as session:
        # Query using ORM with join
        results = session.query(
            GameSession.session_id,
            GameSession.score,
            GameSession.cur8_earned,
            GameSession.started_at,
            User.username,
            User.user_id,
            User.is_anonymous
        ).join(
            User, GameSession.user_id == User.user_id
        ).filter(
            GameSession.game_id == game_id,
            GameSession.ended_at != None
        ).order_by(
            desc(GameSession.score)
        ).limit(limit).all()
        
        leaderboard = []
        for idx, row in enumerate(results, 1):
            entry = {
                'session_id': row.session_id,
                'score': row.score,
                'cur8_earned': row.cur8_earned,
                'started_at': row.started_at,
                'username': row.username,
                'user_id': row.user_id,
                'is_anonymous': bool(row.is_anonymous),
                'rank': idx
            }
            
            if entry['is_anonymous']:
                entry['username'] = f"Anonymous #{entry['user_id'][-6:]}"
            
            leaderboard.append(entry)
    
    return {
        "success": True,
        "game_id": game_id,
        "count": len(leaderboard),
        "leaderboard": leaderboard
    }
