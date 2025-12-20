"""
Register Merge Tower Defense game in the database
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

def register_merge_tower_defense():
    """Register Merge Tower Defense in the database"""
    
    db = SessionLocal()
    
    try:
        # Check if game already exists
        existing_game = db.query(Game).filter(Game.game_id == 'merge-tower-defense').first()
        
        if existing_game:
            print("⚠️  Merge Tower Defense already exists in database")
            print(f"   Game ID: merge-tower-defense")
            print(f"   Title: {existing_game.title}")
            print()
            print("📝 Proceeding with XP Rules registration...")
            game_already_exists = True
        else:
            game_already_exists = False
        
        game_data = {
            'game_id': 'merge-tower-defense',
            'title': 'Merge Tower Defense',
            'description': 'Elite Defense Force! Merge identical turrets to create powerful towers and defend against endless zombie waves. Strategic tower placement meets addictive merge mechanics in this mobile-optimized tower defense game.',
            'author': 'Ggameplatform',
            'version': '1.0.0',
            'entry_point': 'index.html',
            'category': 'strategy',
            'tags': json.dumps(['strategy', 'tower-defense', 'merge', 'zombies', 'action', 'mobile', 'tactical']),
            'thumbnail': 'thumbnail.png',
            'extra_data': json.dumps({
                'difficulty': 'medium',
                'max_players': 1,
                'min_age': 10,
                'featured': True,
                'gameplay': 'tower-defense-merge',
                'theme': 'zombie-apocalypse',
                'graphics': 'sprite-based',
                'controls': ['touch', 'mouse'],
                'playTime': 'medium-session',
                'special_features': [
                    'Advanced merge system with 7 levels',
                    '7 unique turret types with special abilities',
                    '6 enemy types with special mechanics',
                    'Mobile-first optimized gameplay',
                    'Professional particle effects',
                    'Object pooling for performance'
                ]
            }),
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        }
        
        if not game_already_exists:
            print("=" * 70)
            print("  ⚔️  MERGE TOWER DEFENSE - GAME REGISTRATION")
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
                'rule_id': 'merge_tower_score_multiplier',
                'game_id': 'merge-tower-defense',
                'rule_name': 'Score Multiplier',
                'rule_type': 'score_multiplier',
                'parameters': json.dumps({
                    'multiplier': 0.008,  # Slightly lower than blocky road due to higher potential scores
                    'max_xp': 60.0
                }),
                'priority': 10,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': 'merge_tower_wave_bonus',
                'game_id': 'merge-tower-defense',
                'rule_name': 'Wave Progression Bonus',
                'rule_type': 'custom',
                'parameters': json.dumps({
                    'xp_per_wave': 2.0,
                    'max_waves': 20,
                    'description': 'Bonus XP for each wave completed'
                }),
                'priority': 15,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': 'merge_tower_kills_bonus',
                'game_id': 'merge-tower-defense',
                'rule_name': 'Enemy Kills Bonus',
                'rule_type': 'custom',
                'parameters': json.dumps({
                    'xp_per_10_kills': 1.0,
                    'max_kills': 200,
                    'description': 'Bonus XP for zombie elimination'
                }),
                'priority': 12,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': 'merge_tower_high_level_bonus',
                'game_id': 'merge-tower-defense',
                'rule_name': 'Tower Level Achievement',
                'rule_type': 'custom',
                'parameters': json.dumps({
                    'level_bonuses': [
                        {'level': 7, 'xp': 20.0},
                        {'level': 6, 'xp': 15.0},
                        {'level': 5, 'xp': 10.0},
                        {'level': 4, 'xp': 5.0}
                    ],
                    'description': 'Bonus XP for reaching high tower levels'
                }),
                'priority': 18,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': 'merge_tower_time_bonus',
                'game_id': 'merge-tower-defense',
                'rule_name': 'Time Played Bonus',
                'rule_type': 'time_bonus',
                'parameters': json.dumps({
                    'xp_per_minute': 0.15,
                    'max_minutes': 10.0
                }),
                'priority': 5,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': 'merge_tower_milestones',
                'game_id': 'merge-tower-defense',
                'rule_name': 'Score Milestones',
                'rule_type': 'threshold',
                'parameters': json.dumps({
                    'thresholds': [
                        {'score': 10000, 'xp': 30},
                        {'score': 5000, 'xp': 20},
                        {'score': 2500, 'xp': 15},
                        {'score': 1000, 'xp': 10},
                        {'score': 500, 'xp': 5}
                    ]
                }),
                'priority': 20,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            }
        ]
        
        # Check and delete existing XP rules
        existing_rules = db.query(XPRule).filter(XPRule.game_id == 'merge-tower-defense').all()
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
            elif rule_data['rule_type'] == 'threshold':
                thresholds = params.get('thresholds', [])
                if thresholds:
                    highest = max(thresholds, key=lambda x: x.get('score', 0))
                    xp_preview = f"up to +{highest.get('xp', 0)} XP"
                else:
                    xp_preview = "thresholds"
            elif rule_data['rule_type'] == 'custom':
                description = params.get('description', 'custom reward')
                xp_preview = description
            else:
                xp_preview = "custom"
            
            xp_rule = XPRule(**rule_data)
            db.add(xp_rule)
            print(f"✅ XP Rule: {rule_data['rule_name']} ({xp_preview})")
        
        db.commit()
        
        print()
        print("=" * 70)
        print("🎮 REGISTRATION COMPLETE!")
        print("⚔️  Game Features:")
        print("   • 7 unique turret types with special abilities")
        print("   • Advanced merge system (up to level 7)")
        print("   • 6 enemy types with special mechanics")
        print("   • Mobile-first optimized gameplay")
        print("   • Professional particle effects")
        print()
        print("🌐 Play at: https://games.cur8.fun/#/play/merge-tower-defense")
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
    register_merge_tower_defense()
