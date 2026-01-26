"""
Leaderboard Trigger System
Automatically updates leaderboard when game sessions are completed
AGGIORNATO: Ora gestisce sia weekly che all-time leaderboard
"""
import uuid
from datetime import datetime
from sqlalchemy import event, desc
from sqlalchemy.orm import Session
from app.models import GameSession, Leaderboard, User, WeeklyLeaderboard


def update_leaderboard_for_session(session: Session, game_session: GameSession):
    """
    Update leaderboard when a game session is completed.
    
    AGGIORNATO: Ora gestisce ENTRAMBE le leaderboard:
    - All-time: UN solo record per utente per gioco con il punteggio MIGLIORE
    - Weekly: UN solo record per utente per gioco PER SETTIMANA con il punteggio MIGLIORE della settimana
    
    IMPORTANTE: Esclude gli utenti anonimi dalle leaderboard (is_anonymous = 1)
    """
    if not game_session.ended_at:
        # Session not yet ended, skip
        return
    
    game_id = game_session.game_id
    user_id = game_session.user_id
    score = game_session.score
    now = datetime.utcnow().isoformat()
    
    # Check if user is anonymous - skip leaderboard update for anonymous users
    user = session.query(User).filter(User.user_id == user_id).first()
    if not user:
        print(f"⚠️  User {user_id} not found, skipping leaderboard update")
        return
    
    if user.is_anonymous:
        print(f"👤 User {user_id} is anonymous, skipping leaderboard update")
        return
    
    # ========== ALL-TIME LEADERBOARD ==========
    # Check if user already has an entry for this game (deve essercene max 1 per via del constraint UNIQUE)
    existing_entry = session.query(Leaderboard).filter(
        Leaderboard.game_id == game_id,
        Leaderboard.user_id == user_id
    ).first()
    
    if existing_entry:
        # L'utente ha già un record per questo gioco
        if score > existing_entry.score:
            # Nuovo punteggio migliore! Aggiorna il record esistente
            print(f"🏆 [ALL-TIME] New high score for user {user_id} in game {game_id}: {score} (was {existing_entry.score})")
            existing_entry.score = score
            existing_entry.created_at = now
            # Il rank verrà ricalcolato dopo
        else:
            # Non è un punteggio migliore, nessun aggiornamento necessario
            print(f"📊 [ALL-TIME] Score {score} for user {user_id} in game {game_id} is not better than current best {existing_entry.score}")
    else:
        # L'utente non ha ancora un record per questo gioco, creane uno nuovo
        print(f"🎯 [ALL-TIME] New leaderboard entry for user {user_id} in game {game_id}: {score}")
        new_entry = Leaderboard(
            entry_id=f"lb_{uuid.uuid4().hex[:16]}",
            user_id=user_id,
            game_id=game_id,
            score=score,
            rank=None,  # Will be calculated below
            created_at=now
        )
        session.add(new_entry)
    
    # Ricalcola i rank per questo gioco (ordina per score DESC)
    recalculate_ranks_for_game(session, game_id)
    
    # ========== WEEKLY LEADERBOARD ==========
    from app.leaderboard_repository import LeaderboardRepository
    
    lb_repo = LeaderboardRepository(session)
    week_start, week_end = lb_repo.get_current_week()
    
    # Check if user has a weekly entry for this game in current week
    weekly_entry = session.query(WeeklyLeaderboard).filter(
        WeeklyLeaderboard.user_id == user_id,
        WeeklyLeaderboard.game_id == game_id,
        WeeklyLeaderboard.week_start == week_start
    ).first()
    
    if weekly_entry:
        # Update only if new score is better
        if score > weekly_entry.score:
            print(f"📅 [WEEKLY] New weekly high score for user {user_id} in game {game_id}: {score} (was {weekly_entry.score})")
            weekly_entry.score = score
            weekly_entry.updated_at = now
        else:
            print(f"📅 [WEEKLY] Score {score} not better than weekly best {weekly_entry.score}")
    else:
        # Create new weekly entry
        print(f"🆕 [WEEKLY] New weekly entry for user {user_id} in game {game_id}: {score}")
        weekly_entry = WeeklyLeaderboard(
            entry_id=f"wkly_{uuid.uuid4().hex[:16]}",
            week_start=week_start,
            week_end=week_end,
            user_id=user_id,
            game_id=game_id,
            score=score,
            created_at=now,
            updated_at=now
        )
        session.add(weekly_entry)
    
    # After updating weekly leaderboard, recalculate weekly ranks
    recalculate_weekly_ranks(session, week_start)
    
    # Check leaderboard quests for this user
    try:
        from app.quest_tracker import check_leaderboard_quest_progress
        check_leaderboard_quest_progress(session, user_id)
    except Exception as e:
        print(f"⚠️ Error checking leaderboard quests: {e}")


def recalculate_weekly_ranks(session: Session, week_start: str):
    """
    Recalculate ranks for weekly leaderboard.
    Ranks are calculated per game for the given week (each game's entries are
    ordered by score DESC and assigned sequential ranks starting at 1).
    """
    # Get distinct games that have entries this week
    game_rows = session.query(WeeklyLeaderboard.game_id).filter(
        WeeklyLeaderboard.week_start == week_start
    ).distinct().all()

    for (game_id,) in game_rows:
        # For each game, get entries ordered by score desc and assign ranks
        entries = session.query(WeeklyLeaderboard).filter(
            WeeklyLeaderboard.week_start == week_start,
            WeeklyLeaderboard.game_id == game_id
        ).order_by(
            WeeklyLeaderboard.score.desc(),
            WeeklyLeaderboard.created_at.asc()
        ).all()

        for idx, entry in enumerate(entries, start=1):
            entry.rank = idx


def recalculate_ranks_for_game(session: Session, game_id: str):
    """
    Recalculate ranks for all entries in a specific game's leaderboard.
    
    Ordina per score (DESC) e assegna rank sequenziali.
    Non rimuove entry: ogni utente ha 1 solo record per gioco grazie al constraint UNIQUE.
    """
    # Get all entries for this game, ordered by score (descending)
    entries = session.query(Leaderboard).filter(
        Leaderboard.game_id == game_id
    ).order_by(
        Leaderboard.score.desc(),
        Leaderboard.created_at.asc()
    ).all()
    
    # Update ranks
    for idx, entry in enumerate(entries, start=1):
        entry.rank = idx


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


@event.listens_for(Session, 'after_flush_postexec')
def receive_after_flush_postexec(session, flush_context):
    """
    Triggered after flush completes (post-execution phase).
    Updates leaderboard for any completed game sessions.
    This happens after all SQL has been executed, allowing safe modifications.
    """
    global sessions_to_update
    
    # Process all sessions marked for update
    for game_session in list(sessions_to_update):
        try:
            update_leaderboard_for_session(session, game_session)
        except Exception as e:
            print(f"❌ Error updating leaderboard for session {game_session.session_id}: {e}")
            # Log the error but don't raise it to avoid blocking the main transaction
            import traceback
            traceback.print_exc()
    
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


@event.listens_for(GameSession, 'after_insert')
def receive_after_insert(mapper, connection, target):
    """
    Triggered after a GameSession is inserted.
    Marks completed sessions for leaderboard update.
    """
    global sessions_to_update
    
    # Check if session is completed at insert time
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
