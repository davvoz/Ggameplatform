#!/usr/bin/env python3
"""
=============================================================================
PRODUCTION FIX SCRIPT - Quest System Data Repair
=============================================================================
This script fixes all quest-related data issues:
1. Fixes cumulative: None for all game-specific quests
2. Updates High Scorer quest configuration
3. Fixes High Scorer user progress data

Run this after deploying the updated quest_tracker.py code.

Usage:
    python fix_production_quests.py [--dry-run]
    
Options:
    --dry-run   Preview changes without modifying the database
=============================================================================
"""
import sqlite3
import json
import sys
import os
from datetime import datetime

# Database path - adjust for your environment
DB_PATH = os.environ.get('DB_PATH', '/app/data/game_platform.db')

# Cumulative structures for each game
CUMULATIVE_STRUCTURES = {
    'seven': {
        'rolls_played': 0,
        'wins': 0,
        'losses': 0,
        'win_streak': 0,
        'max_win_streak': 0,
        'total_profit': 0,
        'roll_seven_count': 0,
        'wins_under': 0,
        'wins_over': 0,
        'max_bet_won': 0,
        'high_bet_wins': 0
    },
    'yatzi_3d_by_luciogiolli': {
        'games_played': 0,
        'games_won': 0,
        'total_score': 0,
        'high_score': 0,
        'yatzi_count': 0,
        'full_house_count': 0,
        'large_straight_count': 0,
        'small_straight_count': 0,
        'upper_bonus_count': 0
    },
    'merge-tower-defense': {
        'total_kills': 0,
        'total_merges': 0,
        'max_wave': 0,
        'games_played': 0
    },
    'rainbow-rush': {
        'levels_completed': 0,
        'coins_collected': 0,
        'high_score': 0,
        'games_played': 0
    }
}

# High Scorer quest correct configuration
HIGH_SCORER_CONFIG = {
    'game_id': 'rainbow-rush',
    'type': 'high_score',
    'category': 'skill',
    'reset_period': 'daily',
    'reset_on_complete': True,
    'score_threshold': 5000
}


def print_header(title):
    print("\n" + "=" * 60)
    print(f" {title}")
    print("=" * 60)


def fix_cumulative_data(cursor, dry_run=False):
    """Fix all game-specific quests with cumulative: None or {}"""
    print_header("STEP 1: Fix Cumulative Data")
    
    total_fixed = 0
    
    for game_id, cumulative_structure in CUMULATIVE_STRUCTURES.items():
        print(f"\n  [{game_id}]")
        
        # Get quest IDs for this game
        cursor.execute("""
            SELECT quest_id, title FROM quests 
            WHERE config LIKE ?
        """, (f'%"{game_id}"%',))
        quests = cursor.fetchall()
        
        if not quests:
            print(f"    No quests found")
            continue
            
        print(f"    Found {len(quests)} quests")
        
        fixed = 0
        for quest_id, quest_title in quests:
            cursor.execute("""
                SELECT id, user_id, extra_data FROM user_quests 
                WHERE quest_id = ?
            """, (quest_id,))
            
            for row in cursor.fetchall():
                uq_id, user_id, extra_str = row
                extra = json.loads(extra_str) if extra_str else {}
                
                current_cumulative = extra.get('cumulative')
                if current_cumulative is None or current_cumulative == {}:
                    extra['cumulative'] = cumulative_structure.copy()
                    
                    if not dry_run:
                        cursor.execute(
                            "UPDATE user_quests SET extra_data = ? WHERE id = ?",
                            (json.dumps(extra), uq_id)
                        )
                    
                    fixed += 1
                    print(f"    {'[DRY-RUN] ' if dry_run else ''}Fixed: {quest_title} (user: {user_id[:20]}...)")
        
        total_fixed += fixed
        print(f"    Subtotal: {fixed} fixed")
    
    print(f"\n  ✅ Total cumulative fixes: {total_fixed}")
    return total_fixed


def fix_high_scorer_quest(cursor, dry_run=False):
    """Update High Scorer quest configuration"""
    print_header("STEP 2: Fix High Scorer Quest Config")
    
    # Get current config
    cursor.execute("""
        SELECT quest_id, title, target_value, config 
        FROM quests 
        WHERE title LIKE '%High Scorer%'
    """)
    row = cursor.fetchone()
    
    if not row:
        print("  ⚠️ High Scorer quest not found!")
        return False
    
    quest_id, title, old_target, config_str = row
    old_config = json.loads(config_str) if config_str else {}
    
    print(f"  Quest: {title} (ID: {quest_id})")
    print(f"  Current target_value: {old_target}")
    print(f"  Current config: {json.dumps(old_config, indent=4)}")
    
    # Check if already fixed
    if old_target == 1 and old_config.get('score_threshold') == 5000:
        print("\n  ✅ Already correctly configured!")
        return True
    
    # Update
    if not dry_run:
        cursor.execute("""
            UPDATE quests 
            SET target_value = 1, config = ?
            WHERE quest_id = ?
        """, (json.dumps(HIGH_SCORER_CONFIG), quest_id))
    
    print(f"\n  {'[DRY-RUN] ' if dry_run else ''}Updated to:")
    print(f"    target_value: 1")
    print(f"    config: {json.dumps(HIGH_SCORER_CONFIG, indent=4)}")
    print("\n  ✅ High Scorer quest config updated")
    return True


