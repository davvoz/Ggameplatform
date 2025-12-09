"""Fix login streak quest progress for all users."""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models import User, Quest, UserQuest
from sqlalchemy import and_

def fix_login_streak_quests():
    """Update login_streak quest progress to match user's actual login_streak."""
    session = SessionLocal()
    
    try:
        # Get all active login_streak quests
        login_streak_quests = session.query(Quest).filter(
            and_(
                Quest.quest_type == 'login_streak',
                Quest.is_active == 1
            )
        ).all()
        
        if not login_streak_quests:
            print("❌ No active login_streak quests found")
            return
        
        print(f"✅ Found {len(login_streak_quests)} active login_streak quests")
        
        # Get all users
        users = session.query(User).all()
        print(f"✅ Found {len(users)} users")
        
        updates = 0
        for user in users:
            current_streak = user.login_streak or 0
            print(f"\n👤 User: {user.username} (ID: {user.user_id})")
            print(f"   Current login_streak: {current_streak}")
            
            for quest in login_streak_quests:
                # Get or create user quest
                user_quest = session.query(UserQuest).filter(
                    and_(
                        UserQuest.user_id == user.user_id,
                        UserQuest.quest_id == quest.quest_id
                    )
                ).first()
                
                if not user_quest:
                    # Create new user quest
                    user_quest = UserQuest(
                        user_id=user.user_id,
                        quest_id=quest.quest_id,
                        current_progress=current_streak,
                        is_completed=1 if current_streak >= quest.target_value else 0,
                        extra_data='{}'
                    )
                    session.add(user_quest)
                    print(f"   ✨ Created quest '{quest.title}' - Progress: {current_streak}/{quest.target_value}")
                    updates += 1
                else:
                    old_progress = user_quest.current_progress
                    user_quest.current_progress = current_streak
                    
                    # Update completion status
                    if current_streak >= quest.target_value and not user_quest.is_completed:
                        user_quest.is_completed = 1
                        print(f"   🎉 COMPLETED quest '{quest.title}' - Progress: {current_streak}/{quest.target_value}")
                    elif current_streak < quest.target_value and user_quest.is_completed:
                        user_quest.is_completed = 0
                        print(f"   ⬇️ Uncompleted quest '{quest.title}' - Progress: {current_streak}/{quest.target_value}")
                    else:
                        print(f"   📝 Updated quest '{quest.title}' - Progress: {old_progress} -> {current_streak}/{quest.target_value}")
                    
                    updates += 1
        
        session.commit()
        print(f"\n✅ Successfully updated {updates} quest progress entries!")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        session.close()

if __name__ == "__main__":
    fix_login_streak_quests()
