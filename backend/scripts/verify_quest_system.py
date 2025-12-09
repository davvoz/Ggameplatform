"""
Verify quest system setup
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import get_db_session
from app.models import Quest
from sqlalchemy import text

def verify_quest_system():
    """Verify quest system is properly set up."""
    
    with get_db_session() as session:
        print("=" * 60)
        print("Quest System Verification")
        print("=" * 60)
        
        # Check database columns
        print("\n1. Checking database columns...")
        
        # Check users table
        result = session.execute(text("PRAGMA table_info(users)"))
        user_columns = [row[1] for row in result.fetchall()]
        
        required_user_cols = ['login_streak', 'last_login_date']
        for col in required_user_cols:
            status = "✓" if col in user_columns else "✗"
            print(f"  {status} users.{col}")
        
        # Check user_quests table
        result = session.execute(text("PRAGMA table_info(user_quests)"))
        uq_columns = [row[1] for row in result.fetchall()]
        
        required_uq_cols = ['extra_data']
        for col in required_uq_cols:
            status = "✓" if col in uq_columns else "✗"
            print(f"  {status} user_quests.{col}")
        
        # Check quests table
        result = session.execute(text("PRAGMA table_info(quests)"))
        quest_columns = [row[1] for row in result.fetchall()]
        
        required_quest_cols = ['config']
        for col in required_quest_cols:
            status = "✓" if col in quest_columns else "✗"
            print(f"  {status} quests.{col}")
        
        # Check quest types
        print("\n2. Checking quest types...")
        
        required_types = [
            'score_threshold_per_game',
            'login_after_24h',
            'login_streak',
            'leaderboard_top',
            'play_games_weekly',
            'play_time_daily',
            'xp_daily',
            'xp_weekly'
        ]
        
        quests = session.query(Quest).filter(Quest.is_active == 1).all()
        quest_types = {q.quest_type: q for q in quests}
        
        for qt in required_types:
            if qt in quest_types:
                quest = quest_types[qt]
                print(f"  ✓ {qt}")
                print(f"    └─ {quest.title}")
                print(f"       Target: {quest.target_value}, XP: {quest.xp_reward}, Coins: {quest.reward_coins}")
            else:
                print(f"  ✗ {qt} - NOT FOUND")
        
        print("\n" + "=" * 60)
        print("Verification Complete!")
        print("=" * 60)

if __name__ == "__main__":
    verify_quest_system()
