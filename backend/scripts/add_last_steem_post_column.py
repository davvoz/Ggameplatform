"""
Add last_steem_post column to users table
Tracks when the user last published a Steem post
"""

import sys
import os
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.database import get_db
from sqlalchemy import text

def add_last_steem_post_column():
    """Add last_steem_post column to users table"""
    db = next(get_db())
    
    try:
        # Check if column exists
        result = db.execute(text("PRAGMA table_info(users)")).fetchall()
        columns = [row[1] for row in result]
        
        if 'last_steem_post' in columns:
            print("✅ Column 'last_steem_post' already exists")
            return
        
        # Add column
        print("Adding 'last_steem_post' column to users table...")
        db.execute(text("""
            ALTER TABLE users 
            ADD COLUMN last_steem_post TEXT DEFAULT NULL
        """))
        db.commit()
        
        print("✅ Successfully added 'last_steem_post' column")
        
        # Verify
        result = db.execute(text("PRAGMA table_info(users)")).fetchall()
        columns = [row[1] for row in result]
        print(f"Current columns: {columns}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_last_steem_post_column()
