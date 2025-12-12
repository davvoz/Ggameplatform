"""
Script to migrate Rainbow Rush progress from anonymous users to platform accounts
This script should be run ONCE after the authentication fix is deployed
"""

import sys
from pathlib import Path

# Add parent directories to path
sys.path.append(str(Path(__file__).parent.parent.parent.parent.parent))

from app.database import get_db_session
from app.games.rainbow_rush_be.database import get_rainbow_rush_db_session
from app.models import User
from app.games.rainbow_rush_be.models import RainbowRushProgress, RainbowRushLevelCompletion, RainbowRushGameSession


def find_anonymous_users():
    """Find all anonymous user IDs in Rainbow Rush database"""
    with get_rainbow_rush_db_session() as rr_db:
        # Get all unique user_ids from rainbow rush
        progress_users = rr_db.query(RainbowRushProgress.user_id).distinct().all()
        user_ids = [u[0] for u in progress_users]
        
        # Filter anonymous users (start with 'anon_')
        anonymous_ids = [uid for uid in user_ids if uid.startswith('anon_')]
        
        print(f"Found {len(user_ids)} total users in Rainbow Rush")
        print(f"Found {len(anonymous_ids)} anonymous users")
        
        return user_ids, anonymous_ids


def verify_users_in_platform(user_ids):
    """Check which user_ids exist in the main platform database"""
    with get_db_session() as main_db:
        existing_users = []
        missing_users = []
        
        for user_id in user_ids:
            user = main_db.query(User).filter(User.user_id == user_id).first()
            if user:
                existing_users.append(user_id)
            else:
                missing_users.append(user_id)
        
        print(f"\n✅ {len(existing_users)} users exist in platform database")
        print(f"❌ {len(missing_users)} users NOT found in platform database")
        
        if missing_users:
            print("\nMissing users:")
            for uid in missing_users[:10]:  # Show first 10
                print(f"  - {uid}")
            if len(missing_users) > 10:
                print(f"  ... and {len(missing_users) - 10} more")
        
        return existing_users, missing_users


def get_user_progress_stats(user_id):
    """Get progress statistics for a user"""
    with get_rainbow_rush_db_session() as rr_db:
        progress = rr_db.query(RainbowRushProgress).filter(
            RainbowRushProgress.user_id == user_id
        ).first()
        
        if progress:
            return {
                'level': progress.max_level_unlocked,
                'coins': progress.total_coins,
                'stars': progress.total_stars,
                'high_score': progress.high_score
            }
        return None


def delete_anonymous_progress(user_id):
    """Delete all progress for an anonymous user"""
    with get_rainbow_rush_db_session() as rr_db:
        # Delete progress
        rr_db.query(RainbowRushProgress).filter(
            RainbowRushProgress.user_id == user_id
        ).delete()
        
        # Delete completions
        rr_db.query(RainbowRushLevelCompletion).filter(
            RainbowRushLevelCompletion.user_id == user_id
        ).delete()
        
        # Delete sessions
        rr_db.query(RainbowRushGameSession).filter(
            RainbowRushGameSession.user_id == user_id
        ).delete()
        
        rr_db.commit()
        print(f"Deleted all data for anonymous user: {user_id}")


def main():
    """Main migration script"""
    print("=" * 80)
    print("Rainbow Rush - Platform Account Migration")
    print("=" * 80)
    
    # Step 1: Find all users in Rainbow Rush
    print("\n[Step 1] Scanning Rainbow Rush database...")
    all_users, anonymous_users = find_anonymous_users()
    
    # Step 2: Verify which users exist in platform
    print("\n[Step 2] Verifying users in platform database...")
    existing_users, missing_users = verify_users_in_platform(all_users)
    
    # Step 3: Show statistics
    print("\n" + "=" * 80)
    print("MIGRATION SUMMARY")
    print("=" * 80)
    
    print(f"\nTotal Rainbow Rush users: {len(all_users)}")
    print(f"  ✅ Valid platform accounts: {len(existing_users)}")
    print(f"  ⚠️  Anonymous users: {len(anonymous_users)}")
    print(f"  ❌ Invalid/missing accounts: {len(missing_users)}")
    
    # Show anonymous user stats
    if anonymous_users:
        print(f"\n{'Anonymous User':<30} {'Level':<8} {'Coins':<10} {'Stars':<8} {'High Score':<12}")
        print("-" * 80)
        for anon_id in anonymous_users[:20]:  # Show first 20
            stats = get_user_progress_stats(anon_id)
            if stats:
                print(f"{anon_id:<30} {stats['level']:<8} {stats['coins']:<10} {stats['stars']:<8} {stats['high_score']:<12}")
    
    # Step 4: Ask for confirmation to delete anonymous data
    users_to_delete = list(anonymous_users) + [uid for uid in missing_users if uid not in anonymous_users]
    
    if users_to_delete:
        print("\n" + "=" * 80)
        print("⚠️  WARNING: Invalid users cannot play Rainbow Rush anymore")
        print("=" * 80)
        print("\nRainbow Rush now requires a platform account.")
        print(f"Found {len(anonymous_users)} anonymous users and {len([u for u in missing_users if u not in anonymous_users])} invalid user_ids.")
        print("Their old progress cannot be migrated (users don't exist in platform).")
        
        response = input("\nDo you want to DELETE all invalid user data? (yes/no): ")
        
        if response.lower() == 'yes':
            print("\nDeleting invalid user data...")
            for user_id in users_to_delete:
                delete_anonymous_progress(user_id)
            print(f"\n✅ Deleted data for {len(users_to_delete)} invalid users")
        else:
            print("\nSkipping deletion. Invalid data will remain in database.")
            print("Note: These users won't be able to access their data without login.")
    
    print("\n" + "=" * 80)
    print("✅ Migration complete!")
    print("=" * 80)
    print("\nNext steps:")
    print("1. Users must login with their platform account to play Rainbow Rush")
    print("2. New users must create a platform account first")
    print("3. All progress is now tied to platform user_id")


if __name__ == "__main__":
    main()
