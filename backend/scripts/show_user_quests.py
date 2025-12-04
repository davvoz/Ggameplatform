"""
Show quest progress for a specific user
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.database import get_db_session, get_user_by_username
from app.models import UserQuest, Quest

def show_user_quests(username: str):
    """Show all quests and progress for a user."""
    
    user = get_user_by_username(username)
    if not user:
        print(f"❌ User '{username}' not found")
        return
    
    print(f"\n📋 Quest Progress for {username}")
    print("=" * 100)
    
    with get_db_session() as db:
        # Get all active quests
        all_quests = db.query(Quest).filter(Quest.is_active == 1).order_by(Quest.quest_id).all()
        
        print(f"\nTotal XP: {user['total_xp_earned']:.2f}")
        print(f"Current Level: {int(user['total_xp_earned'] / 1000)}")
        print()
        
        completed_count = 0
        in_progress_count = 0
        
        for quest in all_quests:
            # Get user progress
            user_quest = db.query(UserQuest).filter(
                UserQuest.user_id == user['user_id'],
                UserQuest.quest_id == quest.quest_id
            ).first()
            
            if user_quest:
                if user_quest.is_completed:
                    status = "✅ COMPLETED"
                    progress_bar = "█" * 20
                    progress_pct = 100.0
                    completed_count += 1
                else:
                    progress_pct = (user_quest.current_progress / quest.target_value * 100)
                    filled = int(progress_pct / 5)
                    progress_bar = "█" * filled + "░" * (20 - filled)
                    status = f"⏳ {user_quest.current_progress}/{quest.target_value}"
                    in_progress_count += 1
            else:
                # Not started
                status = "⭕ Not Started"
                progress_bar = "░" * 20
                progress_pct = 0.0
            
            print(f"{quest.quest_id:2d}. {quest.title:45s} [{progress_bar}] {progress_pct:5.1f}%")
            print(f"    {status:25s} Reward: {quest.xp_reward} XP, {quest.reward_coins} coins")
            print(f"    {quest.description}")
            print()
        
        print("=" * 100)
        print(f"Summary: {completed_count} completed | {in_progress_count} in progress | {len(all_quests) - completed_count - in_progress_count} not started")
        print()

if __name__ == "__main__":
    import sys
    username = sys.argv[1] if len(sys.argv) > 1 else "luciojolly"
    show_user_quests(username)
