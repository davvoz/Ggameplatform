"""Check complete quest data including claim status."""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models import User, Quest, UserQuest
from app.level_system import LevelSystem
from sqlalchemy import and_

def check_quest_data():
    """Check detailed quest data for reach_level quests."""
    session = SessionLocal()
    
    try:
        user = session.query(User).filter(User.username == 'luciojolly').first()
        if not user:
            print("❌ User not found")
            return
        
        # Get current level from LevelSystem
        current_level = LevelSystem.calculate_level_from_xp(user.total_xp_earned)
        
        print("="*70)
        print(f"👤 User: {user.username}")
        print(f"   Total XP: {user.total_xp_earned:.2f}")
        print(f"   Current Level (LevelSystem): {current_level}")
        print("="*70)
        
        # Get reach_level quests
        reach_level_quests = session.query(Quest).filter(
            and_(
                Quest.quest_type == 'reach_level',
                Quest.is_active == 1
            )
        ).all()
        
        for quest in reach_level_quests:
            user_quest = session.query(UserQuest).filter(
                and_(
                    UserQuest.user_id == user.user_id,
                    UserQuest.quest_id == quest.quest_id
                )
            ).first()
            
            print(f"\n📋 Quest: {quest.title}")
            print(f"   Target Level: {quest.target_value}")
            print(f"   Rewards: {quest.xp_reward} XP, {quest.reward_coins} Coins")
            
            if user_quest:
                print(f"   Current Progress: {user_quest.current_progress}/{quest.target_value}")
                print(f"   Is Completed: {user_quest.is_completed}")
                print(f"   Is Claimed: {user_quest.is_claimed}")
                print(f"   Completed At: {user_quest.completed_at}")
                print(f"   Claimed At: {user_quest.claimed_at}")
                
                # Check if data is correct
                should_be_completed = current_level >= quest.target_value
                
                if user_quest.current_progress != current_level:
                    print(f"   ❌ WRONG PROGRESS! Should be {current_level}")
                
                if should_be_completed and not user_quest.is_completed:
                    print(f"   ❌ SHOULD BE COMPLETED! (level {current_level} >= target {quest.target_value})")
                elif not should_be_completed and user_quest.is_completed:
                    print(f"   ❌ SHOULD NOT BE COMPLETED! (level {current_level} < target {quest.target_value})")
                
                if user_quest.is_claimed and not user_quest.is_completed:
                    print(f"   ❌ CLAIMED WITHOUT BEING COMPLETED!")
                    
            else:
                print(f"   ⚠️  No user_quest entry exists")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        session.close()

if __name__ == "__main__":
    check_quest_data()
