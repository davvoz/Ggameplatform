from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from app.database import (
    create_user, get_user_by_id, get_user_by_username, 
    authenticate_user, update_user_cur8, get_all_users,
    create_game_session, end_game_session, get_user_sessions
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
            # Aggiorna last login
            from app.database import get_db_connection
            from datetime import datetime
            conn = get_db_connection()
            cursor = conn.cursor()
            now = datetime.utcnow().isoformat()
            cursor.execute("UPDATE users SET last_login = ? WHERE user_id = ?", 
                          (now, user['user_id']))
            conn.commit()
            conn.close()
            user['last_login'] = now
        else:
            # Crea nuovo utente Steem
            user = create_user(
                username=auth_data.username,
                email=f"{auth_data.username}@steem.blockchain",  # Email placeholder
                password=None,  # Nessuna password per utenti Steem
                cur8_multiplier=auth_data.cur8_multiplier
            )
            # Aggiungi metadata Steem
            from app.database import get_db_connection
            import json
            conn = get_db_connection()
            cursor = conn.cursor()
            metadata = json.dumps({
                "auth_method": "steem_keychain",
                "steem_username": auth_data.username,
                "verified": True
            })
            cursor.execute("UPDATE users SET metadata = ? WHERE user_id = ?", 
                          (metadata, user['user_id']))
            conn.commit()
            conn.close()
        
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
    
    return {
        "success": True,
        "user": user
    }

@router.get("/users/{user_id}/sessions")
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

@router.get("/leaderboard/{game_id}")
async def get_game_leaderboard(game_id: str, limit: int = 10):
    """Get top scores for a specific game."""
    from app.database import get_db_connection
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT 
            gs.session_id,
            gs.score,
            gs.cur8_earned,
            gs.started_at,
            u.username,
            u.user_id,
            u.is_anonymous
        FROM game_sessions gs
        JOIN users u ON gs.user_id = u.user_id
        WHERE gs.game_id = ? AND gs.ended_at IS NOT NULL
        ORDER BY gs.score DESC
        LIMIT ?
    """, (game_id, limit))
    
    rows = cursor.fetchall()
    conn.close()
    
    leaderboard = []
    for idx, row in enumerate(rows, 1):
        entry = dict(row)
        entry['rank'] = idx
        entry['is_anonymous'] = bool(entry['is_anonymous'])
        if entry['is_anonymous']:
            entry['username'] = f"Anonymous #{entry['user_id'][-6:]}"
        leaderboard.append(entry)
    
    return {
        "success": True,
        "game_id": game_id,
        "count": len(leaderboard),
        "leaderboard": leaderboard
    }
