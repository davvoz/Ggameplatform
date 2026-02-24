"""
Add game_progress table for per-user per-game persistent progress data.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import engine
from app.models import Base, GameProgress

def migrate():
    # Create the game_progress table if it doesn't exist
    GameProgress.__table__.create(engine, checkfirst=True)
    print("✅ game_progress table created (or already exists)")

if __name__ == '__main__':
    migrate()
