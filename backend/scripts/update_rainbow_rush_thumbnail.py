"""
Update Rainbow Rush thumbnail to use local image
"""
from app.database import get_db
from app.models import Game

print("========================================")
print("  Updating Rainbow Rush Thumbnail")
print("========================================\n")

db = next(get_db())

try:
    # Find and update the game
    game = db.query(Game).filter(Game.game_id == 'rainbow-rush').first()
    
    if game:
        game.thumbnail = 'thumbnail.png'
        db.commit()
        print("✅ Thumbnail updated successfully!")
        print("   Game: Rainbow Rush")
        print("   New thumbnail: thumbnail.png")
    else:
        print("⚠️  Game not found in database")
        
except Exception as e:
    print(f"❌ Error: {e}")
    db.rollback()
finally:
    db.close()

print("\nDone!")
