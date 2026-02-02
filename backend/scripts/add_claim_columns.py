"""
Migration script to add is_claimed and claimed_at columns to user_quests table
"""
import sqlite3
from pathlib import Path

def add_claim_columns():
    # Get database path 
    db_path = Path(__file__).parent / "app" / "game_platform.db"
    
    print(f"Connecting to database: {db_path}")
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(user_quests)")
        columns = [col[1] for col in cursor.fetchall()]
        
        print(f"Current columns: {columns}")
        
        # Add is_claimed column if not exists
        if 'is_claimed' not in columns:
            print("Adding is_claimed column...")
            cursor.execute("""
                ALTER TABLE user_quests 
                ADD COLUMN is_claimed INTEGER DEFAULT 0
            """)
            print("✓ is_claimed column added")
        else:
            print("✓ is_claimed column already exists")
        
        # Add claimed_at column if not exists
        if 'claimed_at' not in columns:
            print("Adding claimed_at column...")
            cursor.execute("""
                ALTER TABLE user_quests 
                ADD COLUMN claimed_at TEXT
            """)
            print("✓ claimed_at column added")
        else:
            print("✓ claimed_at column already exists")
        
        # Commit changes
        conn.commit()
        print("\n✅ Migration completed successfully!")
        
        # Verify columns
        cursor.execute("PRAGMA table_info(user_quests)")
        columns = cursor.fetchall()
        print("\nFinal table structure:")
        for col in columns:
            print(f"  - {col[1]} ({col[2]})")
        
    except Exception as e:
        print(f"\n❌ Error during migration: {e}")
        conn.rollback()
        raise
    
    finally:
        conn.close()

if __name__ == "__main__":
    add_claim_columns()
