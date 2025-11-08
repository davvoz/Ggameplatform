"""
Script to register Snake game in the database
"""
from app.database import create_game
import json

game_data = {
    'gameId': 'snake',
    'title': 'Snake Mobile',
    'description': 'Classic snake game optimized for mobile with swipe controls! Eat food, grow longer, and avoid hitting walls or yourself.',
    'author': 'Platform Team',
    'version': '1.0.0',
    'entryPoint': 'index.html',
    'category': 'arcade',
    'tags': ['snake', 'arcade', 'mobile', 'classic'],
    'thumbnail': 'https://via.placeholder.com/400x300/667eea/ffffff?text=Snake',
    'metadata': {
        'difficulty': 'medium',
        'max_players': 1,
        'min_age': 7,
        'featured': True
    }
}

print("========================================")
print("  Registering Snake Game")
print("========================================\n")

try:
    result = create_game(game_data)
    print(f"✅ Game '{game_data['title']}' registered successfully!")
    print(f"   Game ID: {game_data['gameId']}")
    print(f"   Title: {game_data['title']}")
    print(f"   Category: {game_data['category']}")
except Exception as e:
    if "UNIQUE constraint failed" in str(e):
        print(f"⚠️  Game \"{game_data['title']}\" already exists in database")
        print(f"    Game ID: {game_data['gameId']}")
        print(f"    Title: {game_data['title']}")
    else:
        print(f"❌ Error: {e}")

print("\nDone!")
