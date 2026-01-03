#!/usr/bin/env python3
"""
Quest Consistency Fixer

This script fixes various quest data inconsistencies:
1. Duplicate quests (keeps oldest, removes newer duplicates)
2. Daily quests that were claimed but not properly reset
3. Empty cumulative data ({}) that should be None
4. Progress/completion status mismatches
5. Quests completed on previous days that need reset

Works on all environments (local, Docker, server).

Usage:
    python fix_quest_consistency.py           # Run all fixes
    python fix_quest_consistency.py --dry-run # Preview changes without applying
"""

import sqlite3
import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Command line args
DRY_RUN = '--dry-run' in sys.argv

# Determine database path based on environment
def get_db_path():
    """Get the database path based on the current environment."""
    # Check if running in Docker
    docker_path = Path('/app/data/game_platform.db')
    if docker_path.exists():
        return str(docker_path)
    
    # Check local paths
    script_dir = Path(__file__).parent
    local_path = script_dir.parent / 'data' / 'game_platform.db'
    if local_path.exists():
        return str(local_path)
    
    # Try relative path from scripts folder
    relative_path = Path('../data/game_platform.db')
    if relative_path.exists():
        return str(relative_path)
    
    raise FileNotFoundError("Database not found! Tried: /app/data/game_platform.db, ../data/game_platform.db")


def get_today_date():
    """Get today's date in YYYY-MM-DD format (UTC)."""
    return datetime.utcnow().strftime('%Y-%m-%d')


def fix_duplicate_quests(cursor):
    """Find and remove duplicate quests, keeping the oldest one."""
    print("\n🔧 Fixing duplicate quests...")
    
    # Find duplicate quest titles
    cursor.execute('''
        SELECT title, COUNT(*) as cnt, MIN(quest_id) as keep_id
        FROM quests 
        GROUP BY title 
        HAVING cnt > 1
    ''')
    
    duplicates = cursor.fetchall()
    
    if not duplicates:
        print("  ✅ No duplicate quests found")
        return 0
    
    total_removed = 0
    
    for title, count, keep_id in duplicates:
        print(f"  🔍 Found {count} copies of '{title}' - keeping ID {keep_id}")
        
        # Get IDs to delete
        cursor.execute('''
            SELECT quest_id FROM quests 
            WHERE title = ? AND quest_id != ?
        ''', (title, keep_id))
        
        ids_to_delete = [row[0] for row in cursor.fetchall()]
        
        for del_id in ids_to_delete:
            # First, delete associated user_quests
            cursor.execute('SELECT COUNT(*) FROM user_quests WHERE quest_id = ?', (del_id,))
            user_quest_count = cursor.fetchone()[0]
            
            if not DRY_RUN:
                cursor.execute('DELETE FROM user_quests WHERE quest_id = ?', (del_id,))
                cursor.execute('DELETE FROM quests WHERE quest_id = ?', (del_id,))
            
            print(f"    🗑️ {'[DRY-RUN] Would delete' if DRY_RUN else 'Deleted'} quest ID {del_id} ({user_quest_count} user records)")
            total_removed += 1
    
    print(f"  ✅ {'Would remove' if DRY_RUN else 'Removed'} {total_removed} duplicate quests")
    return total_removed


def fix_empty_cumulative(cursor):
    """Fix quests with empty cumulative dict {} that should be None."""
    print("\n🔧 Fixing empty cumulative data...")
    
    cursor.execute('SELECT id, extra_data FROM user_quests WHERE extra_data LIKE ?', ('%cumulative%',))
    fixed = 0
    
    for row in cursor.fetchall():
        uq_id, extra_str = row
        if not extra_str:
            continue
        
        try:
            extra = json.loads(extra_str)
            if extra.get('cumulative') == {}:
                if not DRY_RUN:
                    extra['cumulative'] = None
                    cursor.execute('UPDATE user_quests SET extra_data = ? WHERE id = ?', 
                                  (json.dumps(extra), uq_id))
                fixed += 1
        except json.JSONDecodeError:
            print(f"  ⚠️ Invalid JSON in user_quest {uq_id}")
    
    print(f"  ✅ {'Would fix' if DRY_RUN else 'Fixed'} {fixed} quests with empty cumulative data")
    return fixed


