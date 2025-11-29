import sqlite3
import os

db_path = 'data/games/rainbow_rush.db'

print('\n🗑️  Pulizia Database Rainbow Rush')
print('=' * 70)

if os.path.exists(db_path):
    # Connetti al database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Elimina tutti i dati dalle tabelle
    print('\n🔄 Eliminazione dati...')
    
    cursor.execute("DELETE FROM rainbow_rush_progress")
    progress_deleted = cursor.rowcount
    print(f'   ✅ rainbow_rush_progress: {progress_deleted} record eliminati')
    
    cursor.execute("DELETE FROM rainbow_rush_level_completions")
    completions_deleted = cursor.rowcount
    print(f'   ✅ rainbow_rush_level_completions: {completions_deleted} record eliminati')
    
    cursor.execute("DELETE FROM rainbow_rush_sessions")
    sessions_deleted = cursor.rowcount
    print(f'   ✅ rainbow_rush_sessions: {sessions_deleted} record eliminati')
    
    # Commit e chiudi
    conn.commit()
    conn.close()
    
    print('\n✅ Database pulito!')
    print('   Ora ricarica il gioco e rigioca con il tuo account user_6ce3def93bc34ac9')
else:
    print(f'\n❌ Database non trovato: {db_path}')
