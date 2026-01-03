"""
Quest Tracker - Automatically updates user quest progress
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from sqlalchemy import func
import json

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
                started_at=now,
                extra_data='{}'
            )
            self.db.add(user_quest)
            self.db.flush()
        
        return user_quest
    
    def _get_quest_extra_data(self, user_quest: UserQuest) -> dict:
        """Get extra_data as a dictionary."""
        if not user_quest.extra_data:
            return {}
        try:
            return json.loads(user_quest.extra_data)
        except:
            return {}
    
    def _set_quest_extra_data(self, user_quest: UserQuest, data: dict):
        """Set extra_data from a dictionary."""
        user_quest.extra_data = json.dumps(data)
    
    def _get_today_date(self) -> str:
        """Get today's date as YYYY-MM-DD string."""
        return datetime.utcnow().strftime('%Y-%m-%d')
    
    def _get_week_start_date(self) -> str:
        """Get the start of current week (Monday) as YYYY-MM-DD string."""
        today = datetime.utcnow()
        week_start = today - timedelta(days=today.weekday())
        return week_start.strftime('%Y-%m-%d')
    
    def _reset_if_needed(self, user_quest: UserQuest, period: str) -> bool:
        """
        Reset quest progress if the time period has changed.
        Returns True if reset occurred.
        
        Args:
            user_quest: The UserQuest instance
            period: 'daily' or 'weekly'
        """
        extra_data = self._get_quest_extra_data(user_quest)
        
        if period == 'daily':
            today = self._get_today_date()
            last_date = extra_data.get('last_reset_date')
            
            if last_date != today:
                # New day, reset progress
                user_quest.current_progress = 0
                extra_data['last_reset_date'] = today
                self._set_quest_extra_data(user_quest, extra_data)
                return True
                
        elif period == 'weekly':
            week_start = self._get_week_start_date()
            last_week = extra_data.get('last_reset_week')
            
            if last_week != week_start:
                # New week, reset progress
                user_quest.current_progress = 0
                extra_data['last_reset_week'] = week_start
                self._set_quest_extra_data(user_quest, extra_data)
                return True
        
        return False
    
    def update_quest_progress(self, user_id: str, quest: Quest, new_progress: int, user_quest: UserQuest = None):
        """Update progress for a specific quest."""
        if quest.is_active == 0:
            return
        
        if user_quest is None:
            user_quest = self.get_or_create_user_quest(user_id, quest.quest_id)
        
        # For cumulative quests (login_streak, reach_level), always update progress
        # even if already completed, to show current status
        cumulative_quest_types = ['login_streak', 'reach_level', 'leaderboard_top']
        
        # Don't update if already completed (except for cumulative quests)
        if user_quest.is_completed and quest.quest_type not in cumulative_quest_types:
            return
        
        # Update progress
        user_quest.current_progress = new_progress
        print(f"    📈 [QuestTracker] Updated progress: {quest.title} -> {new_progress}/{quest.target_value}")
        
        # Check if quest is completed
        if user_quest.current_progress >= quest.target_value:
            # Only mark as completed and award rewards if it wasn't already completed
            if not user_quest.is_completed:
                user_quest.is_completed = 1
                user_quest.completed_at = datetime.utcnow().isoformat()
                
                # Save completion date for daily reset logic
                extra_data = self._get_quest_extra_data(user_quest)
                extra_data['last_completion_date'] = self._get_today_date()
                self._set_quest_extra_data(user_quest, extra_data)

                # Award XP (only once)
                user = self.db.query(User).filter(User.user_id == user_id).first()
                if user:
                    # Do NOT add XP here. Rewards must be claimed by the user via
                    # the `/api/quests/claim/{quest_id}` endpoint. Marking the
                    # quest as completed is enough; the claim handler will add
                    # XP and coins when the user explicitly claims the reward.
                    pass

                # Award coins if coin service is available
                # Note: Coin service is disabled during session tracking to avoid transaction conflicts
                # Coins will be awarded when user claims the quest reward
                if self.coin_service and False:  # Temporarily disabled
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
        extra_data = session_data.get('extra_data', {}) or {}
        
        print(f"🎯 [QuestTracker] track_session_end called:")
        print(f"    user_id: {user_id}, game_id: {game_id}, score: {score}")
        print(f"    extra_data: {extra_data}")
        
        if not user_id:
            print(f"⚠️ [QuestTracker] No user_id, skipping quest tracking")
            return
        
        # Get all active quests
        quests = self.db.query(Quest).filter(Quest.is_active == 1).all()
        print(f"📋 [QuestTracker] Found {len(quests)} active quests to check")
        
        for quest in quests:
            self._process_quest_for_session(user_id, quest, game_id, score, duration_seconds, xp_earned, extra_data)
        
        # Note: Do NOT commit here - let the caller manage the transaction
        # self.db.commit()
    
    def _process_quest_for_session(self, user_id: str, quest: Quest, game_id: str, 
                                   score: int, duration_seconds: int, xp_earned: float,
                                   extra_data: Dict = None):
        """Process a single quest based on session data."""
        
        extra_data = extra_data or {}
        quest_type = quest.quest_type
        
        # Parse quest config to check for game-specific quests
        quest_config = {}
        try:
            quest_config = json.loads(quest.config) if quest.config else {}
        except:
            pass
        
        # Check if this quest is for a specific game
        quest_game_id = quest_config.get('game_id')
        if quest_game_id and quest_game_id != game_id:
            # This quest is for a different game, skip
            return
        
        # Get the quest tracking type from config
        tracking_type = quest_config.get('type', '')
        
        # ============ GAME-SPECIFIC QUEST HANDLING ============
        
        # Seven game quests
        if game_id == 'seven' and tracking_type:
            print(f"🎲 [QuestTracker] Processing Seven quest: {quest.title} (type: {tracking_type})")
            self._process_seven_quest(user_id, quest, quest_config, tracking_type, score, extra_data)
            return
        
        # Yatzi game quests
        if game_id == 'yatzi_3d_by_luciogiolli' and tracking_type:
            print(f"🎲 [QuestTracker] Processing Yatzi quest: {quest.title} (type: {tracking_type})")
            self._process_yatzi_quest(user_id, quest, quest_config, tracking_type, score, extra_data)
            return
        
        # Merge Tower Defense game quests
        if game_id == 'merge-tower-defense' and tracking_type:
            print(f"🏰 [QuestTracker] Processing MTD quest: {quest.title} (type: {tracking_type})")
            self._process_merge_td_quest(user_id, quest, quest_config, tracking_type, score, extra_data)
            return
        
        # Rainbow Rush game quests
        if game_id == 'rainbow-rush' and tracking_type:
            print(f"🌈 [QuestTracker] Processing RR quest: {quest.title} (type: {tracking_type})")
            self._process_rainbow_rush_quest(user_id, quest, quest_config, tracking_type, score, extra_data)
            return
        
        # ============ GENERIC QUEST HANDLING ============
        
        # Play games quests (cumulative)
        if quest_type == "play_games":
            # Count completed sessions - filter by game_id if specified in quest config
            query = self.db.query(GameSession).filter(
                GameSession.user_id == user_id,
                GameSession.ended_at.isnot(None)
            )
            # If quest is for a specific game, only count sessions for that game
            if quest_game_id:
                query = query.filter(GameSession.game_id == quest_game_id)
            total_sessions = query.count()
            self.update_quest_progress(user_id, quest, total_sessions)
        
        # Play games weekly (resets each week)
        elif quest_type == "play_games_weekly":
            user_quest = self.get_or_create_user_quest(user_id, quest.quest_id)
            self._reset_if_needed(user_quest, 'weekly')
            
            # Count sessions this week
            week_start = datetime.strptime(self._get_week_start_date(), '%Y-%m-%d')
            sessions_this_week = self.db.query(GameSession).filter(
                GameSession.user_id == user_id,
                GameSession.ended_at.isnot(None),
                GameSession.ended_at >= week_start.isoformat()
            ).count()
            
            self.update_quest_progress(user_id, quest, sessions_this_week)
        
        # Play time quests (total cumulative)
        elif quest_type == "play_time":
            # Sum total playtime
            total_seconds = self.db.query(func.sum(GameSession.duration_seconds)).filter(
                GameSession.user_id == user_id,
                GameSession.ended_at.isnot(None)
            ).scalar() or 0
            self.update_quest_progress(user_id, quest, int(total_seconds))
        
        # Play time daily (resets each day)
        elif quest_type == "play_time_daily":
            user_quest = self.get_or_create_user_quest(user_id, quest.quest_id)
            self._reset_if_needed(user_quest, 'daily')
            
            # Sum playtime today
            today_start = datetime.strptime(self._get_today_date(), '%Y-%m-%d')
            total_seconds_today = self.db.query(func.sum(GameSession.duration_seconds)).filter(
                GameSession.user_id == user_id,
                GameSession.ended_at.isnot(None),
                GameSession.ended_at >= today_start.isoformat()
            ).scalar() or 0
            
            self.update_quest_progress(user_id, quest, int(total_seconds_today))
        
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
        
        # Score threshold per game - Complete N games with score >= threshold
        elif quest_type == "score_threshold_per_game":
            # Get score threshold from quest config
            config = {}
            try:
                config = json.loads(quest.config) if quest.config else {}
            except:
                pass
            
            # Default to 100 if not specified
            min_score = config.get('min_score', 100)
            
            # Count sessions with score >= threshold for this game
            sessions_with_threshold = self.db.query(GameSession).filter(
                GameSession.user_id == user_id,
                GameSession.game_id == game_id,  # Same game
                GameSession.ended_at.isnot(None),
                GameSession.score >= min_score
            ).count()
            
            self.update_quest_progress(user_id, quest, sessions_with_threshold)
        
        # Score ends with specific digit
        elif quest_type == "score_ends_with":
            target_digit = quest.target_value
            if score % 10 == target_digit:
                self.update_quest_progress(user_id, quest, 1)
        
        # Reach level (based on XP)
        elif quest_type == "reach_level":
            user = self.db.query(User).filter(User.user_id == user_id).first()
            if user:
                # Use LevelSystem to get accurate current level
                from app.level_system import LevelSystem
                current_level = LevelSystem.calculate_level_from_xp(user.total_xp_earned)
                self.update_quest_progress(user_id, quest, current_level)
        
        # XP daily (resets each day)
        elif quest_type == "xp_daily":
            user_quest = self.get_or_create_user_quest(user_id, quest.quest_id)
            self._reset_if_needed(user_quest, 'daily')
            
            # Sum XP earned today
            today_start = datetime.strptime(self._get_today_date(), '%Y-%m-%d')
            total_xp_today = self.db.query(func.sum(GameSession.xp_earned)).filter(
                GameSession.user_id == user_id,
                GameSession.ended_at.isnot(None),
                GameSession.ended_at >= today_start.isoformat()
            ).scalar() or 0
            
            self.update_quest_progress(user_id, quest, int(total_xp_today))
        
        # XP weekly (resets each week)
        elif quest_type == "xp_weekly":
            user_quest = self.get_or_create_user_quest(user_id, quest.quest_id)
            self._reset_if_needed(user_quest, 'weekly')
            
            # Sum XP earned this week
            week_start = datetime.strptime(self._get_week_start_date(), '%Y-%m-%d')
            total_xp_week = self.db.query(func.sum(GameSession.xp_earned)).filter(
                GameSession.user_id == user_id,
                GameSession.ended_at.isnot(None),
                GameSession.ended_at >= week_start.isoformat()
            ).scalar() or 0
            
            self.update_quest_progress(user_id, quest, int(total_xp_week))
        
        # Leaderboard top - handled separately in update_leaderboard_quests
        elif quest_type == "leaderboard_top":
            # This is checked separately when leaderboard updates
            pass
        
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
        
        today = self._get_today_date()
        yesterday = (datetime.utcnow() - timedelta(days=1)).strftime('%Y-%m-%d')
        
        # Update login streak
        if user.last_login_date:
            if user.last_login_date == yesterday:
                # Consecutive day login
                user.login_streak = (user.login_streak or 0) + 1
            elif user.last_login_date == today:
                # Already logged in today, don't change streak
                pass
            else:
                # Streak broken, reset to 1
                user.login_streak = 1
        else:
            # First login ever
            user.login_streak = 1
        
        # Update last_login_date
        old_login_date = user.last_login_date
        user.last_login_date = today
        
        self.db.flush()
        
        quests = self.db.query(Quest).filter(Quest.is_active == 1).all()
        
        for quest in quests:
            # Login after 24h quest
            if quest.quest_type == "login_after_24h":
                # Check if last login was more than 24 hours ago
                if user.last_login:
                    try:
                        last_login = datetime.fromisoformat(user.last_login)
                        time_since_login = datetime.utcnow() - last_login
                        
                        # If more than 24 hours have passed, count it
                        if time_since_login >= timedelta(hours=24):
                            # Get or create user quest to track how many times this happened
                            user_quest = self.get_or_create_user_quest(user_id, quest.quest_id)
                            
                            # Check if we already counted today's login
                            extra_data = self._get_quest_extra_data(user_quest)
                            last_counted_date = extra_data.get('last_counted_date')
                            
                            if last_counted_date != today:
                                # Increment progress
                                self.update_quest_progress(user_id, quest, user_quest.current_progress + 1)
                                extra_data['last_counted_date'] = today
                                self._set_quest_extra_data(user_quest, extra_data)
                                self.db.flush()
                    except Exception as e:
                        print(f"⚠️ Error processing login_after_24h quest: {e}")
            
            # Login streak quest
            elif quest.quest_type == "login_streak":
                # Update progress to current streak
                current_streak = user.login_streak or 0
                self.update_quest_progress(user_id, quest, current_streak)
        
        # Note: Do NOT commit here - let the caller manage the transaction
        # self.db.commit()
    
    def _process_seven_quest(self, user_id: str, quest: Quest, quest_config: Dict, 
                              tracking_type: str, score: int, extra_data: Dict):
        """Process Seven game-specific quests."""
        print(f"    🎰 [Seven] Processing quest {quest.quest_id}: {quest.title}")
        print(f"        tracking_type: {tracking_type}, extra_data: {extra_data}")
        
        user_quest = self.get_or_create_user_quest(user_id, quest.quest_id)
        stored_data = self._get_quest_extra_data(user_quest)
        
        # Check for daily reset (only if quest was completed AND it's a new day)
        reset_period = quest_config.get('reset_period')
        reset_on_complete = quest_config.get('reset_on_complete', False)
        
        if reset_period == 'daily' and reset_on_complete:
            today = self._get_today_date()
            last_completion_date = stored_data.get('last_completion_date')
            
            # If quest was completed on a previous day, reset it
            if user_quest.is_completed and last_completion_date and last_completion_date != today:
                print(f"    🔄 [Seven] Resetting completed quest for new day: {quest.title}")
                user_quest.is_completed = 0
                user_quest.current_progress = 0
                user_quest.completed_at = None
                user_quest.is_claimed = 0
                user_quest.claimed_at = None
                # Reset cumulative data for the new day
                stored_data['cumulative'] = None
                stored_data['last_reset_date'] = today
                self._set_quest_extra_data(user_quest, stored_data)
                self.db.flush()
                # Re-fetch stored_data after reset
                stored_data = self._get_quest_extra_data(user_quest)
        
        # Initialize cumulative counters if not present or empty (after reset)
        if 'cumulative' not in stored_data or not stored_data['cumulative']:
            stored_data['cumulative'] = {
                'rolls_played': 0,
                'wins': 0,
                'losses': 0,
                'win_streak': 0,
                'max_win_streak': 0,
                'total_profit': 0,
                'roll_seven_count': 0,
                'wins_under': 0,
                'wins_over': 0,
                'max_bet_won': 0
            }
        
        cumulative = stored_data['cumulative']
        
        # Update cumulative stats from extra_data
        if extra_data:
            # Increment rolls played
            cumulative['rolls_played'] += 1
            
            won = extra_data.get('won', False)
            net_profit = extra_data.get('net_profit', 0)
            bet_amount = extra_data.get('bet_amount', 0)
            bet_type = extra_data.get('bet_type', '')
            dice_sum = extra_data.get('sum', 0)
            winnings = extra_data.get('winnings', 0)
            
            # Track wins/losses
            if won:
                cumulative['wins'] += 1
                cumulative['win_streak'] += 1
                cumulative['max_win_streak'] = max(cumulative['max_win_streak'], cumulative['win_streak'])
                
                # Track wins by bet type
                if bet_type == 'under':
                    cumulative['wins_under'] += 1
                elif bet_type == 'over':
                    cumulative['wins_over'] += 1
                
                # Track high bet wins
                if bet_amount > cumulative['max_bet_won']:
                    cumulative['max_bet_won'] = bet_amount
            else:
                cumulative['losses'] += 1
                cumulative['win_streak'] = 0
            
            # Track total profit
            cumulative['total_profit'] += net_profit
            
            # Track rolling 7
            if dice_sum == 7:
                cumulative['roll_seven_count'] += 1
        
        # Save cumulative data
        stored_data['cumulative'] = cumulative
        self._set_quest_extra_data(user_quest, stored_data)
        self.db.flush()
        
        # Now update quest progress based on tracking type
        if tracking_type == 'rolls_played':
            self.update_quest_progress(user_id, quest, cumulative['rolls_played'], user_quest)
        
        elif tracking_type == 'win_streak':
            self.update_quest_progress(user_id, quest, cumulative['max_win_streak'], user_quest)
        
        elif tracking_type == 'total_profit':
            # Only count positive profit
            if cumulative['total_profit'] > 0:
                self.update_quest_progress(user_id, quest, cumulative['total_profit'], user_quest)
        
        elif tracking_type == 'roll_seven':
            self.update_quest_progress(user_id, quest, cumulative['roll_seven_count'], user_quest)
        
        elif tracking_type == 'win_under_bets':
            self.update_quest_progress(user_id, quest, cumulative['wins_under'], user_quest)
        
        elif tracking_type == 'win_over_bets':
            self.update_quest_progress(user_id, quest, cumulative['wins_over'], user_quest)
        
        elif tracking_type == 'win_with_high_bet':
            # min_bet from config specifies the minimum bet amount to count
            min_bet = quest_config.get('min_bet', 30)
            bet_amount = extra_data.get('bet_amount', 0)
            won = extra_data.get('won', False)
            
            # Count wins with high bets
            if won and bet_amount >= min_bet:
                # Initialize counter if not present
                if 'high_bet_wins' not in cumulative:
                    cumulative['high_bet_wins'] = 0
                cumulative['high_bet_wins'] += 1
                
                # Save updated cumulative
                stored_data['cumulative'] = cumulative
                self._set_quest_extra_data(user_quest, stored_data)
                self.db.flush()
                
                print(f"    🎰 [Seven] High bet win! bet={bet_amount} >= min_bet={min_bet}, count={cumulative['high_bet_wins']}")
                self.update_quest_progress(user_id, quest, cumulative['high_bet_wins'], user_quest)
    
    def _process_yatzi_quest(self, user_id: str, quest: Quest, quest_config: Dict, 
                              tracking_type: str, score: int, extra_data: Dict):
        """Process Yatzi 3D game-specific quests."""
        print(f"    🎲 [Yatzi] Processing quest {quest.quest_id}: {quest.title}")
        print(f"        tracking_type: {tracking_type}, extra_data: {extra_data}")
        
        user_quest = self.get_or_create_user_quest(user_id, quest.quest_id)
        stored_data = self._get_quest_extra_data(user_quest)
        
        # Check for daily reset (only if quest was completed AND it's a new day)
        reset_period = quest_config.get('reset_period')
        reset_on_complete = quest_config.get('reset_on_complete', False)
        
        if reset_period == 'daily' and reset_on_complete:
            today = self._get_today_date()
            last_completion_date = stored_data.get('last_completion_date')
            
            # If quest was completed on a previous day, reset it
            if user_quest.is_completed and last_completion_date and last_completion_date != today:
                print(f"    🔄 [Yatzi] Resetting completed quest for new day: {quest.title}")
                user_quest.is_completed = 0
                user_quest.current_progress = 0
                user_quest.completed_at = None
                user_quest.is_claimed = 0
                user_quest.claimed_at = None
                # Reset cumulative data for the new day
                stored_data['cumulative'] = None
                stored_data['last_reset_date'] = today
                self._set_quest_extra_data(user_quest, stored_data)
                self.db.flush()
                # Re-fetch stored_data after reset
                stored_data = self._get_quest_extra_data(user_quest)
        
        # Initialize cumulative counters if not present or empty (after reset)
        if 'cumulative' not in stored_data or not stored_data['cumulative']:
            stored_data['cumulative'] = {
                'games_played': 0,
                'wins': 0,
                'win_streak': 0,
                'max_win_streak': 0,
                'high_score': 0,
                'roll_yatzi_count': 0,
                'full_houses': 0,
                'large_straights': 0,
                'upper_bonus_count': 0
            }
        
        cumulative = stored_data['cumulative']
        
        # Update cumulative stats from extra_data
        if extra_data:
            # Increment games played
            cumulative['games_played'] += 1
            
            winner = extra_data.get('winner', '')
            player_score = score  # Score is player's score
            
            # Track wins
            if winner == 'player':
                cumulative['wins'] += 1
                cumulative['win_streak'] += 1
                cumulative['max_win_streak'] = max(cumulative['max_win_streak'], cumulative['win_streak'])
            else:
                cumulative['win_streak'] = 0
            
            # Track high score
            if player_score > cumulative['high_score']:
                cumulative['high_score'] = player_score
            
            # Track specific achievements from extra_data
            if extra_data.get('roll_yatzi', False):
                cumulative['roll_yatzi_count'] += 1
            
            if extra_data.get('full_house', False):
                cumulative['full_houses'] += 1
            
            if extra_data.get('large_straight', False):
                cumulative['large_straights'] += 1
            
            if extra_data.get('upper_bonus', False):
                cumulative['upper_bonus_count'] += 1
        
        # Save cumulative data
        stored_data['cumulative'] = cumulative
        self._set_quest_extra_data(user_quest, stored_data)
        self.db.flush()
        
        # Now update quest progress based on tracking type
        if tracking_type == 'games_played':
            self.update_quest_progress(user_id, quest, cumulative['games_played'], user_quest)
        
        elif tracking_type == 'wins':
            self.update_quest_progress(user_id, quest, cumulative['wins'], user_quest)
        
        elif tracking_type == 'win_streak':
            self.update_quest_progress(user_id, quest, cumulative['max_win_streak'], user_quest)
        
        elif tracking_type == 'high_score':
            # Check if current high score meets target
            if cumulative['high_score'] >= quest.target_value:
                self.update_quest_progress(user_id, quest, 1, user_quest)
        
        elif tracking_type == 'roll_yatzi':
            self.update_quest_progress(user_id, quest, cumulative['roll_yatzi_count'], user_quest)
        
        elif tracking_type == 'full_houses':
            self.update_quest_progress(user_id, quest, cumulative['full_houses'], user_quest)
        
        elif tracking_type == 'large_straight':
            self.update_quest_progress(user_id, quest, cumulative['large_straights'], user_quest)
        
        elif tracking_type == 'upper_section_bonus':
            self.update_quest_progress(user_id, quest, cumulative['upper_bonus_count'], user_quest)
    
    def _process_merge_td_quest(self, user_id: str, quest: Quest, quest_config: Dict, 
                                 tracking_type: str, score: int, extra_data: Dict):
        """Process Merge Tower Defense game-specific quests."""
        print(f"    🏰 [MTD] Processing quest {quest.quest_id}: {quest.title}")
        print(f"        tracking_type: {tracking_type}, extra_data: {extra_data}")
        
        user_quest = self.get_or_create_user_quest(user_id, quest.quest_id)
        stored_data = self._get_quest_extra_data(user_quest)
        
        # Check for daily reset (only if quest was completed AND it's a new day)
        reset_period = quest_config.get('reset_period')
        reset_on_complete = quest_config.get('reset_on_complete', False)
        today = self._get_today_date()
        
        if reset_period == 'daily' and reset_on_complete:
            last_completion_date = stored_data.get('last_completion_date')
            
            # Only reset if quest WAS completed and it's a new day
            if user_quest.is_completed and last_completion_date and last_completion_date != today:
                print(f"    🔄 Daily reset triggered for {quest.title}")
                user_quest.current_progress = 0
                user_quest.is_completed = 0
                user_quest.is_claimed = 0
                user_quest.completed_at = None
                user_quest.claimed_at = None
                # Reset cumulative data for the new day
                stored_data['cumulative'] = {
                    'total_kills': 0,
                    'total_merges': 0,
                    'max_wave': 0,
                    'games_played': 0
                }
                self._set_quest_extra_data(user_quest, stored_data)
                self.db.flush()
        
        # Initialize cumulative data if not present or None
        if not stored_data.get('cumulative'):
            stored_data['cumulative'] = {
                'total_kills': 0,
                'total_merges': 0,
                'max_wave': 0,
                'games_played': 0
            }
        
        cumulative = stored_data['cumulative']
        
        # Update cumulative stats from extra_data
        if extra_data:
            # Increment games played
            cumulative['games_played'] += 1
            
            # Get session stats
            session_kills = extra_data.get('kills', 0)
            session_merges = extra_data.get('tower_merges', 0)
            session_wave = extra_data.get('wave', 0)
            
            # Accumulate kills and merges
            cumulative['total_kills'] += session_kills
            cumulative['total_merges'] += session_merges
            
            # Track max wave (highest ever reached)
            if session_wave > cumulative['max_wave']:
                cumulative['max_wave'] = session_wave
        
        # Save cumulative data
        stored_data['cumulative'] = cumulative
        self._set_quest_extra_data(user_quest, stored_data)
        self.db.flush()
        
        # Now update quest progress based on tracking type
        if tracking_type == 'max_wave':
            self.update_quest_progress(user_id, quest, cumulative['max_wave'], user_quest)
        
        elif tracking_type == 'tower_merges':
            self.update_quest_progress(user_id, quest, cumulative['total_merges'], user_quest)
        
        elif tracking_type == 'total_kills':
            self.update_quest_progress(user_id, quest, cumulative['total_kills'], user_quest)
        
        elif tracking_type == 'games_played':
            self.update_quest_progress(user_id, quest, cumulative['games_played'], user_quest)
    
    def _process_rainbow_rush_quest(self, user_id: str, quest: Quest, quest_config: Dict, 
                                     tracking_type: str, score: int, extra_data: Dict):
        """Process Rainbow Rush game-specific quests."""
        print(f"    🌈 [RR] Processing quest {quest.quest_id}: {quest.title}")
        print(f"        tracking_type: {tracking_type}, extra_data: {extra_data}")
        
        user_quest = self.get_or_create_user_quest(user_id, quest.quest_id)
        stored_data = self._get_quest_extra_data(user_quest)
        
        # Check for daily reset (only if quest was completed AND it's a new day)
        reset_period = quest_config.get('reset_period')
        reset_on_complete = quest_config.get('reset_on_complete', False)
        today = self._get_today_date()
        
        if reset_period == 'daily' and reset_on_complete:
            last_completion_date = stored_data.get('last_completion_date')
            
            # Only reset if quest WAS completed and it's a new day
            if user_quest.is_completed and last_completion_date and last_completion_date != today:
                print(f"    🔄 Daily reset triggered for {quest.title}")
                user_quest.current_progress = 0
                user_quest.is_completed = 0
                user_quest.is_claimed = 0
                user_quest.completed_at = None
                user_quest.claimed_at = None
                # Reset cumulative data for the new day
                stored_data['cumulative'] = {
                    'levels_completed': 0,
                    'coins_collected': 0,
                    'high_score': 0,
                    'games_played': 0
                }
                self._set_quest_extra_data(user_quest, stored_data)
                self.db.flush()
        
        # Initialize cumulative data if not present or None
        if not stored_data.get('cumulative'):
            stored_data['cumulative'] = {
                'levels_completed': 0,
                'coins_collected': 0,
                'high_score': 0,
                'games_played': 0
            }
        
        cumulative = stored_data['cumulative']
        
        # Update cumulative stats from extra_data
        if extra_data:
            # Increment games played
            cumulative['games_played'] += 1
            
            # Get session stats - Rainbow Rush uses different field names:
            # 'level' for current level (not cumulative), 'collectibles' for coins
            # Also support new naming if frontend is updated
            session_levels = extra_data.get('levels_completed', 0) or extra_data.get('level', 0)
            session_coins = extra_data.get('coins_collected', 0) or extra_data.get('collectibles', 0)
            
            print(f"    🌈 [RR] Session stats: levels={session_levels}, coins={session_coins}, score={score}")
            
            # Accumulate levels and coins
            cumulative['levels_completed'] += session_levels
            cumulative['coins_collected'] += session_coins
            
            # Track high score (best ever)
            if score > cumulative['high_score']:
                cumulative['high_score'] = score
            
            print(f"    🌈 [RR] Cumulative: levels={cumulative['levels_completed']}, coins={cumulative['coins_collected']}, high_score={cumulative['high_score']}")
        
        # Save cumulative data
        stored_data['cumulative'] = cumulative
        self._set_quest_extra_data(user_quest, stored_data)
        self.db.flush()
        
        # Now update quest progress based on tracking type
        if tracking_type == 'levels_completed':
            self.update_quest_progress(user_id, quest, cumulative['levels_completed'], user_quest)
        
        elif tracking_type == 'coins_collected':
            self.update_quest_progress(user_id, quest, cumulative['coins_collected'], user_quest)
        
        elif tracking_type == 'high_score':
            # Quest completes when high_score reaches the threshold from config
            score_threshold = quest_config.get('score_threshold', quest.target_value)
            if cumulative['high_score'] >= score_threshold:
                self.update_quest_progress(user_id, quest, 1, user_quest)
        
        elif tracking_type == 'games_played':
            self.update_quest_progress(user_id, quest, cumulative['games_played'], user_quest)
    
    def check_leaderboard_quests(self, user_id: str):
        """Check and update leaderboard position quests."""
        from app.models import WeeklyLeaderboard
        
        # Get user's current rank in weekly leaderboard
        week_start = self._get_week_start_date()
        
        # Query weekly leaderboard to find user's rank
        leaderboard = self.db.query(WeeklyLeaderboard).filter(
            WeeklyLeaderboard.week_start == week_start
        ).order_by(WeeklyLeaderboard.rank.asc()).all()
        
        user_rank = None
        for entry in leaderboard:
            if entry.user_id == user_id:
                user_rank = entry.rank
                break
        
        if user_rank is None:
            # User not in leaderboard yet
            return
        
        # Get all active leaderboard quests
        quests = self.db.query(Quest).filter(
            Quest.is_active == 1,
            Quest.quest_type == 'leaderboard_top'
        ).all()
        
        for quest in quests:
            # target_value is the rank threshold (e.g., 5 for "Top 5")
            if user_rank <= quest.target_value:
                # User is in the top N
                self.update_quest_progress(user_id, quest, quest.target_value)
            else:
                # User is not in top N yet
                self.update_quest_progress(user_id, quest, 0)
        
        # Note: Do NOT commit here - let the caller manage the transaction
        # self.db.commit()


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


def check_leaderboard_quest_progress(db: Session, user_id: str, coin_service: Optional[CoinService] = None):
    """
    Convenience function to check leaderboard position quests.
    
    Args:
        db: Database session
        user_id: User identifier
        coin_service: Optional CoinService instance for awarding coins
    """
    tracker = QuestTracker(db, coin_service)
    tracker.check_leaderboard_quests(user_id)
