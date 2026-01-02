"""
Make Seven and Yatzi quests daily resettable
"""
import sys
import os
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models import Quest


def make_quests_daily():
    """Update Seven and Yatzi quests to be daily resettable."""
    
    db = SessionLocal()
    
    try:
        print("=" * 70)
        print("  🔄 MAKING SEVEN & YATZI QUESTS DAILY RESETTABLE")
        print("=" * 70)
        print()
        
        # Find all Seven and Yatzi quests
        quests = db.query(Quest).filter(
            Quest.title.like('Seven:%') | Quest.title.like('Yatzi:%')
        ).all()
        
        updated_count = 0
        for quest in quests:
            config = json.loads(quest.config) if quest.config else {}
            
            # Add daily reset flag
            config['reset_period'] = 'daily'
            config['reset_on_complete'] = True
            
            quest.config = json.dumps(config)
            updated_count += 1
            print(f"✅ Updated: {quest.title}")
            print(f"   Config: {quest.config}")
            print()
        
        db.commit()
        
        print("=" * 70)
        print(f"  Successfully updated {updated_count} quests to daily reset")
        print("=" * 70)
        
    except Exception as e:
        print(f"[ERROR] {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    make_quests_daily()
