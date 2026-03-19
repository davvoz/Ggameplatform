"""
Complete database viewer - Shows all tables with all fields and sample data
"""
import sqlite3
import sys
import os
import re

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

db_path = "data/game_platform.db"

def format_value(value):
    """Format value for display"""
    if value is None:
        return "NULL"
    if isinstance(value, str) and len(value) > 50:
        return value[:47] + "..."
    return str(value)

def _validate_identifier(name):
    """Validate that a SQL identifier contains only safe characters."""
    if not re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', name):
        raise ValueError(f"Invalid SQL identifier: {name}")
    return name

def view_database():
    """View complete database structure and data"""
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
        tables = cursor.fetchall()
        
        print("=" * 100)
        print("COMPLETE DATABASE VIEWER - ALL TABLES AND FIELDS")
        print("=" * 100)
        print(f"\nDatabase: {db_path}")
        print(f"Total tables: {len(tables)}\n")
        
        for table in tables:
            table_name = table[0]
            
            print("\n" + "=" * 100)
            print(f"📋 TABLE: {table_name.upper()}")
            print("=" * 100)
            
            # Get column info
            safe_name = _validate_identifier(table_name)
            cursor.execute(f"PRAGMA table_info({safe_name})")
            columns = cursor.fetchall()
            
            print("\n🔹 SCHEMA:")
            print("-" * 100)
            print(f"{'#':<3} {'Column Name':<30} {'Type':<15} {'Nullable':<10} {'Default':<15} {'PK':<5}")
            print("-" * 100)
            
            for col in columns:
                col_id, col_name, col_type, not_null, default_val, is_pk = col
                nullable = "NOT NULL" if not_null else "NULL"
                default = format_value(default_val) if default_val is not None else "-"
                pk = "YES" if is_pk else ""
                
                print(f"{col_id:<3} {col_name:<30} {col_type:<15} {nullable:<10} {default:<15} {pk:<5}")
            
            # Get row count
            cursor.execute(f"SELECT COUNT(*) FROM [{safe_name}]")
            count = cursor.fetchone()[0]
            
            print(f"\n📊 Total rows: {count}")
            
            # Show sample data (first 3 rows)
            if count > 0:
                print("\n🔹 SAMPLE DATA (first 3 rows):")
                print("-" * 100)
                
                cursor.execute(f"SELECT * FROM [{safe_name}] LIMIT 3")
                rows = cursor.fetchall()
                
                col_names = [col[1] for col in columns]
                
                for i, row in enumerate(rows, 1):
                    print(f"\nRow {i}:")
                    for col_name, value in zip(col_names, row):
                        display_value = format_value(value)
                        print(f"  {col_name:<30} = {display_value}")
            
            # Get foreign keys
            cursor.execute(f"PRAGMA foreign_key_list({safe_name})")
            fks = cursor.fetchall()
            
            if fks:
                print("\n🔹 FOREIGN KEYS:")
                print("-" * 100)
                for fk in fks:
                    fk_id, seq, ref_table, from_col, to_col = fk[0], fk[1], fk[2], fk[3], fk[4]
                    print(f"  {from_col} → {ref_table}.{to_col}")
            
            # Get indexes
            cursor.execute(f"PRAGMA index_list({safe_name})")
            indexes = cursor.fetchall()
            
            if indexes:
                print("\n🔹 INDEXES:")
                print("-" * 100)
                for idx in indexes:
                    idx_name, is_unique = idx[1], idx[2]
                    unique_marker = " [UNIQUE]" if is_unique else ""
                    safe_idx = _validate_identifier(idx_name)
                    cursor.execute(f"PRAGMA index_info({safe_idx})")
                    idx_cols = cursor.fetchall()
                    col_list = ", ".join([col[2] for col in idx_cols])
                    print(f"  {idx_name}{unique_marker}: ({col_list})")
        
        conn.close()
        
        print("\n" + "=" * 100)
        print("✅ Database view complete!")
        print("=" * 100)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    view_database()