def fix_claimed_but_not_completed(cursor):
    """Fix quests that are claimed but not completed (inconsistent state).
    
    EXCLUDES cumulative quests like login_streak, reach_level which have special handling.
    """
    print("\n🔧 Fixing claimed but not completed quests...")
    
    # Exclude cumulative quest types that have special reset behavior
    CUMULATIVE_QUEST_TYPES = ['login_streak', 'reach_level', 'leaderboard_top']
    
    cursor.execute('''
        SELECT uq.id, q.title, uq.is_claimed, uq.is_completed, uq.current_progress, q.target_value, q.quest_type
        FROM user_quests uq
        JOIN quests q ON uq.quest_id = q.quest_id
        WHERE uq.is_claimed = 1 AND uq.is_completed = 0
    ''')
    
    fixed = 0
    skipped = 0
    for row in cursor.fetchall():
        uq_id, title, is_claimed, is_completed, progress, target, quest_type = row
        
        # Skip cumulative quest types
        if quest_type in CUMULATIVE_QUEST_TYPES:
            print(f"  ⏭️ Skipping '{title}' (cumulative quest type: {quest_type})")
            skipped += 1
            continue
        
        print(f"  🔄 {'[DRY-RUN] Would reset' if DRY_RUN else 'Resetting'} '{title}' (claimed but not completed)")
        
        if not DRY_RUN:
            # Get extra_data to reset cumulative
            cursor.execute('SELECT extra_data FROM user_quests WHERE id = ?', (uq_id,))
            extra_str = cursor.fetchone()[0]
            extra = json.loads(extra_str) if extra_str else {}
            extra['cumulative'] = None
            
            cursor.execute('''
                UPDATE user_quests 
                SET is_claimed = 0, claimed_at = NULL, 
                    current_progress = 0, is_completed = 0, completed_at = NULL,
                    extra_data = ?
                WHERE id = ?
            ''', (json.dumps(extra), uq_id))
        fixed += 1
    
    if skipped > 0:
        print(f"  ⏭️ Skipped {skipped} cumulative quests")
    print(f"  ✅ {'Would fix' if DRY_RUN else 'Fixed'} {fixed} claimed-but-not-completed quests")
    return fixed


def reset_stale_daily_quests(cursor):
    """Reset daily quests that were completed on previous days."""
    print("\n🔧 Resetting stale daily quests...")
    
    today = get_today_date()
    
    # Get all daily quests with reset_on_complete
    cursor.execute('''
        SELECT q.quest_id, q.title
        FROM quests q
        WHERE q.is_active = 1
        AND q.config LIKE '%"reset_period": "daily"%'
        AND q.config LIKE '%"reset_on_complete": true%'
    ''')
    
    daily_quests = cursor.fetchall()
    print(f"  Found {len(daily_quests)} daily quest definitions")
    
    reset_count = 0
    
    for quest_id, title in daily_quests:
        # Find completed user_quests for this quest
        cursor.execute('''
            SELECT id, user_id, extra_data
            FROM user_quests
            WHERE quest_id = ? AND is_completed = 1
        ''', (quest_id,))
        
        for row in cursor.fetchall():
            uq_id, user_id, extra_str = row
            
            try:
                extra = json.loads(extra_str) if extra_str else {}
                last_completion = extra.get('last_completion_date')
                
                # Reset if completed on a previous day
                if last_completion and last_completion != today:
                    print(f"  🔄 {'[DRY-RUN] Would reset' if DRY_RUN else 'Resetting'} '{title}' for user {user_id[:20]}... (completed: {last_completion})")
                    
                    if not DRY_RUN:
                        extra['cumulative'] = None
                        extra['last_reset_date'] = today
                        
                        cursor.execute('''
                            UPDATE user_quests 
                            SET current_progress = 0, is_completed = 0, is_claimed = 0,
                                completed_at = NULL, claimed_at = NULL,
                                extra_data = ?
                            WHERE id = ?
                        ''', (json.dumps(extra), uq_id))
                    reset_count += 1
                    
            except json.JSONDecodeError:
                print(f"  ⚠️ Invalid JSON in user_quest {uq_id}")
    
    print(f"  ✅ {'Would reset' if DRY_RUN else 'Reset'} {reset_count} stale daily quests")
    return reset_count


