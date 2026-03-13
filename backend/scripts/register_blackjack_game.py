"""
Register Blackjack game in the database with XP Rules
"""
import sys
import os
from datetime import datetime
import json

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models import Game, XPRule


def register_blackjack():
    """Register Blackjack in the database"""
    
    db = SessionLocal()
    
    try:
        # Check if game already exists
        existing_game = db.query(Game).filter(Game.game_id == 'blackjack').first()
        
        if existing_game:
            print("⚠️  Blackjack already exists in database")
            print(f"   Title: {existing_game.title}")
            print("📝 Proceeding with XP Rules update...")
            game_already_exists = True
        else:
            game_already_exists = False
        
        game_data = {
            'game_id': 'blackjack',
            'title': 'Blackjack',
            'description': 'The classic casino card game! Beat the dealer by getting closer to 21 without going over. Supports Hit, Stand, Double Down, Split and Surrender. Elegant design with green table and animated cards.',
            'author': 'Cur8 Games',
            'version': '1.0.0',
            'entry_point': 'index.html',
            'category': 'casino',
            'tags': json.dumps(['cards', 'casino', 'blackjack', 'quick-play', 'strategy', 'gambling']),
            'thumbnail': 'thumbnail.png',
            'extra_data': json.dumps({
                'difficulty': 'medium',
                'max_players': 1,
                'min_age': 18,
                'featured': True,
                'gameplay': 'card-betting',
                'theme': 'casino',
                'graphics': 'html-css',
                'controls': ['mouse', 'touch'],
                'playTime': 'quick-session',
                'has3D': False,
                'responsive': True
            }),
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        }
        
        if not game_already_exists:
            print("=" * 70)
            print("  🃏 BLACKJACK - GAME REGISTRATION")
            print("=" * 70)
            print()
            
            game = Game(**game_data)
            db.add(game)
            db.commit()
            
            print(f"✅ Game '{game_data['title']}' registered successfully!")
            print(f"   Game ID:      {game_data['game_id']}")
            print(f"   Category:     {game_data['category']}")
            print(f"   Entry Point:  {game_data['entry_point']}")
            print()
        
        # Create XP Rules
        now = datetime.now().isoformat()
        
        xp_rules = [
            {
                'rule_id': 'blackjack_participation',
                'game_id': 'blackjack',
                'rule_name': 'Participation Bonus',
                'rule_type': 'flat',
                'parameters': json.dumps({
                    'base_xp': 0.5
                }),
                'priority': 5,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': 'blackjack_win_bonus',
                'game_id': 'blackjack',
                'rule_name': 'Win Bonus',
                'rule_type': 'threshold',
                'parameters': json.dumps({
                    'thresholds': [
                        {'score': 100, 'xp': 5.0},
                        {'score': 50,  'xp': 3.0},
                        {'score': 25,  'xp': 1.5},
                        {'score': 10,  'xp': 0.5},
                        {'score': 5,   'xp': 0.25},
                        {'score': 1,   'xp': 0.1}
                    ]
                }),
                'priority': 15,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': 'blackjack_score_multiplier',
                'game_id': 'blackjack',
                'rule_name': 'Winnings Multiplier',
                'rule_type': 'score_multiplier',
                'parameters': json.dumps({
                    'multiplier': 0.1,
                    'max_xp': 10.0
                }),
                'priority': 10,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            }
        ]
        
        # Delete existing XP rules
        existing_rules = db.query(XPRule).filter(XPRule.game_id == 'blackjack').all()
        if existing_rules:
            print(f"🗑️  Deleting {len(existing_rules)} existing XP rules...")
            for rule in existing_rules:
                db.delete(rule)
            db.commit()
        
        print("📝 Creating XP Rules...")
        for rule_data in xp_rules:
            xp_rule = XPRule(**rule_data)
            db.add(xp_rule)
        
        db.commit()
        
        print()
        print("🃏 BLACKJACK REGISTRATION COMPLETE!")
        print("=" * 70)
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    register_blackjack()
