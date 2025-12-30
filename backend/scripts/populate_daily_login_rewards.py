"""
Populate daily_login_reward_config table with default rewards
Run this if the table exists but is empty
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import get_db_session
from sqlalchemy import text
from datetime import datetime


def populate_rewards():
    """Populate or update the config table with default 7-day rewards"""
    
    with get_db_session() as session:
        try:
            # Check if table exists
            result = session.execute(text(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='daily_login_reward_config'"
            ))
            
            if not result.fetchone():
                print("❌ Table daily_login_reward_config does not exist!")
                print("   Run create_daily_login_rewards.py first")
                return
            
            # Check current data
            result = session.execute(text("SELECT COUNT(*) FROM daily_login_reward_config"))
            count = result.scalar()
            
            print(f"ℹ️  Current rewards in config: {count}")
            
            if count > 0:
                print("⚠️  Config table already has data. Delete first? (y/n)")
                response = input().strip().lower()
                if response == 'y':
                    session.execute(text("DELETE FROM daily_login_reward_config"))
                    print("✅ Existing data deleted")
                else:
                    print("❌ Aborting. Config not modified.")
                    return
            
            # Insert default rewards
            now = datetime.utcnow().isoformat()
            
            default_rewards = [
                (1, 10, '🪙'),
                (2, 20, '🪙'),
                (3, 30, '🪙'),
                (4, 50, '💰'),
                (5, 75, '💰'),
                (6, 100, '💎'),
                (7, 200, '🎁')
            ]
            
            print("\nInserting default rewards...")
            for day, coins, emoji in default_rewards:
                session.execute(text("""
                    INSERT INTO daily_login_reward_config 
                    (day, coins_reward, emoji, is_active, created_at, updated_at)
                    VALUES (:day, :coins, :emoji, 1, :created, :updated)
                """), {
                    'day': day, 
                    'coins': coins, 
                    'emoji': emoji, 
                    'created': now, 
                    'updated': now
                })
                print(f"  ✓ Day {day}: {coins} coins {emoji}")
            
            session.commit()
            print("\n✅ Default rewards populated successfully!")
            print(f"   Total rewards: {len(default_rewards)}")
            
        except Exception as e:
            print(f"❌ Error populating rewards: {e}")
            session.rollback()
            import traceback
            traceback.print_exc()


def main():
    """Run the population"""
    print("=" * 60)
    print("Populating Daily Login Reward Configuration")
    print("=" * 60)
    print()
    
    populate_rewards()
    
    print("\n" + "=" * 60)
    print("Done!")
    print("=" * 60)


if __name__ == "__main__":
    main()