def fix_orphaned_user_quests(cursor):
    """Remove user_quests that reference non-existent quests."""
    print("\n🔧 Fixing orphaned user_quests...")
    
    cursor.execute('''
        SELECT uq.id, uq.quest_id
        FROM user_quests uq
        LEFT JOIN quests q ON uq.quest_id = q.quest_id
        WHERE q.quest_id IS NULL
    ''')
    
    orphans = cursor.fetchall()
    
    if not orphans:
        print("  ✅ No orphaned user_quests found")
        return 0
    
    for uq_id, quest_id in orphans:
        print(f"  🗑️ {'[DRY-RUN] Would delete' if DRY_RUN else 'Deleting'} orphan user_quest {uq_id} (quest_id {quest_id} doesn't exist)")
        if not DRY_RUN:
            cursor.execute('DELETE FROM user_quests WHERE id = ?', (uq_id,))
    
    print(f"  ✅ {'Would remove' if DRY_RUN else 'Removed'} {len(orphans)} orphaned user_quests")
    return len(orphans)


def sync_login_streak_quests(cursor):
    """Sync login_streak quest progress with actual user login_streak values."""
    print("\n🔧 Syncing login streak quests...")
    
    # Find login_streak quests
    cursor.execute('''
        SELECT q.quest_id, q.title, q.target_value
        FROM quests q
        WHERE q.quest_type = 'login_streak'
    ''')
    
    login_quests = cursor.fetchall()
    
    if not login_quests:
        print("  ℹ️ No login_streak quests found")
        return 0
    
    fixed = 0
    
    for quest_id, title, target in login_quests:
        # Find user_quests for this quest
        cursor.execute('''
            SELECT uq.id, uq.user_id, uq.current_progress
            FROM user_quests uq
            WHERE uq.quest_id = ?
        ''', (quest_id,))
        
        for uq_id, user_id, current_progress in cursor.fetchall():
            # Get actual login_streak from users table
            cursor.execute('SELECT login_streak FROM users WHERE user_id = ?', (user_id,))
            user_row = cursor.fetchone()
            
            if user_row:
                actual_streak = user_row[0] or 0
                
                # If progress doesn't match, fix it
                if current_progress != actual_streak:
                    print(f"  🔄 {'[DRY-RUN] Would sync' if DRY_RUN else 'Syncing'} '{title}' for user {user_id[:15]}...: {current_progress} -> {actual_streak}")
                    
                    if not DRY_RUN:
                        cursor.execute('''
                            UPDATE user_quests 
                            SET current_progress = ?
                            WHERE id = ?
                        ''', (actual_streak, uq_id))
                    fixed += 1
    
    if fixed == 0:
        print("  ✅ All login streak quests are in sync")
    else:
        print(f"  ✅ {'Would sync' if DRY_RUN else 'Synced'} {fixed} login streak quests")
    
    return fixed
    
    orphans = cursor.fetchall()
    
    if not orphans:
        print("  ✅ No orphaned user_quests found")
        return 0
    
    for uq_id, quest_id in orphans:
        print(f"  🗑️ {'[DRY-RUN] Would delete' if DRY_RUN else 'Deleting'} orphan user_quest {uq_id} (quest_id {quest_id} doesn't exist)")
        if not DRY_RUN:
            cursor.execute('DELETE FROM user_quests WHERE id = ?', (uq_id,))
    
    print(f"  ✅ {'Would remove' if DRY_RUN else 'Removed'} {len(orphans)} orphaned user_quests")
    return len(orphans)


