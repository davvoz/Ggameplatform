"""
Register Prediction Market game in the database with XP Rules
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

def register_prediction_market():
    """Register Up or Down (Bitcoin prediction) in the database"""
    
    db = SessionLocal()
    
    try:
        # Check if game already exists
        existing_game = db.query(Game).filter(Game.game_id == 'prediction-market').first()
        
        if existing_game:
            print("⚠️  Up or Down already exists in database")
            print(f"   Game ID: prediction-market")
            print(f"   Title: {existing_game.title}")
            print()
            print("📝 Proceeding with XP Rules registration...")
            game_already_exists = True
        else:
            game_already_exists = False
        
        game_data = {
            'game_id': 'prediction-market',
            'title': 'Up or Down',
            'description': 'Predict whether Bitcoin\'s price will go UP or DOWN in 5-minute rounds. Place your bet, lock in your odds, and win coins if your prediction is correct! Live BTC price from Binance with dynamic odds that change in real-time.',
            'author': 'Cur8',
            'version': '1.0.0',
            'entry_point': 'index.html',
            'category': 'casino',
            'tags': json.dumps(['prediction', 'bitcoin', 'crypto', 'trading', 'betting', 'finance']),
            'thumbnail': 'thumbnail.png',
            'extra_data': json.dumps({
                'difficulty': 'medium',
                'max_players': 1,
                'min_age': 18,
                'featured': True,
                'gameplay': 'prediction-betting',
                'theme': 'crypto-finance',
                'graphics': 'minimal-ui',
                'controls': ['mouse', 'touch'],
                'playTime': '5-min-rounds',
                'responsive': True,
                'realtime_data': True,
                'data_source': 'Binance API'
            }),
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        }
        
        if not game_already_exists:
            print("=" * 70)
            print("  📈 UP OR DOWN — GAME REGISTRATION")
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
                'rule_id': 'prediction_participation',
                'game_id': 'prediction-market',
                'rule_name': 'Participation Bonus',
                'rule_type': 'flat',
                'parameters': json.dumps({
                    'base_xp': 1.0
                }),
                'priority': 5,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': 'prediction_win_bonus',
                'game_id': 'prediction-market',
                'rule_name': 'Correct Prediction Bonus',
                'rule_type': 'threshold',
                'parameters': json.dumps({
                    'thresholds': [
                        {'score': 500, 'xp': 10.0},
                        {'score': 200, 'xp': 5.0},
                        {'score': 100, 'xp': 3.0},
                        {'score': 50, 'xp': 2.0},
                        {'score': 10, 'xp': 1.0},
                        {'score': 1, 'xp': 0.5}
                    ]
                }),
                'priority': 15,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': 'prediction_score_multiplier',
                'game_id': 'prediction-market',
                'rule_name': 'Payout Multiplier',
                'rule_type': 'score_multiplier',
                'parameters': json.dumps({
                    'multiplier': 0.05,
                    'max_xp': 15.0
                }),
                'priority': 10,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            }
        ]
        
        # Check and delete existing XP rules
        existing_rules = db.query(XPRule).filter(XPRule.game_id == 'prediction-market').all()
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
            elif rule_data['rule_type'] == 'threshold':
                thresholds = params.get('thresholds', [])
                if thresholds:
                    highest = max(thresholds, key=lambda x: x.get('score', 0))
                    xp_preview = f"up to +{highest.get('xp', 0)} XP"
                else:
                    xp_preview = "thresholds"
            elif rule_data['rule_type'] == 'flat':
                base_xp = params.get('base_xp', 0)
                xp_preview = f"+{base_xp} XP per round"
            else:
                xp_preview = "custom"
            
            xp_rule = XPRule(**rule_data)
            db.add(xp_rule)
            print(f"✅ XP Rule: {rule_data['rule_name']} ({xp_preview})")
        
        db.commit()
        
        print()
        print("=" * 70)
        print("📈 REGISTRATION COMPLETE!")
        print("🌐 Play at: http://localhost:3000/#/play/prediction-market")
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
    register_prediction_market()
