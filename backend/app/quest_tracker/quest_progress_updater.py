"""
Quest Progress Updater — manages quest progress updates and user_quest lifecycle.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models import Quest, UserQuest, User
from app.quest_tracker.quest_reset_service import QuestResetService

logger = logging.getLogger(__name__)


class QuestProgressUpdater:
    """Handles ``get_or_create_user_quest`` and ``update_quest_progress``."""

    CUMULATIVE_QUEST_TYPES = frozenset({"login_streak", "reach_level", "leaderboard_top"})

    def __init__(self, db: Session):
        self.db = db
        self._reset_service = QuestResetService()

    def get_or_create_user_quest(self, user_id: str, quest_id: int) -> UserQuest:
        """Return the existing ``UserQuest`` row or create a new one."""
        user_quest = (
            self.db.query(UserQuest)
            .filter(UserQuest.user_id == user_id, UserQuest.quest_id == quest_id)
            .first()
        )

        if not user_quest:
            now = datetime.now(timezone.utc).isoformat()
            user_quest = UserQuest(
                user_id=user_id,
                quest_id=quest_id,
                current_progress=0,
                is_completed=0,
                started_at=now,
                extra_data="{}",
            )
            self.db.add(user_quest)
            self.db.flush()

        return user_quest

    def update_quest_progress(
        self,
        user_id: str,
        quest: Quest,
        new_progress: int,
        user_quest: Optional[UserQuest] = None,
    ) -> None:
        """Set *new_progress* on the quest and handle completion."""
        if quest.is_active == 0:
            return

        if user_quest is None:
            user_quest = self.get_or_create_user_quest(user_id, quest.quest_id)

        # Don't update if already completed (except for cumulative quests)
        if user_quest.is_completed and quest.quest_type not in self.CUMULATIVE_QUEST_TYPES:
            return

        user_quest.current_progress = new_progress
        logger.debug(
            "Updated progress: %s -> %s/%s",
            quest.title,
            new_progress,
            quest.target_value,
        )

        if user_quest.current_progress >= quest.target_value and not user_quest.is_completed:
            self._mark_completed(user_id, user_quest)

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _mark_completed(self, user_id: str, user_quest: UserQuest) -> None:
        """Mark a quest as completed and record completion metadata."""
        user_quest.is_completed = 1
        user_quest.completed_at = datetime.now(timezone.utc).isoformat()

        extra_data = self._reset_service.get_extra_data(user_quest)
        extra_data["last_completion_date"] = QuestResetService.get_today_date()
        self._reset_service.set_extra_data(user_quest, extra_data)

        logger.info(
            "Quest completed — user %s, quest %s",
            user_id,
            user_quest.quest_id,
        )
