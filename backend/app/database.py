import sqlite3
from pathlib import Path
from typing import Optional, List, Dict
import json
from datetime import datetime
import uuid
import hashlib

DATABASE_PATH = Path(__file__).parent / "game_platform.db"

def get_db_connection():
    """Create a database connection."""
    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize the database with required tables."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Games table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS games (
            game_id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            author TEXT,
            version TEXT,
            thumbnail TEXT,
            entry_point TEXT NOT NULL,
            category TEXT,
            tags TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            metadata TEXT
        )
    """)
    
    # Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            username TEXT UNIQUE,
            email TEXT UNIQUE,
            password_hash TEXT,
            steem_username TEXT UNIQUE,
            is_anonymous INTEGER DEFAULT 0,
            cur8_multiplier REAL DEFAULT 1.0,
            total_cur8_earned REAL DEFAULT 0.0,
            game_scores TEXT DEFAULT '{}',
            avatar TEXT,
            created_at TEXT NOT NULL,
            last_login TEXT,
            metadata TEXT
        )
    """)
    
    # Game sessions table (tracks user gameplay)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS game_sessions (
            session_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            game_id TEXT NOT NULL,
            score INTEGER DEFAULT 0,
            cur8_earned REAL DEFAULT 0.0,
            duration_seconds INTEGER DEFAULT 0,
            started_at TEXT NOT NULL,
            ended_at TEXT,
            metadata TEXT,
            FOREIGN KEY (user_id) REFERENCES users(user_id),
            FOREIGN KEY (game_id) REFERENCES games(game_id)
        )
    """)
    
    # User achievements table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_achievements (
            achievement_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            game_id TEXT NOT NULL,
            achievement_type TEXT NOT NULL,
            achievement_value TEXT,
            earned_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(user_id),
            FOREIGN KEY (game_id) REFERENCES games(game_id)
        )
    """)
    
    # Leaderboards table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS leaderboards (
            entry_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            game_id TEXT NOT NULL,
            score INTEGER NOT NULL,
            rank INTEGER,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(user_id),
            FOREIGN KEY (game_id) REFERENCES games(game_id)
        )
    """)
    
    conn.commit()
    conn.close()

def migrate_add_game_scores():
    """Add game_scores column to existing users table."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(users)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'game_scores' not in columns:
            cursor.execute("""
                ALTER TABLE users 
                ADD COLUMN game_scores TEXT DEFAULT '{}'
            """)
            conn.commit()
            print("✓ Added game_scores column to users table")
        else:
            print("✓ game_scores column already exists")
    except Exception as e:
        print(f"✗ Migration failed: {e}")
    finally:
        conn.close()

def create_game(game_data: dict) -> dict:
    """Insert a new game into the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    now = datetime.utcnow().isoformat()
    
    cursor.execute("""
        INSERT INTO games (
            game_id, title, description, author, version,
            thumbnail, entry_point, category, tags,
            created_at, updated_at, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        game_data['gameId'],
        game_data['title'],
        game_data.get('description', ''),
        game_data.get('author', ''),
        game_data.get('version', '1.0.0'),
        game_data.get('thumbnail', ''),
        game_data['entryPoint'],
        game_data.get('category', 'uncategorized'),
        json.dumps(game_data.get('tags', [])),
        now,
        now,
        json.dumps(game_data.get('metadata', {}))
    ))
    
    conn.commit()
    conn.close()
    
    return {**game_data, 'createdAt': now, 'updatedAt': now}

def get_all_games() -> List[dict]:
    """Retrieve all games from the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM games ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    
    games = []
    for row in rows:
        game = dict(row)
        game['tags'] = json.loads(game['tags']) if game['tags'] else []
        game['metadata'] = json.loads(game['metadata']) if game['metadata'] else {}
        games.append(game)
    
    return games

def get_game_by_id(game_id: str) -> Optional[dict]:
    """Retrieve a specific game by ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM games WHERE game_id = ?", (game_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        game = dict(row)
        game['tags'] = json.loads(game['tags']) if game['tags'] else []
        game['metadata'] = json.loads(game['metadata']) if game['metadata'] else {}
        return game
    
    return None

