"""
Idempotent registration script for Apex Drive.

Registers (or fully updates) the game record, its XP rules and its weekly
leaderboard rewards. Safe to run multiple times: the play count is kept.

    python scripts/register_apex_drive.py

Ranked / STEEM:
  The leaderboard is the WEEKLY CHALLENGE: one track for everybody, new every
  Monday, raced with one's own car (bought and upgraded in the career, kept
  on the server by app/games/apex_drive_be). A run's time becomes points
  (10000 x par time / time: the faster, the more), checked and scored by the
  game's backend; app/game_score_validators.py lets through only a run that
  backend checked, once. Career races report a score of 0: they pay credits.
  The coin rewards are copied from REWARDS_FROM, STEEM amounts included.

  Whether STEEM is paid rotates by hand every week (the "STEEM Rewards" switch
  of the game in the admin). This script switches it off only when it creates
  the game; afterwards it never touches it, so running it again is safe.

  The cover (thumbnail.png, thumbnail_preview.webp) is drawn by the game's own
  art: node app/games/apex_drive/tools/cover/render-cover.js
"""

import contextlib
import json
import sys
import traceback
import uuid
from datetime import datetime, timezone
from pathlib import Path

# Windows console (cp1252) can't encode emoji — force UTF-8 output.
with contextlib.suppress(Exception):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import get_db_session  # noqa: E402
from app.models import Game, LeaderboardReward, XPRule  # noqa: E402

GAME_ID = "apex_drive"
RANKED_STATUS_ID = 5
REWARDS_FROM = "blocky-road"

NOW = datetime.now(timezone.utc).isoformat()

GAME_DATA = {
    "game_id": GAME_ID,
    "title": "Apex Drive",
    "description": (
        "A 16-bit style racer on roads that dip and curve to the horizon. Race "
        "five rivals with their own tricks across sunset coasts and neon cities, "
        "in rain and storms; win credits, tune your car part by part and fit "
        "mods for every track. Every week one track is the WEEKLY CHALLENGE: "
        "race it with your own car, the fastest time tops the leaderboard."
    ),
    "author": "Cur8 Games",
    "version": "1.0.0",
    "thumbnail": "thumbnail.png",
    "entry_point": "index.html",
    "category": "racing",
    "tags": json.dumps(["racing", "retro", "pixel-art", "ranked", "career", "upgrades"]),
    "status_id": RANKED_STATUS_ID,
    "steem_rewards_enabled": 0,  # only for a new game, see above
    "extra_data": json.dumps({
        "orientation": "landscape",
        "controls": (
            "Arrows or WASD: steer, Up throttle, Down brake; Space nitro; P pause. "
            "Touch: hold the left or right half to steer (full throttle), NITRO button."
        ),
        "modes": ["Career", "Weekly challenge"],
        "features": [
            "Pseudo-3D roads with hills, tunnels, rain and storms",
            "Five rivals, each with its own way of racing",
            "Parts in tiers and tactical mods, kept on the server",
            "Weekly challenge: the same track and rivals for everybody",
        ],
    }),
}

XP_RULES = [
    {
        "rule_id": f"{GAME_ID}_score",
        "game_id": GAME_ID,
        "rule_name": "Apex Drive - Challenge XP",
        "rule_type": "score_multiplier",
        "parameters": json.dumps({
            "multiplier": 0.004,  # a good run, about 8000 points -> 32 XP
            "max_xp": 50.0,
        }),
        "priority": 10,
        "is_active": 1,
    },
    {
        "rule_id": f"{GAME_ID}_time",
        "game_id": GAME_ID,
        "rule_name": "Apex Drive - Time XP",
        "rule_type": "time_bonus",
        "parameters": json.dumps({
            "xp_per_minute": 0.5,
            "max_minutes": 20.0,
        }),
        "priority": 5,
        "is_active": 1,
    },
]


def _upsert_game(db, ts: str) -> str:
    existing = db.query(Game).filter(Game.game_id == GAME_ID).first()
    if existing:
        # The weekly STEEM rotation is set by hand in the admin: keep it.
        for key, value in GAME_DATA.items():
            if key not in ("game_id", "steem_rewards_enabled", "extra_data"):
                setattr(existing, key, value)
        # Merged, not replaced: the play count and anything added later stay.
        current = json.loads(existing.extra_data or "{}")
        existing.extra_data = json.dumps({**current, **json.loads(GAME_DATA["extra_data"])})
        existing.updated_at = ts
        return "updated"
    db.add(Game(created_at=ts, updated_at=ts, **GAME_DATA))
    return "created"


def _replace_xp_rules(db) -> None:
    for rule in db.query(XPRule).filter(XPRule.game_id == GAME_ID).all():
        db.delete(rule)
    db.flush()
    for rule_data in XP_RULES:
        db.add(XPRule(created_at=NOW, updated_at=NOW, **rule_data))


def _copy_rewards(db, ts: str) -> int:
    for reward in db.query(LeaderboardReward).filter(LeaderboardReward.game_id == GAME_ID).all():
        db.delete(reward)
    db.flush()
    source = db.query(LeaderboardReward).filter(
        LeaderboardReward.game_id == REWARDS_FROM,
        LeaderboardReward.is_active == 1,
    ).all()
    for reward in source:
        db.add(LeaderboardReward(
            reward_id=str(uuid.uuid4()),
            game_id=GAME_ID,
            rank_start=reward.rank_start,
            rank_end=reward.rank_end,
            steem_reward=reward.steem_reward,
            coin_reward=reward.coin_reward,
            description=reward.description,
            is_active=1,
            created_at=ts,
            updated_at=ts,
        ))
    return len(source)


def register_apex_drive() -> bool:
    print("=" * 60)
    print("🏎️  REGISTERING GAME: APEX DRIVE")
    print("=" * 60)
    with get_db_session() as db:
        try:
            ts = datetime.now(timezone.utc).isoformat()
            action = _upsert_game(db, ts)
            db.flush()
            _replace_xp_rules(db)
            rewards = _copy_rewards(db, ts)
            db.commit()

            print(f"\n✅  Game {action}: {GAME_DATA['title']} [{GAME_ID}]")
            print(f"  Status ID: {RANKED_STATUS_ID} (ranked)")
            steem = db.query(Game.steem_rewards_enabled).filter(Game.game_id == GAME_ID).scalar()
            print(f"  STEEM:     {'on' if steem else 'off'} this week (rotated by hand in the admin)")
            print(f"  XP rules:  {len(XP_RULES)}")
            print(f"  Rewards:   {rewards} rank bands copied from {REWARDS_FROM}")
            print(f"  Entry:     /games/{GAME_ID}/{GAME_DATA['entry_point']}")
            return True
        except Exception as exc:
            db.rollback()
            print(f"\n❌  Registration failed: {exc}")
            traceback.print_exc()
            return False


if __name__ == "__main__":
    sys.exit(0 if register_apex_drive() else 1)
