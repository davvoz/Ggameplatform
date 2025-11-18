"""
Populate Leaderboard from Existing Game Sessions
Migrates historical game session data to leaderboard table
"""
from app.database import get_db_session
from app.models import GameSession, Leaderboard, User
from app.leaderboard_triggers import update_leaderboard_for_session, recalculate_all_ranks
from sqlalchemy import desc

def populate_leaderboard_from_sessions():
    """
    Populate leaderboard table from all completed game sessions.
    Takes the highest score per user per game.
    """
    print("=" * 60)
    print("  POPULATING LEADERBOARD FROM GAME SESSIONS")
    print("=" * 60)
    
    with get_db_session() as session:
        # Get all completed game sessions
        completed_sessions = session.query(GameSession).filter(
            GameSession.ended_at != None
        ).order_by(GameSession.started_at).all()
        
        print(f"\n📊 Found {len(completed_sessions)} completed game sessions")
        
        if len(completed_sessions) == 0:
            print("⚠️  No completed sessions to process")
            return
        
        # Clear existing leaderboard
        existing_count = session.query(Leaderboard).count()
        if existing_count > 0:
            print(f"🗑️  Clearing {existing_count} existing leaderboard entries...")
            session.query(Leaderboard).delete()
        
        # Process each session
        processed = 0
        skipped = 0
        
        for game_session in completed_sessions:
            try:
                # Use the trigger function to update leaderboard
                update_leaderboard_for_session(session, game_session)
                processed += 1
            except Exception as e:
                print(f"❌ Error processing session {game_session.session_id}: {e}")
                skipped += 1
        
        # Recalculate all ranks
        print("\n🔄 Recalculating ranks...")
        recalculate_all_ranks(session)
        
        # Get final stats
        final_count = session.query(Leaderboard).count()
        unique_games = session.query(Leaderboard.game_id).distinct().count()
        unique_users = session.query(Leaderboard.user_id).distinct().count()
        
        print(f"\n✅ Leaderboard populated successfully!")
        print(f"   - Processed: {processed} sessions")
        print(f"   - Skipped: {skipped} sessions")
        print(f"   - Leaderboard entries: {final_count}")
        print(f"   - Games: {unique_games}")
        print(f"   - Players: {unique_users}")
        
        # Show top 5 entries
        print("\n🏆 Top 5 Leaderboard Entries:")
        top_entries = session.query(Leaderboard).order_by(
            Leaderboard.game_id,
            Leaderboard.rank
        ).limit(5).all()
        
        for entry in top_entries:
            user = session.query(User).filter(User.user_id == entry.user_id).first()
            username = user.username if user and user.username else f"anon_{entry.user_id[-6:]}"
            print(f"   #{entry.rank} - Game: {entry.game_id}, Player: {username}, Score: {entry.score}")
        
    print("\n" + "=" * 60)

if __name__ == "__main__":
    populate_leaderboard_from_sessions()
