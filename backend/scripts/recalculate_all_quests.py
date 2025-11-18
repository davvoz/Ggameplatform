"""
Recalculate quest progress for all existing users based on their session history.
This script processes all users and updates their quest progress retroactively.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.database import get_db_session
from app.models import User, GameSession, Quest, UserQuest
from app.quest_tracker import QuestTracker
from datetime import datetime

def recalculate_all_quests():
    """Recalculate quest progress for all users."""
    
    print("🔄 Recalculating quest progress for all users...\n")
    
    with get_db_session() as db:
        # Get all non-anonymous users
        users = db.query(User).filter(User.is_anonymous == 0).all()
        
        if not users:
            print("⚠️ No users found in database")
            return
        
        print(f"Found {len(users)} users\n")
        
        # Clear existing quest progress
        print("🗑️ Clearing existing quest progress...")
        db.query(UserQuest).delete()
        db.commit()
        print("   ✅ Cleared\n")
        
        # Process each user
        for user in users:
            print(f"👤 Processing user: {user.username or user.user_id}")
            
            # Get all completed sessions for this user
            sessions = db.query(GameSession).filter(
                GameSession.user_id == user.user_id,
                GameSession.ended_at.isnot(None)
            ).order_by(GameSession.started_at).all()
            
            if not sessions:
                print(f"   ℹ️ No sessions found for {user.username}")
                continue
            
            print(f"   Found {len(sessions)} completed sessions")
            
            # Create tracker
            tracker = QuestTracker(db)
            
            # Process each session
            for session in sessions:
                session_data = {
                    'user_id': session.user_id,
                    'game_id': session.game_id,
                    'score': session.score,
                    'duration_seconds': session.duration_seconds,
                    'xp_earned': session.xp_earned
                }
                
                # Track quest progress for this session
                tracker.track_session_end(session_data)
            
            # Commit progress for this user
            db.commit()
            
            # Show completed quests
            completed = db.query(UserQuest).filter(
                UserQuest.user_id == user.user_id,
                UserQuest.is_completed == 1
            ).count()
            
            in_progress = db.query(UserQuest).filter(
                UserQuest.user_id == user.user_id,
                UserQuest.is_completed == 0
            ).count()
            
            print(f"   ✅ Completed: {completed} quests | In Progress: {in_progress} quests")
            
            # Show details if there are completed quests
            if completed > 0:
                completed_quests = db.query(UserQuest).join(Quest).filter(
                    UserQuest.user_id == user.user_id,
                    UserQuest.is_completed == 1
                ).all()
                
                print(f"   🏆 Completed quests:")
                for uq in completed_quests:
                    print(f"      • {uq.quest.title} (+{uq.quest.xp_reward} XP)")
            
            print()
    
    print("\n✨ Quest recalculation completed!")
    
    # Show summary
    with get_db_session() as db:
        total_user_quests = db.query(UserQuest).count()
        total_completed = db.query(UserQuest).filter(UserQuest.is_completed == 1).count()
        total_in_progress = db.query(UserQuest).filter(UserQuest.is_completed == 0).count()
        
        print("\n📊 Summary:")
        print(f"   Total quest progress records: {total_user_quests}")
        print(f"   Completed quests: {total_completed}")
        print(f"   In progress quests: {total_in_progress}")

if __name__ == "__main__":
    recalculate_all_quests()
