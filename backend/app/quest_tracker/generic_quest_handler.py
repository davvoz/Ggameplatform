"""
Generic Quest Handler — processes platform-wide (non-game-specific) quest types.

Uses an internal dispatch dict instead of a long if/elif chain (OCP).
"""

import json
import logging
import math
from datetime import datetime
from typing import Dict, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import (
    CoinTransaction,
    GameSession,
    Quest,
    User,
    UserQuest,
)
from app.quest_tracker.quest_progress_updater import QuestProgressUpdater
from app.quest_tracker.quest_reset_service import QuestResetService

logger = logging.getLogger(__name__)


class GenericQuestHandler:
    """Handles all quest types that are not bound to a specific game."""

    def __init__(self, db: Session, updater: QuestProgressUpdater):
        self.db = db
        self._updater = updater
        self._reset = QuestResetService()

        # quest_type → handler method
        self._dispatch: Dict[str, callable] = {
            "play_games": self._handle_play_games,
            "play_games_weekly": self._handle_play_games_weekly,
            "play_time": self._handle_play_time,
            "play_time_daily": self._handle_play_time_daily,
            "play_same_game": self._handle_play_same_game,
            "score_threshold_per_game": self._handle_score_threshold,
            "score_ends_with": self._handle_score_ends_with,
            "score": self._handle_score,
            "reach_level": self._handle_reach_level,
            "xp_daily": self._handle_xp_daily,
            "xp_weekly": self._handle_xp_weekly,
            "leaderboard_top": self._handle_leaderboard_top,
            "complete_quests": self._handle_complete_quests,
            "play_distinct_games_daily": self._handle_play_distinct_games_daily,
            "complete_half_daily_game_quests": self._handle_complete_half_daily,
            "complete_all_daily_quests": self._handle_complete_all_daily,
        }

    # ------------------------------------------------------------------
    # Public entry point
    # ------------------------------------------------------------------

    def process(
        self,
        user_id: str,
        quest: Quest,
        quest_config: Dict,
        game_id: str,
        score: int,
        duration_seconds: int,
        extra_data: Dict,
    ) -> None:
        """Dispatch to the correct handler based on ``quest.quest_type``."""
        handler = self._dispatch.get(quest.quest_type)
        if handler is None:
            return
        handler(
            user_id=user_id,
            quest=quest,
            quest_config=quest_config,
            game_id=game_id,
            score=score,
            duration_seconds=duration_seconds,
            extra_data=extra_data,
        )

    # ------------------------------------------------------------------
    # Login-specific entry points
    # ------------------------------------------------------------------

    def process_login(self, user_id: str, quest: Quest, user: User, today: str) -> None:
        """Handle login-related quest types."""
        if quest.quest_type == "login_after_24h":
            self._handle_login_after_24h(user_id, quest, user, today)
        elif quest.quest_type == "login_streak":
            self._updater.update_quest_progress(user_id, quest, user.login_streak or 0)

    # ------------------------------------------------------------------
    # Handlers — play_games family
    # ------------------------------------------------------------------

    def _handle_play_games(self, user_id, quest, quest_config, game_id, **_kw):
        user_quest = self._updater.get_or_create_user_quest(user_id, quest.quest_id)
        reset_period = quest_config.get("reset_period")
        quest_game_id = quest_config.get("game_id")

        if reset_period == "daily":
            stored = self._reset.get_extra_data(user_quest)
            stored = self._reset.reset_daily_simple(user_quest, stored)
            self.db.flush()

        if reset_period == "daily":
            today_start = datetime.strptime(self._reset.get_today_date(), "%Y-%m-%d")
            query = self.db.query(GameSession).filter(
                GameSession.user_id == user_id,
                GameSession.ended_at.isnot(None),
                GameSession.ended_at >= today_start.isoformat(),
            )
        else:
            query = self.db.query(GameSession).filter(
                GameSession.user_id == user_id,
                GameSession.ended_at.isnot(None),
            )

        if quest_game_id:
            query = query.filter(GameSession.game_id == quest_game_id)

        self._updater.update_quest_progress(user_id, quest, query.count(), user_quest)

    def _handle_play_games_weekly(self, user_id, quest, **_kw):
        user_quest = self._updater.get_or_create_user_quest(user_id, quest.quest_id)
        self._reset.reset_if_needed(user_quest, "weekly")

        week_start = datetime.strptime(self._reset.get_week_start_date(), "%Y-%m-%d")
        count = (
            self.db.query(GameSession)
            .filter(
                GameSession.user_id == user_id,
                GameSession.ended_at.isnot(None),
                GameSession.ended_at >= week_start.isoformat(),
            )
            .count()
        )
        self._updater.update_quest_progress(user_id, quest, count)

    # ------------------------------------------------------------------
    # Handlers — play_time family
    # ------------------------------------------------------------------

    def _handle_play_time(self, user_id, quest, **_kw):
        total = (
            self.db.query(func.sum(GameSession.duration_seconds))
            .filter(
                GameSession.user_id == user_id,
                GameSession.ended_at.isnot(None),
            )
            .scalar()
            or 0
        )
        self._updater.update_quest_progress(user_id, quest, int(total))

    def _handle_play_time_daily(self, user_id, quest, **_kw):
        user_quest = self._updater.get_or_create_user_quest(user_id, quest.quest_id)
        self._reset.reset_if_needed(user_quest, "daily")

        today_start = datetime.strptime(self._reset.get_today_date(), "%Y-%m-%d")
        total = (
            self.db.query(func.sum(GameSession.duration_seconds))
            .filter(
                GameSession.user_id == user_id,
                GameSession.ended_at.isnot(None),
                GameSession.ended_at >= today_start.isoformat(),
            )
            .scalar()
            or 0
        )
        self._updater.update_quest_progress(user_id, quest, int(total))

    def _handle_play_same_game(self, user_id, quest, **_kw):
        game_counts = (
            self.db.query(
                GameSession.game_id,
                func.count(GameSession.session_id).label("count"),
            )
            .filter(
                GameSession.user_id == user_id,
                GameSession.ended_at.isnot(None),
            )
            .group_by(GameSession.game_id)
            .all()
        )
        max_count = max((gc.count for gc in game_counts), default=0)
        self._updater.update_quest_progress(user_id, quest, max_count)

    # ------------------------------------------------------------------
    # Handlers — score family
    # ------------------------------------------------------------------

    def _handle_score_threshold(self, user_id, quest, quest_config, game_id, **_kw):
        min_score = quest_config.get("min_score", 100)
        count = (
            self.db.query(GameSession)
            .filter(
                GameSession.user_id == user_id,
                GameSession.game_id == game_id,
                GameSession.ended_at.isnot(None),
                GameSession.score >= min_score,
            )
            .count()
        )
        self._updater.update_quest_progress(user_id, quest, count)

    def _handle_score_ends_with(self, user_id, quest, score, **_kw):
        if score % 10 == quest.target_value:
            self._updater.update_quest_progress(user_id, quest, 1)

    def _handle_score(self, user_id, quest, quest_config, extra_data, **_kw):
        extra_data_field = quest_config.get("extra_data_field")
        if not extra_data_field:
            return

        user_quest = self._updater.get_or_create_user_quest(user_id, quest.quest_id)

        reset_period = quest_config.get("reset_period")
        if reset_period == "daily":
            stored = self._reset.get_extra_data(user_quest)
            self._reset.reset_daily_simple(user_quest, stored)
            self.db.flush()

        field_value = extra_data.get(extra_data_field, 0)
        if field_value > 0:
            new_progress = user_quest.current_progress + field_value
            logger.debug(
                "Score quest — incrementing %s: %s + %s = %s",
                extra_data_field,
                user_quest.current_progress,
                field_value,
                new_progress,
            )
            self._updater.update_quest_progress(user_id, quest, new_progress, user_quest)

    # ------------------------------------------------------------------
    # Handlers — XP / level
    # ------------------------------------------------------------------

    def _handle_reach_level(self, user_id, quest, **_kw):
        user = self.db.query(User).filter(User.user_id == user_id).first()
        if user:
            from app.level_system import LevelSystem

            level = LevelSystem.calculate_level_from_xp(user.total_xp_earned)
            self._updater.update_quest_progress(user_id, quest, level)

    def _handle_xp_daily(self, user_id, quest, **_kw):
        user_quest = self._updater.get_or_create_user_quest(user_id, quest.quest_id)
        self._reset.reset_if_needed(user_quest, "daily")

        today_start = datetime.strptime(self._reset.get_today_date(), "%Y-%m-%d")
        total = (
            self.db.query(func.sum(GameSession.xp_earned))
            .filter(
                GameSession.user_id == user_id,
                GameSession.ended_at.isnot(None),
                GameSession.ended_at >= today_start.isoformat(),
            )
            .scalar()
            or 0
        )
        self._updater.update_quest_progress(user_id, quest, int(total))

    def _handle_xp_weekly(self, user_id, quest, **_kw):
        user_quest = self._updater.get_or_create_user_quest(user_id, quest.quest_id)
        self._reset.reset_if_needed(user_quest, "weekly")

        week_start = datetime.strptime(self._reset.get_week_start_date(), "%Y-%m-%d")
        total = (
            self.db.query(func.sum(GameSession.xp_earned))
            .filter(
                GameSession.user_id == user_id,
                GameSession.ended_at.isnot(None),
                GameSession.ended_at >= week_start.isoformat(),
            )
            .scalar()
            or 0
        )
        self._updater.update_quest_progress(user_id, quest, int(total))

    # ------------------------------------------------------------------
    # Handlers — meta / leaderboard
    # ------------------------------------------------------------------

    def _handle_leaderboard_top(self, **_kw):
        pass  # Checked separately via check_leaderboard_quests

    def _handle_complete_quests(self, user_id, quest, **_kw):
        try:
            count = (
                self.db.query(func.count(CoinTransaction.transaction_id))
                .filter(
                    CoinTransaction.user_id == user_id,
                    CoinTransaction.transaction_type == "quest_reward",
                )
                .scalar()
                or 0
            )
        except Exception:
            logger.warning("Fallback for complete_quests count", exc_info=True)
            count = (
                self.db.query(UserQuest)
                .filter(UserQuest.user_id == user_id, UserQuest.is_completed == 1)
                .count()
            )
        self._updater.update_quest_progress(user_id, quest, int(count))

    # ------------------------------------------------------------------
    # Handlers — platform daily quests
    # ------------------------------------------------------------------

    def _handle_play_distinct_games_daily(self, user_id, quest, quest_config, **_kw):
        user_quest = self._updater.get_or_create_user_quest(user_id, quest.quest_id)

        if quest_config.get("reset_period") == "daily":
            stored = self._reset.get_extra_data(user_quest)
            self._reset.reset_daily_simple(user_quest, stored)
            self.db.flush()

        today_start = datetime.strptime(self._reset.get_today_date(), "%Y-%m-%d")
        rows = (
            self.db.query(GameSession.game_id)
            .filter(
                GameSession.user_id == user_id,
                GameSession.ended_at.isnot(None),
                GameSession.ended_at >= today_start.isoformat(),
            )
            .distinct()
            .all()
        )
        self._updater.update_quest_progress(user_id, quest, len(rows), user_quest)

    def _handle_complete_half_daily(self, user_id, quest, quest_config, **_kw):
        user_quest = self._updater.get_or_create_user_quest(user_id, quest.quest_id)

        if quest_config.get("reset_period") == "daily":
            stored = self._reset.get_extra_data(user_quest)
            self._reset.reset_daily_simple(user_quest, stored)
            self.db.flush()

        total, completed = self._count_daily_game_quests(user_id)
        if total > 0:
            quest.target_value = math.ceil(total / 2)
            self._updater.update_quest_progress(user_id, quest, completed, user_quest)

    def _handle_complete_all_daily(self, user_id, quest, quest_config, **_kw):
        user_quest = self._updater.get_or_create_user_quest(user_id, quest.quest_id)

        if quest_config.get("reset_period") == "daily":
            stored = self._reset.get_extra_data(user_quest)
            self._reset.reset_daily_simple(user_quest, stored)
            self.db.flush()

        total, completed = self._count_daily_game_quests(user_id)
        if total > 0:
            quest.target_value = total
            self._updater.update_quest_progress(user_id, quest, completed, user_quest)

    # ------------------------------------------------------------------
    # Login helpers
    # ------------------------------------------------------------------

    def _handle_login_after_24h(
        self, user_id: str, quest: Quest, user: User, today: str
    ) -> None:
        if not user.last_login:
            return
        try:
            last_login = datetime.fromisoformat(user.last_login)
            from datetime import timezone, timedelta

            elapsed = datetime.now(timezone.utc) - last_login
            if elapsed < timedelta(hours=24):
                return

            user_quest = self._updater.get_or_create_user_quest(user_id, quest.quest_id)
            extra = self._reset.get_extra_data(user_quest)

            if extra.get("last_counted_date") != today:
                self._updater.update_quest_progress(
                    user_id, quest, user_quest.current_progress + 1
                )
                extra["last_counted_date"] = today
                self._reset.set_extra_data(user_quest, extra)
                self.db.flush()
        except Exception:
            logger.warning("Error processing login_after_24h quest", exc_info=True)

    # ------------------------------------------------------------------
    # Shared helpers
    # ------------------------------------------------------------------

    def _count_daily_game_quests(self, user_id: str) -> tuple:
        """Return ``(total_daily_game_quests, completed_count)``."""
        daily_game_quests = (
            self.db.query(Quest)
            .filter(
                Quest.is_active == 1,
                Quest.config.like('%"reset_period": "daily"%'),
                Quest.config.like('%"game_id":%'),
            )
            .all()
        )

        total = len(daily_game_quests)
        if total == 0:
            return 0, 0

        ids = [q.quest_id for q in daily_game_quests]
        self.db.flush()

        completed = (
            self.db.query(UserQuest)
            .filter(
                UserQuest.user_id == user_id,
                UserQuest.quest_id.in_(ids),
                UserQuest.is_completed == 1,
            )
            .count()
        )
        return total, completed
