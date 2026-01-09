"""
Script to analyze the database schema and compare with ORM models
"""
import sqlite3
import json
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "data" / "game_platform.db"

def analyze_database():
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = [t[0] for t in cursor.fetchall()]
    
    print("=" * 60)
    print("DATABASE SCHEMA ANALYSIS")
    print("=" * 60)
    
    schema = {}
    
    for table in tables:
        if table.startswith('sqlite_'):
            continue
            
        print(f"\n📋 TABLE: {table}")
        print("-" * 40)
        
        # Get columns
        cursor.execute(f"PRAGMA table_info({table})")
        columns = cursor.fetchall()
        
        table_info = {
            "columns": [],
            "primary_keys": [],
            "foreign_keys": []
        }
        
        for col in columns:
            cid, name, col_type, not_null, default_val, pk = col
            col_info = {
                "name": name,
                "type": col_type,
                "not_null": bool(not_null),
                "default": default_val,
                "primary_key": bool(pk)
            }
            table_info["columns"].append(col_info)
            
            pk_marker = "🔑 PK" if pk else ""
            null_marker = "NOT NULL" if not_null else "NULL"
            print(f"  {name}: {col_type} {null_marker} {pk_marker}")
            
            if pk:
                table_info["primary_keys"].append(name)
        
        # Get foreign keys
        cursor.execute(f"PRAGMA foreign_key_list({table})")
        fks = cursor.fetchall()
        
        if fks:
            print(f"\n  Foreign Keys:")
            for fk in fks:
                fk_info = {
                    "column": fk[3],
                    "references_table": fk[2],
                    "references_column": fk[4]
                }
                table_info["foreign_keys"].append(fk_info)
                print(f"    🔗 {fk[3]} -> {fk[2]}.{fk[4]}")
        
        # Get indexes
        cursor.execute(f"PRAGMA index_list({table})")
        indexes = cursor.fetchall()
        if indexes:
            print(f"\n  Indexes:")
            for idx in indexes:
                print(f"    📇 {idx[1]} (unique: {idx[2]})")
        
        schema[table] = table_info
    
    conn.close()
    
    # Print summary
    print("\n" + "=" * 60)
    print("SCHEMA SUMMARY")
    print("=" * 60)
    print(f"Total tables: {len(schema)}")
    
    # Print relationships diagram
    print("\n" + "=" * 60)
    print("RELATIONSHIPS")
    print("=" * 60)
    
    for table, info in schema.items():
        for fk in info["foreign_keys"]:
            print(f"  {table}.{fk['column']} --> {fk['references_table']}.{fk['references_column']}")
    
    return schema

if __name__ == "__main__":
    schema = analyze_database()
