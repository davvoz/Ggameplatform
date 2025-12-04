"""
Create Weekly Leaderboard Tables
Migrates database to add weekly leaderboard support
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import engine
from app.models import Base, WeeklyLeaderboard, LeaderboardReward, WeeklyWinner


def create_tables():
    """Create new leaderboard tables."""
    
    print("📊 Creating weekly leaderboard tables...")
    print("ℹ️  Note: Using existing 'leaderboards' table as all-time leaderboard")
    
    try:
        # Create only the new tables (leaderboards already exists)
        tables_to_create = [
            WeeklyLeaderboard.__table__,
            LeaderboardReward.__table__,
            WeeklyWinner.__table__
        ]
        
        for table in tables_to_create:
            print(f"Creating table: {table.name}")
            table.create(engine, checkfirst=True)
            print(f"✅ {table.name} created")
        
        print("\n✅ All weekly leaderboard tables created successfully!")
        print("\nNext steps:")
        print("1. Run: python scripts/populate_leaderboard_rewards.py")
        print("2. Restart backend to activate scheduler")
        
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        import traceback
        traceback.print_exc()


def main():
    """Main function."""
    create_tables()


if __name__ == '__main__':
    main()
