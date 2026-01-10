"""
Daily Login Service
Handles the 7-day login reward cycle system
"""

from datetime import datetime, date
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models import UserLoginStreak, DailyLoginRewardConfig, User, UserCoins
from app.services import CoinService
from app.repositories import RepositoryFactory


class DailyLoginService:
    """Service for managing daily login rewards"""
    
    def __init__(self, db: Session, coin_service: Optional[CoinService] = None):
        self.db = db
        if coin_service:
            self.coin_service = coin_service
        else:
            # Create CoinService with proper repositories
            coins_repo = RepositoryFactory.create_usercoins_repository(db)
            transaction_repo = RepositoryFactory.create_cointransaction_repository(db)
            self.coin_service = CoinService(coins_repo, transaction_repo)
    
    def get_reward_config(self) -> Dict[int, Dict[str, Any]]:
        """
        Get reward configuration from database
        
        Returns:
            Dictionary mapping day number to reward details
        """
        configs = self.db.query(DailyLoginRewardConfig).filter(
            DailyLoginRewardConfig.is_active == 1
        ).order_by(DailyLoginRewardConfig.day).all()
        
        return {
            config.day: {
                'coins': config.coins_reward,
                'emoji': config.emoji
            }
            for config in configs
        }
        self.db = db
        if coin_service:
            self.coin_service = coin_service
        else:
            # Create CoinService with proper repositories
            coins_repo = RepositoryFactory.create_usercoins_repository(db)
            transaction_repo = RepositoryFactory.create_cointransaction_repository(db)
            self.coin_service = CoinService(coins_repo, transaction_repo)
    
    def get_user_status(self, user_id: str) -> Dict[str, Any]:
        """
        Get the current daily login reward status for a user
        
        Args:
            user_id: User identifier
            
        Returns:
            Dictionary with current status and available rewards
        """
        # Get or create user's daily login record
        daily_login = self.db.query(UserLoginStreak).filter(
            UserLoginStreak.user_id == user_id
        ).first()
        
        if not daily_login:
            # First time - create record
            now = datetime.utcnow().isoformat()
            daily_login = UserLoginStreak(
                user_id=user_id,
                current_day=1,
                last_claim_date=None,
                total_cycles_completed=0,
                created_at=now,
                updated_at=now
            )
            self.db.add(daily_login)
            self.db.commit()
            self.db.refresh(daily_login)
        
        today = date.today().isoformat()
        
        # Check if streak should reset (missed a day)
        if daily_login.last_claim_date:
            last_claim = date.fromisoformat(daily_login.last_claim_date)
            days_since_claim = (date.today() - last_claim).days
            
            # If more than 1 day has passed, reset to day 1
            if days_since_claim > 1:
                daily_login.current_day = 1
                daily_login.updated_at = datetime.utcnow().isoformat()
                self.db.commit()
        
        # Check if already claimed today
        can_claim = daily_login.last_claim_date != today
        
        # Get reward configuration from database
        reward_config = self.get_reward_config()
        
        # Build reward schedule with claim status
        rewards = []
        for day in range(1, 8):
            status = "locked"  # Default
            
            if day < daily_login.current_day:
                status = "claimed"
            elif day == daily_login.current_day:
                status = "available" if can_claim else "claimed"
            else:
                status = "locked"
            
            # Get reward info from config (with fallback to defaults)
            reward_info = reward_config.get(day, {'coins': 10, 'emoji': '🪙'})
            
            rewards.append({
                "day": day,
                "coins": reward_info['coins'],
                "emoji": reward_info.get('emoji', '🪙'),
                "status": status
            })
        
        return {
            "current_day": daily_login.current_day,
            "last_claim_date": daily_login.last_claim_date,
            "can_claim_today": can_claim,
            "total_cycles_completed": daily_login.total_cycles_completed,
            "rewards": rewards
        }
    
    def claim_daily_reward(self, user_id: str) -> Dict[str, Any]:
        """
        Claim the daily reward for current day
        
        Args:
            user_id: User identifier
            
        Returns:
            Transaction details and updated status
            
        Raises:
            ValueError: If reward already claimed today, user not found, or user is anonymous
        """
        # Verify user exists and is not anonymous
        user = self.db.query(User).filter(User.user_id == user_id).first()
        if not user:
            raise ValueError("User not found")
        if user.is_anonymous:
            raise ValueError("Anonymous users cannot claim daily login rewards")
        
        # Get user's daily login record
        daily_login = self.db.query(UserLoginStreak).filter(
            UserLoginStreak.user_id == user_id
        ).first()
        
        if not daily_login:
            raise ValueError("Daily login record not found")
        
        today = date.today().isoformat()
        
        # Check if already claimed today
        if daily_login.last_claim_date == today:
            raise ValueError("Reward already claimed today")
        
        # Check if streak should reset (missed a day)
        if daily_login.last_claim_date:
            last_claim = date.fromisoformat(daily_login.last_claim_date)
            days_since_claim = (date.today() - last_claim).days
            
            if days_since_claim > 1:
                # Reset to day 1 if user missed a day
                daily_login.current_day = 1
        
        # Get reward amount for current day from database config
        current_day = daily_login.current_day
        reward_config = self.get_reward_config()
        reward_info = reward_config.get(current_day, {'coins': 10, 'emoji': '🪙'})
        reward_amount = reward_info['coins']
        
        # Award coins
        transaction = self.coin_service.award_coins(
            user_id=user_id,
            amount=reward_amount,
            transaction_type="daily_login_reward",
            source_id=f"day_{current_day}",
            description=f"Daily Login Reward - Day {current_day}"
        )
        
        # Update daily login record
        if current_day == 7:
            # Completed full cycle, reset to day 1
            daily_login.current_day = 1
            daily_login.total_cycles_completed += 1
        else:
            # Move to next day
            daily_login.current_day += 1
        
        daily_login.last_claim_date = today
        daily_login.updated_at = datetime.utcnow().isoformat()
        
        self.db.commit()
        
        # Get updated balance
        user_coins = self.db.query(UserCoins).filter(
            UserCoins.user_id == user_id
        ).first()
        
        return {
            "success": True,
            "claimed_day": current_day,
            "coins_awarded": reward_amount,
            "new_balance": user_coins.balance if user_coins else 0,
            "next_day": daily_login.current_day,
            "cycle_completed": current_day == 7,
            "total_cycles": daily_login.total_cycles_completed,
            "transaction": transaction
        }
    
    def reset_user_streak(self, user_id: str) -> Dict[str, Any]:
        """
        Reset a user's daily login streak (admin function)
        
        Args:
            user_id: User identifier
            
        Returns:
            Updated status
        """
        daily_login = self.db.query(DailyLoginReward).filter(
            DailyLoginReward.user_id == user_id
        ).first()
        
        if daily_login:
            daily_login.current_day = 1
            daily_login.last_claim_date = None
            daily_login.updated_at = datetime.utcnow().isoformat()
            self.db.commit()
            
            return {
                "success": True,
                "message": "Streak reset to day 1"
            }
        
        return {
            "success": False,
            "message": "User daily login record not found"
        }
