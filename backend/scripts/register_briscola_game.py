"""
Register Briscola game in the database with XP Rules
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

def register_briscola():
    """Register Briscola in the database"""
    
    db = SessionLocal()
    
    try:
        # Check if game already exists
        existing_game = db.query(Game).filter(Game.game_id == 'briscola').first()
        
        if existing_game:
            print("⚠️  Briscola already exists in database")
            print(f"   Game ID: briscola")
            print(f"   Title: {existing_game.title}")
            print()
            print("📝 Proceeding with XP Rules registration...")
            game_already_exists = True
        else:
            game_already_exists = False
        
        game_data = {
            'game_id': 'briscola',
            'title': 'Briscola',
            'description': 'Il classico gioco di carte italiano! Gioca contro l\'AI con 3 livelli di difficoltà, sfida un amico in locale, o gioca online in multiplayer. Ottimizzato per mobile.',
            'author': 'Cur8',
            'version': '1.0.0',
            'entry_point': 'index.html',
            'category': 'cards',
            'tags': json.dumps(['cards', 'italian', 'multiplayer', 'ai', 'classic', 'briscola']),
            'thumbnail': 'thumbnail.png',
            'extra_data': json.dumps({
                'difficulty': 'medium',
                'max_players': 2,
                'min_age': 6,
                'featured': True,
                'gameplay': 'turn-based',
                'theme': 'classic-cards',
                'graphics': '2d-sprites',
                'controls': ['mouse', 'touch'],
                'playTime': 'medium-session',
                'hasMultiplayer': True,
                'hasAI': True,
                'aiLevels': ['easy', 'medium', 'hard'],
                'responsive': True
            }),
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        }
        
        if not game_already_exists:
            print("=" * 70)
            print("  🃏 BRISCOLA - GAME REGISTRATION")
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
                'rule_id': 'briscola_participation',
                'game_id': 'briscola',
                'rule_name': 'Participation Bonus',
                'rule_type': 'flat',
                'parameters': json.dumps({
                    'base_xp': 5
                }),
                'priority': 5,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': 'briscola_score_bonus',
                'game_id': 'briscola',
                'rule_name': 'Score Multiplier',
                'rule_type': 'score_multiplier',
                'parameters': json.dumps({
                    'xp_per_point': 0.1,  # 0.1 XP per punto
                    'max_xp': 12  # Max 12 XP (120 punti)
                }),
                'priority': 10,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': 'briscola_victory_bonus',
                'game_id': 'briscola',
                'rule_name': 'Victory Bonus',
                'rule_type': 'conditional',
                'parameters': json.dumps({
                    'condition': 'win',
                    'bonus_xp': 15
                }),
                'priority': 15,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': 'briscola_cappotto_bonus',
                'game_id': 'briscola',
                'rule_name': 'Cappotto Bonus',
                'rule_type': 'conditional',
                'parameters': json.dumps({
                    'condition': 'perfect_score',  # 120 punti
                    'bonus_xp': 50
                }),
                'priority': 20,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': 'briscola_hard_ai_bonus',
                'game_id': 'briscola',
                'rule_name': 'Hard AI Victory',
                'rule_type': 'conditional',
                'parameters': json.dumps({
                    'condition': 'hard_ai_win',
                    'bonus_xp': 25
                }),
                'priority': 25,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': 'briscola_multiplayer_bonus',
                'game_id': 'briscola',
                'rule_name': 'Multiplayer Victory',
                'rule_type': 'conditional',
                'parameters': json.dumps({
                    'condition': 'multiplayer_win',
                    'bonus_xp': 30
                }),
                'priority': 30,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': 'briscola_domination_bonus',
                'game_id': 'briscola',
                'rule_name': 'Domination Bonus',
                'rule_type': 'conditional',
                'parameters': json.dumps({
                    'condition': 'domination',  # Win by 40+ points
                    'bonus_xp': 20
                }),
                'priority': 35,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            }
        ]
        
        print("=" * 70)
        print("  📊 XP RULES REGISTRATION")
        print("=" * 70)
        print()
        
        rules_created = 0
        rules_skipped = 0
        
        for rule_data in xp_rules:
            # Check if rule already exists
            existing_rule = db.query(XPRule).filter(XPRule.rule_id == rule_data['rule_id']).first()
            
            if existing_rule:
                print(f"⏭️  Rule '{rule_data['rule_name']}' already exists - skipping")
                rules_skipped += 1
                continue
            
            rule = XPRule(**rule_data)
            db.add(rule)
            print(f"✅ Created rule: {rule_data['rule_name']}")
            print(f"   Type: {rule_data['rule_type']}, Priority: {rule_data['priority']}")
            rules_created += 1
        
        db.commit()
        
        print()
        print("=" * 70)
        print(f"  ✅ REGISTRATION COMPLETE")
        print(f"     Rules Created: {rules_created}")
        print(f"     Rules Skipped: {rules_skipped}")
        print("=" * 70)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def create_briscola_thumbnail():
    """Create a simple thumbnail for the game"""
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        print("⚠️  PIL not installed, skipping thumbnail generation")
        return
    
    # Create a simple thumbnail
    img = Image.new('RGB', (400, 300), color='#1a472a')  # Dark green like card table
    draw = ImageDraw.Draw(img)
    
    # Draw card shape
    card_x, card_y = 150, 80
    card_w, card_h = 100, 140
    
    # Card shadow
    draw.rounded_rectangle(
        [card_x + 5, card_y + 5, card_x + card_w + 5, card_y + card_h + 5],
        radius=8,
        fill='#0a2a1a'
    )
    
    # Card background
    draw.rounded_rectangle(
        [card_x, card_y, card_x + card_w, card_y + card_h],
        radius=8,
        fill='#ffffff'
    )
    
    # Card symbol (spade/picche)
    draw.text((card_x + 35, card_y + 40), "♠", fill='#000000')
    
    # Title
    draw.text((120, 240), "BRISCOLA", fill='#ffd700')
    
    # Save
    script_dir = Path(__file__).parent
    games_dir = script_dir.parent / 'app' / 'games' / 'briscola' / 'assets'
    games_dir.mkdir(parents=True, exist_ok=True)
    
    thumbnail_path = games_dir / 'thumbnail.png'
    img.save(thumbnail_path)
    print(f"✅ Thumbnail saved to: {thumbnail_path}")


if __name__ == '__main__':
    register_briscola()
    print()
    create_briscola_thumbnail()
