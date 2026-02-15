"""
Register Space Shooter 2 game in the database (game-only, no XP rules or quests)
"""
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import create_game, get_game_by_id, update_game


def register_space_shooter_2():
    """Register Space Shooter 2 game metadata only"""

    game_id = 'space_shooter_2'

    # Define game metadata
    game_data = {
        'gameId': game_id,
        'title': 'Space Shooter 2',
        'description': (
            'Tactical evolution of Space Shooter. '
            '5 selectable ships with unique stat profiles, 5 assignable ultimates, '
            '30 discrete levels, points-based economy, scalable upgrade shop. '
            'Canvas 2D, mobile-first, procedural sprites & Web Audio API.'
        ),
        'author': 'Ggameplatform',
        'version': '1.0.0',
        'thumbnail': 'thumbnail.png',
        'entryPoint': 'index.html',
        'category': 'arcade',
        'tags': ['shooter', 'space', 'arcade', 'tactical', 'rpg', 'mobile-first'],
        'metadata': {
            'controls': {
                'desktop': {'move': 'WASD / Arrows', 'fire': 'Space', 'ultimate': 'Q'},
                'mobile': {'move': 'Virtual joystick', 'fire': 'FIRE button', 'ultimate': 'ULT button'}
            },
            'features': [
                '5 Selectable Ships with stat bars',
                '5 Assignable Ultimates',
                '30 Discrete Levels',
                'Boss Fights',
                'Points-based Economy',
                'Scalable Upgrade Shop',
                'Level Summary Screen',
                'Combo System',
                'Power-Up System',
                'Procedural sprites',
                'Web Audio API effects',
                'Parallax starfield',
                'Responsive mobile-first UI'
            ],
            'minPlayers': 1,
            'maxPlayers': 1,
            'difficulty': 'medium',
            'rating': 4.8,
            'playCount': 0,
            'featured': True
        }
    }

    try:
        # Check if game already exists
        existing = get_game_by_id(game_id)
        if existing:
            print('📝 Game "Space Shooter 2" found, updating...')
            result = update_game(game_id, game_data)
            print('✅ Game updated successfully!')
        else:
            print('🆕 Creating new game...')
            result = create_game(game_data)
            print('✅ Game registered successfully!')
        
        print('   Game ID:', result['game_id'])
        print('   Title:', result['title'])
        print('   Category:', result.get('category', 'N/A'))
        print('   Entry Point:', result.get('entry_point', 'index.html'))
        print()
        print('🎮 Play at (local dev):')
        print('   http://localhost:3000/#/play/space_shooter_2')
        print('📊 Game details:')
        print('   http://localhost:3000/#/game/space_shooter_2')
        return result
    except Exception as e:
        print(f'❌ Error registering game: {e}')
        raise


if __name__ == '__main__':
    print('========================================')
    print('  Registering Space Shooter 2')
    print('========================================')
    print()
    register_space_shooter_2()
    print()
    print('Done!')
