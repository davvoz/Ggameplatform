"""
Register Tower Defense 3D game in the database
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import create_game, get_game_by_id

def register_tower_defense():
    """Register Tower Defense 3D game"""
    
    game_data = {
        'gameId': 'tower-defense',
        'title': 'Tower Defense 3D',
        'description': 'Un emozionante gioco tower defense 3D! Costruisci torri strategiche per difendere la tua base dalle ondate di nemici. Migliora le torri, sblocca abilità speciali e sopravvivi alle ondate infinite. Gioco completamente integrato con Platform SDK per tracking punteggi e progressi.',
        'author': 'Platform Team',
        'version': '1.0.0',
        'thumbnail': '/app/games/tower_defense/preview.png',
        'entryPoint': 'index.html',
        'category': 'strategy',
        'tags': ['tower-defense', 'strategy', '3d', 'action', 'arcade'],
        'metadata': {
            'minPlayers': 1,
            'maxPlayers': 1,
            'difficulty': 'medium',
            'rating': 4.7,
            'playCount': 0,
            'featured': True,
            'additionalData': {
                'controls': 'Mouse + Touch',
                'gameType': 'Tower Defense Strategy',
                'playtime': '10-30 minutes',
                'features': [
                    '3D Graphics con Three.js',
                    'Sistema di upgrade torri',
                    'Skill tree per torri',
                    'Ondate infinite',
                    'Sistema audio procedurale',
                    'Supporto mobile e desktop'
                ]
            }
        }
    }
    
    # Check if game already exists
    existing = get_game_by_id('tower-defense')
    if existing:
        print('⚠️  Game "Tower Defense 3D" already exists in database')
        print('    Game ID: tower-defense')
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
        print('   http://localhost:3000/#/play/tower-defense')
        print()
        print('📊 View game details at:')
        print('   http://localhost:3000/#/game/tower-defense')
    except Exception as e:
        print(f'❌ Error registering game: {e}')
        sys.exit(1)

if __name__ == '__main__':
    print('========================================')
    print('  Registering Tower Defense 3D')
    print('========================================')
    print()
    
    register_tower_defense()
    
    print()
    print('Done!')
