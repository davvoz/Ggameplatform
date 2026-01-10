"""
Test script to verify multi-level reward logic
"""
import sys
sys.path.append('.')

from app.level_system import LevelSystem

def test_multi_level_rewards():
    """Test that multiple level-ups award all rewards correctly"""
    
    print("=" * 60)
    print("MULTI-LEVEL REWARD TEST")
    print("=" * 60)
    
    # Test Case 1: Level up from 1 to 3 (gaining 2 levels)
    print("\n📊 Test Case 1: Level 1 → Level 3")
    print("-" * 60)
    
    old_xp = 0  # Level 1
    new_xp = 300  # Level 3
    
    result = LevelSystem.check_level_up(old_xp, new_xp)
    
    print(f"Old Level: {result['old_level']}")
    print(f"New Level: {result['new_level']}")
    print(f"Levels Gained: {result['levels_gained']}")
    print(f"Total Coins Awarded: {result['coins_awarded']}")
    print(f"\nDetails per level:")
    for level_data in result['levels_with_rewards']:
        print(f"  - Level {level_data['level']}: {level_data['coins']} coins")
    
    # Test Case 2: Level up from 5 to 8 (gaining 3 levels)
    print("\n\n📊 Test Case 2: Level 5 → Level 8")
    print("-" * 60)
    
    old_xp = LevelSystem.calculate_xp_for_level(5)
    new_xp = LevelSystem.calculate_xp_for_level(8)
    
    result = LevelSystem.check_level_up(old_xp, new_xp)
    
    print(f"Old XP: {old_xp}")
    print(f"New XP: {new_xp}")
    print(f"Old Level: {result['old_level']}")
    print(f"New Level: {result['new_level']}")
    print(f"Levels Gained: {result['levels_gained']}")
    print(f"Total Coins Awarded: {result['coins_awarded']}")
    print(f"\nDetails per level:")
    for level_data in result['levels_with_rewards']:
        milestone = "🎖️ MILESTONE" if level_data['is_milestone'] else ""
        print(f"  - Level {level_data['level']}: {level_data['coins']} coins {milestone}")
    
    # Test Case 3: Level up from 8 to 11 (crossing level 10 milestone)
    print("\n\n📊 Test Case 3: Level 8 → Level 11 (crossing milestone 10)")
    print("-" * 60)
    
    old_xp = LevelSystem.calculate_xp_for_level(8)
    new_xp = LevelSystem.calculate_xp_for_level(11)
    
    result = LevelSystem.check_level_up(old_xp, new_xp)
    
    print(f"Old Level: {result['old_level']}")
    print(f"New Level: {result['new_level']}")
    print(f"Levels Gained: {result['levels_gained']}")
    print(f"Total Coins Awarded: {result['coins_awarded']}")
    print(f"Final Title: {result['badge']} {result['title']}")
    print(f"\nDetails per level:")
    for level_data in result['levels_with_rewards']:
        milestone = "🎖️ MILESTONE" if level_data['is_milestone'] else ""
        print(f"  - Level {level_data['level']}: {level_data['coins']} coins {milestone}")
    
    # Test Case 4: No level up
    print("\n\n📊 Test Case 4: No Level Up (same level)")
    print("-" * 60)
    
    old_xp = 100
    new_xp = 120
    
    result = LevelSystem.check_level_up(old_xp, new_xp)
    
    print(f"Leveled Up: {result['leveled_up']}")
    print(f"Old Level: {result['old_level']}")
    print(f"New Level: {result['new_level']}")
    
    print("\n" + "=" * 60)
    print("✅ TEST COMPLETED")
    print("=" * 60)

if __name__ == "__main__":
    test_multi_level_rewards()
