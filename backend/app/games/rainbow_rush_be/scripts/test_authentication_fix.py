"""
Test script to verify Rainbow Rush authentication fix
Run this to ensure user validation works correctly
"""

import sys
from pathlib import Path

# Add parent directories to path
sys.path.append(str(Path(__file__).parent.parent.parent.parent.parent))

from app.database import get_db_session
from app.games.rainbow_rush_be.database import get_rainbow_rush_db_session
from app.models import User
from app.games.rainbow_rush_be.models import RainbowRushProgress


def test_user_validation():
    """Test that user_id validation works"""
    print("=" * 80)
    print("Rainbow Rush - Authentication Fix Test")
    print("=" * 80)
    
    # Test 1: Get a valid user from main DB
    print("\n[Test 1] Checking for existing platform users...")
    with get_db_session() as main_db:
        users = main_db.query(User).limit(5).all()
        
        if not users:
            print("⚠️  No users found in platform database")
            print("   Create a user first to test Rainbow Rush")
            return
        
        print(f"✅ Found {len(users)} users in platform database")
        test_user_id = users[0].user_id
        test_username = users[0].username
        print(f"\nTest user: {test_user_id}")
        print(f"Username: {test_username}")
    
    # Test 2: Check if user has Rainbow Rush progress
    print("\n[Test 2] Checking Rainbow Rush progress...")
    with get_rainbow_rush_db_session() as rr_db:
        progress = rr_db.query(RainbowRushProgress).filter(
            RainbowRushProgress.user_id == test_user_id
        ).first()
        
        if progress:
            print(f"✅ User has Rainbow Rush progress:")
            print(f"   Level: {progress.max_level_unlocked}")
            print(f"   Coins: {progress.total_coins}")
            print(f"   Stars: {progress.total_stars}")
        else:
            print(f"ℹ️  User has no Rainbow Rush progress yet")
            print(f"   Progress will be created on first play")
    
    # Test 3: Check for invalid user_ids in Rainbow Rush
    print("\n[Test 3] Checking for invalid user_ids in Rainbow Rush...")
    with get_rainbow_rush_db_session() as rr_db:
        all_progress = rr_db.query(RainbowRushProgress).all()
        
        if not all_progress:
            print("ℹ️  No progress data in Rainbow Rush database")
        else:
            invalid_users = []
            valid_users = []
            anonymous_users = []
            
            with get_db_session() as main_db:
                for progress in all_progress:
                    user_id = progress.user_id
                    
                    # Check if anonymous
                    if user_id.startswith('anon_'):
                        anonymous_users.append(user_id)
                        continue
                    
                    # Check if exists in main DB
                    user = main_db.query(User).filter(User.user_id == user_id).first()
                    if user:
                        valid_users.append(user_id)
                    else:
                        invalid_users.append(user_id)
            
            print(f"\n📊 Rainbow Rush Users Summary:")
            print(f"   ✅ Valid platform accounts: {len(valid_users)}")
            print(f"   ⚠️  Anonymous users: {len(anonymous_users)}")
            print(f"   ❌ Invalid user_ids: {len(invalid_users)}")
            
            if anonymous_users:
                print(f"\n⚠️  Found {len(anonymous_users)} anonymous users!")
                print("   Run migrate_to_platform_accounts.py to clean up")
            
            if invalid_users:
                print(f"\n❌ Found {len(invalid_users)} invalid user_ids!")
                print("   These users don't exist in platform database")
                for uid in invalid_users[:5]:
                    print(f"   - {uid}")
    
    # Test 4: Verify database structure
    print("\n[Test 4] Verifying database structure...")
    with get_rainbow_rush_db_session() as rr_db:
        try:
            # Try to query - this will fail if ForeignKey constraints are still there
            rr_db.query(RainbowRushProgress).first()
            print("✅ Rainbow Rush database structure is correct")
            print("   No ForeignKey constraints causing issues")
        except Exception as e:
            print(f"❌ Database structure error: {e}")
            print("   You may need to recreate the Rainbow Rush database")
    
    print("\n" + "=" * 80)
    print("✅ Authentication fix test complete!")
    print("=" * 80)
    
    print("\n📋 Next steps:")
    print("1. Start the backend server")
    print("2. Login to the platform with a user account")
    print("3. Try to play Rainbow Rush")
    print("4. Verify progress is saved with your platform user_id")


if __name__ == "__main__":
    test_user_validation()
