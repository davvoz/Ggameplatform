"""
Quest Reset Service — handles daily/weekly reset logic and extra_data utilities.
"""

import json
import logging
from datetime import datetime, timedelta, timezone

from app.models import UserQuest

logger = logging.getLogger(__name__)


class QuestResetService:
    """Centralises daily/weekly quest-reset logic and extra_data helpers."""

    # ------------------------------------------------------------------
    # Date helpers
    # ------------------------------------------------------------------

    @staticmethod
    def get_today_date() -> str:
        """Return today's UTC date as ``YYYY-MM-DD``."""
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")

    @staticmethod
    def get_week_start_date() -> str:
        """Return the start of the current ISO week (Monday) as ``YYYY-MM-DD``."""
        today = datetime.now(timezone.utc)
        week_start = today - timedelta(days=today.weekday())
        return week_start.strftime("%Y-%m-%d")

    # ------------------------------------------------------------------
    # extra_data helpers
    # ------------------------------------------------------------------

    @staticmethod
    def get_extra_data(user_quest: UserQuest) -> dict:
        """Deserialise *user_quest.extra_data* into a ``dict``."""
        if not user_quest.extra_data:
            return {}
        try:
            return json.loads(user_quest.extra_data)
        except (json.JSONDecodeError, TypeError):
            return {}

    @staticmethod
    def set_extra_data(user_quest: UserQuest, data: dict) -> None:
        """Serialise *data* into *user_quest.extra_data*."""
        user_quest.extra_data = json.dumps(data)

    # ------------------------------------------------------------------
    # Full daily reset (for game-handler quests with reset_on_complete)
    # ------------------------------------------------------------------

    def reset_daily_on_complete(self, user_quest: UserQuest, stored_data: dict) -> dict:
        """Reset a quest that uses ``reset_on_complete`` logic.

        If the quest was completed on a previous day, clears progress,
        completion flags **and** cumulative data.  Returns the (possibly
        updated) *stored_data* dict.
        """
        today = self.get_today_date()
        last_completion = stored_data.get("last_completion_date")

        if user_quest.is_completed and last_completion and last_completion != today:
            logger.info("Resetting completed quest for new day (user_quest %s)", user_quest.quest_id)
            self._clear_quest_progress(user_quest)
            stored_data["cumulative"] = None
            stored_data["last_reset_date"] = today
            self.set_extra_data(user_quest, stored_data)
            return self.get_extra_data(user_quest)

        return stored_data

    def reset_daily_simple(self, user_quest: UserQuest, stored_data: dict) -> dict:
        """Reset a quest that uses simple ``last_reset_date`` logic.

        Clears progress and flags when a new day begins, regardless of
        whether the quest was completed.  Returns the (possibly updated)
        *stored_data* dict.
        """
        today = self.get_today_date()
        last_reset = stored_data.get("last_reset_date")

        if last_reset != today:
            logger.info("Resetting daily quest for new day (user_quest %s)", user_quest.quest_id)
            self._clear_quest_progress(user_quest)
            stored_data["last_reset_date"] = today
            stored_data["cumulative"] = None
            self.set_extra_data(user_quest, stored_data)
            return self.get_extra_data(user_quest)

        return stored_data

    # ------------------------------------------------------------------
    # Period-based reset (used by generic quest handler)
    # ------------------------------------------------------------------

    def reset_if_needed(self, user_quest: UserQuest, period: str) -> bool:
        """Reset quest progress when the time period has changed.

        Args:
            user_quest: The ``UserQuest`` instance.
            period: ``'daily'`` or ``'weekly'``.

        Returns:
            ``True`` if reset occurred.
        """
        extra_data = self.get_extra_data(user_quest)

        if period == "daily":
            today = self.get_today_date()
            if extra_data.get("last_reset_date") != today:
                user_quest.current_progress = 0
                extra_data["last_reset_date"] = today
                self.set_extra_data(user_quest, extra_data)
                return True

        elif period == "weekly":
            week_start = self.get_week_start_date()
            if extra_data.get("last_reset_week") != week_start:
                user_quest.current_progress = 0
                extra_data["last_reset_week"] = week_start
                self.set_extra_data(user_quest, extra_data)
                return True

        return False

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    @staticmethod
    def _clear_quest_progress(user_quest: UserQuest) -> None:
        """Zero-out progress and completion fields."""
        user_quest.is_completed = 0
        user_quest.current_progress = 0
        user_quest.completed_at = None
        user_quest.is_claimed = 0
        user_quest.claimed_at = None
