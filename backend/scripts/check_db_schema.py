"""
Check current database schema
"""
import sqlite3
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

db_path = "data/game_platform.db"

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = cursor.fetchall()
    
    print("="*80)
    print("CURRENT DATABASE SCHEMA")
    print("="*80)
    
    for table in tables:
        table_name = table[0]
        print(f"\n📋 Table: {table_name}")
        print("-" * 80)
        
        # Get column info
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = cursor.fetchall()
        
        for col in columns:
            col_id, col_name, col_type, not_null, default_val, is_pk = col
            pk_marker = " [PK]" if is_pk else ""
            null_marker = " NOT NULL" if not_null else ""
            default_marker = f" DEFAULT {default_val}" if default_val is not None else ""
            
            print(f"  {col_id:2d}. {col_name:30s} {col_type:15s}{pk_marker}{null_marker}{default_marker}")
        
        # Get count
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        count = cursor.fetchone()[0]
        print(f"\n  📊 Total rows: {count}")
    
    conn.close()
    print("\n" + "="*80)
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
