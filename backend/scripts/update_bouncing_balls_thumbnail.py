"""
Update the Bouncing Balls game thumbnail
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import get_db
from app.models import Game

def update_bouncing_balls_thumbnail():
    """Update the thumbnail for Bouncing Balls game"""
    db = next(get_db())
    
    try:
        # Find and update the game
        game = db.query(Game).filter(Game.game_id == 'bouncing-balls').first()
        
        if game:
            game.thumbnail = 'thumbnail.png'
            db.commit()
            print('✅ Thumbnail updated successfully!')
            print('   Game ID: bouncing-balls')
            print('   New Thumbnail: thumbnail.png')
        else:
            print('⚠️  Game not found in database')
            
    except Exception as e:
        print(f'❌ Error updating thumbnail: {e}')
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

if __name__ == '__main__':
    print('========================================')
    print('  Updating Bouncing Balls Thumbnail')
    print('========================================')
    print()
    
    update_bouncing_balls_thumbnail()
    
    print()
    print('Done!')
