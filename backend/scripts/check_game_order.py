"""Check game display order"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models import Game
import json

db = SessionLocal()

try:
    games = db.query(Game).all()
    
    print("="*70)
    print("  🎮 GAME DISPLAY ORDER")
    print("="*70)
    
    # Create list with game info
    game_list = []
    for game in games:
        status = game.status
        display_order = status.display_order if status else 999999
        
        game_list.append({
            'game_id': game.game_id,
            'title': game.title,
            'status_id': game.status_id,
            'status_name': status.status_name if status else 'None',
            'display_order': display_order
        })
    
    # Sort by display_order
    game_list.sort(key=lambda x: x['display_order'])
    
    print(f"\n{'#':<4} {'Game ID':<25} {'Title':<30} {'Status':<15} {'Order':<6}")
    print("-"*70)
    
    for i, game in enumerate(game_list, 1):
        print(f"{i:<4} {game['game_id']:<25} {game['title']:<30} {game['status_name']:<15} {game['display_order']:<6}")
    
    print("-"*70)
    print(f"\nTotal games: {len(game_list)}")
    
finally:
    db.close()
