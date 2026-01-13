"""
Register the Bouncing Balls game in the platform database
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import create_game, get_game_by_id

def register_bouncing_balls():
    """Register Bouncing Balls - Gravity Master game"""
    
    game_data = {
        'gameId': 'RollABall',
        'title': 'Roll A Ball',
        'description': 'Un gioco ipnotico e rilassante dove crei palline rimbalzanti! Tocca lo schermo per generare nuove palline, raccogli monete e sblocca potenziamenti incredibili. Aumenta gravità, rimbalzo, dimensione e molto altro. Goditi le spettacolari animazioni con effetti arcobaleno e particelle esplosive. Perfetto per mobile!',
        'author': 'Platform Team',
        'version': '1.0.0',
        'thumbnail': 'thumbnail.png',
        'entryPoint': 'index.html',
        'category': 'casual',
        'tags': ['casual', 'arcade', 'physics', 'relaxing', 'mobile-friendly', 'upgrade'],
        'metadata': {
            'minPlayers': 1,
            'maxPlayers': 1,
            'difficulty': 'easy',
            'rating': 4.9,
            'playCount': 0,
            'featured': True,
            'additionalData': {
                'controls': 'Touch/Click - Tap anywhere to create balls',
                'gameType': 'Casual Physics',
                'playtime': '5-15 minutes',
                'orientation': 'both',
                'features': [
                    'Physics-based gameplay',
                    '8 unique upgrades',
                    'Spectacular particle effects',
                    'Rainbow trail effects',
                    'Floating text animations',
                    'Auto-spawning collectible coins',
                    'Smooth 60 FPS animations',
                    'Mobile and desktop optimized',
                    'Relaxing and addictive',
                    'Beautiful gradient visuals'
                ]
            }
        }
    }
    
    # Check if game already exists
    existing = get_game_by_id('RollABall')
    if existing:
        print('⚠️  Game "Roll A Ball" already exists in database')
        print('    Game ID: RollABall')
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
        print('   http://localhost:3000/#/play/bouncing-balls')
        print()
        print('📊 View game details at:')
        print('   http://localhost:3000/#/game/bouncing-balls')
        print()
        print('🎯 Game Features:')
        print('   • 🎾 Tap to create colorful bouncing balls')
        print('   • 💰 Collect auto-spawning coins')
        print('   • ⬆️ 8 powerful upgrades:')
        print('      - New Ball: Add more balls to the screen')
        print('      - Gravity: Control fall speed')
        print('      - Bounce: Increase elasticity')
        print('      - Size: Make balls bigger')
        print('      - Value: Earn more coins')
        print('      - Speed: Faster movement')
        print('      - Multiplier: Multiply coin earnings')
        print('      - Rainbow: Gorgeous visual effects')
        print('   • ✨ Stunning animations and particle effects')
        print('   • 📱 Perfect for mobile and touch devices')
        print('   • 🌈 Beautiful gradient and glow effects')
    except Exception as e:
        print(f'❌ Error registering game: {e}')
        sys.exit(1)

if __name__ == '__main__':
    print('========================================')
    print('  Registering Bouncing Balls')
    print('========================================')
    print()
    
    register_bouncing_balls()
    
    print()
    print('Done!')
