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
            print()
            print("📝 Proceeding with XP Rules registration...")
            game_already_exists = True
        else:
            game_already_exists = False
        
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
        
        if not game_already_exists:
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
                'rule_id': 'blocky_road_score_multiplier',
                'game_id': 'blocky-road',
                'rule_name': 'Score Multiplier',
                'rule_type': 'score_multiplier',
                'parameters': json.dumps({
                    'multiplier': 0.01,
                    'max_xp': 50.0
                }),
                'priority': 10,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': 'blocky_road_time_bonus',
                'game_id': 'blocky-road',
                'rule_name': 'Time Played Bonus',
                'rule_type': 'time_bonus',
                'parameters': json.dumps({
                    'xp_per_minute': 0.1,
                    'max_minutes': 5.0
                }),
                'priority': 5,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': 'blocky_road_high_score_bonus',
                'game_id': 'blocky-road',
                'rule_name': 'High Score Bonus',
                'rule_type': 'high_score_bonus',
                'parameters': json.dumps({
                    'bonus_xp': 15.0
                }),
                'priority': 15,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': 'blocky_road_milestones',
                'game_id': 'blocky-road',
                'rule_name': 'Score Milestones',
                'rule_type': 'threshold',
                'parameters': json.dumps({
                    'thresholds': [
                        {'score': 100, 'xp': 25},
                        {'score': 50, 'xp': 15},
                        {'score': 25, 'xp': 10}
                    ]
                }),
                'priority': 20,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            }
        ]
        
        # Check and delete existing XP rules
        existing_rules = db.query(XPRule).filter(XPRule.game_id == 'blocky-road').all()
        if existing_rules:
            print(f"🗑️  Deleting {len(existing_rules)} existing XP rules...")
            for rule in existing_rules:
                db.delete(rule)
            db.commit()
        
        print("📝 Creating XP Rules...")
        print()
        
        for rule_data in xp_rules:
            params = json.loads(rule_data['parameters'])
            
            # Calculate XP preview based on rule type
            if rule_data['rule_type'] == 'score_multiplier':
                multiplier = params.get('multiplier', 0.01)
                max_xp = params.get('max_xp', 'unlimited')
                xp_preview = f"{multiplier}x score (max {max_xp})"
            elif rule_data['rule_type'] == 'time_bonus':
                xp_per_min = params.get('xp_per_minute', 0.1)
                max_min = params.get('max_minutes', 10)
                xp_preview = f"{xp_per_min} XP/min (max {max_min}min)"
            elif rule_data['rule_type'] == 'high_score_bonus':
                bonus = params.get('bonus_xp', 10.0)
                xp_preview = f"+{bonus} XP"
            elif rule_data['rule_type'] == 'threshold':
                thresholds = params.get('thresholds', [])
                if thresholds:
                    highest = max(thresholds, key=lambda x: x.get('score', 0))
                    xp_preview = f"up to +{highest.get('xp', 0)} XP"
                else:
                    xp_preview = "thresholds"
            else:
                xp_preview = "custom"
            
            xp_rule = XPRule(**rule_data)
            db.add(xp_rule)
            print(f"✅ XP Rule: {rule_data['rule_name']} ({xp_preview})")
        
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
