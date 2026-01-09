"""
Create quests for Blocky Road game
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

def create_blocky_road_quests():
    """Create quests for Blocky Road game"""
    
    db = SessionLocal()
    
    try:
        print("=" * 70)
        print("  🚗 BLOCKY ROAD - QUEST CREATION")
        print("=" * 70)
        print()
        
        now = datetime.now().isoformat()
        
        quests = [
            {
                'title': 'Blocky Road: First Drive',
                'description': 'Play 5 games',
                'quest_type': 'play_games',
                'target_value': 5,
                'xp_reward': 50,
                'reward_coins': 5,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'blocky-road',
                    'type': 'games_played',
                    'category': 'gameplay',
                    'reset_period': 'daily',
                    'reset_on_complete': True
                })
            },
            {
                'title': 'Blocky Road: Coin Collector',
                'description': 'Collect 15 coins in total',
                'quest_type': 'score',
                'target_value': 15,
                'xp_reward': 50,
                'reward_coins': 15,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'blocky-road',
                    'type': 'coins_collected',
                    'category': 'collection',
                    'extra_data_field': 'coins',
                    'reset_period': 'daily',
                    'reset_on_complete': True
                })
            },
            {
                'title': 'Blocky Road: I Love Trains',
                'description': 'Get hit by trains 5 times (they hurt!)',
                'quest_type': 'score',
                'target_value': 5,
                'xp_reward': 50,
                'reward_coins': 5,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'blocky-road',
                    'type': 'train_deaths',
                    'category': 'achievement',
                    'extra_data_field': 'train_deaths',
                    'reset_period': 'daily',
                    'reset_on_complete': True
                })
            }
        ]
        
        added_count = 0
        skipped_count = 0
        
        for quest_data in quests:
            # Check if quest already exists
            existing = db.query(Quest).filter(Quest.title == quest_data['title']).first()
            
            if existing:
                print(f"⏭️  Skipped: '{quest_data['title']}' (already exists)")
                skipped_count += 1
                continue
            
            # Add quest
            quest = Quest(
                title=quest_data['title'],
                description=quest_data['description'],
                quest_type=quest_data['quest_type'],
                target_value=quest_data['target_value'],
                xp_reward=quest_data['xp_reward'],
                reward_coins=quest_data['reward_coins'],
                is_active=quest_data['is_active'],
                created_at=quest_data['created_at'],
                config=quest_data['config']
            )
            db.add(quest)
            print(f"✅ Added: '{quest_data['title']}' ({quest_data['xp_reward']} XP, {quest_data['reward_coins']} coins)")
            added_count += 1
        
        db.commit()
        
        print()
        print("=" * 70)
        print(f"✅ Successfully added {added_count} Blocky Road quests")
        print(f"⏭️  Skipped {skipped_count} existing quests")
        print("=" * 70)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_blocky_road_quests()
