"""
Add Campaigns Table
Migration script to add the campaigns table to an existing database.

Usage:
    python scripts/add_campaigns_table.py
"""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, inspect, text
from app.models import Base, Campaign

# Database path
DATABASE_PATH = Path(__file__).parent.parent / "data" / "game_platform.db"
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"


def check_table_exists(engine, table_name: str) -> bool:
    """Check if a table exists in the database."""
    inspector = inspect(engine)
    return table_name in inspector.get_table_names()


def create_campaigns_table():
    """Create the campaigns table if it doesn't exist."""
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    
    table_name = 'campaigns'
    
    if check_table_exists(engine, table_name):
        print(f"✅ Table '{table_name}' already exists")
        
        # Check columns
        inspector = inspect(engine)
        columns = [col['name'] for col in inspector.get_columns(table_name)]
        print(f"   Columns: {', '.join(columns)}")
        
        # Count records
        with engine.connect() as conn:
            result = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
            count = result.scalar()
            print(f"   Records: {count}")
        
        return True
    
    print(f"📝 Creating table '{table_name}'...")
    
    # Create only the Campaign table
    Campaign.__table__.create(engine, checkfirst=True)
    
    # Verify creation
    if check_table_exists(engine, table_name):
        print(f"✅ Table '{table_name}' created successfully!")
        
        # Show table structure
        inspector = inspect(engine)
        columns = inspector.get_columns(table_name)
        print("\n   Table structure:")
        for col in columns:
            nullable = "NULL" if col['nullable'] else "NOT NULL"
            print(f"   - {col['name']}: {col['type']} {nullable}")
        
        return True
    else:
        print(f"❌ Failed to create table '{table_name}'")
        return False


if __name__ == "__main__":
    print("=" * 50)
    print("Campaigns Table Migration")
    print("=" * 50)
    print(f"\nDatabase: {DATABASE_PATH}")
    print()
    
    if not DATABASE_PATH.parent.exists():
        print(f"⚠️  Database directory doesn't exist: {DATABASE_PATH.parent}")
        print("   The table will be created when the application starts.")
    elif not DATABASE_PATH.exists():
        print(f"⚠️  Database file doesn't exist: {DATABASE_PATH}")
        print("   The table will be created when the application starts.")
    else:
        create_campaigns_table()
    
    print("\n" + "=" * 50)
    print("Done!")