def update_game(game_id: str, game_data: dict) -> Optional[dict]:
    """Update an existing game."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    now = datetime.utcnow().isoformat()
    
    cursor.execute("""
        UPDATE games SET
            title = ?, description = ?, author = ?, version = ?,
            thumbnail = ?, entry_point = ?, category = ?, tags = ?,
            updated_at = ?, metadata = ?
        WHERE game_id = ?
    """, (
        game_data.get('title'),
        game_data.get('description', ''),
        game_data.get('author', ''),
        game_data.get('version', '1.0.0'),
        game_data.get('thumbnail', ''),
        game_data.get('entryPoint'),
        game_data.get('category', 'uncategorized'),
        json.dumps(game_data.get('tags', [])),
        now,
        json.dumps(game_data.get('metadata', {})),
        game_id
    ))
    
    conn.commit()
    conn.close()
    
    return get_game_by_id(game_id)

def delete_game(game_id: str) -> bool:
    """Delete a game from the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("DELETE FROM games WHERE game_id = ?", (game_id,))
    deleted = cursor.rowcount > 0
    
    conn.commit()
    conn.close()
    
    return deleted

def increment_play_count(game_id: str) -> bool:
    """Increment the play count for a game."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get current metadata
    cursor.execute("SELECT metadata FROM games WHERE game_id = ?", (game_id,))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        return False
    
    metadata = json.loads(row['metadata']) if row['metadata'] else {}
    current_count = metadata.get('playCount', 0)
    metadata['playCount'] = current_count + 1
    
    # Update metadata
    cursor.execute("""
        UPDATE games SET metadata = ? WHERE game_id = ?
    """, (json.dumps(metadata), game_id))
    
    conn.commit()
    conn.close()
    
    return True

# ============ USER MANAGEMENT ============

def generate_anonymous_id() -> str:
    """Generate a unique anonymous user ID."""
    return f"anon_{uuid.uuid4().hex[:12]}"

def hash_password(password: str) -> str:
    """Hash a password using SHA-256."""
    return hashlib.sha256(password.encode()).hexdigest()

def create_user(username: Optional[str] = None, email: Optional[str] = None, 
                password: Optional[str] = None, cur8_multiplier: float = 1.0) -> dict:
    """Create a new user (registered or anonymous)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    now = datetime.utcnow().isoformat()
    
    # Determina se è anonimo
    is_anonymous = 1 if (username is None and email is None) else 0
    
    # Genera user_id
    if is_anonymous:
        user_id = generate_anonymous_id()
        username = None
        email = None
        password_hash = None
    else:
        user_id = f"user_{uuid.uuid4().hex[:16]}"
        password_hash = hash_password(password) if password else None
    
    try:
        cursor.execute("""
            INSERT INTO users (
                user_id, username, email, password_hash, is_anonymous,
                cur8_multiplier, total_cur8_earned, game_scores, created_at, last_login, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id, username, email, password_hash, is_anonymous,
            cur8_multiplier, 0.0, json.dumps({}), now, now, json.dumps({})
        ))
        
        conn.commit()
        
        user = {
            'user_id': user_id,
            'username': username,
            'email': email,
            'is_anonymous': bool(is_anonymous),
            'cur8_multiplier': cur8_multiplier,
            'total_cur8_earned': 0.0,
            'created_at': now,
            'last_login': now
        }
        
        return user
        
    except sqlite3.IntegrityError as e:
        conn.rollback()
        raise ValueError(f"User already exists: {str(e)}")
    finally:
        conn.close()

def get_user_by_id(user_id: str) -> Optional[dict]:
    """Retrieve a user by ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        user = dict(row)
        user['metadata'] = json.loads(user['metadata']) if user['metadata'] else {}
        user['game_scores'] = json.loads(user['game_scores']) if user.get('game_scores') else {}
        user['is_anonymous'] = bool(user['is_anonymous'])
        # Non restituire password_hash
        user.pop('password_hash', None)
        return user
    
    return None

def get_user_by_username(username: str) -> Optional[dict]:
    """Retrieve a user by username."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        user = dict(row)
        user['metadata'] = json.loads(user['metadata']) if user['metadata'] else {}
        user['game_scores'] = json.loads(user['game_scores']) if user.get('game_scores') else {}
        user['is_anonymous'] = bool(user['is_anonymous'])
        return user
    
    return None

def authenticate_user(username: str, password: str) -> Optional[dict]:
    """Authenticate a user with username and password."""
    user = get_user_by_username(username)
    
    if user and user.get('password_hash') == hash_password(password):
        # Update last login
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.utcnow().isoformat()
        cursor.execute("UPDATE users SET last_login = ? WHERE user_id = ?", 
                      (now, user['user_id']))
        conn.commit()
        conn.close()
        
        user.pop('password_hash', None)
        return user
    
    return None

def update_user_cur8(user_id: str, cur8_amount: float) -> Optional[dict]:
    """Update user's total CUR8 earned."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE users 
        SET total_cur8_earned = total_cur8_earned + ?
        WHERE user_id = ?
    """, (cur8_amount, user_id))
    
    conn.commit()
    conn.close()
    
    return get_user_by_id(user_id)

def get_all_users() -> List[dict]:
    """Retrieve all users (excluding anonymous)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM users 
        WHERE is_anonymous = 0 
        ORDER BY created_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    
    users = []
    for row in rows:
        user = dict(row)
        user['metadata'] = json.loads(user['metadata']) if user['metadata'] else {}
        user['game_scores'] = json.loads(user['game_scores']) if user.get('game_scores') else {}
        user['is_anonymous'] = bool(user['is_anonymous'])
        user.pop('password_hash', None)
        users.append(user)
    
    return users

# ============ GAME SESSIONS ============

def create_game_session(user_id: str, game_id: str) -> dict:
    """Create a new game session."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    now = datetime.utcnow().isoformat()
    session_id = f"session_{uuid.uuid4().hex[:16]}"
    
    cursor.execute("""
        INSERT INTO game_sessions (
            session_id, user_id, game_id, score, cur8_earned,
            duration_seconds, started_at, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (session_id, user_id, game_id, 0, 0.0, 0, now, json.dumps({})))
    
    conn.commit()
    conn.close()
    
    return {
        'session_id': session_id,
        'user_id': user_id,
        'game_id': game_id,
        'score': 0,
        'cur8_earned': 0.0,
        'started_at': now
    }

def end_game_session(session_id: str, score: int, duration_seconds: int) -> dict:
    """End a game session and calculate CUR8 earned."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get session info
    cursor.execute("""
        SELECT gs.*, u.cur8_multiplier, u.game_scores
        FROM game_sessions gs
        JOIN users u ON gs.user_id = u.user_id
        WHERE gs.session_id = ?
    """, (session_id,))
    
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
    
    session = dict(row)
    multiplier = session['cur8_multiplier']
    game_id = session['game_id']
    user_id = session['user_id']
    
    # Parse current game scores
    game_scores = json.loads(session['game_scores']) if session.get('game_scores') else {}
    
    # Update high score for this game if new score is higher
    current_high_score = game_scores.get(game_id, 0)
    if score > current_high_score:
        game_scores[game_id] = score
        
        # Update user's game_scores in database
        cursor.execute("""
            UPDATE users 
            SET game_scores = ?
            WHERE user_id = ?
        """, (json.dumps(game_scores), user_id))
    
    # Calculate CUR8 earned (score * multiplier * duration factor)
    base_cur8 = (score / 100) * multiplier
    time_bonus = (duration_seconds / 60) * 0.1  # Bonus for time played
    cur8_earned = round(base_cur8 + time_bonus, 2)
    
    now = datetime.utcnow().isoformat()
    
    # Update session
    cursor.execute("""
        UPDATE game_sessions 
        SET score = ?, cur8_earned = ?, duration_seconds = ?, ended_at = ?
        WHERE session_id = ?
    """, (score, cur8_earned, duration_seconds, now, session_id))
    
    # Update user's total CUR8
    cursor.execute("""
        UPDATE users 
        SET total_cur8_earned = total_cur8_earned + ?
        WHERE user_id = ?
    """, (cur8_earned, user_id))
    
    conn.commit()
    conn.close()
    
    return {
        'session_id': session_id,
        'score': score,
        'cur8_earned': cur8_earned,
        'duration_seconds': duration_seconds,
        'ended_at': now
    }

def get_user_sessions(user_id: str, limit: int = 10) -> List[dict]:
    """Get user's game sessions."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT gs.*, g.title as game_title
        FROM game_sessions gs
        JOIN games g ON gs.game_id = g.game_id
        WHERE gs.user_id = ?
        ORDER BY gs.started_at DESC
        LIMIT ?
    """, (user_id, limit))
    
    rows = cursor.fetchall()
    conn.close()
    
    sessions = []
    for row in rows:
        session = dict(row)
        session['metadata'] = json.loads(session['metadata']) if session['metadata'] else {}
        sessions.append(session)
    
    return sessions

def get_open_sessions() -> List[dict]:
    """Get all open/unclosed game sessions."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT gs.*, g.title as game_title, u.username
        FROM game_sessions gs
        LEFT JOIN games g ON gs.game_id = g.game_id
        LEFT JOIN users u ON gs.user_id = u.user_id
        WHERE gs.ended_at IS NULL
        ORDER BY gs.started_at DESC
    """)
    
    rows = cursor.fetchall()
    conn.close()
    
    sessions = []
    for row in rows:
        session = dict(row)
        session['metadata'] = json.loads(session['metadata']) if session['metadata'] else {}
        sessions.append(session)
    
    return sessions

def close_open_sessions(max_duration_seconds: int = None) -> int:
    """Close all open sessions, optionally with default duration."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get all open sessions
    cursor.execute("""
        SELECT gs.session_id, gs.user_id, gs.started_at, gs.score, u.cur8_multiplier
        FROM game_sessions gs
        JOIN users u ON gs.user_id = u.user_id
        WHERE gs.ended_at IS NULL
    """)
    
    open_sessions = cursor.fetchall()
    now = datetime.utcnow().isoformat()
    closed_count = 0
    
    for row in open_sessions:
        session = dict(row)
        session_id = session['session_id']
        user_id = session['user_id']
        multiplier = session['cur8_multiplier']
        score = session['score'] or 0
        
        # Calculate duration
        if max_duration_seconds:
            duration = max_duration_seconds
        else:
            # Calculate actual duration from started_at
            started = datetime.fromisoformat(session['started_at'])
            ended = datetime.utcnow()
            duration = int((ended - started).total_seconds())
        
        # Calculate CUR8
        base_cur8 = (score / 100) * multiplier
        time_bonus = (duration / 60) * 0.1
        cur8_earned = round(base_cur8 + time_bonus, 2)
        
        # Update session
        cursor.execute("""
            UPDATE game_sessions 
            SET score = ?, cur8_earned = ?, duration_seconds = ?, ended_at = ?
            WHERE session_id = ?
        """, (score, cur8_earned, duration, now, session_id))
        
        # Update user's total CUR8
        cursor.execute("""
            UPDATE users 
            SET total_cur8_earned = total_cur8_earned + ?
            WHERE user_id = ?
        """, (cur8_earned, user_id))
        
        closed_count += 1
    
    conn.commit()
    conn.close()
    
    return closed_count

def force_close_session(session_id: str) -> bool:
    """Force close a specific open session."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get session info
    cursor.execute("""
        SELECT gs.*, u.cur8_multiplier 
        FROM game_sessions gs
        JOIN users u ON gs.user_id = u.user_id
        WHERE gs.session_id = ? AND gs.ended_at IS NULL
    """, (session_id,))
    
    row = cursor.fetchone()
    if not row:
        conn.close()
        return False
    
    session = dict(row)
    
    # Calculate duration from started_at
    started = datetime.fromisoformat(session['started_at'])
    ended = datetime.utcnow()
    duration = int((ended - started).total_seconds())
    
    score = session['score'] or 0
    multiplier = session['cur8_multiplier']
    
    # Calculate CUR8
    base_cur8 = (score / 100) * multiplier
    time_bonus = (duration / 60) * 0.1
    cur8_earned = round(base_cur8 + time_bonus, 2)
    
    now = datetime.utcnow().isoformat()
    
    # Update session
    cursor.execute("""
        UPDATE game_sessions 
        SET score = ?, cur8_earned = ?, duration_seconds = ?, ended_at = ?
        WHERE session_id = ?
    """, (score, cur8_earned, duration, now, session_id))
    
    # Update user's total CUR8
    cursor.execute("""
        UPDATE users 
        SET total_cur8_earned = total_cur8_earned + ?
        WHERE user_id = ?
    """, (cur8_earned, session['user_id']))
    
    conn.commit()
    conn.close()
    
    return True
