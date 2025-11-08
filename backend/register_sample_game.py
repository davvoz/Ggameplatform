"""
Register the Space Clicker sample game in the platform database
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import create_game, get_game_by_id

def register_sample_game():
    """Register Space Clicker game"""
    
    game_data = {
        'gameId': 'space-clicker',
        'title': 'Space Clicker',
        'description': 'A fun clicking game where you collect space points by clicking on planets! Features combo multipliers, upgrades, and level progression. Perfect example of Platform SDK integration.',
        'author': 'Platform Team',
        'version': '1.0.0',
        'thumbnail': 'https://via.placeholder.com/400x300/1e3c72/ffffff?text=Space+Clicker',
        'entryPoint': 'index.html',
        'category': 'casual',
        'tags': ['clicker', 'casual', 'space', 'arcade', 'simple'],
        'metadata': {
            'minPlayers': 1,
            'maxPlayers': 1,
            'difficulty': 'easy',
            'rating': 4.5,
            'playCount': 0,
            'featured': True,
            'additionalData': {
                'controls': 'Mouse or Spacebar',
                'gameType': 'Incremental Clicker',
                'playtime': '5-10 minutes'
            }
        }
    }
    
    # Check if game already exists
    existing = get_game_by_id('space-clicker')
    if existing:
        print('⚠️  Game "Space Clicker" already exists in database')
        print('    Game ID: space-clicker')
        print('    Title:', existing['title'])
        return
    
    # Register the game
    try:
        created = create_game(game_data)
        print('✅ Game registered successfully!')
        print('   Game ID:', created['gameId'])
        print('   Title:', created['title'])
        print('   Category:', created.get('category', 'N/A'))
        print('   Tags:', ', '.join(created.get('tags', [])))
        print()
        print('🎮 You can now play the game at:')
        print('   http://localhost:3000/#/play/space-clicker')
        print()
        print('📊 View game details at:')
        print('   http://localhost:3000/#/game/space-clicker')
    except Exception as e:
        print(f'❌ Error registering game: {e}')
        sys.exit(1)

if __name__ == '__main__':
    print('========================================')
    print('  Registering Sample Game')
    print('========================================')
    print()
    
    register_sample_game()
    
    print()
    print('Done!')
