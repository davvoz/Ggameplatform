from pathlib import Path
from typing import Optional, List, Dict, Any
import hashlib
import uuid
import json
from datetime import datetime
from sqlalchemy import create_engine, desc
from sqlalchemy.orm import sessionmaker, Session
from contextlib import contextmanager

from app.models import Base, Game, User, GameSession, UserAchievement, Leaderboard, XPRule
from app.leaderboard_triggers import setup_leaderboard_triggers
from app.xp_calculator import XPCalculator, SessionContext

DATABASE_PATH = Path(__file__).parent / "game_platform.db"
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

# Create engine and session factory
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@contextmanager
def get_db_session():
    """Context manager for database sessions."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception as e:
        session.rollback()
        raise
    finally:
        session.close()

def get_db():
    """Dependency for FastAPI endpoints."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initialize the database with required tables."""
    Base.metadata.create_all(bind=engine)
    setup_leaderboard_triggers()
    print("✅ Database initialized with SQLAlchemy ORM")

# ============ GAME MANAGEMENT ============

def create_game(game_data: dict) -> dict:
    """Insert a new game into the database."""
    with get_db_session() as session:
        now = datetime.utcnow().isoformat()
        
        game = Game(
            game_id=game_data['gameId'],
            title=game_data['title'],
            description=game_data.get('description', ''),
            author=game_data.get('author', ''),
            version=game_data.get('version', '1.0.0'),
            thumbnail=game_data.get('thumbnail', ''),
            entry_point=game_data['entryPoint'],
            category=game_data.get('category', 'uncategorized'),
            tags=json.dumps(game_data.get('tags', [])),
            created_at=now,
            updated_at=now,
            extra_data=json.dumps(game_data.get('metadata', {}))
        )
        
        session.add(game)
        session.flush()
        
        return game.to_dict()

def get_all_games() -> List[dict]:
    """Retrieve all games from the database."""
    with get_db_session() as session:
        games = session.query(Game).order_by(desc(Game.created_at)).all()
        return [game.to_dict() for game in games]

def get_game_by_id(game_id: str) -> Optional[dict]:
    """Retrieve a specific game by ID."""
    with get_db_session() as session:
        game = session.query(Game).filter(Game.game_id == game_id).first()
        return game.to_dict() if game else None

def update_game(game_id: str, game_data: dict) -> Optional[dict]:
    """Update an existing game."""
    with get_db_session() as session:
        game = session.query(Game).filter(Game.game_id == game_id).first()
        
        if not game:
            return None
        
        now = datetime.utcnow().isoformat()
        
        game.title = game_data.get('title', game.title)
        game.description = game_data.get('description', game.description)
        game.author = game_data.get('author', game.author)
        game.version = game_data.get('version', game.version)
        game.thumbnail = game_data.get('thumbnail', game.thumbnail)
        game.entry_point = game_data.get('entryPoint', game.entry_point)
        game.category = game_data.get('category', game.category)
        game.tags = json.dumps(game_data.get('tags', json.loads(game.tags)))
        game.updated_at = now
        game.extra_data = json.dumps(game_data.get('metadata', json.loads(game.extra_data)))
        
        session.flush()
        
        return game.to_dict()

def delete_game(game_id: str) -> bool:
    """Delete a game from the database."""
    with get_db_session() as session:
        game = session.query(Game).filter(Game.game_id == game_id).first()
        
        if not game:
            return False
        
        session.delete(game)
        return True

