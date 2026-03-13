"""
Register Sette e Mezzo game in the database
"""
import sys
import os
from datetime import datetime
import json

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models import Game


def register_setteemezzo():
    """Register Sette e Mezzo in the database"""

    db = SessionLocal()

    try:
        # Check if game already exists
        existing_game = db.query(Game).filter(Game.game_id == 'setteemezzo').first()

        if existing_game:
            print("⚠️  Sette e Mezzo already exists in database")
            print(f"   Game ID: setteemezzo")
            print(f"   Title: {existing_game.title}")
            return

        print("=" * 70)
        print("  🃏 SETTE E MEZZO - GAME REGISTRATION")
        print("=" * 70)
        print()

        game_data = {
            'game_id': 'setteemezzo',
            'title': 'Sette e Mezzo',
            'description': 'The classic Neapolitan card game! Get as close as possible to 7½ without busting. Place your bet and try your luck!',
            'author': 'Cur8',
            'version': '1.0.0',
            'entry_point': 'index.html',
            'category': 'cards',
            'tags': json.dumps(['cards', 'italian', 'classic', 'casino', 'napoletane', 'sette-e-mezzo']),
            'thumbnail': 'thumbnail.png',
            'extra_data': json.dumps({
                'difficulty': 'easy',
                'max_players': 1,
                'min_age': 6,
                'featured': False,
                'gameplay': 'turn-based',
                'theme': 'classic-cards',
                'graphics': '2d-canvas',
                'controls': ['mouse', 'touch'],
                'playTime': 'short-session',
                'hasMultiplayer': False,
                'hasAI': True,
                'aiLevels': ['standard'],
                'responsive': True
            }),
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        }

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
        print("=" * 70)
        print("  ✅ REGISTRATION COMPLETE")
        print("=" * 70)
        print()
        print("ℹ️  XP Rules and Quests not included — will be added separately.")

    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        raise
    finally:
        db.close()


if __name__ == '__main__':
    register_setteemezzo()
