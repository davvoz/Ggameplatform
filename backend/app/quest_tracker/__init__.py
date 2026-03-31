"""
Quest Tracker package — backward-compatible re-exports.

All existing callers use::

    from app.quest_tracker import track_quest_progress_for_session
    from app.quest_tracker import track_quest_progress_for_login
    from app.quest_tracker import check_leaderboard_quest_progress
    from app.quest_tracker import QuestTracker

These imports continue to work without any changes.
"""

from typing import Dict, Optional

from sqlalchemy.orm import Session

from app.services import CoinService
from app.quest_tracker.tracker import QuestTracker

__all__ = [
    "QuestTracker",
    "track_quest_progress_for_session",
    "track_quest_progress_for_login",
    "check_leaderboard_quest_progress",
]


def track_quest_progress_for_session(
    db: Session,
    session_data: Dict,
    coin_service: Optional[CoinService] = None,
) -> None:
    """Convenience function to track quest progress after a game session."""
    tracker = QuestTracker(db, coin_service)
    tracker.track_session_end(session_data)


def track_quest_progress_for_login(
    db: Session,
    user_id: str,
    coin_service: Optional[CoinService] = None,
) -> None:
    """Convenience function to track quest progress on login."""
    tracker = QuestTracker(db, coin_service)
    tracker.track_login(user_id)


def check_leaderboard_quest_progress(
    db: Session,
    user_id: str,
    coin_service: Optional[CoinService] = None,
) -> None:
    """Convenience function to check leaderboard position quests."""
    tracker = QuestTracker(db, coin_service)
    tracker.check_leaderboard_quests(user_id)
