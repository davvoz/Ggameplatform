"""
Populate Leaderboard Rewards
Creates initial reward configuration for weekly leaderboards
"""

import sys
import os
from datetime import datetime
import uuid

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import get_db_session
from app.models import LeaderboardReward


def create_default_rewards():
    """Create default global rewards for all games."""
    
    rewards = [
        # Top 1 - 1st place
        {
            'game_id': None,  # Global reward
            'rank_start': 1,
            'rank_end': 1,
            'steem_reward': 10.0,
            'coin_reward': 1000,
            'description': '1st Place - Gold Medal'
        },
        # Top 2 - 2nd place
        {
            'game_id': None,
            'rank_start': 2,
            'rank_end': 2,
            'steem_reward': 5.0,
            'coin_reward': 500,
            'description': '2nd Place - Silver Medal'
        },
        # Top 3 - 3rd place
        {
            'game_id': None,
            'rank_start': 3,
            'rank_end': 3,
            'steem_reward': 2.5,
            'coin_reward': 250,
            'description': '3rd Place - Bronze Medal'
        },
        # Top 4-10
        {
            'game_id': None,
            'rank_start': 4,
            'rank_end': 10,
            'steem_reward': 1.0,
            'coin_reward': 100,
            'description': 'Top 10 - Honorable Mention'
        },
    ]
    
    return rewards


def populate_rewards():
    """Populate leaderboard_rewards table."""
    
    print("🎁 Populating leaderboard rewards...")
    
    with get_db_session() as session:
        # Check if rewards already exist
        existing = session.query(LeaderboardReward).count()
        if existing > 0:
            print(f"⚠️  Found {existing} existing rewards. Skipping population.")
            response = input("Do you want to clear and recreate? (yes/no): ")
            if response.lower() != 'yes':
                print("❌ Aborted")
                return
            
            # Clear existing
            session.query(LeaderboardReward).delete()
            session.commit()
            print("🗑️  Cleared existing rewards")
        
        # Create rewards
        rewards_data = create_default_rewards()
        now = datetime.utcnow().isoformat()
        
        for reward_data in rewards_data:
            reward = LeaderboardReward(
                reward_id=str(uuid.uuid4()),
                game_id=reward_data['game_id'],
                rank_start=reward_data['rank_start'],
                rank_end=reward_data['rank_end'],
                steem_reward=reward_data['steem_reward'],
                coin_reward=reward_data['coin_reward'],
                description=reward_data['description'],
                is_active=1,
                created_at=now,
                updated_at=now
            )
            
            session.add(reward)
            print(f"✅ Created reward: Rank {reward.rank_start}-{reward.rank_end}: "
                  f"{reward.steem_reward} STEEM + {reward.coin_reward} coins")
        
        session.commit()
        print(f"\n✅ Successfully created {len(rewards_data)} reward configurations")


def main():
    """Main function."""
    try:
        populate_rewards()
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
