"""
Test Login After 24h Quest
Simula login dopo 24 ore per l'utente user_421c14bf22e040f2
"""

import sys
import os
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import get_db_session
from app.models import User, Quest, UserQuest
from app.quest_tracker import track_quest_progress_for_login
from sqlalchemy import text

USER_ID = "user_421c14bf22e040f2"

def main():
    print("=" * 70)
    print("  TEST: Login After 24h Quest")
    print("=" * 70)
    
    with get_db_session() as session:
        # 1. Verifica utente
        print(f"\n1. Caricamento utente {USER_ID}...")
        user = session.query(User).filter(User.user_id == USER_ID).first()
        
        if not user:
            print(f"❌ Utente {USER_ID} non trovato!")
            return
        
        print(f"✅ Utente trovato: {user.username or 'Anonymous'}")
        print(f"   Last login: {user.last_login}")
        print(f"   Last login date: {user.last_login_date}")
        print(f"   Login streak: {user.login_streak}")
        
        # 2. Trova la quest login_after_24h
        print(f"\n2. Caricamento quest 'login_after_24h'...")
        quest = session.query(Quest).filter(
            Quest.quest_type == 'login_after_24h'
        ).first()
        
        if not quest:
            print(f"❌ Quest 'login_after_24h' non trovata!")
            return
        
        print(f"✅ Quest trovata: {quest.title}")
        print(f"   Quest ID: {quest.quest_id}")
        print(f"   Target: {quest.target_value}")
        print(f"   Rewards: {quest.xp_reward} XP, {quest.reward_coins} Coins")
        
        # 3. Controlla progresso attuale
        print(f"\n3. Controllo progresso attuale...")
        user_quest = session.query(UserQuest).filter(
            UserQuest.user_id == USER_ID,
            UserQuest.quest_id == quest.quest_id
        ).first()
        
        if user_quest:
            print(f"   Progresso: {user_quest.current_progress}/{quest.target_value}")
            print(f"   Completata: {'Sì' if user_quest.is_completed else 'No'}")
            print(f"   Extra data: {user_quest.extra_data}")
        else:
            print(f"   Nessun progresso trovato (verrà creato)")
        
        # 4. FORZIAMO i dati per simulare un gap di 24+ ore
        print(f"\n4. FORZATURA: Impostiamo last_login a 25 ore fa...")
        
        # Calcola 25 ore fa
        now = datetime.utcnow()
        twentyfive_hours_ago = now - timedelta(hours=25)
        
        # Aggiorna last_login
        user.last_login = twentyfive_hours_ago.isoformat()
        session.flush()
        
        print(f"✅ Last login impostato a: {user.last_login}")
        print(f"   Ore trascorse: ~25 ore")
        
        # 5. Simuliamo il login
        print(f"\n5. SIMULAZIONE LOGIN...")
        print(f"   Chiamata a track_quest_progress_for_login()...")
        
        try:
            # Questa funzione dovrebbe:
            # - Controllare che siano passate 24+ ore
            # - Incrementare il progresso della quest
            # - Aggiornare last_login_date
            # - Aggiornare login_streak
            track_quest_progress_for_login(session, USER_ID)
            
            print(f"✅ Tracking quest eseguito!")
            
        except Exception as e:
            print(f"❌ Errore durante tracking: {e}")
            import traceback
            traceback.print_exc()
            return
        
        # 6. Verifica risultati
        print(f"\n6. VERIFICA RISULTATI...")
        
        # Ricarica user
        session.refresh(user)
        print(f"   Last login aggiornato: {user.last_login}")
        print(f"   Last login date: {user.last_login_date}")
        print(f"   Login streak: {user.login_streak}")
        
        # Ricarica user_quest
        user_quest = session.query(UserQuest).filter(
            UserQuest.user_id == USER_ID,
            UserQuest.quest_id == quest.quest_id
        ).first()
        
        if user_quest:
            print(f"\n   📊 PROGRESSO QUEST:")
            print(f"   • Progresso: {user_quest.current_progress}/{quest.target_value}")
            print(f"   • Completata: {'✅ SÌ' if user_quest.is_completed else '❌ NO'}")
            
            if user_quest.is_completed:
                print(f"   • Completata il: {user_quest.completed_at}")
                print(f"   • 🎉 RICOMPENSE OTTENUTE:")
                print(f"     - {quest.xp_reward} XP")
                print(f"     - {quest.reward_coins} Coins")
            
            import json
            try:
                extra = json.loads(user_quest.extra_data) if user_quest.extra_data else {}
                if extra:
                    print(f"   • Extra data: {extra}")
            except:
                pass
        else:
            print(f"   ⚠️ User quest non trovato dopo tracking!")
        
        # 7. Riepilogo
        print(f"\n" + "=" * 70)
        print(f"  RIEPILOGO TEST")
        print(f"=" * 70)
        
        if user_quest and user_quest.current_progress > 0:
            print(f"✅ TEST RIUSCITO!")
            print(f"   La quest 'login_after_24h' è stata aggiornata correttamente.")
            print(f"   Progresso incrementato a: {user_quest.current_progress}")
        else:
            print(f"⚠️ TEST PARZIALE")
            print(f"   La quest potrebbe non essere stata aggiornata.")
            print(f"   Controlla i log sopra per dettagli.")
        
        print(f"\n💡 NOTA:")
        print(f"   Per testare di nuovo, ri-esegui lo script.")
        print(f"   Il progresso continuerà ad incrementare ogni volta.")
        print(f"=" * 70)

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ ERRORE: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