def fix_high_scorer_user_data(cursor, dry_run=False):
    """Fix user progress for High Scorer quest"""
    print_header("STEP 3: Fix High Scorer User Data")
    
    # Find High Scorer quest
    cursor.execute("SELECT quest_id FROM quests WHERE title LIKE '%High Scorer%'")
    row = cursor.fetchone()
    
    if not row:
        print("  ⚠️ High Scorer quest not found!")
        return 0
    
    quest_id = row[0]
    score_threshold = HIGH_SCORER_CONFIG['score_threshold']
    
    print(f"  Quest ID: {quest_id}")
    print(f"  Score threshold: {score_threshold}")
    
    # Fix user_quests
    cursor.execute("""
        SELECT id, user_id, extra_data, current_progress, is_completed 
        FROM user_quests 
        WHERE quest_id = ?
    """, (quest_id,))
    
    fixed = 0
    for row in cursor.fetchall():
        uq_id, user_id, extra_str, progress, completed = row
        extra = json.loads(extra_str) if extra_str else {}
        high_score = extra.get('cumulative', {}).get('high_score', 0)
        
        should_complete = high_score >= score_threshold
        needs_fix = False
        
        if should_complete and (progress != 1 or completed != 1):
            needs_fix = True
            new_progress = 1
            new_completed = 1
        elif not should_complete and progress != 0:
            needs_fix = True
            new_progress = 0
            new_completed = 0
        
        if needs_fix:
            if not dry_run:
                cursor.execute("""
                    UPDATE user_quests 
                    SET current_progress = ?, is_completed = ?
                    WHERE id = ?
                """, (new_progress, new_completed, uq_id))
            
            status = "✅ completed" if should_complete else "⏳ in progress"
            print(f"  {'[DRY-RUN] ' if dry_run else ''}Fixed user {user_id[:20]}...: high_score={high_score} -> {status}")
            fixed += 1
        else:
            status = "✅" if completed else "⏳"
            print(f"  {status} User {user_id[:20]}...: high_score={high_score} (OK)")
    
    print(f"\n  ✅ Fixed {fixed} user_quests")
    return fixed


def verify_fixes(cursor):
    """Verify all fixes were applied correctly"""
    print_header("VERIFICATION")
    
    issues = []
    
    # Check cumulative data
    for game_id in CUMULATIVE_STRUCTURES.keys():
        cursor.execute("""
            SELECT q.title, uq.extra_data
            FROM user_quests uq
            JOIN quests q ON uq.quest_id = q.quest_id
            WHERE q.config LIKE ?
        """, (f'%"{game_id}"%',))
        
        for row in cursor.fetchall():
            title, extra_str = row
            extra = json.loads(extra_str) if extra_str else {}
            cumulative = extra.get('cumulative')
            
            if cumulative is None or cumulative == {}:
                issues.append(f"  ❌ {game_id}: {title} - cumulative still None/empty")
    
    # Check High Scorer quest
    cursor.execute("""
        SELECT target_value, config 
        FROM quests 
        WHERE title LIKE '%High Scorer%'
    """)
    row = cursor.fetchone()
    if row:
        target, config_str = row
        config = json.loads(config_str) if config_str else {}
        if target != 1:
            issues.append(f"  ❌ High Scorer: target_value is {target}, should be 1")
        if config.get('score_threshold') != 5000:
            issues.append(f"  ❌ High Scorer: score_threshold is {config.get('score_threshold')}, should be 5000")
    
    if issues:
        print("Issues found:")
        for issue in issues:
            print(issue)
        return False
    else:
        print("  ✅ All checks passed!")
        return True


def main():
    dry_run = '--dry-run' in sys.argv
    
    print("\n" + "=" * 60)
    print(" PRODUCTION QUEST FIX SCRIPT")
    print(" " + datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print("=" * 60)
    
    if dry_run:
        print("\n⚠️  DRY-RUN MODE - No changes will be made\n")
    
    print(f"Database: {DB_PATH}")
    
    if not os.path.exists(DB_PATH):
        print(f"\n❌ ERROR: Database not found at {DB_PATH}")
        print("Set DB_PATH environment variable or run from correct directory")
        sys.exit(1)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Step 1: Fix cumulative data
        cumulative_fixed = fix_cumulative_data(cursor, dry_run)
        
        # Step 2: Fix High Scorer quest config
        fix_high_scorer_quest(cursor, dry_run)
        
        # Step 3: Fix High Scorer user data
        user_data_fixed = fix_high_scorer_user_data(cursor, dry_run)
        
        # Commit changes
        if not dry_run:
            conn.commit()
            print("\n💾 Changes committed to database")
        
        # Verify
        verify_fixes(cursor)
        
        # Summary
        print_header("SUMMARY")
        print(f"  Cumulative data fixed: {cumulative_fixed}")
        print(f"  High Scorer user data fixed: {user_data_fixed}")
        
        if dry_run:
            print("\n⚠️  This was a DRY-RUN. Run without --dry-run to apply changes.")
        else:
            print("\n✅ All fixes applied successfully!")
            print("   Restart the backend to apply code changes.")
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == '__main__':
    main()
