"""
Add extra_data column to user_quests table for tracking daily/weekly stats
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import get_db_session
from sqlalchemy import text

def add_extra_data_column():
    """Add extra_data column to user_quests table."""
    
    with get_db_session() as session:
        try:
            # Check if column exists
            result = session.execute(text("PRAGMA table_info(user_quests)"))
            columns = [row[1] for row in result.fetchall()]
            
            if 'extra_data' not in columns:
                print("Adding extra_data column to user_quests table...")
                session.execute(text(
                    "ALTER TABLE user_quests ADD COLUMN extra_data TEXT DEFAULT '{}'"
                ))
                session.commit()
                print("✅ extra_data column added successfully")
            else:
                print("ℹ️  extra_data column already exists")
                
        except Exception as e:
            print(f"❌ Error adding extra_data column: {e}")
            session.rollback()
            raise

if __name__ == "__main__":
    print("Adding extra_data column to user_quests table...")
    add_extra_data_column()
    print("Done!")
