"""
Rainbow Rush Repository
Data access layer for Rainbow Rush game
Following Repository Pattern and SOLID principles
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime
import uuid

from .models import RainbowRushProgress, RainbowRushLevelCompletion, RainbowRushGameSession


class RainbowRushRepository:
    """
    Repository for Rainbow Rush game data
    Single Responsibility: Handle all database operations for Rainbow Rush
    Dependency Inversion: Depends on Session abstraction, not concrete implementation
    """
    
    def __init__(self, db_session: Session):
        """
        Initialize repository with database session
        
        Args:
            db_session: SQLAlchemy database session
        """
        self.db = db_session
    
    # ==================== PROGRESS METHODS ====================
    
    def get_or_create_progress(self, user_id: str) -> RainbowRushProgress:
        """
        Get existing progress or create new one for user
        
        Args:
            user_id: User identifier
            
        Returns:
            RainbowRushProgress instance
        """
        try:
            progress = self.db.query(RainbowRushProgress).filter(
                RainbowRushProgress.user_id == user_id
            ).first()
            
            if not progress:
                progress = RainbowRushProgress(
                    progress_id=f"rr_prog_{user_id}",
                    user_id=user_id,
                    current_level=1,
                    max_level_unlocked=1,
                    total_coins=0,
                    total_stars=0,
                    high_score=0,
                    level_completions='{}',
                    unlocked_items='{"skins": ["default"], "abilities": ["jump"]}',
                    statistics='{}',
                    created_at=datetime.utcnow().isoformat(),
                    last_played=datetime.utcnow().isoformat(),
                    updated_at=datetime.utcnow().isoformat(),
                    metadata='{}'
                )
                self.db.add(progress)
                self.db.commit()
                self.db.refresh(progress)
            
            return progress
        except SQLAlchemyError as e:
            self.db.rollback()
            raise Exception(f"Error getting/creating progress: {str(e)}")
    
    def update_progress(self, progress_id: str, data: Dict[str, Any]) -> Optional[RainbowRushProgress]:
        """
        Update player progress
        
        Args:
            progress_id: Progress identifier
            data: Dictionary with fields to update
            
        Returns:
            Updated RainbowRushProgress or None
        """
        try:
            progress = self.db.query(RainbowRushProgress).filter(
                RainbowRushProgress.progress_id == progress_id
            ).first()
            
            if not progress:
                return None
            
            # Update allowed fields
            allowed_fields = [
                'current_level', 'max_level_unlocked', 'total_coins', 
                'total_stars', 'high_score', 'level_completions',
                'unlocked_items', 'statistics', 'metadata'
            ]
            
            for key, value in data.items():
                if key in allowed_fields and hasattr(progress, key):
                    setattr(progress, key, value)
            
            progress.updated_at = datetime.utcnow().isoformat()
            progress.last_played = datetime.utcnow().isoformat()
            
            self.db.commit()
            self.db.refresh(progress)
            return progress
        except SQLAlchemyError as e:
            self.db.rollback()
            raise Exception(f"Error updating progress: {str(e)}")
    
    def get_progress_by_user(self, user_id: str) -> Optional[RainbowRushProgress]:
        """Get progress by user ID"""
        try:
            return self.db.query(RainbowRushProgress).filter(
                RainbowRushProgress.user_id == user_id
            ).first()
        except SQLAlchemyError as e:
            raise Exception(f"Error fetching progress: {str(e)}")
    
    # ==================== LEVEL COMPLETION METHODS ====================
    
    def create_level_completion(self, completion_data: Dict[str, Any]) -> RainbowRushLevelCompletion:
        """
        Create new level completion record
        
        Args:
            completion_data: Dictionary with completion data
            
        Returns:
            Created RainbowRushLevelCompletion
        """
        try:
            completion = RainbowRushLevelCompletion(
                completion_id=f"rr_comp_{uuid.uuid4().hex[:16]}",
                user_id=completion_data['user_id'],
                progress_id=completion_data['progress_id'],
                level_id=completion_data['level_id'],
                level_name=completion_data.get('level_name', f"Level {completion_data['level_id']}"),
                stars_earned=completion_data.get('stars_earned', 0),
                completion_time=completion_data.get('completion_time', 0.0),
                score=completion_data.get('score', 0),
                objectives_completed=completion_data.get('objectives_completed', '[]'),
                level_stats=completion_data.get('level_stats', '{}'),
                is_validated=completion_data.get('is_validated', 0),
                validation_score=completion_data.get('validation_score', 0.0),
                completed_at=datetime.utcnow().isoformat(),
                created_at=datetime.utcnow().isoformat(),
                session_duration=completion_data.get('session_duration', 0.0),
                client_timestamp=completion_data.get('client_timestamp')
            )
            
            self.db.add(completion)
            self.db.commit()
            self.db.refresh(completion)
            return completion
        except SQLAlchemyError as e:
            self.db.rollback()
            raise Exception(f"Error creating level completion: {str(e)}")
    
    def get_level_completions(self, user_id: str, level_id: Optional[int] = None) -> List[RainbowRushLevelCompletion]:
        """
        Get level completions for user
        
        Args:
            user_id: User identifier
            level_id: Optional level ID to filter
            
        Returns:
            List of completions
        """
        try:
            query = self.db.query(RainbowRushLevelCompletion).filter(
                RainbowRushLevelCompletion.user_id == user_id
            )
            
            if level_id is not None:
                query = query.filter(RainbowRushLevelCompletion.level_id == level_id)
            
            return query.order_by(RainbowRushLevelCompletion.completed_at.desc()).all()
        except SQLAlchemyError as e:
            raise Exception(f"Error fetching level completions: {str(e)}")
    
    def get_best_completion(self, user_id: str, level_id: int) -> Optional[RainbowRushLevelCompletion]:
        """Get best completion for specific level (highest stars, then best time)"""
        try:
            return self.db.query(RainbowRushLevelCompletion).filter(
                RainbowRushLevelCompletion.user_id == user_id,
                RainbowRushLevelCompletion.level_id == level_id
            ).order_by(
                RainbowRushLevelCompletion.stars_earned.desc(),
                RainbowRushLevelCompletion.completion_time.asc()
            ).first()
        except SQLAlchemyError as e:
            raise Exception(f"Error fetching best completion: {str(e)}")
    
    # ==================== SESSION METHODS ====================
    
    def create_session(self, user_id: str, progress_id: str, level_id: int) -> RainbowRushGameSession:
        """
        Create new game session
        
        Args:
            user_id: User identifier
            progress_id: Progress identifier
            level_id: Level being played
            
        Returns:
            Created session
        """
        try:
            session = RainbowRushGameSession(
                session_id=f"rr_sess_{uuid.uuid4().hex[:16]}",
                user_id=user_id,
                progress_id=progress_id,
                level_id=level_id,
                is_active=1,
                session_events='[]',
                current_stats='{}',
                started_at=datetime.utcnow().isoformat(),
                last_update=datetime.utcnow().isoformat(),
                ended_at=None,
                heartbeat_count=0,
                anomaly_flags=0
            )
            
            self.db.add(session)
            self.db.commit()
            self.db.refresh(session)
            return session
        except SQLAlchemyError as e:
            self.db.rollback()
            raise Exception(f"Error creating session: {str(e)}")
    
    def update_session(self, session_id: str, data: Dict[str, Any]) -> Optional[RainbowRushGameSession]:
        """
        Update game session
        
        Args:
            session_id: Session identifier
            data: Update data
            
        Returns:
            Updated session or None
        """
        try:
            session = self.db.query(RainbowRushGameSession).filter(
                RainbowRushGameSession.session_id == session_id
            ).first()
            
            if not session:
                return None
            
            allowed_fields = [
                'current_stats', 'session_events', 'heartbeat_count', 
                'anomaly_flags', 'is_active', 'ended_at'
            ]
            
            for key, value in data.items():
                if key in allowed_fields and hasattr(session, key):
                    setattr(session, key, value)
            
            session.last_update = datetime.utcnow().isoformat()
            
            self.db.commit()
            self.db.refresh(session)
            return session
        except SQLAlchemyError as e:
            self.db.rollback()
            raise Exception(f"Error updating session: {str(e)}")
    
    def get_session(self, session_id: str) -> Optional[RainbowRushGameSession]:
        """Get session by ID"""
        try:
            return self.db.query(RainbowRushGameSession).filter(
                RainbowRushGameSession.session_id == session_id
            ).first()
        except SQLAlchemyError as e:
            raise Exception(f"Error fetching session: {str(e)}")
    
    def get_active_session(self, user_id: str) -> Optional[RainbowRushGameSession]:
        """Get active session for user"""
        try:
            return self.db.query(RainbowRushGameSession).filter(
                RainbowRushGameSession.user_id == user_id,
                RainbowRushGameSession.is_active == 1
            ).first()
        except SQLAlchemyError as e:
            raise Exception(f"Error fetching active session: {str(e)}")
    
    def end_session(self, session_id: str) -> Optional[RainbowRushGameSession]:
        """End an active session"""
        try:
            session = self.get_session(session_id)
            if session:
                session.is_active = 0
                session.ended_at = datetime.utcnow().isoformat()
                session.last_update = datetime.utcnow().isoformat()
                self.db.commit()
                self.db.refresh(session)
            return session
        except SQLAlchemyError as e:
            self.db.rollback()
            raise Exception(f"Error ending session: {str(e)}")
