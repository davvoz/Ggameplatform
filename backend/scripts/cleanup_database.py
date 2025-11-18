"""
Script to clean up database - empties sessions, leaderboard, and user quests tables.
Keeps games, users, xp_rules, and quests intact.
"""
from app.database import get_db_session
from app.models import GameSession, Leaderboard, UserQuest

def cleanup_database():
    """Empty sessions, leaderboard, and user quests tables."""
    print("🧹 Starting database cleanup...")
    print("📌 Cleaning: Sessions, Leaderboard, User Quests")
    print("📦 Keeping: Games, Users, XP Rules, Quests\n")
    
    with get_db_session() as session:
        # Delete all user quests
        user_quests_count = session.query(UserQuest).count()
        session.query(UserQuest).delete()
        print(f"✅ Deleted {user_quests_count} user quest progress entries")
        
        # Delete all leaderboard entries
        leaderboard_count = session.query(Leaderboard).count()
        session.query(Leaderboard).delete()
        print(f"✅ Deleted {leaderboard_count} leaderboard entries")
        
        # Delete all game sessions
        sessions_count = session.query(GameSession).count()
        session.query(GameSession).delete()
        print(f"✅ Deleted {sessions_count} game sessions")
        
        session.commit()
    
    print("\n✨ Database cleanup completed!")
    print("📦 Games, Users, XP Rules, and Quests tables remain intact")
    print("🔄 All user progress has been reset")

if __name__ == "__main__":
    cleanup_database()
