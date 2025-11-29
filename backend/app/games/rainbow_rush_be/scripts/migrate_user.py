import sqlite3
import json
from datetime import datetime

# Connetti al database
conn = sqlite3.connect('data/games/rainbow_rush.db')
cursor = conn.cursor()

# ID vecchio e nuovo
old_user_id = 'anon_1764375015523_bh0tdto4b'
new_user_id = 'user_6ce3def93bc34ac9'

print(f'\n🔄 Migrazione dati Rainbow Rush')
print(f'Da: {old_user_id}')
print(f'A:  {new_user_id}')
print('=' * 70)

# 1. Controlla se esiste già un record per il nuovo user_id
cursor.execute("SELECT user_id FROM rainbow_rush_progress WHERE user_id = ?", (new_user_id,))
existing = cursor.fetchone()

if existing:
    print(f'\n⚠️  Utente {new_user_id} esiste già!')
    cursor.execute("""
        SELECT current_level, max_level_unlocked, total_stars, total_coins 
        FROM rainbow_rush_progress WHERE user_id = ?
    """, (new_user_id,))
    data = cursor.fetchone()
    print(f'   Dati esistenti: Level {data[1]}, Stars {data[2]}, Coins {data[3]}')
    
    # Chiedi conferma (in questo caso sovrascrivo)
    print('\n   Sovrascrivo con i dati dell\'account anonimo...')

# 2. Aggiorna user_id in rainbow_rush_progress
cursor.execute("""
    UPDATE rainbow_rush_progress 
    SET user_id = ?, 
        updated_at = ?
    WHERE user_id = ?
""", (new_user_id, datetime.utcnow().isoformat(), old_user_id))

progress_updated = cursor.rowcount
print(f'\n✅ Progress aggiornati: {progress_updated} record')

# 3. Aggiorna user_id in rainbow_rush_level_completions
cursor.execute("""
    UPDATE rainbow_rush_level_completions 
    SET user_id = ?
    WHERE user_id = ?
""", (new_user_id, old_user_id))

completions_updated = cursor.rowcount
print(f'✅ Level completions aggiornati: {completions_updated} record')

# 4. Aggiorna user_id in rainbow_rush_sessions
cursor.execute("""
    UPDATE rainbow_rush_sessions 
    SET user_id = ?
    WHERE user_id = ?
""", (new_user_id, old_user_id))

sessions_updated = cursor.rowcount
print(f'✅ Sessions aggiornate: {sessions_updated} record')

# 5. Verifica i dati migrati
cursor.execute("""
    SELECT user_id, current_level, max_level_unlocked, total_stars, total_coins, high_score, level_completions
    FROM rainbow_rush_progress 
    WHERE user_id = ?
""", (new_user_id,))

result = cursor.fetchone()

if result:
    print(f'\n📊 Dati migrati per {new_user_id}:')
    print(f'   Max Level Unlocked: {result[2]}')
    print(f'   Total Stars: {result[3]}')
    print(f'   Total Coins: {result[4]}')
    print(f'   High Score: {result[5]}')
    
    level_completions = json.loads(result[6]) if result[6] else {}
    print(f'   Livelli Completati: {len(level_completions)}')
    for level_id in sorted(level_completions.keys(), key=int):
        data = level_completions[level_id]
        print(f'      Level {level_id}: {data.get("stars", 0)}⭐')

# Commit delle modifiche
conn.commit()
conn.close()

print('\n✅ Migrazione completata!')
print(f'\nOra puoi loggarti come {new_user_id} e trovare tutti i tuoi progressi.')
