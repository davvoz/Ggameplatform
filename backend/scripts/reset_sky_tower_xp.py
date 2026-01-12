"""
Reset Sky Tower XP rules
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models import XPRule

def reset_xp_rules():
    db = SessionLocal()
    game_id = 'sky-tower'
    
    try:
        # Delete existing XP rules
        deleted = db.query(XPRule).filter(XPRule.game_id == game_id).delete()
        db.commit()
        print(f"✅ Deleted {deleted} XP rules for {game_id}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == '__main__':
    reset_xp_rules()
