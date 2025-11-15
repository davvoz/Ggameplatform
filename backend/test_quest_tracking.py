"""
Test quest tracking system
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.database import create_user, create_game_session, end_game_session, get_db_session
from app.models import UserQuest
import time

def test_quest_tracking():
    """Test the quest tracking system."""
    
    print("🧪 Testing Quest Tracking System\n")
    
    # Create a test user
    print("1. Creating test user...")
    try:
        user = create_user(username="questtester", email="quest@test.com", password="test123")
    except ValueError:
        # User already exists, authenticate instead
        from app.database import get_user_by_username
        user = get_user_by_username("questtester")
        print(f"   ℹ️ User already exists, using existing user")
    
    user_id = user['user_id']
    print(f"   ✅ User: {user_id}\n")
    
    # Start and end some game sessions
    print("2. Playing some games...")
    
    for i in range(5):
        print(f"   Playing game {i+1}...")
        session = create_game_session(user_id, "snake")
        time.sleep(0.1)  # Small delay
        
        # End session with various scores
        score = (i + 1) * 100
        duration = 120  # 2 minutes each
        
        result = end_game_session(session['session_id'], score, duration)
        print(f"   ✅ Session ended - Score: {score}, XP: {result['xp_earned']:.2f}")
    
    print()
    
    # Check quest progress
    print("3. Checking quest progress...")
    with get_db_session() as db:
        user_quests = db.query(UserQuest).filter(
            UserQuest.user_id == user_id
        ).all()
        
        if user_quests:
            print(f"\n   📊 Quest Progress for user {user['username']}:")
            print("   " + "-" * 80)
            for uq in user_quests:
                quest = uq.quest
                progress_pct = (uq.current_progress / quest.target_value * 100) if quest.target_value > 0 else 0
                status = "✅ COMPLETED" if uq.is_completed else f"⏳ {uq.current_progress}/{quest.target_value}"
                print(f"   {quest.quest_id:2d}. {quest.title:50s} {status:20s} ({progress_pct:.1f}%)")
        else:
            print("   ⚠️ No quest progress found!")
    
    print("\n✨ Test completed!")

if __name__ == "__main__":
    test_quest_tracking()
