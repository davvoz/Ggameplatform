"""Test quest triggers by updating user data."""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models import User, UserQuest, Quest
from sqlalchemy import and_

def test_triggers():
    """Test that quest triggers work correctly."""
    session = SessionLocal()
    
    try:
        # Get luciojolly user
        user = session.query(User).filter(User.username == 'luciojolly').first()
        if not user:
            print("❌ User 'luciojolly' not found")
            return
        
        print(f"👤 Testing triggers for user: {user.username}")
        print(f"   Current login_streak: {user.login_streak}")
        print(f"   Current total_xp_earned: {user.total_xp_earned}")
        
        # Get login_streak quest
        login_streak_quest = session.query(Quest).filter(
            and_(
                Quest.quest_type == 'login_streak',
                Quest.is_active == 1
            )
        ).first()
        
        if login_streak_quest:
            # Check current quest progress BEFORE trigger
            user_quest_before = session.query(UserQuest).filter(
                and_(
                    UserQuest.user_id == user.user_id,
                    UserQuest.quest_id == login_streak_quest.quest_id
                )
            ).first()
            
            if user_quest_before:
                print(f"\n📋 BEFORE trigger:")
                print(f"   Quest: {login_streak_quest.title}")
                print(f"   Progress: {user_quest_before.current_progress}/{login_streak_quest.target_value}")
                print(f"   Completed: {user_quest_before.is_completed}")
            else:
                print(f"\n📋 No user_quest entry exists yet")
            
            # Trigger the update by setting login_streak to current value
            # This should activate the trigger
            old_streak = user.login_streak
            user.login_streak = old_streak  # Set to same value to trigger UPDATE
            session.commit()
            
            # Re-query to see if trigger worked
            session.expire_all()
            user_quest_after = session.query(UserQuest).filter(
                and_(
                    UserQuest.user_id == user.user_id,
                    UserQuest.quest_id == login_streak_quest.quest_id
                )
            ).first()
            
            print(f"\n📋 AFTER trigger:")
            if user_quest_after:
                print(f"   Quest: {login_streak_quest.title}")
                print(f"   Progress: {user_quest_after.current_progress}/{login_streak_quest.target_value}")
                print(f"   Completed: {user_quest_after.is_completed}")
                
                if user_quest_after.current_progress == old_streak:
                    print(f"\n✅ TRIGGER WORKS! Quest progress matches login_streak ({old_streak})")
                else:
                    print(f"\n⚠️  Progress mismatch: quest={user_quest_after.current_progress}, streak={old_streak}")
            else:
                print(f"   ⚠️  Trigger created no user_quest entry")
        
        print("\n" + "="*60)
        print("To fully test, update login_streak in the database viewer")
        print("and refresh the quest page to see if it updates automatically.")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        session.close()

if __name__ == "__main__":
    test_triggers()
