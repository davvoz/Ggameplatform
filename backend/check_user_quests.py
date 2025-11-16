import sqlite3

# Connessione al database
conn = sqlite3.connect('backend/app/game_platform.db')
cursor = conn.cursor()

# Verifica struttura tabella user_quests
print("=== STRUTTURA TABELLA user_quests ===")
cursor.execute("PRAGMA table_info(user_quests)")
columns = cursor.fetchall()
for col in columns:
    print(f"{col[1]} ({col[2]})")

print("\n=== CONTENUTO user_quests ===")
cursor.execute("SELECT * FROM user_quests")
rows = cursor.fetchall()
print(f"Totale righe: {len(rows)}")

if rows:
    for row in rows:
        print(row)
else:
    print("NESSUNA RIGA TROVATA!")

# Verifica users
print("\n=== UTENTI NEL DATABASE ===")
cursor.execute("SELECT id, username FROM users")
users = cursor.fetchall()
for user in users:
    print(f"User: {user[1]} (ID: {user[0]})")

# Verifica quests
print("\n=== QUESTS NEL DATABASE ===")
cursor.execute("SELECT id, title FROM quests")
quests = cursor.fetchall()
print(f"Totale quests: {len(quests)}")

conn.close()
