"""
Rainbow Rush: Stormrun — the course of the week.

Everyone runs the same course for a whole week: the seed is an HMAC of the ISO
week, so it is the same for all players and cannot be guessed for future weeks.
The weeks change together with the platform's weekly leaderboard reset.
"""

import os
import hmac
import hashlib
from datetime import datetime, timezone

_SECRET = os.environ.get('STORMRUN_SECRET', 'stormrun-weekly-v1').encode()
_MAX_SEED = 2147483647


def current_week(now: datetime = None) -> dict:
    """Deterministic seed for the current ISO week (same for everyone)."""
    now = now or datetime.now(timezone.utc)
    year, week, _ = now.isocalendar()
    week_id = f"{year}-W{week:02d}"
    digest = hmac.new(_SECRET, week_id.encode(), hashlib.sha256).hexdigest()
    return {
        "week_id": week_id,
        "seed": int(digest, 16) % _MAX_SEED or 1,
    }
