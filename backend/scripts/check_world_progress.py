"""Check game_progress table for world unlock persistence issues."""
import sqlite3
import json
import os

# Get the correct DB path relative to this script location
script_dir = os.path.dirname(os.path.abspath(__file__))  # backend/scripts
backend_dir = os.path.dirname(script_dir)  # backend
db_path = os.path.join(backend_dir, 'data', 'game_platform.db')
print(f"DB path: {os.path.abspath(db_path)}")
print(f"DB exists: {os.path.exists(db_path)}")
print(f"DB size: {os.path.getsize(db_path) if os.path.exists(db_path) else 'N/A'} bytes")

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# 1. Check if the table exists
cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='game_progress'")
table = cur.fetchone()
print("=" * 70)
print("1. TABLE EXISTS:", "YES" if table else "NO <<<< PROBLEMA!")
print("=" * 70)

if not table:
    print("La tabella game_progress NON ESISTE nel DB!")
    print("Tabelle presenti:")
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    for t in cur.fetchall():
        print(f"  - {t['name']}")
    conn.close()
    exit()

# 2. Table schema
print("\n2. TABLE SCHEMA:")
cur.execute("PRAGMA table_info(game_progress)")
for col in cur.fetchall():
    print(f"   {col['name']:20s} {col['type']:15s} nullable={not col['notnull']}")

# 3. Total row count
cur.execute("SELECT COUNT(*) as cnt FROM game_progress")
print(f"\n3. TOTAL ROWS: {cur.fetchone()['cnt']}")

# 4. All rows for space_shooter_2
print("\n4. ALL SPACE_SHOOTER_2 PROGRESS:")
cur.execute("SELECT * FROM game_progress WHERE game_id LIKE '%space_shooter%' OR game_id LIKE '%space-shooter%'")
rows = cur.fetchall()
if not rows:
    print("   NESSUN RECORD trovato per space_shooter!")
    cur.execute("SELECT DISTINCT game_id FROM game_progress")
    ids = cur.fetchall()
    print(f"   Game IDs presenti: {[r['game_id'] for r in ids]}")
else:
    for r in rows:
        data = json.loads(r['progress_data']) if r['progress_data'] else {}
        print(f"   user={r['user_id']:25s} game={r['game_id']:20s} data={data} updated={r['updated_at']}")

# 5. Show ALL rows regardless of game
print("\n5. ALL RECORDS IN game_progress (last 20):")
cur.execute("SELECT * FROM game_progress ORDER BY updated_at DESC LIMIT 20")
rows = cur.fetchall()
if not rows:
    print("   NESSUN RECORD in tutta la tabella!")
else:
    for r in rows:
        data = json.loads(r['progress_data']) if r['progress_data'] else {}
        print(f"   user={r['user_id']:25s} game={r['game_id']:20s} data={data} updated={r['updated_at']}")

# 6. Check the game_id used for space_shooter_2
print("\n6. GAME IDs in games table matching 'space':")
try:
    cur.execute("SELECT game_id, name FROM games WHERE game_id LIKE '%space%' OR name LIKE '%space%'")
    for r in cur.fetchall():
        print(f"   game_id='{r['game_id']}' name='{r['name']}'")
except Exception as e:
    print(f"   Error: {e}")

conn.close()
print("\nDone.")
