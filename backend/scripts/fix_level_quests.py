"""
Fix quest livello errate
Resetta le quest reach_level che sono state completate per errore
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import get_db_session
from app.models import User, Quest, UserQuest

USER_ID = "user_ab1faa2624b24938"

def main():
    print("=" * 70)
    print("  FIX QUEST LIVELLO ERRATE")
    print("=" * 70)
    
    with get_db_session() as session:
        user = session.query(User).filter(User.user_id == USER_ID).first()
        
        if not user:
            print(f"❌ Utente non trovato")
            return
        
        current_level = int(user.total_xp_earned / 1000)
        print(f"\n👤 Utente: {user.username or 'Anonymous'}")
        print(f"   Total XP: {user.total_xp_earned}")
        print(f"   Livello attuale: {current_level}")
        
        # Trova tutte le quest reach_level
        reach_level_quests = session.query(Quest).filter(
            Quest.quest_type == 'reach_level'
        ).all()
        
        print(f"\n🔍 Controllo quest reach_level...")
        
        for quest in reach_level_quests:
            target_level = quest.target_value
            
            user_quest = session.query(UserQuest).filter(
                UserQuest.user_id == USER_ID,
                UserQuest.quest_id == quest.quest_id
            ).first()
            
            if user_quest:
                should_be_completed = current_level >= target_level
                is_completed = bool(user_quest.is_completed)
                
                print(f"\n📊 {quest.title} (Level {target_level})")
                print(f"   Stato attuale: {'✅ Completata' if is_completed else '⏳ In corso'}")
                print(f"   Progresso: {user_quest.current_progress}/{target_level}")
                print(f"   Dovrebbe essere: {'✅ Completata' if should_be_completed else '⏳ In corso'}")
                
                # Se lo stato è errato, correggi
                if is_completed != should_be_completed:
                    print(f"   ⚠️  STATO ERRATO! Correzione in corso...")
                    
                    if should_be_completed:
                        # Dovrebbe essere completata
                        user_quest.is_completed = 1
                        user_quest.current_progress = target_level
                        if not user_quest.completed_at:
                            from datetime import datetime
                            user_quest.completed_at = datetime.utcnow().isoformat()
                        print(f"   ✅ Quest marcata come completata")
                    else:
                        # NON dovrebbe essere completata
                        user_quest.is_completed = 0
                        user_quest.is_claimed = 0
                        user_quest.current_progress = current_level
                        user_quest.completed_at = None
                        user_quest.claimed_at = None
                        print(f"   ✅ Quest resettata a in corso")
        
        session.commit()
        
        print(f"\n" + "=" * 70)
        print(f"  CORREZIONE COMPLETATA")
        print("=" * 70)
        
        # Mostra riepilogo finale
        print(f"\n📋 Riepilogo finale:")
        for quest in reach_level_quests:
            user_quest = session.query(UserQuest).filter(
                UserQuest.user_id == USER_ID,
                UserQuest.quest_id == quest.quest_id
            ).first()
            
            if user_quest:
                status = "✅ Completata" if user_quest.is_completed else f"⏳ {user_quest.current_progress}/{quest.target_value}"
                print(f"   {status} - {quest.title}")

if __name__ == "__main__":
    main()
