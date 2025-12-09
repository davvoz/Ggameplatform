"""Reset invalid claims - quests that were claimed without being completed."""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models import UserQuest, Quest
from sqlalchemy import and_

def reset_invalid_claims():
    """Reset is_claimed=0 for quests that are claimed but not completed."""
    session = SessionLocal()
    
    try:
        print("="*70)
        print("  RESET INVALID QUEST CLAIMS")
        print("="*70)
        
        # Find all user quests that are claimed but not completed
        invalid_claims = session.query(UserQuest, Quest).join(
            Quest, UserQuest.quest_id == Quest.quest_id
        ).filter(
            and_(
                UserQuest.is_claimed == 1,
                UserQuest.is_completed == 0
            )
        ).all()
        
        if not invalid_claims:
            print("\n✅ No invalid claims found!")
            return
        
        print(f"\n⚠️  Found {len(invalid_claims)} invalid claims:")
        
        for user_quest, quest in invalid_claims:
            print(f"\n❌ INVALID CLAIM:")
            print(f"   Quest: {quest.title}")
            print(f"   User ID: {user_quest.user_id}")
            print(f"   Progress: {user_quest.current_progress}/{quest.target_value}")
            print(f"   is_completed: {user_quest.is_completed}")
            print(f"   is_claimed: {user_quest.is_claimed}")
            print(f"   Claimed At: {user_quest.claimed_at}")
            print(f"   🔧 Resetting claim...")
            
            # Reset claim
            user_quest.is_claimed = 0
            user_quest.claimed_at = None
        
        session.commit()
        print(f"\n✅ Successfully reset {len(invalid_claims)} invalid claims!")
        print("   Users can now claim these quests again when they complete them.")
        
    except Exception as e:
        session.rollback()
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        session.close()

if __name__ == "__main__":
    reset_invalid_claims()
