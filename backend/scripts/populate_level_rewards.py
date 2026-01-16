"""
Populate level_rewards table with progressive coin rewards
From level 2 to 500 with special bonuses for multiples of 5
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import get_db_session
from sqlalchemy import text
from datetime import datetime
import uuid


def calculate_coins(level):
    """Calculate coins for a level based on progressive formula"""
    
    # More balanced progression - slower growth
    if level <= 20:
        base = 5 + level  # 6-25 coins
    elif level <= 50:
        base = 10 + level  # 31-60 coins
    elif level <= 100:
        base = 15 + (level // 2)  # 40-65 coins
    else:  # 101-200
        base = 20 + (level // 3)  # 53-86 coins
    
    # Small bonus for multiples of 5: +5 coins
    if level % 5 == 0:
        base += 10
    
    return base


def clear_existing_rewards():
    """Clear all existing level rewards"""
    with get_db_session() as session:
        try:
            count = session.execute(text("SELECT COUNT(*) FROM level_rewards")).scalar()
            if count > 0:
                print(f"⚠️  Found {count} existing rewards. Deleting...")
                session.execute(text("DELETE FROM level_rewards"))
                session.commit()
                print("✅ Cleared all existing rewards")
            else:
                print("ℹ️  No existing rewards found")
        except Exception as e:
            print(f"❌ Error clearing rewards: {e}")
            session.rollback()
            raise


def populate_level_rewards():
    """Populate level rewards from level 2 to 200"""
    
    print("=" * 80)
    print("POPULATING LEVEL REWARDS")
    print("=" * 80)
    
    clear_existing_rewards()
    
    print("\n📊 Reward Structure:")
    print("  Levels 2-20:   5 + level coins (6-30)")
    print("  Levels 21-50:  10 + level coins (31-60)")
    print("  Levels 51-100: 15 + level/2 coins (40-65)")
    print("  Levels 101-500: 20 + level/3 coins (53-186)")
    print("  Bonus: Multiples of 5 get +5 coins")
    print("    Example: Level 10 = 5+10+5 = 20 coins")
    print("    Example: Level 50 = 10+50+5 = 65 coins")
    print("    Example: Level 500 = 20+166+5 = 191 coins")
    
    print("\n💰 Creating rewards...")
    
    with get_db_session() as session:
        try:
            now = datetime.utcnow().isoformat()
            created_count = 0
            
            # Preview first few and some milestones
            preview_levels = [2, 3, 4, 5, 9, 10, 11, 15, 20, 25, 50, 100, 150, 200, 250, 300, 400, 500]

            for level in range(2, 501):
                coins = calculate_coins(level)
                reward_id = str(uuid.uuid4())
                
                # Create description
                if level % 5 == 0:
                    description = f"Level {level} milestone bonus!"
                else:
                    description = f"Reached level {level}"
                
                # Insert reward
                session.execute(text("""
                    INSERT INTO level_rewards 
                    (reward_id, level, reward_type, reward_amount, description, is_active, created_at, updated_at)
                    VALUES (:reward_id, :level, :reward_type, :reward_amount, :description, 1, :created_at, :updated_at)
                """), {
                    "reward_id": reward_id,
                    "level": level,
                    "reward_type": "coins",
                    "reward_amount": coins,
                    "description": description,
                    "created_at": now,
                    "updated_at": now
                })
                
                created_count += 1
                
                # Show preview
                if level in preview_levels:
                    milestone = "🎉 MILESTONE" if level % 5 == 0 else ""
                    print(f"  Level {level:3d}: {coins:3d} coins {milestone}")
            
            session.commit()
            
            print(f"\n✅ Successfully created {created_count} level rewards!")
            
            # Show summary statistics
            print("\n📈 Summary Statistics:")

            total_coins_50 = sum(calculate_coins(l) for l in range(2, 51))
            total_coins_100 = sum(calculate_coins(l) for l in range(2, 101))
            total_coins_200 = sum(calculate_coins(l) for l in range(2, 201))
            total_coins_500 = sum(calculate_coins(l) for l in range(2, 501))

            print(f"  Total coins from level 2 to 50:   {total_coins_50:,} coins")
            print(f"  Total coins from level 2 to 100:  {total_coins_100:,} coins")
            print(f"  Total coins from level 2 to 200:  {total_coins_200:,} coins")
            print(f"  Total coins from level 2 to 500:  {total_coins_500:,} coins")

            print("\n💎 Special Milestones:")
            special = [5, 10, 25, 50, 100, 150, 200, 250, 300, 400, 500]
            for level in special:
                coins = calculate_coins(level)
                print(f"  Level {level:3d}: {coins:3d} coins")
            
        except Exception as e:
            print(f"\n❌ Error creating rewards: {e}")
            session.rollback()
            import traceback
            traceback.print_exc()
            raise
    
    print("\n" + "=" * 80)
    print("✅ LEVEL REWARDS POPULATED SUCCESSFULLY!")
    print("=" * 80)


if __name__ == "__main__":
    populate_level_rewards()