def increment_play_count(game_id: str) -> bool:
    """Increment the play count for a game."""
    with get_db_session() as session:
        game = session.query(Game).filter(Game.game_id == game_id).first()
        
        if not game:
            return False
        
        extra_data = json.loads(game.extra_data) if game.extra_data else {}
        current_count = extra_data.get('playCount', 0)
        extra_data['playCount'] = current_count + 1
        game.extra_data = json.dumps(extra_data)
        
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
    with get_db_session() as session:
        now = datetime.utcnow().isoformat()
        
        is_anonymous = 1 if (username is None and email is None) else 0
        
        if is_anonymous:
            user_id = generate_anonymous_id()
            while session.query(User).filter(User.user_id == user_id).first():
                user_id = generate_anonymous_id()
        else:
            user_id = f"user_{uuid.uuid4().hex[:16]}"
        
        # Check for existing username or email
        if username:
            existing = session.query(User).filter(User.username == username).first()
            if existing:
                raise ValueError(f"Username '{username}' already exists")
        
        if email:
            existing = session.query(User).filter(User.email == email).first()
            if existing:
                raise ValueError(f"Email '{email}' already registered")
        
        user = User(
            user_id=user_id,
            username=username,
            email=email,
            password_hash=hash_password(password) if password else None,
            is_anonymous=is_anonymous,
            cur8_multiplier=cur8_multiplier,
            total_xp_earned=0.0,
            game_scores='{}',
            created_at=now,
            last_login=now if not is_anonymous else None,
            extra_data='{}'
        )
        
        session.add(user)
        session.flush()
        
        return user.to_dict()

def get_user_by_id(user_id: str) -> Optional[dict]:
    """Retrieve a user by ID."""
    with get_db_session() as session:
        user = session.query(User).filter(User.user_id == user_id).first()
        return user.to_dict() if user else None

def get_user_by_username(username: str) -> Optional[dict]:
    """Retrieve a user by username."""
    with get_db_session() as session:
        user = session.query(User).filter(User.username == username).first()
        return user.to_dict() if user else None

def authenticate_user(username: str, password: str) -> Optional[dict]:
    """Authenticate a user with username and password."""
    user = get_user_by_username(username)
    
    if user and user.get('password_hash') == hash_password(password):
        # Update last login
        with get_db_session() as session:
            db_user = session.query(User).filter(User.user_id == user['user_id']).first()
            db_user.last_login = datetime.utcnow().isoformat()
            session.flush()
            return db_user.to_dict()
    
    return None

def update_user_xp(user_id: str, xp_amount: float) -> Optional[dict]:
    """Update user's total XP earned."""
    with get_db_session() as session:
        user = session.query(User).filter(User.user_id == user_id).first()
        
        if not user:
            return None
        
        user.total_xp_earned += xp_amount
        session.flush()
        
        return user.to_dict()

def get_all_users() -> List[dict]:
    """Retrieve all users (excluding anonymous)."""
    with get_db_session() as session:
        users = session.query(User).filter(User.is_anonymous == 0).order_by(desc(User.created_at)).all()
        return [user.to_dict() for user in users]

# ============ XP RULES MANAGEMENT ============

def create_xp_rule(
    game_id: str, 
    rule_name: str, 
    rule_type: str, 
    parameters: dict, 
    priority: int = 0,
    is_active: bool = True
) -> dict:
    """
    Create a new XP calculation rule for a game.
    
    Args:
        game_id: Game identifier
        rule_name: Human-readable name for the rule
        rule_type: Type of calculation strategy
        parameters: Rule-specific parameters
        priority: Priority (higher = applied first)
        is_active: Whether the rule is active
        
    Returns:
        Created rule as dictionary
    """
    with get_db_session() as session:
        # Verify game exists
        game = session.query(Game).filter(Game.game_id == game_id).first()
        if not game:
            raise ValueError(f"Game {game_id} not found")
        
        now = datetime.utcnow().isoformat()
        rule_id = f"xpr_{uuid.uuid4().hex[:16]}"
        
        xp_rule = XPRule(
            rule_id=rule_id,
            game_id=game_id,
            rule_name=rule_name,
            rule_type=rule_type,
            parameters=json.dumps(parameters),
            priority=priority,
            is_active=1 if is_active else 0,
            created_at=now,
            updated_at=now
        )
        
        session.add(xp_rule)
        session.flush()
        
        return xp_rule.to_dict()


def get_game_xp_rules(game_id: str, active_only: bool = True) -> List[dict]:
    """
    Get all XP rules for a specific game.
    
    Args:
        game_id: Game identifier
        active_only: If True, only return active rules
        
    Returns:
        List of XP rules as dictionaries
    """
    with get_db_session() as session:
        query = session.query(XPRule).filter(XPRule.game_id == game_id)
        
        if active_only:
            query = query.filter(XPRule.is_active == 1)
        
        rules = query.order_by(desc(XPRule.priority)).all()
        return [rule.to_dict() for rule in rules]


