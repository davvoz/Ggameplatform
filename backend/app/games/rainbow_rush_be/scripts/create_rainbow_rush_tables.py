"""
Database Migration Script - Rainbow Rush Tables
Creates tables for Rainbow Rush game-specific data
Run this script to add Rainbow Rush tables to the database
"""

import sys
import os
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine
from app.games.rainbow_rush_be.database import get_rainbow_rush_db_url, rainbow_rush_engine
from app.games.rainbow_rush_be.models import (
    RainbowRushProgress,
    RainbowRushLevelCompletion,
    RainbowRushGameSession
)


def create_rainbow_rush_tables():
    """Create Rainbow Rush tables in database"""
    print("🎮 Rainbow Rush Database Migration")
    print("=" * 50)
    
    # Get database URL
    database_url = get_rainbow_rush_db_url()
    print(f"📊 Database: {database_url}")
    
    # Use Rainbow Rush engine (già configurato)
    engine = rainbow_rush_engine
    
    try:
        # Create only Rainbow Rush tables
        print("\n📦 Creating Rainbow Rush tables...")
        RainbowRushProgress.__table__.create(engine, checkfirst=True)
        print("✅ Created table: rainbow_rush_progress")
        
        RainbowRushLevelCompletion.__table__.create(engine, checkfirst=True)
        print("✅ Created table: rainbow_rush_level_completions")
        
        RainbowRushGameSession.__table__.create(engine, checkfirst=True)
        print("✅ Created table: rainbow_rush_sessions")
        
        print("\n" + "=" * 50)
        print("✅ Rainbow Rush tables created successfully!")
        print("\nTables created:")
        print("  - rainbow_rush_progress")
        print("  - rainbow_rush_level_completions")
        print("  - rainbow_rush_sessions")
        print("\n🎮 Rainbow Rush backend is ready!")
        
    except Exception as e:
        print(f"\n❌ Error creating tables: {e}")
        raise
    finally:
        engine.dispose()


if __name__ == "__main__":
    create_rainbow_rush_tables()
