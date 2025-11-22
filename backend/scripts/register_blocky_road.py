"""
Register Blocky Road game in the database
"""
import sys
import os
from pathlib import Path
from datetime import datetime

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.database import create_game
import json

def register_blocky_road():
    """Register Blocky Road in the database"""
    
    game_data = {
        'gameId': 'blocky-road',
        'title': 'Blocky Road',
        'description': 'Cross the blockchain! Navigate through a procedurally generated world filled with crypto vehicles, floating platforms, and blockchain trains. Collect Bitcoin coins and avoid obstacles in this addictive infinite runner inspired by Crossy Road!',
        'author': 'Ggameplatform',
        'version': '1.0.0',
        'entryPoint': 'index.html',
        'category': 'arcade',
        'tags': ['arcade', 'infinite-runner', 'blockchain', 'crossy-road', 'voxel', 'casual', 'mobile'],
        'thumbnail': 'thumbnail.png',
        'metadata': {
            'difficulty': 'medium',
            'max_players': 1,
            'min_age': 7,
            'featured': True,
            'gameplay': 'infinite-runner',
            'theme': 'blockchain',
            'graphics': 'voxel',
            'controls': ['keyboard', 'touch'],
            'playTime': 'quick-session'
        }
    }
    
    print("=" * 70)
    print("  🎮 BLOCKY ROAD - GAME REGISTRATION")
    print("=" * 70)
    print()
    
    try:
        result = create_game(game_data)
        print(f"✅ Game '{game_data['title']}' registered successfully!")
        print()
        print(f"   Game ID:      {game_data['gameId']}")
        print(f"   Title:        {game_data['title']}")
        print(f"   Category:     {game_data['category']}")
        print(f"   Entry Point:  {game_data['entryPoint']}")
        print(f"   Tags:         {', '.join(game_data['tags'])}")
        print()
        print("🎯 Description:")
        print(f"   {game_data['description']}")
        print()
        
    except Exception as e:
        if "UNIQUE constraint failed" in str(e):
            print(f"⚠️  Game '{game_data['title']}' already exists in database")
            print(f"   Game ID: {game_data['gameId']}")
        else:
            print(f"❌ Error: {e}")
            raise
    
    print("=" * 70)

if __name__ == "__main__":
    register_blocky_road()
