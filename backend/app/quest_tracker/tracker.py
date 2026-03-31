"""
Quest Tracker — lean orchestrator (Facade).

Delegates game-specific quest processing to registered handlers and
platform-wide quest types to ``GenericQuestHandler``.
"""

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional

from sqlalchemy.orm import Session

from app.models import Quest, User
from app.services import CoinService
from app.quest_tracker.quest_progress_updater import QuestProgressUpdater
from app.quest_tracker.quest_reset_service import QuestResetService
from app.quest_tracker.handler_registry import get_handler_class
from app.quest_tracker.generic_quest_handler import GenericQuestHandler

logger = logging.getLogger(__name__)


class QuestTracker:
    """Tracks and updates user quest progress automatically."""

    def __init__(self, db: Session, coin_service: Optional[CoinService] = None):
        self.db = db
        self.coin_service = coin_service
        self._updater = QuestProgressUpdater(db)
        self._reset = QuestResetService()
        self._generic = GenericQuestHandler(db, self._updater)

    # ------------------------------------------------------------------
    # Public API — preserved for backward compatibility
    # ------------------------------------------------------------------

    def track_session_end(self, session_data: Dict) -> None:
        """Track quest progress when a game session ends."""
        user_id = session_data.get("user_id")
        game_id = session_data.get("game_id")
        score = session_data.get("score", 0)
        duration_seconds = session_data.get("duration_seconds", 0)
        extra_data = session_data.get("extra_data") or {}

        logger.info(
            "track_session_end — user=%s, game=%s, score=%s",
            user_id,
            game_id,
            score,
        )

        if not user_id:
            logger.warning("No user_id in session_data — skipping")
            return

        quests = self.db.query(Quest).filter(Quest.is_active == 1).all()
        logger.debug("Found %s active quests to check", len(quests))

        for quest in quests:
            self._process_quest(
                user_id, quest, game_id, score, duration_seconds, extra_data,
            )

    def track_login(self, user_id: str) -> None:
        """Track quest progress when user logs in."""
        user = self.db.query(User).filter(User.user_id == user_id).first()
        if not user:
            return

        today = self._reset.get_today_date()
        yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")

        # Update login streak
        if user.last_login_date:
            if user.last_login_date == yesterday:
                user.login_streak = (user.login_streak or 0) + 1
            elif user.last_login_date != today:
                user.login_streak = 1
        else:
            user.login_streak = 1

        user.last_login_date = today
        self.db.flush()

        quests = self.db.query(Quest).filter(Quest.is_active == 1).all()
        for quest in quests:
            self._generic.process_login(user_id, quest, user, today)

    def check_leaderboard_quests(self, user_id: str) -> None:
        """Check and update leaderboard position quests."""
        from app.models import WeeklyLeaderboard

        week_start = self._reset.get_week_start_date()
        leaderboard = (
            self.db.query(WeeklyLeaderboard)
            .filter(WeeklyLeaderboard.week_start == week_start)
            .order_by(WeeklyLeaderboard.rank.asc())
            .all()
        )

        user_rank = None
        for entry in leaderboard:
            if entry.user_id == user_id:
                user_rank = entry.rank
                break

        if user_rank is None:
            return

        quests = (
            self.db.query(Quest)
            .filter(Quest.is_active == 1, Quest.quest_type == "leaderboard_top")
            .all()
        )

        for quest in quests:
            progress = quest.target_value if user_rank <= quest.target_value else 0
            self._updater.update_quest_progress(user_id, quest, progress)

    # ------------------------------------------------------------------
    # Internal dispatch
    # ------------------------------------------------------------------

    def _process_quest(
        self,
        user_id: str,
        quest: Quest,
        game_id: str,
        score: int,
        duration_seconds: int,
        extra_data: Dict,
    ) -> None:
        """Route a single quest to the appropriate handler."""
        quest_config = self._parse_config(quest)
        tracking_type = quest_config.get("type", "")
        quest_game_id = quest_config.get("game_id")

        # Skip if the quest targets a different game
        if quest_game_id and quest_game_id != game_id:
            return

        # Try game-specific handler first
        handler_cls = get_handler_class(game_id) if tracking_type else None
        if handler_cls and quest_game_id:
            handler = handler_cls(self.db, self._updater)
            handler.process(
                user_id=user_id,
                quest=quest,
                quest_config=quest_config,
                tracking_type=tracking_type,
                score=score,
                extra_data=extra_data,
                duration_seconds=duration_seconds,
            )
            return

        # Fall back to generic handler
        self._generic.process(
            user_id=user_id,
            quest=quest,
            quest_config=quest_config,
            game_id=game_id,
            score=score,
            duration_seconds=duration_seconds,
            extra_data=extra_data,
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _parse_config(quest: Quest) -> dict:
        if not quest.config:
            return {}
        try:
            return json.loads(quest.config)
        except (json.JSONDecodeError, TypeError):
            return {}
