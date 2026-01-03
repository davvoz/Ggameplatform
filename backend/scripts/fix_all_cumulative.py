"""
Script completo per bonificare TUTTI i dati cumulative delle quest game-specific.
Inizializza cumulative a un dizionario valido invece di None per ogni tipo di gioco.
"""
import sqlite3
import json

DB_PATH = '../data/game_platform.db'

# Strutture cumulative per ogni gioco
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

def fix_all_game_quests():
    """Fix all game-specific quests with cumulative: None"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    total_fixed = 0
    
    for game_id, cumulative_structure in CUMULATIVE_STRUCTURES.items():
        print(f"\n=== Fixing {game_id} quests ===")
        
        # Get quest IDs for this game
        cursor.execute("""
            SELECT quest_id, title FROM quests 
            WHERE config LIKE ?
        """, (f'%"{game_id}"%',))
        quests = cursor.fetchall()
        
        if not quests:
            print(f"  No quests found for {game_id}")
            continue
            
        print(f"  Found {len(quests)} quests: {[q[1] for q in quests]}")
        
        fixed = 0
        for quest_id, quest_title in quests:
            cursor.execute("""
                SELECT id, user_id, extra_data FROM user_quests 
                WHERE quest_id = ?
            """, (quest_id,))
            
            for row in cursor.fetchall():
                uq_id, user_id, extra_str = row
                extra = json.loads(extra_str) if extra_str else {}
                
                # Check if cumulative is None, empty, or missing
                current_cumulative = extra.get('cumulative')
                if current_cumulative is None or current_cumulative == {}:
                    # Initialize with proper structure
                    extra['cumulative'] = cumulative_structure.copy()
                    cursor.execute(
                        "UPDATE user_quests SET extra_data = ? WHERE id = ?",
                        (json.dumps(extra), uq_id)
                    )
                    fixed += 1
                    print(f"    Fixed user {user_id}: {quest_title}")
        
        total_fixed += fixed
        print(f"  Fixed {fixed} user_quests for {game_id}")
    
    conn.commit()
    conn.close()
    
    return total_fixed

def verify_fix():
    """Verify that all game-specific quests now have valid cumulative"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("\n=== VERIFICATION ===")
    issues = []
    
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
                issues.append(f"{game_id}: {title}")
            elif not isinstance(cumulative, dict):
                issues.append(f"{game_id}: {title} - cumulative is not a dict!")
    
    if issues:
        print("❌ ISSUES REMAINING:")
        for i in issues:
            print(f"  - {i}")
    else:
        print("✅ All game-specific quests have valid cumulative data!")
    
    conn.close()
    return len(issues)

if __name__ == '__main__':
    print("=" * 60)
    print("COMPLETE CUMULATIVE DATA FIX")
    print("=" * 60)
    
    fixed = fix_all_game_quests()
    print(f"\n{'=' * 60}")
    print(f"TOTAL FIXED: {fixed} user_quests")
    print("=" * 60)
    
    remaining = verify_fix()
    
    if remaining == 0:
        print("\n✅ All done! Game quests should work correctly now.")
    else:
        print(f"\n⚠️ Still {remaining} issues remaining!")
