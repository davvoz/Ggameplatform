import sqlite3

conn = sqlite3.connect('backend/app/game_platform.db')
cursor = conn.cursor()

print("=== TABELLE NEL DATABASE ===")
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
for row in cursor.fetchall():
    print(row[0])

print("\n=== GIOCHI REGISTRATI ===")
cursor.execute('SELECT game_id, title, thumbnail FROM games')
for row in cursor.fetchall():
    thumb = row[2][:50] if row[2] else "MANCA"
    print(f"{row[0]}: {row[1]} - thumb: {thumb}")

print("\n=== GIOCHI CON HIGH SCORES (game_scores in users) ===")
cursor.execute("SELECT user_id, username, game_scores FROM users WHERE is_anonymous = 0")
for row in cursor.fetchall():
    import json
    scores = json.loads(row[2]) if row[2] else {}
    if scores:
        print(f"\n{row[1]} ({row[0]}):")
        for game_id, score in scores.items():
            print(f"  {game_id}: {score}")

conn.close()
