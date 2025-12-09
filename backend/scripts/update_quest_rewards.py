"""
Update quest rewards to match requirements
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import get_db_session
from app.models import Quest

def update_quest_rewards():
    """Update quest rewards."""
    
    with get_db_session() as session:
        try:
            updates = [
                {'quest_type': 'login_after_24h', 'reward_coins': 5},
                {'quest_type': 'login_streak', 'reward_coins': 10},
            ]
            
            for update in updates:
                quest = session.query(Quest).filter(
                    Quest.quest_type == update['quest_type']
                ).first()
                
                if quest:
                    quest.reward_coins = update['reward_coins']
                    print(f"✅ Updated '{quest.title}' - reward_coins={update['reward_coins']}")
                else:
                    print(f"⚠️  Quest '{update['quest_type']}' not found")
            
            session.commit()
            print("\n✅ All quest rewards updated!")
                
        except Exception as e:
            print(f"❌ Error updating quests: {e}")
            session.rollback()
            raise

if __name__ == "__main__":
    print("Updating quest rewards...")
    update_quest_rewards()
    print("Done!")
