"""
Update score_threshold_per_game quest with proper config
"""

import sys
import os
import json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import get_db_session
from app.models import Quest

def update_score_threshold_quest():
    """Update score_threshold_per_game quest with config."""
    
    with get_db_session() as session:
        try:
            # Find the quest
            quest = session.query(Quest).filter(
                Quest.quest_type == 'score_threshold_per_game'
            ).first()
            
            if quest:
                # Set a reasonable default score threshold
                config = {
                    'min_score': 500  # Minimum score per game
                }
                quest.config = json.dumps(config)
                session.commit()
                print(f"✅ Updated quest '{quest.title}' with min_score=500")
            else:
                print("ℹ️  Quest 'score_threshold_per_game' not found")
                
        except Exception as e:
            print(f"❌ Error updating quest: {e}")
            session.rollback()
            raise

if __name__ == "__main__":
    print("Updating score_threshold_per_game quest...")
    update_score_threshold_quest()
    print("Done!")
