"""
Create quests for Seven game
"""
import sys
import os
from pathlib import Path
from datetime import datetime
import json

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models import Quest

def create_seven_quests():
    """Create quests for Seven game"""
    
    db = SessionLocal()
    
    try:
        print("=" * 70)
        print("  🎲 SEVEN - QUEST CREATION")
        print("=" * 70)
        print()
        
        now = datetime.now().isoformat()
        
        quests = [
            {
                'title': 'Seven: First Roll',
                'description': 'Play your first round of Seven',
                'quest_type': 'play_games',
                'target_value': 1,
                'xp_reward': 10,
                'reward_coins': 5,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'seven',
                    'type': 'rounds_played',
                    'category': 'gameplay'
                })
            },
            {
                'title': 'Seven: Lucky Roller',
                'description': 'Play 10 rounds of Seven',
                'quest_type': 'play_games',
                'target_value': 10,
                'xp_reward': 25,
                'reward_coins': 15,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'seven',
                    'type': 'rounds_played',
                    'category': 'gameplay'
                })
            },
            {
                'title': 'Seven: Hot Streak',
                'description': 'Win 3 times in a row',
                'quest_type': 'score',
                'target_value': 3,
                'xp_reward': 30,
                'reward_coins': 20,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'seven',
                    'type': 'win_streak',
                    'category': 'skill'
                })
            },
            {
                'title': 'Seven: High Roller',
                'description': 'Reach a bank of 500 chips',
                'quest_type': 'score',
                'target_value': 500,
                'xp_reward': 50,
                'reward_coins': 50,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'seven',
                    'type': 'bank_amount',
                    'category': 'progression'
                })
            },
            {
                'title': 'Seven: All In',
                'description': 'Win with a bet of 50 chips',
                'quest_type': 'score',
                'target_value': 50,
                'xp_reward': 40,
                'reward_coins': 30,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'seven',
                    'type': 'win_with_bet',
                    'category': 'skill'
                })
            },
            {
                'title': 'Seven: Perfect Seven',
                'description': 'Roll exactly 7 five times',
                'quest_type': 'score',
                'target_value': 5,
                'xp_reward': 35,
                'reward_coins': 25,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'seven',
                    'type': 'roll_exact',
                    'value': 7,
                    'category': 'luck'
                })
            }
        ]
        
        # Check and delete existing Seven quests (by title prefix)
        existing_quests = db.query(Quest).filter(Quest.title.like('Seven:%')).all()
        if existing_quests:
            print(f"🗑️  Deleting {len(existing_quests)} existing Seven quests...")
            for quest in existing_quests:
                db.delete(quest)
            db.commit()
        
        print("📝 Creating Quests...")
        print()
        
        for quest_data in quests:
            config = json.loads(quest_data['config'])
            
            quest = Quest(**quest_data)
            db.add(quest)
            
            xp = quest_data['xp_reward']
            coins = quest_data['reward_coins']
            
            print(f"✅ {quest_data['title']}")
            print(f"   Type:     {quest_data['quest_type']}")
            print(f"   Target:   {quest_data['target_value']}")
            print(f"   Category: {config.get('category', 'N/A')}")
            print(f"   Rewards:  {xp} XP, {coins} coins")
            print(f"   {quest_data['description']}")
            print()
        
        db.commit()
        
        print("=" * 70)
        print(f"✅ Created {len(quests)} quests for Seven!")
        print("=" * 70)
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_seven_quests()
