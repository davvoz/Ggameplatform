"""
Migration script to create game_statuses table
This script creates the game_statuses table and adds the status_id column to the games table.
"""

import sys
import os
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, inspect, text
from app.database import DATABASE_PATH, engine
from app.models import Base, GameStatus, Game


def table_exists(engine, table_name):
    """Check if a table exists in the database."""
    inspector = inspect(engine)
    return table_name in inspector.get_table_names()


def column_exists(engine, table_name, column_name):
    """Check if a column exists in a table."""
    inspector = inspect(engine)
    if not table_exists(engine, table_name):
        return False
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def create_game_statuses_table():
    """Create the game_statuses table and update games table."""
    
    print("\n" + "="*60)
    print("GAME STATUSES TABLE MIGRATION")
    print("="*60)
    
    # Check if game_statuses table already exists
    if table_exists(engine, 'game_statuses'):
        print("✓ Table 'game_statuses' already exists")
    else:
        print("\n→ Creating 'game_statuses' table...")
        GameStatus.__table__.create(engine)
        print("✓ Table 'game_statuses' created successfully")
    
    # Check if status_id column exists in games table
    if column_exists(engine, 'games', 'status_id'):
        print("✓ Column 'status_id' already exists in 'games' table")
    else:
        print("\n→ Adding 'status_id' column to 'games' table...")
        with engine.begin() as conn:
            # SQLite requires special handling for ALTER TABLE
            conn.execute(text("""
                ALTER TABLE games 
                ADD COLUMN status_id INTEGER 
                REFERENCES game_statuses(status_id)
            """))
        print("✓ Column 'status_id' added successfully")
    
    print("\n" + "="*60)
    print("MIGRATION COMPLETED SUCCESSFULLY")
    print("="*60)
    print("\nNext steps:")
    print("1. Run: python backend/scripts/populate_game_statuses.py")
    print("2. Start the server and check the db-viewer")
    print("="*60 + "\n")


if __name__ == "__main__":
    try:
        create_game_statuses_table()
    except Exception as e:
        print("\n" + "="*60)
        print("ERROR DURING MIGRATION")
        print("="*60)
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
