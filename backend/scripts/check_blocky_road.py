"""Check blocky-road registration"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import get_db_session
from app.models import Game

with get_db_session() as db:
    game = db.query(Game).filter(Game.game_id == 'blocky-road').first()
    if game:
        print(f"Game ID:      {game.game_id}")
        print(f"Entry Point:  {game.entry_point}")
        print(f"Title:        {game.title}")
    else:
        print("Game not found!")
