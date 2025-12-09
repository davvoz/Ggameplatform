"""
Forza Aggiornamento Quest per Utente
Ricalcola tutte le quest per l'utente user_421c14bf22e040f2
"""

import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import get_db_session
from app.models import User, Quest, GameSession
from app.quest_tracker import QuestTracker

USER_ID = "user_421c14bf22e040f2"

def main():
    print("=" * 70)
    print("  FORZA AGGIORNAMENTO QUEST")
    print(f"  Utente: {USER_ID}")
    print("=" * 70)
    
    with get_db_session() as session:
        # Verifica utente
        user = session.query(User).filter(User.user_id == USER_ID).first()
        
        if not user:
            print(f"❌ Utente {USER_ID} non trovato!")
            return
        
        print(f"\n✅ Utente: {user.username or 'Anonymous'}")
        
        # Prendi l'ultima sessione per simulare un evento
        last_session = session.query(GameSession).filter(
            GameSession.user_id == USER_ID,
            GameSession.ended_at.isnot(None)
        ).order_by(GameSession.ended_at.desc()).first()
        
        if not last_session:
            print("❌ Nessuna sessione trovata per questo utente!")
            return
        
        print(f"\n📊 Ultima sessione:")
        print(f"   Game: {last_session.game_id}")
        print(f"   Score: {last_session.score}")
        print(f"   Duration: {last_session.duration_seconds}s")
        print(f"   XP: {last_session.xp_earned}")
        
        # Inizializza tracker
        tracker = QuestTracker(session)
        
        # Prepara session data
        session_data = {
            'user_id': USER_ID,
            'game_id': last_session.game_id,
            'score': last_session.score,
            'duration_seconds': last_session.duration_seconds,
            'xp_earned': last_session.xp_earned
        }
        
        print(f"\n🔄 Aggiornamento quest in corso...")
        
        # Forza tracking
        tracker.track_session_end(session_data)
        
        print(f"✅ Quest aggiornate!")
        
        # Mostra risultati
        print(f"\n📋 Risultati:")
        
        from app.models import UserQuest
        user_quests = session.query(UserQuest).filter(
            UserQuest.user_id == USER_ID
        ).all()
        
        for uq in user_quests:
            quest = session.query(Quest).filter(Quest.quest_id == uq.quest_id).first()
            if quest:
                status = "✅" if uq.is_completed else f"{uq.current_progress}/{quest.target_value}"
                print(f"   {status} - {quest.quest_type}: {quest.title}")
        
        print(f"\n" + "=" * 70)
        print(f"  AGGIORNAMENTO COMPLETATO!")
        print("=" * 70)

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ ERRORE: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
