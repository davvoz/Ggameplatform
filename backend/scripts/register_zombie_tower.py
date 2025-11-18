"""
Register the Zombie Tower Defense game in the platform database
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import create_game, get_game_by_id

def register_zombie_tower():
    """Register Zombie Tower Defense game"""
    
    game_data = {
        'gameId': 'zombie-tower',
        'title': 'Zombie Tower Defense',
        'description': 'A thrilling tower defense game! Place cannons strategically to defend against endless waves of zombies. Merge 3 cannons of the same type to upgrade them. Features multiple cannon types with unique abilities, progressive difficulty, and an energy system. Perfect for mobile and desktop!',
        'author': 'Platform Team',
        'version': '1.0.0',
        'thumbnail': 'https://via.placeholder.com/400x300/1a1a2e/4ecdc4?text=Zombie+Tower+Defense+🧟',
        'entryPoint': 'index.html',
        'category': 'strategy',
        'tags': ['tower-defense', 'strategy', 'zombies', 'action', 'merge', 'mobile-friendly'],
        'metadata': {
            'minPlayers': 1,
            'maxPlayers': 1,
            'difficulty': 'medium',
            'rating': 4.8,
            'playCount': 0,
            'featured': True,
            'additionalData': {
                'controls': 'Touch/Mouse - Tap to place, Drag to merge',
                'gameType': 'Tower Defense',
                'playtime': '10-20 minutes',
                'orientation': 'vertical',
                'features': [
                    '5 unique cannon types',
                    'Merge system (3 cannons → upgrade)',
                    '4 zombie types with progressive difficulty',
                    'Energy-based defense system',
                    'Wave-based progression',
                    'Mobile and desktop optimized'
                ]
            }
        }
    }
    
    # Check if game already exists
    existing = get_game_by_id('zombie-tower')
    if existing:
        print('⚠️  Game "Zombie Tower Defense" already exists in database')
        print('    Game ID: zombie-tower')
        print('    Title:', existing['title'])
        return
    
    # Register the game
    try:
        created = create_game(game_data)
        print('✅ Game registered successfully!')
        print('   Game ID:', created['game_id'])
        print('   Title:', created['title'])
        print('   Category:', created.get('category', 'N/A'))
        print('   Tags:', ', '.join(created.get('tags', [])))
        print()
        print('🎮 You can now play the game at:')
        print('   http://localhost:3000/#/play/zombie-tower')
        print()
        print('📊 View game details at:')
        print('   http://localhost:3000/#/game/zombie-tower')
        print()
        print('🎯 Game Features:')
        print('   • 5 cannon types: Basic, Rapid, Heavy, Laser, Freeze')
        print('   • Merge 3 same cannons to upgrade')
        print('   • 4 zombie types with increasing difficulty')
        print('   • Energy system - protect the defense line!')
        print('   • Endless waves - how far can you go?')
    except Exception as e:
        print(f'❌ Error registering game: {e}')
        sys.exit(1)

if __name__ == '__main__':
    print('========================================')
    print('  Registering Zombie Tower Defense')
    print('========================================')
    print()
    
    register_zombie_tower()
    
    print()
    print('Done!')
