"""
Verifica stato quest completate ma non claimed
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import get_db_session
from app.models import User, Quest, UserQuest

USER_ID = "user_421c14bf22e040f2"

def main():
    print("=" * 70)
    print("  VERIFICA QUEST COMPLETATE MA NON CLAIMED")
    print("=" * 70)
    
    with get_db_session() as session:
        user = session.query(User).filter(User.user_id == USER_ID).first()
        
        if not user:
            print(f"❌ Utente non trovato")
            return
        
        print(f"\n👤 Utente: {user.username or 'Anonymous'}")
        print(f"   Total XP: {user.total_xp_earned}")
        print(f"   Level: {int(user.total_xp_earned / 1000)}")
        
        # Trova tutte le quest completate ma non claimed
        completed_not_claimed = session.query(UserQuest).filter(
            UserQuest.user_id == USER_ID,
            UserQuest.is_completed == 1,
            UserQuest.is_claimed == 0
        ).all()
        
        print(f"\n📊 Quest completate ma NON ancora claimed: {len(completed_not_claimed)}")
        
        for uq in completed_not_claimed:
            quest = session.query(Quest).filter(Quest.quest_id == uq.quest_id).first()
            if quest:
                print(f"\n🎯 {quest.title}")
                print(f"   Type: {quest.quest_type}")
                print(f"   Progress: {uq.current_progress}/{quest.target_value}")
                print(f"   Completed at: {uq.completed_at}")
                print(f"   Rewards: {quest.xp_reward} XP, {quest.reward_coins} Coins")
        
        # Quest completate E claimed
        completed_claimed = session.query(UserQuest).filter(
            UserQuest.user_id == USER_ID,
            UserQuest.is_completed == 1,
            UserQuest.is_claimed == 1
        ).all()
        
        print(f"\n✅ Quest completate E claimed: {len(completed_claimed)}")
        
        # Quest in corso
        in_progress = session.query(UserQuest).filter(
            UserQuest.user_id == USER_ID,
            UserQuest.is_completed == 0
        ).all()
        
        print(f"\n⏳ Quest in corso: {len(in_progress)}")
        
        for uq in in_progress:
            quest = session.query(Quest).filter(Quest.quest_id == uq.quest_id).first()
            if quest:
                progress_pct = (uq.current_progress / quest.target_value * 100) if quest.target_value > 0 else 0
                print(f"   • {quest.title}: {uq.current_progress}/{quest.target_value} ({progress_pct:.0f}%)")

if __name__ == "__main__":
    main()
