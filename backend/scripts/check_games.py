"""Quick check of registered games"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import get_db_session
from app.models import Game

with get_db_session() as db:
    games = db.query(Game).all()
    print("\n📦 GIOCHI REGISTRATI:")
    print("-" * 70)
    for g in games:
        print(f"  • {g.title:40s} [{g.game_id}]")
    print(f"\nTotale: {len(games)} giochi\n")
