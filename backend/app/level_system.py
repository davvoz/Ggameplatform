"""
Level System - Player progression and rewards
"""

from typing import Dict, List, Optional, Tuple
from datetime import datetime
import math


class LevelSystem:
    """
    Manages player levels, XP requirements, and level-up rewards.
    
    Formula: XP required for level N = 100 * N^1.5
    This creates a smooth exponential curve that's not too punishing.
    """
    
    # Level thresholds and titles
    LEVEL_MILESTONES = {
        1: {"title": "Novizio", "badge": "🌱", "color": "#A0A0A0"},
        5: {"title": "Esploratore", "badge": "🎮", "color": "#4A90E2"},
        10: {"title": "Avventuriero", "badge": "⚔️", "color": "#50C878"},
        20: {"title": "Veterano", "badge": "🛡️", "color": "#9B59B6"},
        30: {"title": "Maestro", "badge": "👑", "color": "#F39C12"},
        40: {"title": "Campione", "badge": "🏆", "color": "#E74C3C"},
        50: {"title": "Leggenda", "badge": "⭐", "color": "#FFD700"},
        75: {"title": "Eroe", "badge": "💎", "color": "#00D4FF"},
        100: {"title": "Immortale", "badge": "🔥", "color": "#FF1493"}
    }
    
    # Coin rewards for level milestones
    LEVEL_COIN_REWARDS = {
        5: 50,
        10: 100,
        15: 150,
        20: 200,
        25: 250,
        30: 300,
        40: 400,
        50: 500,
        60: 600,
        75: 750,
        100: 1000
    }
    
    @staticmethod
    def calculate_level_from_xp(xp: float) -> int:
        """
        Calculate player level from total XP.
        
        Formula: level = floor((XP / 100) ^ (2/3))
        This is the inverse of the XP requirement formula.
        
        Args:
            xp: Total XP earned
            
        Returns:
            Current level (minimum 1)
        """
        if xp is None or xp <= 0:
            return 1

        # Inverse formula: level = floor((XP / 100)^(2/3))
        try:
            level = int(math.floor(math.pow(xp / 100.0, 2.0/3.0)))
        except Exception:
            level = 1

        return max(1, level)
    
    @staticmethod
    def calculate_xp_for_level(level: int) -> int:
        """
        Calculate total XP required to reach a specific level.
        
        Formula: XP = 100 * level^1.5
        
        Args:
            level: Target level
            
        Returns:
            Total XP required to reach that level
        """
        if level <= 1:
            return 0
        
        return int(100 * math.pow(level, 1.5))

    @staticmethod
    def calculate_xp_required_for_next_level(level: int) -> int:
        """
        XP required to go from `level` to `level+1` (per-level requirement).

        This is the Pokemon-style view: how much XP you still need to gain
        to reach the next level, independent from the player's total XP.
        It returns an integer number of XP points for that single level.
        """
        cur = LevelSystem.calculate_xp_for_level(level)
        nxt = LevelSystem.calculate_xp_for_level(level + 1)
        return int(nxt - cur)
    
    @staticmethod
    def get_xp_progress(current_xp: float) -> Dict:
        """
        Get detailed XP progress information.
        
        Args:
            current_xp: Player's current total XP
            
        Returns:
            Dictionary with level, progress, and XP requirements
        """
        current_level = LevelSystem.calculate_level_from_xp(current_xp)
        next_level = current_level + 1

        xp_current_level = LevelSystem.calculate_xp_for_level(current_level)
        xp_next_level = LevelSystem.calculate_xp_for_level(next_level)

        # XP gained inside the current level (clamped to >= 0)
        xp_in_level = max(0.0, float(current_xp) - float(xp_current_level))

        # XP required for the next level (per-level requirement, Pokemon-style)
        xp_required_for_next = int(xp_next_level - xp_current_level)

        # Remaining XP to reach next level
        xp_to_next_level = max(0.0, float(xp_required_for_next) - xp_in_level)

        # Progress percentage inside current level (clamped between 0 and 100)
        if xp_required_for_next > 0:
            progress_percent = (xp_in_level / xp_required_for_next) * 100.0
        else:
            progress_percent = 0.0

        progress_percent = max(0.0, min(100.0, progress_percent))

        return {
            "current_level": current_level,
            "next_level": next_level,
            "current_xp": round(float(current_xp), 2),
            "xp_current_level": xp_current_level,
            "xp_next_level": xp_next_level,
            "xp_in_level": round(xp_in_level, 2),
            "xp_required_for_next_level": xp_required_for_next,
            "xp_to_next_level": round(xp_to_next_level, 2),
            "progress_percent": round(progress_percent, 2)
        }
    
    @staticmethod
    def get_level_title(level: int) -> Dict:
        """
        Get the title and badge for a specific level.
        Loads from database level_milestones table.
        
        Args:
            level: Player level
            
        Returns:
            Dictionary with title, badge, and color
        """
        from app.database import SessionLocal
        from app.models import LevelMilestone
        
        db = SessionLocal()
        try:
            # Get all active milestones
            milestones = db.query(LevelMilestone).filter(
                LevelMilestone.is_active == True,
                LevelMilestone.level <= level
            ).order_by(LevelMilestone.level.desc()).all()
            
            if milestones:
                # Use the highest milestone <= current level
                milestone = milestones[0]
                return {
                    "level": level,
                    "milestone_level": milestone.level,
                    "title": milestone.title,
                    "badge": milestone.badge,
                    "color": milestone.color
                }
            else:
                # Fallback to level 1
                milestone = db.query(LevelMilestone).filter_by(level=1).first()
                if milestone:
                    return {
                        "level": level,
                        "milestone_level": 1,
                        "title": milestone.title,
                        "badge": milestone.badge,
                        "color": milestone.color
                    }
                # Ultimate fallback
                return {
                    "level": level,
                    "milestone_level": 1,
                    "title": "Newbie",
                    "badge": "🌱",
                    "color": "#4ade80"
                }
        finally:
            db.close()
    
    @staticmethod
    def get_level_up_rewards(new_level: int) -> Dict:
        """
        Get rewards for reaching a new level.
        Reads from database level_rewards table.
        
        Args:
            new_level: The level just reached
            
        Returns:
            Dictionary with rewards information
        """
        from app.database import SessionLocal
        from app.models import LevelReward, LevelMilestone
        
        rewards = {
            "level": new_level,
            "coins": 0,
            "title_unlocked": None,
            "badge_unlocked": None,
            "is_milestone": False
        }
        
        db = SessionLocal()
        try:
            # Check if this level has rewards in database
            level_reward = db.query(LevelReward).filter(
                LevelReward.level == new_level,
                LevelReward.is_active == True
            ).first()
            
            if level_reward:
                if level_reward.reward_type == "coins":
                    rewards["coins"] = level_reward.reward_amount
            
            # Check if this is a title milestone in database
            milestone = db.query(LevelMilestone).filter(
                LevelMilestone.level == new_level,
                LevelMilestone.is_active == True
            ).first()
            
            if milestone:
                rewards["title_unlocked"] = milestone.title
                rewards["badge_unlocked"] = milestone.badge
                rewards["is_milestone"] = True
        finally:
            db.close()
        
        return rewards
    
    @staticmethod
    def get_all_milestones() -> List[Dict]:
        """
        Get list of all level milestones with their requirements.
        Reads from database level_milestones and level_rewards tables.
        
        Returns:
            List of milestone dictionaries
        """
        from app.database import SessionLocal
        from app.models import LevelMilestone, LevelReward
        
        db = SessionLocal()
        try:
            milestones = []
            
            # Get all milestones from database
            db_milestones = db.query(LevelMilestone).filter(
                LevelMilestone.is_active == True
            ).order_by(LevelMilestone.level).all()
            
            for milestone in db_milestones:
                xp_required = LevelSystem.calculate_xp_for_level(milestone.level)
                
                # Get coin reward for this level if exists
                reward = db.query(LevelReward).filter(
                    LevelReward.level == milestone.level,
                    LevelReward.reward_type == "coins",
                    LevelReward.is_active == True
                ).first()
                
                coin_reward = reward.reward_amount if reward else 0
                
                milestones.append({
                    "level": milestone.level,
                    "title": milestone.title,
                    "badge": milestone.badge,
                    "color": milestone.color,
                    "xp_required": xp_required,
                    "coin_reward": coin_reward
                })
            
            return milestones
        finally:
            db.close()
    
    @staticmethod
    def check_level_up(old_xp: float, new_xp: float) -> Dict:
        """
        Check if player leveled up and return level-up information.
        
        Args:
            old_xp: Previous XP amount
            new_xp: New XP amount
            
        Returns:
            Dict with leveled_up bool and level-up details if applicable
        """
        old_level = LevelSystem.calculate_level_from_xp(old_xp)
        new_level = LevelSystem.calculate_level_from_xp(new_xp)
        
        if new_level > old_level:
            rewards = LevelSystem.get_level_up_rewards(new_level)
            title_info = LevelSystem.get_level_title(new_level)
            
            return {
                "leveled_up": True,
                "old_level": old_level,
                "new_level": new_level,
                "levels_gained": new_level - old_level,
                "coins_awarded": rewards.get("coins", 0),
                "title": title_info["title"],
                "badge": title_info["badge"],
                "color": title_info["color"],
                "is_milestone": rewards.get("is_milestone", False),
                "xp_progress": LevelSystem.get_xp_progress(new_xp)
            }
        
        return {
            "leveled_up": False,
            "old_level": old_level,
            "new_level": old_level
        }


# Example XP progression table
def print_level_table():
    """Print a table showing XP requirements for each level."""
    print("Level | XP Required | Coins Reward | Title")
    print("-" * 60)
    for level in range(1, 101):
        xp = LevelSystem.calculate_xp_for_level(level)
        coins = LevelSystem.LEVEL_COIN_REWARDS.get(level, 0)
        title_info = LevelSystem.get_level_title(level)
        title = f"{title_info['badge']} {title_info['title']}" if level in LevelSystem.LEVEL_MILESTONES else ""
        
        print(f"{level:5d} | {xp:11d} | {coins:12d} | {title}")


if __name__ == "__main__":
    print_level_table()
