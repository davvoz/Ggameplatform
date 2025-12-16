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
                'description': 'Play your first roll (Over or Under)',
                'quest_type': 'play_games',
                'target_value': 1,
                'xp_reward': 10,
                'reward_coins': 5,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'seven',
                    'type': 'rolls_played',
                    'category': 'gameplay'
                })
            },
            {
                'title': 'Seven: Expert Player',
                'description': 'Complete 20 dice rolls',
                'quest_type': 'play_games',
                'target_value': 20,
                'xp_reward': 25,
                'reward_coins': 15,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'seven',
                    'type': 'rolls_played',
                    'category': 'gameplay'
                })
            },
            {
                'title': 'Seven: Lucky Streak',
                'description': 'Win 5 bets in a row',
                'quest_type': 'score',
                'target_value': 5,
                'xp_reward': 40,
                'reward_coins': 25,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'seven',
                    'type': 'win_streak',
                    'category': 'skill'
                })
            },
            {
                'title': 'Seven: In The Black',
                'description': 'Reach a total profit of +50 coins',
                'quest_type': 'score',
                'target_value': 50,
                'xp_reward': 35,
                'reward_coins': 30,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'seven',
                    'type': 'total_profit',
                    'category': 'progression'
                })
            },
            {
                'title': 'Seven: Cursed Seven',
                'description': 'Roll a 7 (always loses) 3 times',
                'quest_type': 'score',
                'target_value': 3,
                'xp_reward': 20,
                'reward_coins': 15,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'seven',
                    'type': 'roll_seven',
                    'category': 'luck'
                })
            },
            {
                'title': 'Seven: Under Master',
                'description': 'Win 10 bets on Under (<7)',
                'quest_type': 'score',
                'target_value': 10,
                'xp_reward': 30,
                'reward_coins': 20,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'seven',
                    'type': 'win_under_bets',
                    'category': 'skill'
                })
            },
            {
                'title': 'Seven: Over Winner',
                'description': 'Win 10 bets on Over (>7)',
                'quest_type': 'score',
                'target_value': 10,
                'xp_reward': 30,
                'reward_coins': 20,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'seven',
                    'type': 'win_over_bets',
                    'category': 'skill'
                })
            },
            {
                'title': 'Seven: Bold Gambler',
                'description': 'Win a bet of at least 30 coins',
                'quest_type': 'score',
                'target_value': 30,
                'xp_reward': 45,
                'reward_coins': 35,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'seven',
                    'type': 'win_with_high_bet',
                    'category': 'skill'
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
