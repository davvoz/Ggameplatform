"""Fix quest completion status when progress meets target."""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models import UserQuest, Quest
from datetime import datetime

def fix_completion_status():
    """Set is_completed=1 for quests where current_progress >= target_value."""
    session = SessionLocal()
    
    try:
        # Get all user quests with their quest details
        user_quests = session.query(UserQuest, Quest).join(
            Quest, UserQuest.quest_id == Quest.quest_id
        ).all()
        
        fixed = 0
        for user_quest, quest in user_quests:
            # Check if progress meets target but not marked as completed
            if (user_quest.current_progress >= quest.target_value and 
                not user_quest.is_completed):
                
                print(f"🔧 Fixing quest: {quest.title}")
                print(f"   User ID: {user_quest.user_id}")
                print(f"   Progress: {user_quest.current_progress}/{quest.target_value}")
                
                user_quest.is_completed = 1
                if not user_quest.completed_at:
                    user_quest.completed_at = datetime.utcnow().isoformat()
                
                fixed += 1
        
        session.commit()
        print(f"\n✅ Fixed {fixed} quest completion statuses!")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        session.close()

if __name__ == "__main__":
    fix_completion_status()
