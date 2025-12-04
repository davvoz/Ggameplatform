"""
Coin Rewards System
Handles automatic coin distribution for various achievements
"""

from datetime import datetime
from typing import Optional, Dict, List
from sqlalchemy.orm import Session

from app.models import Leaderboard, User
from app.services import CoinService


class CoinRewardManager:
    """
    Manager for automatic coin reward distribution
    Handles leaderboard rewards, streaks, and other automated coin distributions
    """
    
    def __init__(self, db: Session, coin_service: CoinService):
        self.db = db
        self.coin_service = coin_service
    
    def award_leaderboard_positions(self, game_id: str, top_n: int = 100) -> List[Dict]:
        """
        Award coins to top players in a game's leaderboard
        
        Args:
            game_id: Game identifier
            top_n: Number of top players to reward
            
        Returns:
            List of awarded transactions
        """
        # Get top players
        top_players = self.db.query(Leaderboard).filter(
            Leaderboard.game_id == game_id
        ).order_by(Leaderboard.score.desc()).limit(top_n).all()
        
        awarded = []
        for entry in top_players:
            if entry.rank:
                result = self.coin_service.award_leaderboard_reward(
                    user_id=entry.user_id,
                    game_id=game_id,
                    rank=entry.rank,
                    score=entry.score
                )
                if result:
                    awarded.append(result)
        
        return awarded
    
    def award_new_high_score(
        self,
        user_id: str,
        game_id: str,
        old_score: int,
        new_score: int
    ) -> Optional[Dict]:
        """
        Award coins for achieving a new personal high score
        
        Args:
            user_id: User identifier
            game_id: Game identifier
            old_score: Previous high score
            new_score: New high score
            
        Returns:
            Transaction record or None
        """
        # Get reward config for high score improvement
        reward_config = self.coin_service.get_reward_config("high_score")
        
        if reward_config:
            improvement_percent = 0
            if old_score > 0:
                improvement_percent = ((new_score - old_score) / old_score) * 100
            
            # Award coins
            return self.coin_service.award_coins(
                user_id=user_id,
                amount=reward_config['coin_amount'],
                transaction_type="high_score",
                source_id=game_id,
                description=f"New high score in {game_id}: {new_score}",
                extra_data={
                    "game_id": game_id,
                    "old_score": old_score,
                    "new_score": new_score,
                    "improvement_percent": round(improvement_percent, 2)
                }
            )
        
        return None
    
    def check_and_award_daily_login(self, user_id: str) -> Optional[Dict]:
        """
        Check if user is eligible for daily login bonus and award coins
        
        Args:
            user_id: User identifier
            
        Returns:
            Transaction record or None if already claimed today
        """
        # Get user's last daily login transaction
        from app.repositories import CoinTransactionRepository, RepositoryFactory
        
        tx_repo = RepositoryFactory.create_cointransaction_repository(self.db)
        recent_logins = self.db.query(tx_repo.model).filter(
            tx_repo.model.user_id == user_id,
            tx_repo.model.transaction_type == "daily_login"
        ).order_by(tx_repo.model.created_at.desc()).limit(1).all()
        
        # Check if already claimed today
        if recent_logins:
            last_login = datetime.fromisoformat(recent_logins[0].created_at)
            now = datetime.utcnow()
            
            # If last login was today, don't award again
            if last_login.date() == now.date():
                return None
        
        # Award daily login bonus
        return self.coin_service.award_daily_login(user_id)
    
    def award_play_streak(
        self,
        user_id: str,
        consecutive_days: int
    ) -> Optional[Dict]:
        """
        Award coins for maintaining a play streak
        
        Args:
            user_id: User identifier
            consecutive_days: Number of consecutive days played
            
        Returns:
            Transaction record or None
        """
        # Define streak milestones
        streak_rewards = {
            7: 50,    # 1 week
            14: 100,  # 2 weeks
            30: 250,  # 1 month
            60: 500,  # 2 months
            90: 1000  # 3 months
        }
        
        # Check if this is a milestone
        if consecutive_days in streak_rewards:
            amount = streak_rewards[consecutive_days]
            return self.coin_service.award_coins(
                user_id=user_id,
                amount=amount,
                transaction_type="streak_bonus",
                source_id=f"streak_{consecutive_days}",
                description=f"{consecutive_days}-day play streak bonus",
                extra_data={"consecutive_days": consecutive_days}
            )
        
        return None
    
    def award_level_up(
        self,
        user_id: str,
        old_level: int,
        new_level: int
    ) -> Optional[Dict]:
        """
        Award coins for leveling up
        
        Args:
            user_id: User identifier
            old_level: Previous level
            new_level: New level
            
        Returns:
            Transaction record or None
        """
        reward_config = self.coin_service.get_reward_config("level_up")
        
        if reward_config:
            # Scale reward with level
            base_amount = reward_config['coin_amount']
            amount = base_amount + (new_level * 10)  # More coins for higher levels
            
            return self.coin_service.award_coins(
                user_id=user_id,
                amount=amount,
                transaction_type="level_up",
                source_id=f"level_{new_level}",
                description=f"Reached level {new_level}",
                extra_data={
                    "old_level": old_level,
                    "new_level": new_level
                }
            )
        
        return None


def create_coin_reward_manager(db: Session, coin_service: CoinService) -> CoinRewardManager:
    """Factory function to create a CoinRewardManager instance"""
    return CoinRewardManager(db, coin_service)
