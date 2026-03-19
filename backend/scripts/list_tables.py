"""
List all tables in the database
"""
import sys
import os
import re
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import sqlite3

def _validate_identifier(name):
    """Validate that a SQL identifier contains only safe characters."""
    if not re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', name):
        raise ValueError(f"Invalid SQL identifier: {name}")
    return name

def list_all_tables():
    """List all tables in database"""
    print("🔍 Checking database tables...")
    
    db_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'game_platform.db')
    
    if not os.path.exists(db_path):
        print(f"❌ Database not found at: {db_path}")
        return
    
    print(f"📂 Database: {db_path}")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = cursor.fetchall()
        
        print(f"\n📊 Found {len(tables)} tables:")
        for table in tables:
            table_name = table[0]
            safe_name = _validate_identifier(table_name)
            cursor.execute(f"SELECT COUNT(*) FROM [{safe_name}]")
            count = cursor.fetchone()[0]
            print(f"   • {table_name:30} ({count} records)")
            
            # If it's quests, show structure
            if 'quest' in table_name.lower():
                cursor.execute(f"PRAGMA table_info({safe_name})")
                columns = cursor.fetchall()
                print(f"     Columns:")
                for col in columns:
                    print(f"       - {col[1]:20} {col[2]:10}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == "__main__":
    list_all_tables()
