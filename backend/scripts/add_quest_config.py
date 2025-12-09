"""
Add config column to quests table for storing additional quest parameters
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import get_db_session
from sqlalchemy import text

def add_quest_config_column():
    """Add config column to quests table."""
    
    with get_db_session() as session:
        try:
            # Check if column exists
            result = session.execute(text("PRAGMA table_info(quests)"))
            columns = [row[1] for row in result.fetchall()]
            
            if 'config' not in columns:
                print("Adding config column to quests table...")
                session.execute(text(
                    "ALTER TABLE quests ADD COLUMN config TEXT DEFAULT '{}'"
                ))
                session.commit()
                print("✅ config column added successfully")
            else:
                print("ℹ️  config column already exists")
                
        except Exception as e:
            print(f"❌ Error adding config column: {e}")
            session.rollback()
            raise

if __name__ == "__main__":
    print("Adding config column to quests table...")
    add_quest_config_column()
    print("Done!")