def get_xp_rule_by_id(rule_id: str) -> Optional[dict]:
    """Get a specific XP rule by ID."""
    with get_db_session() as session:
        rule = session.query(XPRule).filter(XPRule.rule_id == rule_id).first()
        return rule.to_dict() if rule else None


def update_xp_rule(rule_id: str, updates: dict) -> Optional[dict]:
    """
    Update an existing XP rule.
    
    Args:
        rule_id: Rule identifier
        updates: Dictionary of fields to update
        
    Returns:
        Updated rule as dictionary or None if not found
    """
    with get_db_session() as session:
        rule = session.query(XPRule).filter(XPRule.rule_id == rule_id).first()
        
        if not rule:
            return None
        
        now = datetime.utcnow().isoformat()
        
        # Update allowed fields
        if 'rule_name' in updates:
            rule.rule_name = updates['rule_name']
        if 'rule_type' in updates:
            rule.rule_type = updates['rule_type']
        if 'parameters' in updates:
            rule.parameters = json.dumps(updates['parameters'])
        if 'priority' in updates:
            rule.priority = updates['priority']
        if 'is_active' in updates:
            rule.is_active = 1 if updates['is_active'] else 0
        
        rule.updated_at = now
        session.flush()
        
        return rule.to_dict()


def delete_xp_rule(rule_id: str) -> bool:
    """Delete an XP rule."""
    with get_db_session() as session:
        rule = session.query(XPRule).filter(XPRule.rule_id == rule_id).first()
        
        if not rule:
            return False
        
        session.delete(rule)
        return True


def toggle_xp_rule(rule_id: str, is_active: bool) -> Optional[dict]:
    """Toggle XP rule active status."""
    return update_xp_rule(rule_id, {'is_active': is_active})


def calculate_session_xp(
    game_id: str,
    score: int,
    duration_seconds: int,
    is_new_high_score: bool,
    user_multiplier: float,
    previous_high_score: int = 0
) -> Dict[str, Any]:
    """
    Calculate XP for a game session using the rules system.
    
    Args:
        game_id: Game identifier
        score: Score achieved in session
        duration_seconds: Duration of session in seconds
        is_new_high_score: Whether this is a new high score
        user_multiplier: User's CUR8 multiplier
        previous_high_score: Previous high score (for improvement calculation)
        
    Returns:
        Dictionary with total_xp, base_xp, and breakdown
    """
    rules = get_game_xp_rules(game_id, active_only=True)
    
    context = SessionContext(
        score=score,
        duration_seconds=duration_seconds,
        is_new_high_score=is_new_high_score,
        user_multiplier=user_multiplier,
        previous_high_score=previous_high_score
    )
    
    calculator = XPCalculator()
    return calculator.calculate_total_xp(rules, context)

# ============ GAME SESSIONS ============

def create_game_session(user_id: str, game_id: str) -> dict:
    """Create a new game session."""
    with get_db_session() as session:
        now = datetime.utcnow().isoformat()
        session_id = f"session_{uuid.uuid4().hex[:16]}"
        
        game_session = GameSession(
            session_id=session_id,
            user_id=user_id,
            game_id=game_id,
            score=0,
            xp_earned=0.0,
            duration_seconds=0,
            started_at=now,
            extra_data='{}'
        )
        
        session.add(game_session)
        session.flush()
        
        return game_session.to_dict()

