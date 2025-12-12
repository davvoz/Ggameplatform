"""
Diagnostic script for luciojolly user
Check why mobile shows different progress than desktop
"""

import sys
from pathlib import Path
import json

# Add parent directories to path
sys.path.append(str(Path(__file__).parent.parent.parent.parent.parent))

from app.database import get_db_session
from app.games.rainbow_rush_be.database import get_rainbow_rush_db_session
from app.models import User
from app.games.rainbow_rush_be.models import RainbowRushProgress, RainbowRushLevelCompletion, RainbowRushGameSession


def diagnose_luciojolly():
    """Complete diagnostic for luciojolly user"""
    print("\n" + "=" * 80)
    print("🔍 RAINBOW RUSH - DIAGNOSTIC FOR LUCIOJOLLY")
    print("=" * 80)
    
    # Step 1: Find all users with "luciojolly" in username or user_id
    print("\n[Step 1] Searching for 'luciojolly' in main platform database...")
    print("-" * 80)
    
    with get_db_session() as main_db:
        # Search by username
        users_by_name = main_db.query(User).filter(
            User.username.like('%luciojolly%')
        ).all()
        
        # Search by steem username
        users_by_steem = main_db.query(User).filter(
            User.steem_username.like('%luciojolly%')
        ).all()
        
        # Search by email
        users_by_email = main_db.query(User).filter(
            User.email.like('%luciojolly%')
        ).all()
        
        all_users = list(set(users_by_name + users_by_steem + users_by_email))
        
        if not all_users:
            print("❌ No users found with 'luciojolly' in the platform database!")
            print("   User might not be registered or using different username")
            return
        
        print(f"✅ Found {len(all_users)} user(s) matching 'luciojolly':\n")
        
        # Extract user data before session closes
        user_data_list = []
        for user in all_users:
            user_data_list.append({
                'user_id': user.user_id,
                'username': user.username,
                'email': user.email,
                'steem_username': user.steem_username,
                'is_anonymous': user.is_anonymous,
                'last_login': user.last_login,
                'created_at': user.created_at
            })
            
        for user_data in user_data_list:
            print(f"  👤 User ID: {user_data['user_id']}")
            print(f"     Username: {user_data['username']}")
            print(f"     Email: {user_data['email'] or 'N/A'}")
            print(f"     Steem: {user_data['steem_username'] or 'N/A'}")
            print(f"     Anonymous: {'Yes' if user_data['is_anonymous'] else 'No'}")
            print(f"     Last Login: {user_data['last_login'] or 'Never'}")
            print(f"     Created: {user_data['created_at']}")
            print()
    
    # Step 2: Check Rainbow Rush progress for each user
    print("\n[Step 2] Checking Rainbow Rush progress...")
    print("-" * 80)
    
    with get_rainbow_rush_db_session() as rr_db:
        for user_data in user_data_list:
            print(f"\n  📊 Progress for {user_data['username']} ({user_data['user_id']}):")
            
            progress = rr_db.query(RainbowRushProgress).filter(
                RainbowRushProgress.user_id == user_data['user_id']
            ).first()
            
            if progress:
                print(f"     ✅ HAS PROGRESS:")
                print(f"        Current Level: {progress.current_level}")
                print(f"        Max Level Unlocked: {progress.max_level_unlocked}")
                print(f"        Total Coins: {progress.total_coins}")
                print(f"        Total Stars: {progress.total_stars}")
                print(f"        High Score: {progress.high_score}")
                print(f"        Last Played: {progress.last_played}")
                print(f"        Created: {progress.created_at}")
                
                # Parse level completions
                level_completions = json.loads(progress.level_completions) if progress.level_completions else {}
                if level_completions:
                    print(f"\n        🎮 Level Completions ({len(level_completions)} levels):")
                    for level_id in sorted(level_completions.keys(), key=int):
                        data = level_completions[level_id]
                        stars = data.get('stars', 0)
                        completed = data.get('completed', False)
                        best_time = data.get('best_time', 0)
                        coins = data.get('coins', 0)
                        print(f"           Level {level_id}: {'✅' if completed else '❌'} {stars}⭐ Time:{best_time:.1f}s Coins:{coins}")
                
                # Parse unlocked items
                unlocked_items = json.loads(progress.unlocked_items) if progress.unlocked_items else {}
                if unlocked_items:
                    print(f"\n        🔓 Unlocked Items:")
                    for category, items in unlocked_items.items():
                        print(f"           {category}: {', '.join(items)}")
                
                # Parse statistics
                statistics = json.loads(progress.statistics) if progress.statistics else {}
                if statistics:
                    print(f"\n        📈 Statistics:")
                    for stat_name, value in statistics.items():
                        print(f"           {stat_name}: {value}")
            else:
                print(f"     ❌ NO PROGRESS FOUND")
                print(f"        This user has never played Rainbow Rush")
    
    # Step 3: Check for duplicate or similar user_ids in Rainbow Rush
    print("\n\n[Step 3] Checking for ALL Rainbow Rush users...")
    print("-" * 80)
    
    with get_rainbow_rush_db_session() as rr_db:
        all_progress = rr_db.query(RainbowRushProgress).all()
        
        print(f"\n  📊 Total users in Rainbow Rush: {len(all_progress)}\n")
        
        # Show all users with their progress
        for prog in all_progress:
            user_type = "🟢 VALID"
            
            # Check if user exists in main DB
            with get_db_session() as main_db:
                user = main_db.query(User).filter(User.user_id == prog.user_id).first()
                if not user:
                    user_type = "🔴 INVALID (not in platform DB)"
                elif prog.user_id.startswith('anon_'):
                    user_type = "🟡 ANONYMOUS"
            
            print(f"  {user_type}")
            print(f"     User ID: {prog.user_id}")
            print(f"     Max Level: {prog.max_level_unlocked} | Stars: {prog.total_stars} | Coins: {prog.total_coins}")
            print(f"     Last Played: {prog.last_played}")
            print()
    
    # Step 4: Check level completions history
    print("\n[Step 4] Checking level completion history for luciojolly users...")
    print("-" * 80)
    
    with get_rainbow_rush_db_session() as rr_db:
        for user_data in user_data_list:
            completions = rr_db.query(RainbowRushLevelCompletion).filter(
                RainbowRushLevelCompletion.user_id == user_data['user_id']
            ).order_by(RainbowRushLevelCompletion.completed_at.desc()).all()
            
            print(f"\n  📜 Completion History for {user_data['username']} ({user_data['user_id']}):")
            
            if completions:
                print(f"     Total Completions: {len(completions)}\n")
                
                # Show last 10 completions
                for comp in completions[:10]:
                    level_stats = json.loads(comp.level_stats) if comp.level_stats else {}
                    print(f"     🎮 Level {comp.level_id} ({comp.level_name})")
                    print(f"        Stars: {comp.stars_earned} | Score: {comp.score} | Time: {comp.completion_time:.1f}s")
                    print(f"        Validated: {'✅' if comp.is_validated else '❌'} (score: {comp.validation_score:.2f})")
                    print(f"        Completed: {comp.completed_at}")
                    print()
            else:
                print(f"     ❌ No completion records found")
    
    # Step 5: Check active sessions
    print("\n[Step 5] Checking active/recent game sessions...")
    print("-" * 80)
    
    with get_rainbow_rush_db_session() as rr_db:
        for user_data in user_data_list:
            sessions = rr_db.query(RainbowRushGameSession).filter(
                RainbowRushGameSession.user_id == user_data['user_id']
            ).order_by(RainbowRushGameSession.started_at.desc()).limit(5).all()
            
            print(f"\n  🎮 Sessions for {user_data['username']} ({user_data['user_id']}):")
            
            if sessions:
                print(f"     Total Recent Sessions: {len(sessions)}\n")
                
                for sess in sessions:
                    status = "🟢 ACTIVE" if sess.is_active else "⚪ ENDED"
                    print(f"     {status} Session {sess.session_id}")
                    print(f"        Level: {sess.level_id}")
                    print(f"        Started: {sess.started_at}")
                    print(f"        Last Update: {sess.last_update}")
                    if sess.ended_at:
                        print(f"        Ended: {sess.ended_at}")
                    print(f"        Heartbeats: {sess.heartbeat_count}")
                    print(f"        Anomaly Flags: {sess.anomaly_flags}")
                    print()
            else:
                print(f"     ❌ No session records found")
    
    # Step 6: Diagnosis Summary
    print("\n" + "=" * 80)
    print("📋 DIAGNOSIS SUMMARY")
    print("=" * 80)
    
    if len(user_data_list) > 1:
        print("\n⚠️  PROBLEM DETECTED: MULTIPLE ACCOUNTS")
        print(f"   Found {len(user_data_list)} accounts matching 'luciojolly'")
        print("   This could explain why mobile shows different progress!")
        print("\n   Possible causes:")
        print("   1. Different login method (email vs steem vs anonymous)")
        print("   2. Multiple registrations")
        print("   3. Case sensitivity issues")
    elif len(user_data_list) == 1:
        user_data = user_data_list[0]
        with get_rainbow_rush_db_session() as rr_db:
            progress = rr_db.query(RainbowRushProgress).filter(
                RainbowRushProgress.user_id == user_data['user_id']
            ).first()
            
            if progress:
                print("\n✅ Account found with progress")
                print(f"   User ID: {user_data['user_id']}")
                print(f"   Max Level Unlocked: {progress.max_level_unlocked}")
                print("\n   If mobile shows different progress, check:")
                print("   1. Are you logged in with the same account on mobile?")
                print("   2. Check browser console for AuthManager.getUser().user_id")
                print("   3. Verify the SDK is using the correct user_id")
            else:
                print("\n⚠️  Account found but NO progress")
                print("   The user has never played or progress was deleted")
    
    print("\n" + "=" * 80)
    print("💡 RECOMMENDED ACTIONS")
    print("=" * 80)
    print("""
1. On MOBILE, open browser console and run:
   > window.AuthManager.getUser()
   > localStorage.getItem('rr_user_id')

2. On DESKTOP, do the same and compare the user_id

3. If user_ids are different:
   - You're logged in with different accounts
   - Login with the correct account on mobile

4. If user_ids are the same but progress is different:
   - Clear browser cache on mobile
   - Force reload the page (Ctrl+Shift+R or clear cache)

5. To merge progress if you have multiple accounts:
   - Contact admin to merge the accounts
   - Or manually copy progress data between accounts
    """)
    
    print("=" * 80 + "\n")


if __name__ == "__main__":
    diagnose_luciojolly()
