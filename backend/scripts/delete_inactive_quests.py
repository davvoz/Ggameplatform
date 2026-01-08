"""
Script to delete all inactive quests (is_active = 0)
"""

import sys
from pathlib import Path

# Add the backend directory to the path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import get_db_session
from app.models import Quest, UserQuest

def delete_inactive_quests():
    """Delete all quests flagged as inactive."""
    
    with get_db_session() as db:
        print("=" * 70)
        print("  🗑️  DELETING INACTIVE QUESTS")
        print("=" * 70)
        print()
        
        # Find all inactive quests
        inactive_quests = db.query(Quest).filter(Quest.is_active == 0).all()
        
        if not inactive_quests:
            print("✅ No inactive quests found!")
            return
        
        print(f"Found {len(inactive_quests)} inactive quests:\n")
        
        for quest in inactive_quests:
            print(f"  - ID {quest.quest_id}: {quest.title}")
        
        print()
        
        # Delete related user_quests first (foreign key constraint)
        for quest in inactive_quests:
            user_quests_count = db.query(UserQuest).filter(UserQuest.quest_id == quest.quest_id).count()
            if user_quests_count > 0:
                print(f"🔗 Deleting {user_quests_count} user progress records for quest {quest.quest_id}...")
                db.query(UserQuest).filter(UserQuest.quest_id == quest.quest_id).delete()
        
        # Delete the inactive quests
        deleted_count = db.query(Quest).filter(Quest.is_active == 0).delete()
        
        db.commit()
        
        print()
        print("=" * 70)
        print(f"✅ Deleted {deleted_count} inactive quests")
        
        remaining = db.query(Quest).count()
        print(f"📊 Remaining quests: {remaining}")
        print("=" * 70)

if __name__ == "__main__":
    delete_inactive_quests()