def end_game_session(session_id: str, score: int, duration_seconds: int) -> dict:
    """End a game session and calculate XP earned using the rules system."""
    with get_db_session() as session:
        game_session = session.query(GameSession).filter(
            GameSession.session_id == session_id
        ).first()
        
        if not game_session:
            return None
        
        user = session.query(User).filter(User.user_id == game_session.user_id).first()
        
        if not user:
            return None
        
        multiplier = user.cur8_multiplier
        game_id = game_session.game_id
                
        # Parse current game scores
        game_scores = json.loads(user.game_scores) if user.game_scores else {}
        
        # Check if this is a new high score
        is_new_high_score = False
        previous_high_score = game_scores.get(game_id, 0)
        
        if score > previous_high_score:
            is_new_high_score = True
            game_scores[game_id] = score
            user.game_scores = json.dumps(game_scores)
        
        # Calculate XP using the new rules system
        xp_result = calculate_session_xp(
            game_id=game_id,
            score=score,
            duration_seconds=duration_seconds,
            is_new_high_score=is_new_high_score,
            user_multiplier=multiplier,
            previous_high_score=previous_high_score
        )
        
        xp_earned = xp_result['total_xp']
        
        # Update session
        now = datetime.utcnow().isoformat()
        game_session.score = score
        game_session.xp_earned = xp_earned
        game_session.duration_seconds = duration_seconds
        game_session.ended_at = now
        
        extra_data = json.loads(game_session.extra_data) if game_session.extra_data else {}
        extra_data['is_new_high_score'] = is_new_high_score
        extra_data['previous_high_score'] = previous_high_score
        extra_data['xp_breakdown'] = xp_result['rule_breakdown']
        extra_data['base_xp'] = xp_result['base_xp']
        game_session.extra_data = json.dumps(extra_data)
        
        # Update user's total XP
        user.total_xp_earned += xp_earned
        session.flush()
        
        result = game_session.to_dict()
        
    # Note: Leaderboard is automatically updated by the trigger system
    # No need to manually recalculate ranks here
    
    return result

def get_user_sessions(user_id: str, limit: int = 10) -> List[dict]:
    """Get recent sessions for a user."""
    with get_db_session() as session:
        sessions = session.query(GameSession).filter(
            GameSession.user_id == user_id
        ).order_by(desc(GameSession.started_at)).limit(limit).all()
        
        return [s.to_dict() for s in sessions]

def get_open_sessions() -> List[dict]:
    """Get all open (unclosed) game sessions."""
    with get_db_session() as session:
        sessions = session.query(GameSession).filter(
            GameSession.ended_at == None
        ).order_by(desc(GameSession.started_at)).all()
        
        return [s.to_dict() for s in sessions]

def close_open_sessions(max_duration_seconds: int = None) -> int:
    """Force close all open sessions."""
    with get_db_session() as session:
        open_sessions = session.query(GameSession).filter(
            GameSession.ended_at == None
        ).all()
        
        closed_count = 0
        now = datetime.utcnow().isoformat()
        
        for game_session in open_sessions:
            # Calculate duration
            started = datetime.fromisoformat(game_session.started_at)
            ended = datetime.utcnow()
            duration = int((ended - started).total_seconds())
            
            if max_duration_seconds and duration > max_duration_seconds:
                duration = max_duration_seconds
            
        # Calculate CUR8 (minimal since we're forcing close)
        user = session.query(User).filter(User.user_id == game_session.user_id).first()
        multiplier = user.cur8_multiplier if user else 1.0
        
        minutes_played = min(duration / 60, 10)
        xp_earned = minutes_played * 0.1 * multiplier
        
        # Update session
        game_session.duration_seconds = duration
        game_session.xp_earned = xp_earned
        game_session.ended_at = now
        
        # Update user's total XP
        if user:
            user.total_xp_earned += xp_earned
        
        closed_count += 1
        
        session.flush()
        
        return closed_count

def force_close_session(session_id: str) -> bool:
    """Force close a specific open session."""
    with get_db_session() as session:
        game_session = session.query(GameSession).filter(
            GameSession.session_id == session_id,
            GameSession.ended_at == None
        ).first()
        
        if not game_session:
            return False
        
        # Calculate duration
        started = datetime.fromisoformat(game_session.started_at)
        ended = datetime.utcnow()
        duration = int((ended - started).total_seconds())
        
        # Calculate CUR8
        user = session.query(User).filter(User.user_id == game_session.user_id).first()
        multiplier = user.cur8_multiplier if user else 1.0
        
        minutes_played = min(duration / 60, 10)
        xp_earned = minutes_played * 0.1 * multiplier
        
        # Update session
        now = datetime.utcnow().isoformat()
        game_session.duration_seconds = duration
        game_session.xp_earned = xp_earned
        game_session.ended_at = now
        
        # Update user's total XP
        if user:
            user.total_xp_earned += xp_earned
        
        session.flush()
        
        return True

def get_db_connection():
    """Legacy function for compatibility - returns a session instead."""
    return SessionLocal()

def migrate_add_game_scores():
    """Migration function - no longer needed with ORM."""
    pass
