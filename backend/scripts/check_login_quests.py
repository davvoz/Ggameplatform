"""Check user login data for login quests."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import get_db_session
from app.models import User, UserQuest, Quest
from datetime import datetime

def main():
    with get_db_session() as db:
        user = db.query(User).filter(User.username == 'luciojolly').first()
        
        if not user:
            print("User not found")
            return
        
        print("\n📊 USER LOGIN DATA:")
        print(f"   Username: {user.username}")
        print(f"   Created at: {user.created_at}")
        print(f"   Last login: {user.last_login}")
        print(f"   Last login date: {user.last_login_date}")
        print(f"   Login streak: {user.login_streak}")
        
        # Calculate time difference
        if user.created_at and user.last_login:
            created = datetime.fromisoformat(user.created_at)
            last = datetime.fromisoformat(user.last_login)
            diff_hours = (last - created).total_seconds() / 3600
            diff_days = diff_hours / 24
            
            print(f"\n⏰ TIME ANALYSIS:")
            print(f"   Hours since creation to last login: {diff_hours:.2f}h")
            print(f"   Days: {diff_days:.2f}")
            print(f"   Has passed 24h? {'✅ YES' if diff_hours >= 24 else '❌ NO'}")
        
        # Check login_after_24h quest
        quest = db.query(Quest).filter(Quest.quest_type == 'login_after_24h').first()
        if quest:
            user_quest = db.query(UserQuest).filter(
                UserQuest.user_id == user.user_id,
                UserQuest.quest_id == quest.quest_id
            ).first()
            
            print(f"\n🎯 QUEST: {quest.title}")
            print(f"   Type: {quest.quest_type}")
            print(f"   Target: {quest.target_value}")
            
            if user_quest:
                print(f"   Current Progress: {user_quest.current_progress}/{quest.target_value}")
                print(f"   Completed: {'✅ Yes' if user_quest.is_completed else '❌ No'}")
                print(f"   Extra data: {user_quest.extra_data}")
            else:
                print(f"   ❌ No progress record found")
        
        # Check login_streak quest
        quest2 = db.query(Quest).filter(Quest.quest_type == 'login_streak').first()
        if quest2:
            user_quest2 = db.query(UserQuest).filter(
                UserQuest.user_id == user.user_id,
                UserQuest.quest_id == quest2.quest_id
            ).first()
            
            print(f"\n🎯 QUEST: {quest2.title}")
            print(f"   Type: {quest2.quest_type}")
            print(f"   Target: {quest2.target_value}")
            
            if user_quest2:
                print(f"   Current Progress: {user_quest2.current_progress}/{quest2.target_value}")
                print(f"   Completed: {'✅ Yes' if user_quest2.is_completed else '❌ No'}")
                print(f"   Extra data: {user_quest2.extra_data}")
            else:
                print(f"   ❌ No progress record found")

if __name__ == '__main__':
    main()
