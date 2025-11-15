"""
Script to clean up database - empties users, sessions, and leaderboard tables.
Keeps games, xp_rules, and quests intact.
"""
from app.database import get_db_session
from app.models import User, GameSession, Leaderboard

def cleanup_database():
    """Empty users, sessions, and leaderboard tables."""
    print("🧹 Starting database cleanup...")
    
    with get_db_session() as session:
        # Delete all leaderboard entries
        leaderboard_count = session.query(Leaderboard).count()
        session.query(Leaderboard).delete()
        print(f"✅ Deleted {leaderboard_count} leaderboard entries")
        
        # Delete all game sessions
        sessions_count = session.query(GameSession).count()
        session.query(GameSession).delete()
        print(f"✅ Deleted {sessions_count} game sessions")
        
        # Delete all users
        users_count = session.query(User).count()
        session.query(User).delete()
        print(f"✅ Deleted {users_count} users")
        
        session.commit()
    
    print("\n✨ Database cleanup completed!")
    print("📦 Games, XP Rules, and Quests tables remain intact")

if __name__ == "__main__":
    cleanup_database()
