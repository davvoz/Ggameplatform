"""
Script di migrazione per rinominare le colonne cur8_earned e total_cur8_earned
in xp_earned e total_xp_earned nel database SQLite.

Questo script:
1. Crea una copia di backup del database
2. Rinomina le colonne nelle tabelle users e game_sessions
3. Verifica che la migrazione sia avvenuta correttamente
"""

import sqlite3
import shutil
from pathlib import Path
from datetime import datetime

DATABASE_PATH = Path(__file__).parent / "app" / "game_platform.db"
BACKUP_PATH = Path(__file__).parent / "backups" / f"game_platform_before_xp_migration_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"

def create_backup():
    """Crea un backup del database prima della migrazione."""
    print(f"📦 Creazione backup del database...")
    
    # Crea la directory backups se non esiste
    BACKUP_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    # Copia il database
    shutil.copy2(DATABASE_PATH, BACKUP_PATH)
    print(f"✅ Backup creato: {BACKUP_PATH}")
    return BACKUP_PATH

def migrate_database():
    """Esegue la migrazione rinominando le colonne."""
    print(f"\n🔄 Inizio migrazione del database...")
    
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    try:
        # Verifica se le colonne esistono già nel nuovo formato
        cursor.execute("PRAGMA table_info(users)")
        users_columns = [col[1] for col in cursor.fetchall()]
        
        cursor.execute("PRAGMA table_info(game_sessions)")
        sessions_columns = [col[1] for col in cursor.fetchall()]
        
        # Controlla se la migrazione è già stata eseguita
        if 'total_xp_earned' in users_columns:
            print("⚠️  La colonna total_xp_earned esiste già nella tabella users")
            print("   La migrazione potrebbe essere già stata eseguita")
            return False
        
        if 'xp_earned' in sessions_columns:
            print("⚠️  La colonna xp_earned esiste già nella tabella game_sessions")
            print("   La migrazione potrebbe essere già stata eseguita")
            return False
        
        print("\n1️⃣ Migrazione tabella USERS...")
        
        # Per SQLite, dobbiamo ricreare la tabella per rinominare le colonne
        # 1. Crea una nuova tabella con i nuovi nomi
        cursor.execute("""
            CREATE TABLE users_new (
                user_id TEXT PRIMARY KEY,
                username TEXT UNIQUE,
                email TEXT UNIQUE,
                password_hash TEXT,
                steem_username TEXT UNIQUE,
                is_anonymous INTEGER DEFAULT 0,
                cur8_multiplier REAL DEFAULT 1.0,
                total_xp_earned REAL DEFAULT 0.0,
                game_scores TEXT DEFAULT '{}',
                avatar TEXT,
                created_at TEXT NOT NULL,
                last_login TEXT,
                extra_data TEXT DEFAULT '{}'
            )
        """)
        print("   ✓ Tabella users_new creata")
        
        # 2. Copia i dati dalla vecchia tabella alla nuova
        cursor.execute("""
            INSERT INTO users_new 
            SELECT user_id, username, email, password_hash, steem_username,
                   is_anonymous, cur8_multiplier, total_cur8_earned, game_scores,
                   avatar, created_at, last_login, extra_data
            FROM users
        """)
        print("   ✓ Dati copiati nella nuova tabella")
        
        # 3. Elimina la vecchia tabella
        cursor.execute("DROP TABLE users")
        print("   ✓ Vecchia tabella users eliminata")
        
        # 4. Rinomina la nuova tabella
        cursor.execute("ALTER TABLE users_new RENAME TO users")
        print("   ✓ Tabella rinominata in users")
        
        print("\n2️⃣ Migrazione tabella GAME_SESSIONS...")
        
        # Stesso processo per game_sessions
        cursor.execute("""
            CREATE TABLE game_sessions_new (
                session_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                game_id TEXT NOT NULL,
                score INTEGER DEFAULT 0,
                xp_earned REAL DEFAULT 0.0,
                duration_seconds INTEGER DEFAULT 0,
                started_at TEXT NOT NULL,
                ended_at TEXT,
                extra_data TEXT DEFAULT '{}',
                FOREIGN KEY (user_id) REFERENCES users(user_id),
                FOREIGN KEY (game_id) REFERENCES games(game_id)
            )
        """)
        print("   ✓ Tabella game_sessions_new creata")
        
        cursor.execute("""
            INSERT INTO game_sessions_new 
            SELECT session_id, user_id, game_id, score, cur8_earned,
                   duration_seconds, started_at, ended_at, extra_data
            FROM game_sessions
        """)
        print("   ✓ Dati copiati nella nuova tabella")
        
        cursor.execute("DROP TABLE game_sessions")
        print("   ✓ Vecchia tabella game_sessions eliminata")
        
        cursor.execute("ALTER TABLE game_sessions_new RENAME TO game_sessions")
        print("   ✓ Tabella rinominata in game_sessions")
        
        # Ricrea gli indici
        print("\n3️⃣ Ricreazione indici...")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user ON game_sessions(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_game ON game_sessions(game_id)")
        print("   ✓ Indici ricreati")
        
        conn.commit()
        print("\n✅ Migrazione completata con successo!")
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Errore durante la migrazione: {e}")
        print(f"   Il backup è disponibile in: {BACKUP_PATH}")
        return False
        
    finally:
        conn.close()

def verify_migration():
    """Verifica che la migrazione sia stata eseguita correttamente."""
    print(f"\n🔍 Verifica della migrazione...")
    
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    try:
        # Verifica struttura tabella users
        cursor.execute("PRAGMA table_info(users)")
        users_columns = {col[1]: col[2] for col in cursor.fetchall()}
        
        # Verifica struttura tabella game_sessions
        cursor.execute("PRAGMA table_info(game_sessions)")
        sessions_columns = {col[1]: col[2] for col in cursor.fetchall()}
        
        # Verifica che le nuove colonne esistano
        if 'total_xp_earned' not in users_columns:
            print("   ❌ Colonna total_xp_earned non trovata nella tabella users")
            return False
        
        if 'xp_earned' not in sessions_columns:
            print("   ❌ Colonna xp_earned non trovata nella tabella game_sessions")
            return False
        
        # Verifica che le vecchie colonne non esistano più
        if 'total_cur8_earned' in users_columns:
            print("   ❌ La vecchia colonna total_cur8_earned esiste ancora nella tabella users")
            return False
        
        if 'cur8_earned' in sessions_columns:
            print("   ❌ La vecchia colonna cur8_earned esiste ancora nella tabella game_sessions")
            return False
        
        # Conta i record per verificare che i dati siano stati preservati
        cursor.execute("SELECT COUNT(*) FROM users")
        users_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM game_sessions")
        sessions_count = cursor.fetchone()[0]
        
        print(f"   ✓ Tabella users: {users_count} record")
        print(f"   ✓ Tabella game_sessions: {sessions_count} record")
        print(f"   ✓ Colonna total_xp_earned presente in users")
        print(f"   ✓ Colonna xp_earned presente in game_sessions")
        
        # Mostra un esempio di dati migrati
        cursor.execute("SELECT user_id, username, total_xp_earned FROM users LIMIT 1")
        user_sample = cursor.fetchone()
        if user_sample:
            print(f"\n   📊 Esempio utente migrato:")
            print(f"      ID: {user_sample[0]}")
            print(f"      Username: {user_sample[1]}")
            print(f"      Total XP: {user_sample[2]}")
        
        cursor.execute("SELECT session_id, score, xp_earned FROM game_sessions WHERE ended_at IS NOT NULL LIMIT 1")
        session_sample = cursor.fetchone()
        if session_sample:
            print(f"\n   📊 Esempio sessione migrata:")
            print(f"      ID: {session_sample[0]}")
            print(f"      Score: {session_sample[1]}")
            print(f"      XP Earned: {session_sample[2]}")
        
        print("\n✅ Verifica completata - Migrazione OK!")
        return True
        
    except Exception as e:
        print(f"\n❌ Errore durante la verifica: {e}")
        return False
        
    finally:
        conn.close()

def main():
    """Funzione principale di esecuzione."""
    print("=" * 80)
    print("MIGRAZIONE DATABASE: CUR8 → XP")
    print("=" * 80)
    print(f"\nDatabase: {DATABASE_PATH}")
    
    if not DATABASE_PATH.exists():
        print(f"\n❌ Database non trovato: {DATABASE_PATH}")
        return
    
    # Crea backup
    backup_path = create_backup()
    
    # Chiedi conferma
    print(f"\n⚠️  ATTENZIONE: Questa operazione modificherà il database.")
    print(f"   Un backup è stato creato in: {backup_path}")
    response = input("\nProcedere con la migrazione? (s/n): ")
    
    if response.lower() != 's':
        print("\n❌ Migrazione annullata dall'utente")
        return
    
    # Esegui migrazione
    if migrate_database():
        # Verifica migrazione
        if verify_migration():
            print("\n" + "=" * 80)
            print("✅ MIGRAZIONE COMPLETATA CON SUCCESSO!")
            print("=" * 80)
            print(f"\n📝 Note:")
            print(f"   - Backup disponibile in: {backup_path}")
            print(f"   - Le colonne 'cur8_earned' e 'total_cur8_earned' sono state rinominate")
            print(f"   - I dati sono stati preservati")
            print(f"   - Il codice dell'applicazione è stato aggiornato per usare i nuovi nomi")
        else:
            print("\n⚠️  La migrazione è stata eseguita ma la verifica ha rilevato problemi")
            print(f"   Controlla il backup: {backup_path}")
    else:
        print("\n❌ Migrazione fallita")
        print(f"   Ripristina dal backup se necessario: {backup_path}")

if __name__ == "__main__":
    main()
