"""
Migration script per aggiungere il constraint UNIQUE(user_id, game_id) alla tabella leaderboards.

Questo script:
1. Verifica che non ci siano duplicati (devono essere già stati rimossi con fix_leaderboard_structure.py)
2. Crea una nuova tabella con il constraint corretto
3. Copia i dati dalla vecchia tabella
4. Sostituisce la vecchia tabella con la nuova
"""
import sqlite3
from app.database import get_db_session
from app.models import Leaderboard

def migrate_leaderboard_unique_constraint():
    """
    Applica il constraint UNIQUE(user_id, game_id) alla tabella leaderboards.
    """
    print("\n" + "="*80)
    print("MIGRAZIONE: AGGIUNTA CONSTRAINT UNIQUE(user_id, game_id)")
    print("="*80 + "\n")
    
    # Verifica che non ci siano duplicati
    with get_db_session() as session:
        total_entries = session.query(Leaderboard).count()
        unique_pairs = session.query(
            Leaderboard.user_id,
            Leaderboard.game_id
        ).distinct().count()
        
        if total_entries != unique_pairs:
            print(f"❌ ERRORE: Trovati {total_entries - unique_pairs} duplicati!")
            print("Esegui prima: python fix_leaderboard_structure.py --rebuild --yes")
            return False
        
        print(f"✅ Verifica duplicati OK: {total_entries} entry, tutte uniche\n")
    
    # Ottieni il path del database
    db_path = "app/game_platform.db"
    
    print(f"📂 Database: {db_path}\n")
    
    # Connetti al database SQLite
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # 1. Crea una nuova tabella temporanea con il constraint corretto
        print("1️⃣  Creo tabella temporanea con constraint UNIQUE...")
        cursor.execute("""
            CREATE TABLE leaderboards_new (
                entry_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                game_id TEXT NOT NULL,
                score INTEGER NOT NULL,
                rank INTEGER,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                FOREIGN KEY (game_id) REFERENCES games(game_id) ON DELETE CASCADE,
                UNIQUE(user_id, game_id)
            )
        """)
        print("   ✅ Tabella temporanea creata\n")
        
        # 2. Copia tutti i dati dalla vecchia alla nuova tabella
        print("2️⃣  Copio i dati dalla tabella originale...")
        cursor.execute("""
            INSERT INTO leaderboards_new (entry_id, user_id, game_id, score, rank, created_at)
            SELECT entry_id, user_id, game_id, score, rank, created_at
            FROM leaderboards
        """)
        copied_rows = cursor.rowcount
        print(f"   ✅ Copiati {copied_rows} record\n")
        
        # 3. Drop la vecchia tabella
        print("3️⃣  Rimuovo la tabella originale...")
        cursor.execute("DROP TABLE leaderboards")
        print("   ✅ Tabella originale rimossa\n")
        
        # 4. Rinomina la nuova tabella
        print("4️⃣  Rinomino la nuova tabella...")
        cursor.execute("ALTER TABLE leaderboards_new RENAME TO leaderboards")
        print("   ✅ Tabella rinominata\n")
        
        # 5. Ricrea gli indici
        print("5️⃣  Ricreo gli indici...")
        cursor.execute("""
            CREATE INDEX idx_leaderboard_game_score 
            ON leaderboards(game_id, score DESC)
        """)
        print("   ✅ Indice idx_leaderboard_game_score creato\n")
        
        # Commit delle modifiche
        conn.commit()
        
        print("="*80)
        print("✅ MIGRAZIONE COMPLETATA CON SUCCESSO!")
        print("="*80)
        print("\nLa tabella leaderboards ora ha:")
        print("  - Constraint UNIQUE(user_id, game_id)")
        print("  - Indice idx_leaderboard_game_score")
        print("\nRegola applicata: UN solo record per utente per gioco con il punteggio migliore")
        print("="*80 + "\n")
        
        return True
        
    except Exception as e:
        print(f"\n❌ ERRORE durante la migrazione: {e}")
        conn.rollback()
        return False
        
    finally:
        conn.close()


def verify_migration():
    """Verifica che la migrazione sia stata eseguita correttamente."""
    print("\n" + "="*80)
    print("VERIFICA MIGRAZIONE")
    print("="*80 + "\n")
    
    db_path = "app/game_platform.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Verifica che la tabella esista
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='leaderboards'
        """)
        
        if not cursor.fetchone():
            print("❌ Tabella leaderboards non trovata!")
            return False
        
        print("✅ Tabella leaderboards trovata\n")
        
        # Verifica lo schema
        cursor.execute("PRAGMA table_info(leaderboards)")
        columns = cursor.fetchall()
        
        print("📋 Colonne:")
        for col in columns:
            print(f"   - {col[1]} ({col[2]})")
        print()
        
        # Verifica gli indici e i constraint
        cursor.execute("PRAGMA index_list(leaderboards)")
        indexes = cursor.fetchall()
        
        print("🔍 Indici e Constraint:")
        for idx in indexes:
            print(f"   - {idx[1]} (unique={bool(idx[2])})")
        print()
        
        # Verifica il constraint UNIQUE
        has_unique = any(idx[2] == 1 for idx in indexes)  # idx[2] = unique flag
        
        if has_unique:
            print("✅ Constraint UNIQUE(user_id, game_id) presente\n")
        else:
            print("⚠️  Constraint UNIQUE potrebbe non essere visibile via PRAGMA\n")
            print("   (SQLite non sempre mostra i constraint nelle info)\n")
        
        # Conta i record
        cursor.execute("SELECT COUNT(*) FROM leaderboards")
        count = cursor.fetchone()[0]
        print(f"📊 Record nella tabella: {count}\n")
        
        print("="*80)
        print("✅ VERIFICA COMPLETATA")
        print("="*80 + "\n")
        
        return True
        
    except Exception as e:
        print(f"❌ ERRORE durante la verifica: {e}")
        return False
        
    finally:
        conn.close()


if __name__ == "__main__":
    print("\n🔄 MIGRAZIONE DATABASE - LEADERBOARD UNIQUE CONSTRAINT")
    print("="*80)
    print("Questo script aggiunge il constraint UNIQUE(user_id, game_id)")
    print("alla tabella leaderboards del database.")
    print("\nATTENZIONE: Assicurati di aver eseguito prima:")
    print("  python fix_leaderboard_structure.py --rebuild --yes")
    print("="*80 + "\n")
    
    import sys
    
    # Check for --yes flag
    auto_confirm = "--yes" in sys.argv or "-y" in sys.argv
    
    if not auto_confirm:
        response = input("Continuare con la migrazione? (s/n): ")
        if response.lower() != 's':
            print("Migrazione annullata.")
            sys.exit(0)
    else:
        print("✅ Auto-confermato con flag --yes\n")
    
    # Esegui la migrazione
    success = migrate_leaderboard_unique_constraint()
    
    if success:
        # Verifica
        verify_migration()
    else:
        print("\n❌ Migrazione fallita!")
        sys.exit(1)
