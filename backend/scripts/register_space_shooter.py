"""
Register Space Shooter game in the database (game-only, no XP rules or quests)
"""
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import create_game, get_game_by_id


def register_space_shooter():
	"""Register Space Shooter game metadata only"""

	game_id = 'space_shooter'

	# Check if game already exists
	existing = get_game_by_id(game_id)
	if existing:
		print('⚠️  Game "Space Shooter" already exists in database')
		print('    Game ID:', game_id)
		print('    Title:', existing.get('title'))
		return existing

	# Define game metadata (no XP rules, no quests)
	game_data = {
		'gameId': game_id,
		'title': 'Space Shooter',
		'description': (
			'Shoot\'em up verticale in JavaScript puro, mobile-first. '
			'Controlli con tastiera o joystick virtuale, nemici con pattern variabili, '
			'power-up, effetti audio Web Audio API e starfield parallax.'
		),
		'author': 'Ggameplatform',
		'version': '1.0.0',
		# Thumbnail optional; leave empty if not available in assets
		'thumbnail': 'thumbnail.png',
		'entryPoint': 'index.html',
		'category': 'arcade',
		'tags': ['shooter', 'space', 'arcade', 'javascript', 'mobile-first'],
		'metadata': {
			'controls': {
				'desktop': {'move': 'WASD / Arrows', 'fire': 'Space'},
				'mobile': {'move': 'Virtual joystick', 'fire': 'FIRE button'}
			},
			'features': [
				'OOP architecture',
				'Mobile-first input',
				'Progressive waves & bosses',
				'Procedural sprites fallback',
				'Web Audio API effects',
				'Parallax starfield',
				'Power-Up system',
				'Responsive UI'
			],
			'minPlayers': 1,
			'maxPlayers': 1,
			'difficulty': 'medium',
			'rating': 4.6,
			'playCount': 0,
			'featured': True
		}
	}

	try:
		created = create_game(game_data)
		print('✅ Game registered successfully!')
		print('   Game ID:', created['game_id'])
		print('   Title:', created['title'])
		print('   Category:', created.get('category', 'N/A'))
		print('   Entry Point:', created.get('entry_point', 'index.html'))
		print()
		print('🎮 Play at (local dev):')
		print('   http://localhost:3000/#/play/space_shooter')
		print('📊 Game details:')
		print('   http://localhost:3000/#/game/space_shooter')
		return created
	except Exception as e:
		print(f'❌ Error registering game: {e}')
		raise


if __name__ == '__main__':
	print('========================================')
	print('  Registering Space Shooter')
	print('========================================')
	print()
	register_space_shooter()
	print()
	print('Done!')

