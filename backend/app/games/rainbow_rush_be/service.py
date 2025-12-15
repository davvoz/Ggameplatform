"""
Rainbow Rush Service Layer
Business logic and anti-cheat validation for Rainbow Rush
Following SOLID principles and Domain-Driven Design
"""

from typing import Dict, Any, Optional, List
from datetime import datetime
import json
import math
from functools import lru_cache

from .repository import RainbowRushRepository
from .models import RainbowRushProgress, RainbowRushLevelCompletion, RainbowRushGameSession


class ValidationError(Exception):
    """Custom exception for validation errors"""
    pass


class AntiCheatValidator:
    """
    Anti-cheat validation logic
    Single Responsibility: Validate game data for cheating
    """
    
    # Level-based expected completion times (in seconds)
    EXPECTED_MIN_TIMES = {
        1: 10,   # Level 1 minimum 10 seconds
        2: 15,
        3: 20,
        4: 25,
        5: 30,
    }
    
    # Maximum reasonable scores per level
    MAX_SCORES = {
        1: 10000,
        2: 15000,
        3: 20000,
        4: 25000,
        5: 30000,
    }
    
    @staticmethod
    def validate_level_completion(level_id: int, completion_time: float, score: int, 
                                   level_stats: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate level completion data for anomalies
        
        Args:
            level_id: Level identifier
            completion_time: Time taken to complete (seconds)
            score: Score achieved
            level_stats: Additional statistics
            
        Returns:
            Dictionary with validation results
        """
        anomalies = []
        validation_score = 1.0  # Start with perfect score
        
        # Check completion time (too fast = suspicious)
        min_time = AntiCheatValidator.EXPECTED_MIN_TIMES.get(level_id, 10)
        if completion_time < min_time:
            anomalies.append(f"Completion time too fast: {completion_time}s < {min_time}s")
            validation_score -= 0.5
        
        # Check if completion time is unreasonably fast (< 1 second)
        if completion_time < 1.0:
            anomalies.append(f"Impossible completion time: {completion_time}s")
            validation_score -= 0.3
        
        # Check score bounds
        max_score = AntiCheatValidator.MAX_SCORES.get(level_id, 50000)
        if score > max_score:
            anomalies.append(f"Score too high: {score} > {max_score}")
            validation_score -= 0.4
        
        # Check negative values
        if score < 0:
            anomalies.append("Negative score detected")
            validation_score -= 0.5
        
        # Validate level stats
        coins_collected = level_stats.get('coins_collected', 0)
        enemies_killed = level_stats.get('enemies_killed', 0)
        
        if coins_collected < 0 or enemies_killed < 0:
            anomalies.append("Negative stats detected")
            validation_score -= 0.3
        
        # Ensure validation score doesn't go below 0
        validation_score = max(0.0, validation_score)
        
        return {
            'is_valid': len(anomalies) == 0,
            'validation_score': validation_score,
            'anomalies': anomalies,
            'trusted': validation_score >= 0.7
        }
    
    @staticmethod
    def validate_session_heartbeat(session: RainbowRushGameSession, 
                                    elapsed_time: float) -> bool:
        """
        Validate session heartbeat for suspicious activity
        
        Args:
            session: Game session
            elapsed_time: Time elapsed since session start
            
        Returns:
            True if valid, False if suspicious
        """
        # Check if heartbeat count is reasonable for elapsed time
        # Expected: ~1 heartbeat every 5-10 seconds
        expected_heartbeats = elapsed_time / 7.5  # Average
        
        if session.heartbeat_count < expected_heartbeats * 0.5:
            return False  # Too few heartbeats
        
        if session.heartbeat_count > expected_heartbeats * 2.0:
            return False  # Too many heartbeats
        
        return True


class RainbowRushService:
    """
    Service layer for Rainbow Rush game logic
    Single Responsibility: Orchestrate business operations and validation
    Open/Closed: Extensible for new features
    """
    
    def __init__(self, repository: RainbowRushRepository):
        """
        Initialize service with repository
        
        Args:
            repository: RainbowRushRepository instance
        """
        self.repository = repository
        self.validator = AntiCheatValidator()
    
    # ==================== PROGRESS OPERATIONS ====================
    
    def get_player_progress(self, user_id: str) -> Dict[str, Any]:
        """
        Get or create player progress
        
        Args:
            user_id: User identifier
            
        Returns:
            Progress data as dictionary
        """
        progress = self.repository.get_or_create_progress(user_id)
        return progress.to_dict()
    
    def update_player_progress(self, user_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update player progress with validation
        
        Args:
            user_id: User identifier
            update_data: Data to update
            
        Returns:
            Updated progress data
        """
        progress = self.repository.get_progress_by_user(user_id)
        if not progress:
            raise ValidationError(f"Progress not found for user {user_id}")
        
        # Validate updates
        if 'max_level_unlocked' in update_data:
            new_level = update_data['max_level_unlocked']
            if new_level > progress.max_level_unlocked + 1:
                raise ValidationError("Cannot skip levels")
        
        # Convert JSON fields to strings if needed
        if 'level_completions' in update_data and isinstance(update_data['level_completions'], dict):
            update_data['level_completions'] = json.dumps(update_data['level_completions'])
        
        if 'unlocked_items' in update_data and isinstance(update_data['unlocked_items'], dict):
            update_data['unlocked_items'] = json.dumps(update_data['unlocked_items'])
        
        if 'statistics' in update_data and isinstance(update_data['statistics'], dict):
            update_data['statistics'] = json.dumps(update_data['statistics'])
        
        updated_progress = self.repository.update_progress(progress.progress_id, update_data)
        return updated_progress.to_dict() if updated_progress else None
    
    def save_level_progress(self, user_id: str, level_id: int, 
                            level_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Save progress for a specific level
        
        Args:
            user_id: User identifier
            level_id: Level identifier
            level_data: Level completion data
            
        Returns:
            Updated progress
        """
        progress = self.repository.get_or_create_progress(user_id)
        
        # Parse existing completions solo se necessario
        try:
            completions = json.loads(progress.level_completions) if progress.level_completions else {}
        except (json.JSONDecodeError, TypeError):
            completions = {}
        
        # Update level data
        level_key = str(level_id)
        current_stars = completions.get(level_key, {}).get('stars', 0)
        new_stars = level_data.get('stars', 0)
        
        # Update solo se migliorato
        if level_key not in completions or new_stars > current_stars:
            completions[level_key] = level_data
        
        # Update progress
        update_data = {
            'level_completions': json.dumps(completions),
            'max_level_unlocked': max(progress.max_level_unlocked, level_id + 1)
        }
        
        # Calcola total_stars solo se c'è stato un aggiornamento
        if 'stars' in level_data and new_stars > current_stars:
            update_data['total_stars'] = sum(
                comp.get('stars', 0) for comp in completions.values()
            )
        
        updated = self.repository.update_progress(progress.progress_id, update_data)
        return updated.to_dict() if updated else None
    
    # ==================== LEVEL COMPLETION OPERATIONS ====================
    
    def submit_level_completion(self, user_id: str, completion_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Submit and validate level completion
        
        Args:
            user_id: User identifier
            completion_data: Completion data to submit
            
        Returns:
            Created completion record with validation results
        """
        progress = self.repository.get_or_create_progress(user_id)
        
        level_id = completion_data.get('level_id')
        completion_time = completion_data.get('completion_time', 0.0)
        score = completion_data.get('score', 0)
        level_stats = completion_data.get('level_stats', {})
        
        # Validate completion data
        validation_result = self.validator.validate_level_completion(
            level_id, completion_time, score, level_stats
        )
        
        # Prepare completion record
        completion_record = {
            'user_id': user_id,
            'progress_id': progress.progress_id,
            'level_id': level_id,
            'level_name': completion_data.get('level_name', f"Level {level_id}"),
            'stars_earned': completion_data.get('stars_earned', 0),
            'completion_time': completion_time,
            'score': score,
            'objectives_completed': json.dumps(completion_data.get('objectives_completed', [])),
            'level_stats': json.dumps(level_stats),
            'is_validated': 1 if validation_result['is_valid'] else 0,
            'validation_score': validation_result['validation_score'],
            'session_duration': completion_data.get('session_duration', completion_time),
            'client_timestamp': completion_data.get('client_timestamp')
        }
        
        # Create completion record
        completion = self.repository.create_level_completion(completion_record)
        
        # Update progress if this is a better completion
        self.save_level_progress(user_id, level_id, {
            'stars': completion_data.get('stars_earned', 0),
            'best_time': completion_time,
            'completed': True
        })
        
        result = completion.to_dict()
        result['validation'] = validation_result
        
        return result
    
    def get_level_history(self, user_id: str, level_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Get completion history for user
        
        Args:
            user_id: User identifier
            level_id: Optional level filter
            
        Returns:
            List of completion records
        """
        completions = self.repository.get_level_completions(user_id, level_id)
        return [comp.to_dict() for comp in completions]
    
    # ==================== SESSION OPERATIONS ====================
    
    def start_game_session(self, user_id: str, level_id: int) -> Dict[str, Any]:
        """
        Start a new game session
        
        Args:
            user_id: User identifier
            level_id: Level being played
            
        Returns:
            Created session data
        """
        progress = self.repository.get_or_create_progress(user_id)
        
        # End any existing active session
        active_session = self.repository.get_active_session(user_id)
        if active_session:
            self.repository.end_session(active_session.session_id)
        
        # Create new session
        session = self.repository.create_session(user_id, progress.progress_id, level_id)
        return session.to_dict()
    
    def update_game_session(self, session_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update game session (heartbeat, stats, events)
        
        Args:
            session_id: Session identifier
            update_data: Update data
            
        Returns:
            Updated session data
        """
        session = self.repository.get_session(session_id)
        if not session:
            raise ValidationError(f"Session {session_id} not found")
        
        # Increment heartbeat if requested
        if update_data.get('heartbeat'):
            update_data['heartbeat_count'] = session.heartbeat_count + 1
            
            # Validate heartbeat
            started = datetime.fromisoformat(session.started_at)
            elapsed = (datetime.utcnow() - started).total_seconds()
            
            if not self.validator.validate_session_heartbeat(session, elapsed):
                # Mark anomaly
                update_data['anomaly_flags'] = session.anomaly_flags | 0x01  # Bit 0: heartbeat anomaly
        
        # Convert JSON fields
        if 'current_stats' in update_data and isinstance(update_data['current_stats'], dict):
            update_data['current_stats'] = json.dumps(update_data['current_stats'])
        
        if 'session_events' in update_data and isinstance(update_data['session_events'], list):
            update_data['session_events'] = json.dumps(update_data['session_events'])
        
        updated_session = self.repository.update_session(session_id, update_data)
        return updated_session.to_dict() if updated_session else None
    
    def end_game_session(self, session_id: str) -> Dict[str, Any]:
        """
        End an active game session
        
        Args:
            session_id: Session identifier
            
        Returns:
            Ended session data
        """
        session = self.repository.end_session(session_id)
        
        # Track quest progress for RainbowRushGameSession
        # Note: Generic GameSession records created by runtimeShell.js already track quests
        # This is additional tracking for Rainbow Rush specific sessions
        if session:
            from app.quest_tracker import track_quest_progress_for_session
            from app.repositories import RepositoryFactory
            from app.services import ServiceFactory
            
            # Calculate session duration
            if session.started_at and session.ended_at:
                started = datetime.fromisoformat(session.started_at)
                ended = datetime.fromisoformat(session.ended_at)
                duration_seconds = int((ended - started).total_seconds())
            else:
                duration_seconds = 0
            
            # Extract score from current_stats if available
            score = 0
            try:
                if session.current_stats:
                    stats = json.loads(session.current_stats) if isinstance(session.current_stats, str) else session.current_stats
                    score = stats.get('score', 0)
                    print(f"🎯 [Rainbow Rush] Extracted score from session: {score}")
                    print(f"📊 [Rainbow Rush] Full stats: {stats}")
            except Exception as e:
                print(f"⚠️ [Rainbow Rush] Error extracting score: {e}")
                pass
            
            # Get total XP earned from progress during this session
            xp_earned = 0
            try:
                progress = self.repository.get_progress_by_user(session.user_id)
                if progress and progress.statistics:
                    stats = json.loads(progress.statistics) if isinstance(progress.statistics, str) else progress.statistics
                    xp_earned = stats.get('session_xp', 0)
            except:
                pass
            
            # Prepare session data for quest tracker
            session_data = {
                'user_id': session.user_id,
                'game_id': 'rainbow_rush',
                'score': score,
                'duration_seconds': duration_seconds,
                'xp_earned': xp_earned
            }
            
            # Get coin service for quest rewards
            # IMPORTANT: Use platform database for quest tracking, not Rainbow Rush game DB
            try:
                from app.database import SessionLocal
                
                # Create a platform database session for quest tracking
                platform_db = SessionLocal()
                try:
                    coin_repo = RepositoryFactory.create_usercoins_repository(platform_db)
                    transaction_repo = RepositoryFactory.create_cointransaction_repository(platform_db)
                    coin_service = ServiceFactory.create_coin_service(coin_repo, transaction_repo)
                    
                    track_quest_progress_for_session(platform_db, session_data, coin_service)
                    platform_db.commit()
                    print(f"✅ Quest progress tracked for Rainbow Rush session {session_id} (score: {score}, duration: {duration_seconds}s)")
                except Exception as e:
                    platform_db.rollback()
                    print(f"⚠️ Failed to track quest progress for session {session_id}: {e}")
                    import traceback
                    traceback.print_exc()
                finally:
                    platform_db.close()
            except Exception as e:
                print(f"⚠️ Failed to initialize platform database for quest tracking: {e}")
        
        return session.to_dict() if session else None
    
    def get_active_session(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get active session for user
        
        Args:
            user_id: User identifier
            
        Returns:
            Active session data or None
        """
        session = self.repository.get_active_session(user_id)
        return session.to_dict() if session else None
