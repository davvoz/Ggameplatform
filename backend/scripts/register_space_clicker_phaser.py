"""
Register Space Clicker Phaser game in the database
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

def register_space_clicker_phaser():
    """Register Space Clicker Phaser in the database"""
    db: Session = next(get_db())
    
    try:
        # Check if game already exists
        existing_game = db.query(Game).filter(Game.game_id == "space-clicker-phaser").first()
        
        if existing_game:
            print("Space Clicker Phaser already exists in database. Updating...")
            game = existing_game
        else:
            print("Registering new game: Space Clicker Phaser")
            game = Game(game_id="space-clicker-phaser")
            db.add(game)
        
        # Update game details
        game.title = "Space Clicker - Phaser Edition"
        game.description = "An engaging space-themed clicker game built with Phaser 3! Click the rocket to increase your score. Features stunning space graphics, smooth animations, and addictive gameplay. Perfect for quick gaming sessions!"
        game.thumbnail = "thumbnail.png"
        game.category = "Clicker"
        game.entry_point = "index.html"
        game.author = "Ggameplatform"
        game.version = "1.0.0"
        game.tags = json.dumps(["clicker", "space", "phaser", "idle", "casual", "arcade"])
        game.created_at = datetime.utcnow().isoformat()
        game.updated_at = datetime.utcnow().isoformat()
        
        db.commit()
        
        print("✅ Space Clicker Phaser registered successfully!")
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
    print("Space Clicker Phaser - Game Registration")
    print("=" * 60)
    register_space_clicker_phaser()
    print("=" * 60)
