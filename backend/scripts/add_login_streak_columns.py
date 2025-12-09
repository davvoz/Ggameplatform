"""
Add login streak tracking columns to users table
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import get_db_session
from sqlalchemy import text

def add_login_streak_columns():
    """Add login streak tracking columns to users table."""
    
    with get_db_session() as session:
        try:
            # Check existing columns
            result = session.execute(text("PRAGMA table_info(users)"))
            columns = [row[1] for row in result.fetchall()]
            
            # Add login_streak column
            if 'login_streak' not in columns:
                print("Adding login_streak column to users table...")
                session.execute(text(
                    "ALTER TABLE users ADD COLUMN login_streak INTEGER DEFAULT 0"
                ))
                print("✅ login_streak column added")
            else:
                print("ℹ️  login_streak column already exists")
            
            # Add last_login_date column (for tracking consecutive days)
            if 'last_login_date' not in columns:
                print("Adding last_login_date column to users table...")
                session.execute(text(
                    "ALTER TABLE users ADD COLUMN last_login_date TEXT DEFAULT NULL"
                ))
                print("✅ last_login_date column added")
            else:
                print("ℹ️  last_login_date column already exists")
            
            session.commit()
            print("✅ Login streak columns added successfully")
                
        except Exception as e:
            print(f"❌ Error adding login streak columns: {e}")
            session.rollback()
            raise

if __name__ == "__main__":
    print("Adding login streak columns to users table...")
    add_login_streak_columns()
    print("Done!")
