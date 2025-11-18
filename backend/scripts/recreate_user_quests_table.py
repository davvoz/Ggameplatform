"""
Script per ricreare la tabella user_quests con le nuove colonne.
Questo script:
1. Fa il backup dei dati esistenti
2. Droppa la tabella user_quests
3. Ricrea la tabella con le nuove colonne (is_claimed, claimed_at)
4. Ripristina i dati esistenti
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import create_engine
from app.models import Base, UserQuest
from app.database import DATABASE_URL, engine, SessionLocal

def main():
    print("=" * 60)
    print("  RECREATE USER_QUESTS TABLE")
    print("=" * 60)
    
    session = SessionLocal()
    
    try:
        # 1. Backup existing data
        print("\n[1/4] Backup existing user_quests data...")
        try:
            existing_data = session.query(UserQuest).all()
            backup_data = [
                {
                    'user_id': uq.user_id,
                    'quest_id': uq.quest_id,
                    'current_progress': uq.current_progress,
                    'is_completed': uq.is_completed,
                    'completed_at': uq.completed_at
                }
                for uq in existing_data
            ]
            print(f"   ✅ Backed up {len(backup_data)} records")
        except Exception as e:
            print(f"   ⚠️ Could not backup (table might not exist): {e}")
            backup_data = []
        
        # 2. Drop the table
        print("\n[2/4] Dropping user_quests table...")
        UserQuest.__table__.drop(engine, checkfirst=True)
        print("   ✅ Table dropped")
        
        # 3. Recreate with new schema
        print("\n[3/4] Recreating user_quests table with new columns...")
        UserQuest.__table__.create(engine, checkfirst=True)
        print("   ✅ Table recreated with is_claimed and claimed_at columns")
        
        # 4. Restore data
        if backup_data:
            print(f"\n[4/4] Restoring {len(backup_data)} records...")
            for data in backup_data:
                new_record = UserQuest(
                    user_id=data['user_id'],
                    quest_id=data['quest_id'],
                    current_progress=data['current_progress'],
                    is_completed=data['is_completed'],
                    completed_at=data['completed_at'],
                    is_claimed=0,  # Nuova colonna: non ancora claimate
                    claimed_at=None  # Nuova colonna: nessun claim ancora
                )
                session.add(new_record)
            session.commit()
            print(f"   ✅ {len(backup_data)} records restored")
        else:
            print("\n[4/4] No data to restore")
        
        print("\n" + "=" * 60)
        print("  ✅ OPERATION COMPLETED SUCCESSFULLY")
        print("=" * 60)
        print("\nNext steps:")
        print("1. Restart the server")
        print("2. Run: python backend\\recalculate_all_quests.py")
        print("3. Check: http://localhost:8000/quests/user/user_9808e87567534e83")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        session.rollback()
        return 1
    finally:
        session.close()
    
    return 0

if __name__ == "__main__":
    exit(main())
