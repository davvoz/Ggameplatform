"""
Register Seven game in the database with XP Rules
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

def register_seven():
    """Register Seven (7 è in mezzo) in the database"""
    
    db = SessionLocal()
    
    try:
        # Check if game already exists
        existing_game = db.query(Game).filter(Game.game_id == 'seven').first()
        
        if existing_game:
            print("⚠️  Seven already exists in database")
            print(f"   Game ID: seven")
            print(f"   Title: {existing_game.title}")
            print()
            print("📝 Proceeding with XP Rules registration...")
            game_already_exists = True
        else:
            game_already_exists = False
        
        game_data = {
            'game_id': 'seven',
            'title': 'Seven — 7 è in mezzo',
            'description': 'Gioco di dadi elegante e professionale con grafica 3D. Punta Sopra o Sotto 7, lancia due dadi e metti alla prova la tua fortuna! Design responsive e animazioni fluide per un\'esperienza di gioco coinvolgente.',
            'author': 'Cur8',
            'version': '1.0.0',
            'entry_point': 'index.html',
            'category': 'casino',
            'tags': json.dumps(['dice', 'casino', '3d', 'quick-play', 'luck', 'gambling']),
            'thumbnail': 'thumbnail.png',
            'extra_data': json.dumps({
                'difficulty': 'easy',
                'max_players': 1,
                'min_age': 18,
                'featured': True,
                'gameplay': 'dice-betting',
                'theme': 'casino',
                'graphics': '3d-css',
                'controls': ['mouse', 'touch'],
                'playTime': 'quick-session',
                'has3D': True,
                'responsive': True
            }),
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        }
        
        if not game_already_exists:
            print("=" * 70)
            print("  🎲 SEVEN - GAME REGISTRATION")
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
                'rule_id': 'seven_rounds_played',
                'game_id': 'seven',
                'rule_name': 'Rounds Played Bonus',
                'rule_type': 'custom',
                'parameters': json.dumps({
                    'xp_per_round': 0.5,
                    'max_rounds': 20,
                    'description': 'Earn XP for each round played'
                }),
                'priority': 5,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': 'seven_win_streak',
                'game_id': 'seven',
                'rule_name': 'Win Streak Bonus',
                'rule_type': 'threshold',
                'parameters': json.dumps({
                    'thresholds': [
                        {'score': 3, 'xp': 10, 'description': '3 wins in a row'},
                        {'score': 5, 'xp': 20, 'description': '5 wins in a row'},
                        {'score': 10, 'xp': 50, 'description': '10 wins in a row'}
                    ]
                }),
                'priority': 15,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': 'seven_high_roller',
                'game_id': 'seven',
                'rule_name': 'High Roller Bonus',
                'rule_type': 'custom',
                'parameters': json.dumps({
                    'bank_threshold': 500,
                    'bonus_xp': 30.0,
                    'description': 'Reach 500+ chips bank'
                }),
                'priority': 20,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': 'seven_score_multiplier',
                'game_id': 'seven',
                'rule_name': 'Score Multiplier',
                'rule_type': 'score_multiplier',
                'parameters': json.dumps({
                    'multiplier': 0.02,
                    'max_xp': 40.0
                }),
                'priority': 10,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': 'seven_time_bonus',
                'game_id': 'seven',
                'rule_name': 'Time Played Bonus',
                'rule_type': 'time_bonus',
                'parameters': json.dumps({
                    'xp_per_minute': 0.2,
                    'max_minutes': 10.0
                }),
                'priority': 5,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            }
        ]
        
        # Check and delete existing XP rules
        existing_rules = db.query(XPRule).filter(XPRule.game_id == 'seven').all()
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
                xp_preview = f"{multiplier}x score (max {max_xp} XP)"
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
                desc = params.get('description', 'custom rule')
                xp_preview = desc
            else:
                xp_preview = "custom"
            
            xp_rule = XPRule(**rule_data)
            db.add(xp_rule)
            print(f"✅ XP Rule: {rule_data['rule_name']} ({xp_preview})")
        
        db.commit()
        
        print()
        print("=" * 70)
        print("🎲 REGISTRATION COMPLETE!")
        print("🌐 Play at: http://localhost:3000/#/play/seven")
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
    register_seven()
