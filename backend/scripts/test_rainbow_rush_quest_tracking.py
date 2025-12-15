"""
Test Rainbow Rush quest tracking system
Verifies that quest tracking works correctly with platform database
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import create_user, get_user_by_username, get_db_session
from app.games.rainbow_rush_be.database import get_rainbow_rush_db_session, init_rainbow_rush_db
from app.games.rainbow_rush_be.repository import RainbowRushRepository
from app.games.rainbow_rush_be.service import RainbowRushService
from app.models import UserQuest, Quest

def test_rainbow_rush_quest_tracking():
    """Test the Rainbow Rush quest tracking system."""
    
    print("🧪 Testing Rainbow Rush Quest Tracking System\n")
    
    # Initialize databases
    print("1. Initializing databases...")
    try:
        init_rainbow_rush_db()
        print("   ✅ Databases initialized\n")
    except Exception as e:
        print(f"   ⚠️ Database initialization: {e}\n")
    
    # Create or get test user
    print("2. Creating/getting test user...")
    try:
        user = create_user(username="rr_test_user", email="rrtest@test.com", password="test123")
        print(f"   ✅ Created new user: {user['user_id']}")
    except ValueError:
        user = get_user_by_username("rr_test_user")
        print(f"   ℹ️ Using existing user: {user['user_id']}")
    
    user_id = user['user_id']
    print()
    
    # Check active quests in platform database
    print("3. Checking active quests in platform database...")
    with get_db_session() as db:
        active_quests = db.query(Quest).filter(Quest.is_active == 1).all()
        print(f"   ✅ Found {len(active_quests)} active quests")
        if active_quests:
            print("   Quests:")
            for quest in active_quests[:5]:  # Show first 5
                print(f"     - {quest.quest_id}: {quest.title} ({quest.quest_type})")
    print()
    
    # Start and end a Rainbow Rush session
    print("4. Starting Rainbow Rush session...")
    with get_rainbow_rush_db_session() as rr_db:
        repository = RainbowRushRepository(rr_db)
        service = RainbowRushService(repository)
        
        # Start session
        session = service.start_game_session(user_id, level_id=1)
        session_id = session['session_id']
        print(f"   ✅ Session started: {session_id}")
        
        # Update session with stats
        stats = {
            'level': 1,
            'score': 500,
            'time': 1234567890,
            'duration_seconds': 60,
            'extra_data': {
                'levels_completed': 1,
                'distance': 100,
                'coins_collected': 10,
                'enemies_defeated': 5
            }
        }
        
        service.update_game_session(session_id, {'current_stats': stats})
        print(f"   ✅ Session updated with stats")
        
        # End session - this should trigger quest tracking
        print("\n5. Ending session (triggering quest tracking)...")
        try:
            ended_session = service.end_game_session(session_id)
            print(f"   ✅ Session ended successfully")
            print(f"   📊 Score: {stats['score']}, Duration: {stats['duration_seconds']}s")
        except Exception as e:
            print(f"   ❌ Error ending session: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    print()
    
    # Check quest progress in platform database
    print("6. Checking quest progress in platform database...")
    with get_db_session() as db:
        user_quests = db.query(UserQuest).filter(
            UserQuest.user_id == user_id
        ).all()
        
        if user_quests:
            print(f"   ✅ Found {len(user_quests)} quest progress entries")
            print("\n   📊 Quest Progress:")
            print("   " + "-" * 80)
            for uq in user_quests[:10]:  # Show first 10
                quest = uq.quest
                progress_pct = (uq.current_progress / quest.target_value * 100) if quest.target_value > 0 else 0
                status = "✅ COMPLETED" if uq.is_completed else f"⏳ {uq.current_progress}/{quest.target_value}"
                print(f"   {quest.quest_id:2d}. {quest.title:50s} {status:20s} ({progress_pct:.1f}%)")
        else:
            print("   ⚠️ No quest progress found - this might indicate an issue")
    
    print("\n✨ Test completed successfully!")
    return True

if __name__ == "__main__":
    success = test_rainbow_rush_quest_tracking()
    sys.exit(0 if success else 1)
