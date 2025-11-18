"""
Update Zombie Tower Defense game thumbnail to use local path
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import SessionLocal
from app.models import Game

def update_zombie_thumbnail():
    """Update Zombie Tower thumbnail to use local path"""
    
    db = SessionLocal()
    try:
        # Find the game
        game = db.query(Game).filter(Game.game_id == 'zombie-tower').first()
        
        if not game:
            print('❌ Game "zombie-tower" not found in database')
            return False
        
        print('📊 Current state:')
        print(f'   Game: {game.title}')
        print(f'   Current thumbnail: {game.thumbnail[:100]}...' if len(game.thumbnail) > 100 else f'   Current thumbnail: {game.thumbnail}')
        
        # Update to local path (relative to game directory)
        new_thumbnail = 'thumbnail.png'
        game.thumbnail = new_thumbnail
        
        db.commit()
        
        print('\n✅ Thumbnail updated successfully!')
        print(f'   New thumbnail: {new_thumbnail}')
        print('\n💡 Make sure the thumbnail file exists at:')
        print(f'   backend/app/games/zombie-tower/thumbnail.png')
        
        return True
        
    except Exception as e:
        db.rollback()
        print(f'❌ Error updating thumbnail: {e}')
        return False
    finally:
        db.close()

if __name__ == '__main__':
    print('========================================')
    print('  Update Zombie Tower Thumbnail')
    print('========================================')
    print()
    
    success = update_zombie_thumbnail()
    
    print()
    if success:
        print('Done! ✓')
    else:
        print('Failed! ✗')
        sys.exit(1)
