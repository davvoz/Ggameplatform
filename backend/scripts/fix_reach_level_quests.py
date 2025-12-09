#!/usr/bin/env python3
"""
Script URGENTE per fixare le quest reach_level danneggiate
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import get_db
from app.models import User, Quest, UserQuest
from app.level_system import LevelSystem

def fix_reach_level_quests():
    """Fixa tutte le quest reach_level."""
    
    print("\n" + "="*70)
    print("🚨 FIX URGENTE: REACH LEVEL QUESTS")
    print("="*70)
    
    db = next(get_db())
    
    try:
        # Trova tutte le quest reach_level
        reach_level_quests = db.query(Quest).filter(
            Quest.quest_type == 'reach_level'
        ).all()
        
        print(f"\n📊 Trovate {len(reach_level_quests)} quest reach_level")
        
        for quest in reach_level_quests:
            print(f"\n🎯 Quest: {quest.title} (Target: {quest.target_value})")
            
            # Trova tutte le user_quests per questa quest
            user_quests = db.query(UserQuest).filter(
                UserQuest.quest_id == quest.quest_id
            ).all()
            
            print(f"   Trovate {len(user_quests)} user_quests")
            
            for uq in user_quests:
                # Ottieni l'utente
                user = db.query(User).filter(User.user_id == uq.user_id).first()
                
                if not user:
                    continue
                
                # Calcola il livello corretto
                current_level = LevelSystem.calculate_level_from_xp(user.total_xp_earned or 0)
                
                # Se il progresso è MOLTO diverso dal livello, fixalo
                if uq.current_progress != current_level:
                    old_progress = uq.current_progress
                    uq.current_progress = current_level
                    
                    # Aggiorna lo stato di completamento
                    was_completed = uq.is_completed
                    should_be_completed = current_level >= quest.target_value
                    
                    if should_be_completed and not was_completed:
                        uq.is_completed = 1
                        from datetime import datetime
                        uq.completed_at = datetime.utcnow().isoformat()
                        print(f"   ✅ {user.username}: {old_progress} → {current_level} (COMPLETATA!)")
                    elif not should_be_completed and was_completed:
                        uq.is_completed = 0
                        uq.completed_at = None
                        print(f"   🔄 {user.username}: {old_progress} → {current_level} (RESET)")
                    else:
                        print(f"   📝 {user.username}: {old_progress} → {current_level}")
        
        db.commit()
        print(f"\n✅ Fix completato con successo!")
        
    except Exception as e:
        print(f"\n❌ Errore: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    print("\n⚠️  ATTENZIONE: Questo script fixerà le quest reach_level danneggiate!")
    response = input("\n❓ Vuoi procedere? (s/n): ")
    
    if response.lower() in ['s', 'si', 'y', 'yes']:
        fix_reach_level_quests()
    else:
        print("\n❌ Operazione annullata")
