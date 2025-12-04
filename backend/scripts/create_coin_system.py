"""
Migration script to create coin system tables and populate initial data
"""

import sys
import os
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import get_db_session
from app.models import Base, UserCoins, CoinTransaction, CoinReward
from sqlalchemy import create_engine
from pathlib import Path

# Get engine directly
DATABASE_PATH = Path(__file__).parent.parent / "data" / "game_platform.db"
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"
DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


def create_coin_tables():
    """Create coin system tables"""
    print("🔨 Creating coin system tables...")
    
    # Create only the coin-related tables
    UserCoins.__table__.create(engine, checkfirst=True)
    CoinTransaction.__table__.create(engine, checkfirst=True)
    CoinReward.__table__.create(engine, checkfirst=True)
    
    print("✅ Tables created successfully")


def populate_initial_rewards():
    """Populate initial coin reward configurations"""
    print("💰 Populating initial reward configurations...")
    
    now = datetime.utcnow().isoformat()
    
    rewards = [
        # Quest rewards
        CoinReward(
            reward_type="quest",
            reward_key="default",
            coin_amount=50,
            description="Default quest completion reward",
            is_active=1,
            created_at=now,
            updated_at=now,
            extra_data='{}'
        ),
        
        # Leaderboard rewards
        CoinReward(
            reward_type="leaderboard_rank",
            reward_key="1",
            coin_amount=1000,
            description="1st place reward",
            is_active=1,
            created_at=now,
            updated_at=now,
            extra_data='{"rank": 1}'
        ),
        CoinReward(
            reward_type="leaderboard_rank",
            reward_key="2",
            coin_amount=500,
            description="2nd place reward",
            is_active=1,
            created_at=now,
            updated_at=now,
            extra_data='{"rank": 2}'
        ),
        CoinReward(
            reward_type="leaderboard_rank",
            reward_key="3",
            coin_amount=250,
            description="3rd place reward",
            is_active=1,
            created_at=now,
            updated_at=now,
            extra_data='{"rank": 3}'
        ),
        CoinReward(
            reward_type="leaderboard_rank",
            reward_key="top_10",
            coin_amount=100,
            description="Top 10 reward",
            is_active=1,
            created_at=now,
            updated_at=now,
            extra_data='{"rank_range": [4, 10]}'
        ),
        CoinReward(
            reward_type="leaderboard_rank",
            reward_key="top_100",
            coin_amount=25,
            description="Top 100 reward",
            is_active=1,
            created_at=now,
            updated_at=now,
            extra_data='{"rank_range": [11, 100]}'
        ),
        
        # Daily login
        CoinReward(
            reward_type="daily_login",
            reward_key=None,
            coin_amount=10,
            description="Daily login bonus",
            is_active=1,
            created_at=now,
            updated_at=now,
            extra_data='{}'
        ),
        
        # High score
        CoinReward(
            reward_type="high_score",
            reward_key=None,
            coin_amount=20,
            description="New personal high score",
            is_active=1,
            created_at=now,
            updated_at=now,
            extra_data='{}'
        ),
        
        # Level up
        CoinReward(
            reward_type="level_up",
            reward_key=None,
            coin_amount=100,
            description="Level up base reward",
            is_active=1,
            created_at=now,
            updated_at=now,
            extra_data='{"scales_with_level": true}'
        ),
    ]
    
    with get_db_session() as session:
        for reward in rewards:
            # Check if already exists
            existing = session.query(CoinReward).filter(
                CoinReward.reward_type == reward.reward_type,
                CoinReward.reward_key == reward.reward_key
            ).first()
            
            if not existing:
                session.add(reward)
                print(f"  ➕ Added: {reward.reward_type}" + (f" - {reward.reward_key}" if reward.reward_key else ""))
            else:
                print(f"  ⏭️  Skipped (exists): {reward.reward_type}" + (f" - {reward.reward_key}" if reward.reward_key else ""))
        
        session.commit()
    
    print("✅ Reward configurations populated")


def initialize_existing_users():
    """Initialize coin balance for existing users"""
    print("👥 Initializing coin balances for existing users...")
    
    from app.models import User
    
    with get_db_session() as session:
        # Get all users
        users = session.query(User).all()
        now = datetime.utcnow().isoformat()
        
        count = 0
        for user in users:
            # Check if user already has coins record
            existing = session.query(UserCoins).filter(
                UserCoins.user_id == user.user_id
            ).first()
            
            if not existing:
                # Create initial balance with welcome bonus
                user_coins = UserCoins(
                    user_id=user.user_id,
                    balance=100,  # Welcome bonus
                    total_earned=100,
                    total_spent=0,
                    last_updated=now,
                    created_at=now
                )
                session.add(user_coins)
                
                # Create transaction record for welcome bonus
                tx = CoinTransaction(
                    transaction_id=f"tx_welcome_{user.user_id[:8]}",
                    user_id=user.user_id,
                    amount=100,
                    transaction_type="welcome_bonus",
                    source_id=None,
                    description="Welcome to the platform!",
                    balance_after=100,
                    created_at=now,
                    extra_data='{}'
                )
                session.add(tx)
                count += 1
        
        session.commit()
        print(f"✅ Initialized {count} user coin balances")


def main():
    """Run migration"""
    print("\n" + "="*50)
    print("🪙  COIN SYSTEM MIGRATION")
    print("="*50 + "\n")
    
    try:
        # Create tables
        create_coin_tables()
        print()
        
        # Populate rewards
        populate_initial_rewards()
        print()
        
        # Initialize existing users
        initialize_existing_users()
        print()
        
        print("="*50)
        print("✅ Migration completed successfully!")
        print("="*50 + "\n")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