def check_progress_consistency(cursor):
    """Check and report progress inconsistencies (not auto-fixed)."""
    print("\n🔍 Checking progress consistency...")
    
    cursor.execute('''
        SELECT uq.id, q.title, uq.current_progress, q.target_value, 
               uq.is_completed, uq.extra_data
        FROM user_quests uq
        JOIN quests q ON uq.quest_id = q.quest_id
        WHERE q.config LIKE '%"game_id"%'
    ''')
    
    issues = 0
    for row in cursor.fetchall():
        uq_id, title, progress, target, is_completed, extra_str = row
        
        # Check: completed but progress < target
        if is_completed and progress < target:
            print(f"  ⚠️ '{title}': marked complete but progress {progress} < target {target}")
            issues += 1
        
        # Check: not completed but progress >= target
        if not is_completed and progress >= target:
            print(f"  ⚠️ '{title}': progress {progress} >= target {target} but not completed")
            issues += 1
    
    if issues == 0:
        print("  ✅ No progress inconsistencies found")
    else:
        print(f"  ⚠️ Found {issues} progress inconsistencies (manual review needed)")
    
    return issues


def show_quest_status(cursor):
    """Show current status of all game-specific quests."""
    print("\n📊 Current Daily Quest Status:")
    print("-" * 70)
    
    cursor.execute('''
        SELECT q.title, uq.current_progress, q.target_value, 
               uq.is_completed, uq.is_claimed
        FROM user_quests uq
        JOIN quests q ON uq.quest_id = q.quest_id
        WHERE q.config LIKE '%"reset_period": "daily"%'
        ORDER BY q.title
    ''')
    
    for row in cursor.fetchall():
        title, progress, target, is_completed, is_claimed = row
        status = "✅ Claimed" if is_claimed else ("🎁 Ready" if is_completed else "📋 Active")
        print(f"  {title}: {progress}/{target} [{status}]")


def show_summary(cursor):
    """Show summary of quests in database."""
    print("\n📈 Database Summary:")
    print("-" * 70)
    
    cursor.execute('SELECT COUNT(*) FROM quests WHERE is_active = 1')
    active_quests = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM quests WHERE is_active = 0')
    inactive_quests = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM user_quests')
    user_quests = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(DISTINCT user_id) FROM user_quests')
    users_with_quests = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM quests WHERE config LIKE '%\"reset_period\": \"daily\"%'")
    daily_quests = cursor.fetchone()[0]
    
    print(f"  Active quests: {active_quests}")
    print(f"  Inactive quests: {inactive_quests}")
    print(f"  Daily quests: {daily_quests}")
    print(f"  User quest records: {user_quests}")
    print(f"  Users with quests: {users_with_quests}")


def main():
    print("=" * 60)
    print("  Quest Consistency Fixer")
    if DRY_RUN:
        print("  🔍 DRY-RUN MODE - No changes will be made")
    print("=" * 60)
    
    # Get database path
    try:
        db_path = get_db_path()
        print(f"\n📂 Database: {db_path}")
    except FileNotFoundError as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Run all fixes
        total_fixed = 0
        total_fixed += fix_duplicate_quests(cursor)
        total_fixed += fix_orphaned_user_quests(cursor)
        total_fixed += fix_empty_cumulative(cursor)
        total_fixed += fix_claimed_but_not_completed(cursor)
        total_fixed += reset_stale_daily_quests(cursor)
        total_fixed += sync_login_streak_quests(cursor)
        check_progress_consistency(cursor)
        
        # Commit changes (if not dry-run)
        if not DRY_RUN:
            conn.commit()
        
        # Show current status
        show_quest_status(cursor)
        show_summary(cursor)
        
        print("\n" + "=" * 60)
        if DRY_RUN:
            print(f"  🔍 DRY-RUN: Would fix {total_fixed} issues")
            print("  Run without --dry-run to apply changes")
        else:
            print(f"  ✅ Done! Fixed {total_fixed} issues")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == '__main__':
    main()
