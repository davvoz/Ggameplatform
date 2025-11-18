"""
Register Rainbow Rush game in the database
"""
import sys
import os
import json
from datetime import datetime

# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from app.database import get_db
from app.models import Game
from sqlalchemy.orm import Session

def register_rainbow_rush():
    """Register Rainbow Rush in the database"""
    db: Session = next(get_db())
    
    try:
        # Check if game already exists
        existing_game = db.query(Game).filter(Game.game_id == "rainbow-rush").first()
        
        if existing_game:
            print("Rainbow Rush already exists in database. Updating...")
            game = existing_game
        else:
            print("Registering new game: Rainbow Rush")
            game = Game(game_id="rainbow-rush")
            db.add(game)
        
        # Update game details
        game.title = "Rainbow Rush"
        game.description = "A colorful endless runner platform game! Jump through rainbow-colored platforms, collect golden gems, avoid obstacles, and see how far you can go. Features procedurally generated levels that get progressively harder. Perfect for quick gaming sessions on mobile and desktop!"
        game.thumbnail = "thumbnail.png"  # Use local file instead of Base64
        game.category = "Platform"
        game.entry_point = "index.html"
        game.author = "Ggameplatform"
        game.version = "1.0.0"
        game.tags = json.dumps(["platform", "runner", "endless", "colorful", "mobile", "casual"])
        game.created_at = datetime.utcnow().isoformat()
        game.updated_at = datetime.utcnow().isoformat()
        
        db.commit()
        
        print("✅ Rainbow Rush registered successfully!")
        print(f"   Game ID: {game.game_id}")
        print(f"   Title: {game.title}")
        print(f"   Category: {game.category}")
        print(f"   Entry Point: {game.entry_point}")
        print(f"   Author: {game.author}")
        print(f"   Tags: {game.tags}")
        
        return game
        
    except Exception as e:
        print(f"❌ Error registering game: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 60)
    print("Rainbow Rush - Game Registration")
    print("=" * 60)
    register_rainbow_rush()
    print("=" * 60)
