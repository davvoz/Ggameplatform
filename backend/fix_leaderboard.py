"""
Fix leaderboard - Update all existing sessions to leaderboard
"""
from app.database import get_db_session
from app.models import GameSession, Leaderboard
from app.leaderboard_triggers import update_leaderboard_for_session
from sqlalchemy import desc

print("🔧 Fixing leaderboard from existing sessions...")

with get_db_session() as session:
    # Get all completed sessions
    completed_sessions = session.query(GameSession).filter(
        GameSession.ended_at.isnot(None),
        GameSession.score > 0  # Only sessions with score
    ).order_by(desc(GameSession.ended_at)).all()
    
    print(f"Found {len(completed_sessions)} completed sessions with score > 0")
    
    for game_session in completed_sessions:
        print(f"Processing session {game_session.session_id[:20]}... "
              f"game={game_session.game_id}, score={game_session.score}")
        update_leaderboard_for_session(session, game_session)
    
    session.commit()
    
    print("\n✅ Leaderboard updated!")
    
    # Show results
    print("\n=== LEADERBOARD RESULTS ===")
    leaderboard_entries = session.query(Leaderboard).order_by(
        Leaderboard.game_id, desc(Leaderboard.score)
    ).all()
    
    current_game = None
    for entry in leaderboard_entries:
        if entry.game_id != current_game:
            current_game = entry.game_id
            print(f"\n{entry.game_id}:")
        print(f"  Rank #{entry.rank}: User {entry.user_id[:20]}... - Score: {entry.score}")
