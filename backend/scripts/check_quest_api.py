"""Check what the quest API returns for a specific user."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import get_db_session
from app.models import User
from app.repositories import RepositoryFactory
from app.services import ServiceFactory

def main():
    with get_db_session() as session:
        # Get user
        user = session.query(User).filter(User.username == 'luciojolly').first()
        
        if not user:
            print("User not found")
            return
        
        # Simulate API call - get quests with progress
        from app.models import Quest, UserQuest
        
        quests = session.query(Quest).filter(Quest.is_active == 1).all()
        
        for quest in quests:
            if quest.quest_type == 'play_time_daily':
                # Get user progress
                progress = session.query(UserQuest).filter(
                    UserQuest.user_id == user.user_id,
                    UserQuest.quest_id == quest.quest_id
                ).first()
                
                print(f"\n🎯 Quest: {quest.title}")
                print(f"   Type: {quest.quest_type}")
                print(f"   Target: {quest.target_value}")
                
                if progress:
                    print(f"   Current Progress: {progress.current_progress}")
                    print(f"   Completed: {progress.is_completed}")
                    print(f"   Extra data: {progress.extra_data}")
                    print(f"\n   ✅ API returns progress: {progress.current_progress}/{quest.target_value}")
                else:
                    print(f"   ❌ No progress record found for user")
                
                break

if __name__ == '__main__':
    main()
