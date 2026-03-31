"""
Base Game Quest Handler — Template Method ABC for game-specific quest processing.
"""

import json
import logging
from abc import ABC, abstractmethod
from typing import Dict, Optional

from sqlalchemy.orm import Session

from app.models import Quest, UserQuest
from app.quest_tracker.quest_reset_service import QuestResetService
from app.quest_tracker.quest_progress_updater import QuestProgressUpdater

logger = logging.getLogger(__name__)


class BaseGameQuestHandler(ABC):
    """Abstract base for game-specific quest handlers.

    Sub-classes must implement three methods:

    * ``_default_cumulative`` — initial counters dict
    * ``_update_cumulative`` — update counters from session data
    * ``_map_tracking_type`` — resolve *tracking_type* → progress value

    The ``process`` method (Template Method) orchestrates the common flow:
    reset → initialise cumulative → update → save → progress update.
    """

    def __init__(self, db: Session, updater: QuestProgressUpdater):
        self.db = db
        self._updater = updater
        self._reset_service = QuestResetService()

    # ------------------------------------------------------------------
    # Template method
    # ------------------------------------------------------------------

    def process(
        self,
        user_id: str,
        quest: Quest,
        quest_config: Dict,
        tracking_type: str,
        score: int,
        extra_data: Dict,
        **kwargs,
    ) -> None:
        """Execute the full quest-processing pipeline."""
        logger.debug(
            "Processing quest %s: %s (type: %s)",
            quest.quest_id,
            quest.title,
            tracking_type,
        )

        user_quest = self._updater.get_or_create_user_quest(user_id, quest.quest_id)
        stored_data = self._reset_service.get_extra_data(user_quest)

        # Step 1 — daily reset (if applicable)
        stored_data = self._handle_reset(user_quest, quest_config, stored_data)

        # Step 2 — initialise cumulative counters
        if not stored_data.get("cumulative"):
            stored_data["cumulative"] = self._default_cumulative()

        cumulative = stored_data["cumulative"]

        # Step 3 — update cumulative from session data
        if extra_data:
            self._update_cumulative(cumulative, extra_data, score, **kwargs)

        # Step 4 — persist cumulative
        stored_data["cumulative"] = cumulative
        self._reset_service.set_extra_data(user_quest, stored_data)
        self.db.flush()

        # Step 5 — resolve tracking type → progress value and update
        progress = self._map_tracking_type(
            tracking_type, cumulative, extra_data or {}, quest_config, user_quest, quest,
        )
        if progress is not None:
            self._updater.update_quest_progress(user_id, quest, progress, user_quest)

        # Step 6 — post-completion bookkeeping
        self._save_completion_date_if_needed(user_quest, stored_data)

    # ------------------------------------------------------------------
    # Abstract methods to implement per game
    # ------------------------------------------------------------------

    @abstractmethod
    def _default_cumulative(self) -> dict:
        """Return the initial counters dict for this game."""

    @abstractmethod
    def _update_cumulative(
        self, cumulative: dict, extra_data: Dict, score: int, **kwargs
    ) -> None:
        """Mutate *cumulative* in-place from *extra_data* and *score*."""

    @abstractmethod
    def _map_tracking_type(
        self,
        tracking_type: str,
        cumulative: dict,
        extra_data: Dict,
        quest_config: Dict,
        user_quest: UserQuest,
        quest: Quest,
    ) -> Optional[int]:
        """Return the progress value for *tracking_type*, or ``None`` to skip."""

    # ------------------------------------------------------------------
    # Concrete helpers (shared across all games)
    # ------------------------------------------------------------------

    def _handle_reset(
        self, user_quest: UserQuest, quest_config: Dict, stored_data: dict
    ) -> dict:
        """Apply daily/simple reset if the quest config requires it."""
        reset_period = quest_config.get("reset_period")
        reset_on_complete = quest_config.get("reset_on_complete", False)

        if reset_period == "daily":
            if reset_on_complete:
                return self._reset_service.reset_daily_on_complete(user_quest, stored_data)
            return self._reset_service.reset_daily_simple(user_quest, stored_data)

        return stored_data

    def _save_completion_date_if_needed(
        self, user_quest: UserQuest, stored_data: dict
    ) -> None:
        """Persist ``last_completion_date`` right after the quest is first completed."""
        if user_quest.is_completed and not stored_data.get("last_completion_date"):
            stored_data["last_completion_date"] = QuestResetService.get_today_date()
            self._reset_service.set_extra_data(user_quest, stored_data)
            self.db.flush()
