"""
Register Blocky Road game in the database
"""
import sys
import os
from pathlib import Path
from datetime import datetime
import json

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models import Game, XPRule

def register_blocky_road():
    """Register Blocky Road in the database"""
    
    db = SessionLocal()
    
    try:
        # Check if game already exists
        existing_game = db.query(Game).filter(Game.game_id == 'blocky-road').first()
        
        if existing_game:
            print("⚠️  Blocky Road already exists in database")
            print(f"   Game ID: blocky-road")
            print(f"   Title: {existing_game.title}")
            return
        
        game_data = {
            'game_id': 'blocky-road',
            'title': 'Blocky Road',
            'description': 'Cross the blockchain! Navigate through a procedurally generated world filled with crypto vehicles, floating platforms, and blockchain trains. Collect Bitcoin coins and avoid obstacles in this addictive infinite runner inspired by Crossy Road!',
            'author': 'Ggameplatform',
            'version': '1.0.0',
            'entry_point': 'index.html',
            'category': 'arcade',
            'tags': json.dumps(['arcade', 'infinite-runner', 'blockchain', 'crossy-road', 'voxel', 'casual', 'mobile']),
            'thumbnail': 'thumbnail.png',
            'extra_data': json.dumps({
                'difficulty': 'medium',
                'max_players': 1,
                'min_age': 7,
                'featured': True,
                'gameplay': 'infinite-runner',
                'theme': 'blockchain',
                'graphics': 'voxel',
                'controls': ['keyboard', 'touch'],
                'playTime': 'quick-session'
            }),
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        }
        
        print("=" * 70)
        print("  🎮 BLOCKY ROAD - GAME REGISTRATION")
        print("=" * 70)
        print()
        
        # Create game
        game = Game(**game_data)
        db.add(game)
        db.commit()
        
        print(f"✅ Game '{game_data['title']}' registered successfully!")
        print()
        print(f"   Game ID:      {game_data['game_id']}")
        print(f"   Title:        {game_data['title']}")
        print(f"   Category:     {game_data['category']}")
        print(f"   Entry Point:  {game_data['entry_point']}")
        print()
        print("🎯 Description:")
        print(f"   {game_data['description']}")
        print()
        
        # Create XP Rules
        now = datetime.now().isoformat()
        
        xp_rules = [
            {
                'rule_id': 'blocky_road_move_forward',
                'game_id': 'blocky-road',
                'rule_name': 'Move forward one step',
                'rule_type': 'score',
                'parameters': json.dumps({
                    'event_type': 'score',
                    'xp_reward': 1,
                    'condition': {'min_score': 1}
                }),
                'priority': 0,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': 'blocky_road_collect_coin',
                'game_id': 'blocky-road',
                'rule_name': 'Collect a coin',
                'rule_type': 'coin',
                'parameters': json.dumps({
                    'event_type': 'coin',
                    'xp_reward': 5,
                    'condition': {}
                }),
                'priority': 0,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': 'blocky_road_reach_25',
                'game_id': 'blocky-road',
                'rule_name': 'Reach score 25',
                'rule_type': 'milestone',
                'parameters': json.dumps({
                    'event_type': 'milestone',
                    'xp_reward': 25,
                    'condition': {'min_score': 25}
                }),
                'priority': 0,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': 'blocky_road_reach_50',
                'game_id': 'blocky-road',
                'rule_name': 'Reach score 50',
                'rule_type': 'milestone',
                'parameters': json.dumps({
                    'event_type': 'milestone',
                    'xp_reward': 50,
                    'condition': {'min_score': 50}
                }),
                'priority': 0,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': 'blocky_road_reach_100',
                'game_id': 'blocky-road',
                'rule_name': 'Reach score 100',
                'rule_type': 'milestone',
                'parameters': json.dumps({
                    'event_type': 'milestone',
                    'xp_reward': 100,
                    'condition': {'min_score': 100}
                }),
                'priority': 0,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            }
        ]
        
        for rule_data in xp_rules:
            params = json.loads(rule_data['parameters'])
            xp_rule = XPRule(**rule_data)
            db.add(xp_rule)
            print(f"✅ XP Rule: {rule_data['rule_name']} (+{params['xp_reward']} XP)")
        
        db.commit()
        
        print()
        print("=" * 70)
        print("🎮 REGISTRATION COMPLETE!")
        print("🌐 Play at: https://games.cur8.fun/#/play/blocky-road")
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
    register_blocky_road()
