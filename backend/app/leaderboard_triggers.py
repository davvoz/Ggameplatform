"""
Leaderboard Trigger System
Automatically updates leaderboard when game sessions are completed
"""
import uuid
from datetime import datetime
from sqlalchemy import event, desc
from sqlalchemy.orm import Session
from app.models import GameSession, Leaderboard, User


def update_leaderboard_for_session(session: Session, game_session: GameSession):
    """
    Update leaderboard when a game session is completed.
    Maintains top N scores per game.
    """
    if not game_session.ended_at:
        # Session not yet ended, skip
        return
    
    game_id = game_session.game_id
    user_id = game_session.user_id
    score = game_session.score
    
    # Configuration: How many top scores to keep per game
    MAX_LEADERBOARD_ENTRIES_PER_GAME = 100
    
    # Check if user already has an entry for this game
    existing_entry = session.query(Leaderboard).filter(
        Leaderboard.game_id == game_id,
        Leaderboard.user_id == user_id
    ).first()
    
    if existing_entry:
        # User already has a leaderboard entry for this game
        if score > existing_entry.score:
            # New high score! Update the existing entry
            print(f"🏆 New high score for user {user_id} in game {game_id}: {score} (was {existing_entry.score})")
            existing_entry.score = score
            existing_entry.created_at = datetime.utcnow().isoformat()
        else:
            # Not a high score, no update needed
            return
    else:
        # User doesn't have a leaderboard entry yet, create one
        print(f"🎯 New leaderboard entry for user {user_id} in game {game_id}: {score}")
        new_entry = Leaderboard(
            entry_id=f"lb_{uuid.uuid4().hex[:16]}",
            user_id=user_id,
            game_id=game_id,
            score=score,
            rank=None,  # Will be calculated below
            created_at=datetime.utcnow().isoformat()
        )
        session.add(new_entry)
    
    # Recalculate ranks for this game
    recalculate_ranks_for_game(session, game_id, MAX_LEADERBOARD_ENTRIES_PER_GAME)


def recalculate_ranks_for_game(session: Session, game_id: str, max_entries: int = 100):
    """
    Recalculate ranks for all entries in a specific game's leaderboard.
    Also removes entries beyond max_entries limit.
    """
    # Get all entries for this game, ordered by score (descending)
    entries = session.query(Leaderboard).filter(
        Leaderboard.game_id == game_id
    ).order_by(desc(Leaderboard.score)).all()
    
    # Update ranks and remove excess entries
    for idx, entry in enumerate(entries, start=1):
        if idx <= max_entries:
            entry.rank = idx
        else:
            # Remove entries beyond the limit
            session.delete(entry)


def recalculate_all_ranks(session: Session):
    """
    Recalculate ranks for all games in the leaderboard.
    Useful for initial setup or maintenance.
    """
    # Get all unique game_ids in leaderboard
    game_ids = session.query(Leaderboard.game_id).distinct().all()
    
    for (game_id,) in game_ids:
        recalculate_ranks_for_game(session, game_id)


# Track sessions that need leaderboard updates
sessions_to_update = set()


@event.listens_for(Session, 'after_flush')
def receive_after_flush(session, flush_context):
    """
    Triggered after flush completes.
    Updates leaderboard for any completed game sessions.
    """
    global sessions_to_update
    
    # Process all sessions marked for update
    for game_session in list(sessions_to_update):
        try:
            update_leaderboard_for_session(session, game_session)
        except Exception as e:
            print(f"❌ Error updating leaderboard: {e}")
    
    # Clear the set
    sessions_to_update.clear()


@event.listens_for(GameSession, 'before_update')
def receive_before_update(mapper, connection, target):
    """
    Triggered before a GameSession is updated.
    Marks completed sessions for leaderboard update.
    """
    global sessions_to_update
    
    # Check if session was just completed
    if target.ended_at:
        sessions_to_update.add(target)


def setup_leaderboard_triggers():
    """
    Initialize leaderboard trigger system.
    This should be called once at application startup.
    """
    print("✅ Leaderboard triggers initialized")


# Alternative: Direct SQL trigger (if needed for pure SQL approach)
def create_sql_trigger(engine):
    """
    Create a SQL trigger in SQLite for leaderboard updates.
    Note: SQLite triggers are limited compared to other databases.
    """
    trigger_sql = """
    CREATE TRIGGER IF NOT EXISTS update_leaderboard_on_session_end
    AFTER UPDATE ON game_sessions
    FOR EACH ROW
    WHEN NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL
    BEGIN
        -- This would need a stored procedure, which SQLite doesn't support well
        -- Better to use SQLAlchemy events instead
        SELECT 1; -- Placeholder
    END;
    """
    
    # SQLite doesn't support complex triggers well
    # Using SQLAlchemy events is the recommended approach
    print("⚠️  SQL triggers are limited in SQLite. Using SQLAlchemy events instead.")
