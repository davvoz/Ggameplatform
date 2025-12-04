"""
Test script for level system integration
Simulates XP gain and checks for level-up detection
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.database import get_db_session, end_game_session, create_game_session, get_user_by_username
from app.level_system import LevelSystem
from app.models import User

def test_level_up():
    """Test level-up detection and coin rewards"""
    
    print("=" * 80)
    print("🎮 TESTING LEVEL SYSTEM INTEGRATION")
    print("=" * 80)
    
    # Get test user (first non-anonymous user)
    with get_db_session() as session:
        user = session.query(User).filter(User.is_anonymous == False).first()
        
        if not user:
            print("❌ No users found in database")
            return
        
        print(f"\n👤 Testing with user: {user.username}")
        print(f"   User ID: {user.user_id}")
        print(f"   Current XP: {user.total_xp_earned:.2f}")
        
        # Calculate current level
        current_level = LevelSystem.calculate_level_from_xp(user.total_xp_earned)
        level_info = LevelSystem.get_level_title(current_level)
        
        print(f"   Current Level: {current_level}")
        print(f"   Title: {level_info['badge']} {level_info['title']}")
        
        # Calculate XP needed for next level
        next_level = current_level + 1
        xp_for_next = LevelSystem.calculate_xp_for_level(next_level)
        xp_needed = xp_for_next - user.total_xp_earned
        
        print(f"\n📊 Next Level: {next_level}")
        print(f"   XP Required: {xp_for_next:.2f}")
        print(f"   XP Needed: {xp_needed:.2f}")
        
        # Get next milestone
        next_milestone = None
        for level in sorted(LevelSystem.LEVEL_MILESTONES.keys()):
            if level > current_level:
                next_milestone = level
                break
        
        if next_milestone:
            milestone_info = LevelSystem.get_level_title(next_milestone)
            milestone_xp = LevelSystem.calculate_xp_for_level(next_milestone)
            print(f"\n🏆 Next Milestone: Level {next_milestone}")
            print(f"   Title: {milestone_info['badge']} {milestone_info['title']}")
            print(f"   XP Required: {milestone_xp:.2f}")
            print(f"   XP Needed: {milestone_xp - user.total_xp_earned:.2f}")
            
            # Check if there's a coin reward
            if next_milestone in LevelSystem.LEVEL_COIN_REWARDS:
                coins = LevelSystem.LEVEL_COIN_REWARDS[next_milestone]
                print(f"   🪙 Coin Reward: {coins}")
        
        print("\n" + "=" * 80)
        print("🎯 SIMULATING GAME SESSION")
        print("=" * 80)
        
        # Find a game to test with
        from app.models import Game
        game = session.query(Game).first()
        
        if not game:
            print("❌ No games found in database")
            return
        
        print(f"\n🎮 Game: {game.title} ({game.game_id})")
        
        # Calculate score needed to level up
        # We'll simulate a score that gives us roughly the XP we need
        # Using default XP calculation: score * 0.01 + time_bonus
        # Let's aim for slightly more than needed to ensure level up
        score_needed = int((xp_needed + 10) / 0.01)
        duration = 120  # 2 minutes
        
        print(f"   Score to use: {score_needed}")
        print(f"   Duration: {duration}s")
        
        # Create game session
        print("\n▶️  Starting game session...")
        session_data = create_game_session(user.user_id, game.game_id)
        session_id = session_data['session_id']
        print(f"   Session ID: {session_id}")
        
        # End game session (this should trigger level-up check)
        print("\n⏹️  Ending game session...")
        result = end_game_session(session_id, score_needed, duration)
        
        if result:
            print(f"\n✅ Session ended successfully!")
            print(f"   Score: {result['score']}")
            print(f"   XP Earned: {result['xp_earned']:.2f}")
            
            # Check for level-up info
            if 'level_up' in result:
                level_up = result['level_up']
                print(f"\n🎉 LEVEL UP DETECTED!")
                print(f"   Old Level: {level_up['old_level']}")
                print(f"   New Level: {level_up['new_level']}")
                print(f"   New Title: {level_up['badge']} {level_up['title']}")
                print(f"   Coins Awarded: 🪙 {level_up['coins_awarded']}")
                
                if level_up['is_milestone']:
                    print(f"   ✨ MILESTONE ACHIEVED! ✨")
            else:
                print("\n📊 No level up this session")
            
            # Show updated user info
            session.expire(user)  # Refresh user object
            session.refresh(user)
            
            new_level = LevelSystem.calculate_level_from_xp(user.total_xp_earned)
            new_info = LevelSystem.get_level_title(new_level)
            
            print(f"\n📈 Updated User Stats:")
            print(f"   Total XP: {user.total_xp_earned:.2f}")
            print(f"   Current Level: {new_level}")
            print(f"   Title: {new_info['badge']} {new_info['title']}")
        else:
            print("❌ Failed to end game session")
    
    print("\n" + "=" * 80)
    print("✅ Test completed!")
    print("=" * 80)

if __name__ == "__main__":
    test_level_up()
