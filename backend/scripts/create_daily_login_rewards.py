"""
Create user login streak system with configurable rewards
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import get_db_session
from sqlalchemy import text
from datetime import datetime


def create_user_login_streak_table():
    """Create the user_login_streak table"""
    
    with get_db_session() as session:
        try:
            # Check if table already exists
            result = session.execute(text(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='user_login_streak'"
            ))
            
            if result.fetchone():
                print("ℹ️  Table user_login_streak already exists")
                return
            
            # Create table
            print("Creating user_login_streak table...")
            session.execute(text("""
                CREATE TABLE user_login_streak (
                    user_id TEXT PRIMARY KEY,
                    current_day INTEGER DEFAULT 1,
                    last_claim_date TEXT,
                    total_cycles_completed INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
                )
            """))
            
            # Create index for efficient lookups
            session.execute(text("""
                CREATE INDEX idx_user_login_streak_user ON user_login_streak(user_id)
            """))
            
            session.commit()
            print("✅ Table user_login_streak created successfully!")
            
        except Exception as e:
            print(f"❌ Error creating table: {e}")
            session.rollback()
            raise


def create_reward_config_table():
    """Create the daily_login_reward_config table"""
    
    with get_db_session() as session:
        try:
            # Check if table already exists
            result = session.execute(text(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='daily_login_reward_config'"
            ))
            
            if result.fetchone():
                print("ℹ️  Table daily_login_reward_config already exists")
                return
            
            # Create table
            print("Creating daily_login_reward_config table...")
            session.execute(text("""
                CREATE TABLE daily_login_reward_config (
                    day INTEGER PRIMARY KEY,
                    coins_reward INTEGER NOT NULL,
                    emoji TEXT DEFAULT '🪙',
                    is_active INTEGER DEFAULT 1,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """))
            
            session.commit()
            print("✅ Table daily_login_reward_config created successfully!")
            
            # Populate with default rewards
            populate_default_rewards(session)
            
        except Exception as e:
            print(f"❌ Error creating config table: {e}")
            session.rollback()
            raise


def populate_default_rewards(session):
    """Populate the config table with default 7-day rewards"""
    
    try:
        now = datetime.utcnow().isoformat()
        
        default_rewards = [
            (1, 10, '🪙', now),
            (2, 20, '🪙', now),
            (3, 30, '🪙', now),
            (4, 50, '💰', now),
            (5, 75, '💰', now),
            (6, 100, '💎', now),
            (7, 200, '🎁', now)
        ]
        
        for day, coins, emoji, timestamp in default_rewards:
            session.execute(text("""
                INSERT INTO daily_login_reward_config 
                (day, coins_reward, emoji, is_active, created_at, updated_at)
                VALUES (:day, :coins, :emoji, 1, :created, :updated)
            """), {
                'day': day, 
                'coins': coins, 
                'emoji': emoji, 
                'created': timestamp, 
                'updated': timestamp
            })
        
        session.commit()
        print("✅ Default rewards populated successfully!")
        
    except Exception as e:
        print(f"❌ Error populating rewards: {e}")
        session.rollback()
        raise


def main():
    """Run the migration"""
    print("=" * 60)
    print("Creating User Login Streak System")
    print("=" * 60)
    
    create_user_login_streak_table()
    create_reward_config_table()
    
    print("\n" + "=" * 60)
    print("✅ Login streak system created successfully!")
    print("=" * 60)
    print("\nDefault reward schedule:")
    print("  Day 1: 10 coins 🪙")
    print("  Day 2: 20 coins 🪙🪙")
    print("  Day 3: 30 coins 🪙🪙🪙")
    print("  Day 4: 50 coins 💰")
    print("  Day 5: 75 coins 💎")
    print("  Day 6: 100 coins 💰💰")
    print("  Day 7: 200 coins 🎁")
    print("\nRewards are editable via DB viewer!")
    print("=" * 60)


if __name__ == "__main__":
    main()
