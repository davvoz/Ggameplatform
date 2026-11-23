"""Settings of the weekly report: the week counter, the post, the files."""

import json
import os
from datetime import date, datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path
from typing import Dict

PACKAGE_DIR = Path(__file__).parent
DATA_DIR = PACKAGE_DIR / "data"
ASSETS_DIR = PACKAGE_DIR / "assets"
GAMES_DIR = PACKAGE_DIR.parent / "games"

# The posts count the weeks: the week starting on this Monday is week 40
WEEK_ANCHOR = date(2026, 11, 2)
WEEK_ANCHOR_NUMBER = 40
# The first week the job opens by itself: the weeks before were posted by hand
FIRST_AUTOMATED_WEEK = date(2026, 11, 30)

GAMES_PER_WEEK = 3
RANKED_STATUS_CODE = "ranked"

POST_AUTHOR = os.getenv("WEEKLY_POST_AUTHOR", "cur8")
# The posting key of cur8.fund, which @cur8 lets post in its name
POSTING_KEY_ENV = "STEEM_POSTING_KEY"
COMMUNITY = "hive-159863"
TAGS = [COMMUNITY, "gaming", "cur8", "play2earn", "steem", "steemexclusive"]
SITE_URL = "https://games.cur8.fun"
APP = "cur8games/1.0"

# A week that fails this many times waits for the admin's "run now"
MAX_ATTEMPTS = 6


def current_week_start() -> date:
    today = datetime.now(timezone.utc).date()
    return today - timedelta(days=today.weekday())


def week_number(week_start: date) -> int:
    return WEEK_ANCHOR_NUMBER + (week_start - WEEK_ANCHOR).days // 7


@lru_cache(maxsize=1)
def game_styles() -> Dict[str, Dict[str, str]]:
    """Each game's emoji and the verb that invites to play it (data/games.json)."""
    with open(DATA_DIR / "games.json", encoding="utf-8") as f:
        return json.load(f)


def game_style(game_id: str) -> Dict[str, str]:
    return {"emoji": "🎮", "verb": "play", **game_styles().get(game_id, {})}
