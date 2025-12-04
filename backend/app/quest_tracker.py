"""
Quest Tracker - Automatically updates user quest progress
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import Quest, UserQuest, User, GameSession
from app.repositories import UserCoinsRepository, CoinTransactionRepository
from app.services import CoinService


class QuestTracker:
    """Tracks and updates user quest progress automatically."""
    
    def __init__(self, db: Session, coin_service: Optional[CoinService] = None):
        self.db = db
        self.coin_service = coin_service
    
    def get_or_create_user_quest(self, user_id: str, quest_id: int) -> UserQuest:
        """Get existing user quest progress or create new one."""
        user_quest = self.db.query(UserQuest).filter(
            UserQuest.user_id == user_id,
            UserQuest.quest_id == quest_id
        ).first()
        
        if not user_quest:
            now = datetime.utcnow().isoformat()
            user_quest = UserQuest(
                user_id=user_id,
                quest_id=quest_id,
                current_progress=0,
                is_completed=0,
                started_at=now
            )
            self.db.add(user_quest)
            self.db.flush()
        
        return user_quest
    
    def update_quest_progress(self, user_id: str, quest: Quest, new_progress: int):
        """Update progress for a specific quest."""
        if quest.is_active == 0:
            return
        
        user_quest = self.get_or_create_user_quest(user_id, quest.quest_id)
        
        # Don't update if already completed
        if user_quest.is_completed:
            return
        
        # Update progress
        user_quest.current_progress = new_progress
        
        # Check if quest is completed
        if user_quest.current_progress >= quest.target_value:
            user_quest.is_completed = 1
            user_quest.completed_at = datetime.utcnow().isoformat()
            
            # Award XP
            user = self.db.query(User).filter(User.user_id == user_id).first()
            if user:
                user.total_xp_earned += quest.xp_reward
            
            # Award coins if coin service is available
            if self.coin_service:
                try:
                    self.coin_service.award_quest_reward(
                        user_id=user_id,
                        quest_id=quest.quest_id,
                        quest_title=quest.title,
                        quest_sats_reward=quest.reward_coins if hasattr(quest, 'reward_coins') else 0
                    )
                except Exception as e:
                    print(f"⚠️ Failed to award coins for quest {quest.quest_id}: {e}")
            
            print(f"✅ Quest completed! User {user_id} completed quest {quest.quest_id}: {quest.title}")
    
    def track_session_end(self, session_data: Dict):
        """Track quest progress when a game session ends."""
        user_id = session_data.get('user_id')
        game_id = session_data.get('game_id')
        score = session_data.get('score', 0)
        duration_seconds = session_data.get('duration_seconds', 0)
        xp_earned = session_data.get('xp_earned', 0)
        
        if not user_id:
            return
        
        # Get all active quests
        quests = self.db.query(Quest).filter(Quest.is_active == 1).all()
        
        for quest in quests:
            self._process_quest_for_session(user_id, quest, game_id, score, duration_seconds, xp_earned)
        
        self.db.commit()
    
    def _process_quest_for_session(self, user_id: str, quest: Quest, game_id: str, 
                                   score: int, duration_seconds: int, xp_earned: float):
        """Process a single quest based on session data."""
        
        quest_type = quest.quest_type
        
        # Play games quests
        if quest_type == "play_games":
            # Count total completed sessions
            total_sessions = self.db.query(GameSession).filter(
                GameSession.user_id == user_id,
                GameSession.ended_at.isnot(None)
            ).count()
            self.update_quest_progress(user_id, quest, total_sessions)
        
        # Play time quests (total cumulative)
        elif quest_type == "play_time":
            # Sum total playtime
            total_seconds = self.db.query(func.sum(GameSession.duration_seconds)).filter(
                GameSession.user_id == user_id,
                GameSession.ended_at.isnot(None)
            ).scalar() or 0
            self.update_quest_progress(user_id, quest, int(total_seconds))
        
        # Play same game quests
        elif quest_type == "play_same_game":
            # Count sessions for each game
            game_counts = self.db.query(
                GameSession.game_id,
                func.count(GameSession.session_id).label('count')
            ).filter(
                GameSession.user_id == user_id,
                GameSession.ended_at.isnot(None)
            ).group_by(GameSession.game_id).all()
            
            # Get max count
            max_count = max([gc.count for gc in game_counts]) if game_counts else 0
            self.update_quest_progress(user_id, quest, max_count)
        
        # Score ends with specific digit
        elif quest_type == "score_ends_with":
            target_digit = quest.target_value
            if score % 10 == target_digit:
                self.update_quest_progress(user_id, quest, 1)
        
        # Reach level (based on XP)
        elif quest_type == "reach_level":
            user = self.db.query(User).filter(User.user_id == user_id).first()
            if user:
                # Simple level calculation: level = XP / 1000
                current_level = int(user.total_xp_earned / 1000)
                self.update_quest_progress(user_id, quest, current_level)
        
        # Complete quests meta-quest
        elif quest_type == "complete_quests":
            completed_count = self.db.query(UserQuest).filter(
                UserQuest.user_id == user_id,
                UserQuest.is_completed == 1
            ).count()
            self.update_quest_progress(user_id, quest, completed_count)
    
    def track_login(self, user_id: str):
        """Track quest progress when user logs in."""
        user = self.db.query(User).filter(User.user_id == user_id).first()
        if not user:
            return
        
        quests = self.db.query(Quest).filter(Quest.is_active == 1).all()
        
        for quest in quests:
            if quest.quest_type == "login_after_24h":
                # Check if last login was more than 24 hours ago
                if user.last_login:
                    last_login = datetime.fromisoformat(user.last_login)
                    time_since_login = datetime.utcnow() - last_login
                    if time_since_login > timedelta(hours=24):
                        self.update_quest_progress(user_id, quest, 1)
        
        self.db.commit()


def track_quest_progress_for_session(db: Session, session_data: Dict, coin_service: Optional[CoinService] = None):
    """
    Convenience function to track quest progress after a game session.
    
    Args:
        db: Database session
        session_data: Dictionary with session information (user_id, game_id, score, duration_seconds, xp_earned)
        coin_service: Optional CoinService instance for awarding coins
    """
    tracker = QuestTracker(db, coin_service)
    tracker.track_session_end(session_data)


def track_quest_progress_for_login(db: Session, user_id: str, coin_service: Optional[CoinService] = None):
    """
    Convenience function to track quest progress on login.
    
    Args:
        db: Database session
        user_id: User identifier
        coin_service: Optional CoinService instance for awarding coins
    """
    tracker = QuestTracker(db, coin_service)
    tracker.track_login(user_id)
