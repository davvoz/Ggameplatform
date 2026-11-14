"""
Idempotent registration script for Night Mage.

Registers (or fully updates) the game record, its XP rules, its quests and its
weekly leaderboard rewards. Safe to run multiple times: the play count and the
players' quest progress are kept.

    python scripts/register_night_mage.py

Ranked / STEEM:
  The game is ranked from day one. The score is the arcade score of a whole
  night (endless waves) and the platform keeps each player's best of the week.
  Everybody plays the same seeded waves for a week; invaders sent by other
  players (backend module night_mage_be) join some waves. The coin rewards are
  copied from REWARDS_FROM, STEEM amounts included.

  Whether STEEM is paid rotates by hand every week (the "STEEM Rewards" switch
  of the game in the admin). This script switches it off only when it creates
  the game; afterwards it never touches it, so running it again is safe.
"""

import contextlib
import sys
import json
import uuid
import traceback
from pathlib import Path
from datetime import datetime, timezone

# Windows console (cp1252) can't encode emoji — force UTF-8 output.
with contextlib.suppress(Exception):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import get_db_session
from app.models import Game, LeaderboardReward, Quest, XPRule

GAME_ID = "night_mage"
RANKED_STATUS_ID = 5
REWARDS_FROM = "blocky-road"

NOW = datetime.now(timezone.utc).isoformat()

GAME_DATA = {
    "game_id": GAME_ID,
    "title": "Night Mage",
    "description": (
        "The forest wakes up at night, and it is hungry. Tap the monsters to "
        "blast them, tap their arrows and fireballs out of the air, tap the "
        "mage to raise the shield. Survive wave after wave across twelve "
        "haunted maps, keep the combo alive for up to x6 points, and after a "
        "good night send your own monster to haunt the other mages."
    ),
    "author": "Cur8 Games",
    "version": "1.0.0",
    "thumbnail": "thumbnail.png",
    "entry_point": "index.html",
    "category": "arcade",
    "tags": json.dumps(["arcade", "tap", "survival", "pixel-art", "ranked", "fantasy", "async-pvp"]),
    "status_id": RANKED_STATUS_ID,
    "steem_rewards_enabled": 0,  # only for a new game, see above
    "extra_data": json.dumps({
        "orientation": "landscape",
        "controls": "Tap or click: monsters and shots to blast them, the mage for the shield. Space starts, P pauses.",
        "modes": ["Weekly night"],
        "features": [
            "One gesture: tap",
            "Endless waves on twelve maps, a new scene every four waves",
            "Combo multiplier up to x6, wave and flawless bonuses",
            "Send an invader with your name into other players' nights",
            "Same seeded waves for everybody, new every week",
        ],
    }),
}

XP_RULES = [
    {
        "rule_id": f"{GAME_ID}_score",
        "game_id": GAME_ID,
        "rule_name": "Night Mage - Score XP",
        "rule_type": "score_multiplier",
        "parameters": json.dumps({
            "multiplier": 0.0002,  # 100k points -> 20 XP
            "max_xp": 80.0,
        }),
        "priority": 10,
        "is_active": 1,
    },
    {
        "rule_id": f"{GAME_ID}_time",
        "game_id": GAME_ID,
        "rule_name": "Night Mage - Time XP",
        "rule_type": "time_bonus",
        "parameters": json.dumps({
            "xp_per_minute": 0.5,
            "max_minutes": 20.0,
        }),
        "priority": 5,
        "is_active": 1,
    },
]


def _quest(title, description, *, field, target, xp, coins, category):
    return {
        "title": title,
        "description": description,
        "quest_type": "score",
        "target_value": target,
        "xp_reward": xp,
        "reward_coins": coins,
        "is_active": 1,
        "config": json.dumps({
            "game_id": GAME_ID, "extra_data_field": field, "category": category,
            "reset_period": "daily", "reset_on_complete": True,
        }),
    }


QUESTS = [
    _quest("Night Mage: Monster Hunter", "Defeat 150 monsters in Night Mage today",
           field="enemies_defeated", target=150, xp=40, coins=5, category="gameplay"),
    _quest("Night Mage: Night Watch", "Clear 20 waves in Night Mage today",
           field="waves_cleared", target=20, xp=45, coins=10, category="gameplay"),
    _quest("Night Mage: Invader Hunter", "Slay 2 invaders sent by other players in Night Mage today",
           field="invaders_slain", target=2, xp=50, coins=10, category="skill"),
    _quest("Night Mage: Sharp Eye", "Burn 25 arrows and fireballs out of the air in Night Mage today",
           field="shots_down", target=25, xp=50, coins=10, category="skill"),
]

_QUEST_TITLES = {q["title"] for q in QUESTS}


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


def _upsert_quests(db) -> None:
    # Updated in place: a new row would lose what players did today.
    existing = {q.title: q for q in db.query(Quest).filter(Quest.title.in_(_QUEST_TITLES)).all()}
    for quest_data in QUESTS:
        quest = existing.get(quest_data["title"])
        if quest is None:
            db.add(Quest(created_at=NOW, **quest_data))
            continue
        for key, value in quest_data.items():
            setattr(quest, key, value)


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


def register_night_mage() -> bool:
    print("=" * 60)
    print("🧙  REGISTERING GAME: NIGHT MAGE")
    print("=" * 60)
    with get_db_session() as db:
        try:
            ts = datetime.now(timezone.utc).isoformat()

            action = _upsert_game(db, ts)
            db.flush()
            _replace_xp_rules(db)
            _upsert_quests(db)
            rewards = _copy_rewards(db, ts)
            db.commit()

            print(f"\n✅  Game {action}: {GAME_DATA['title']} [{GAME_ID}]")
            print(f"  Status ID: {RANKED_STATUS_ID} (ranked)")
            steem = db.query(Game.steem_rewards_enabled).filter(Game.game_id == GAME_ID).scalar()
            print(f"  STEEM:     {'on' if steem else 'off'} this week (rotated by hand in the admin)")
            print(f"  XP rules:  {len(XP_RULES)}")
            print(f"  Quests:    {len(QUESTS)}")
            print(f"  Rewards:   {rewards} rank bands copied from {REWARDS_FROM}")
            print(f"  Entry:     /games/{GAME_ID}/{GAME_DATA['entry_point']}")
            return True
        except Exception as exc:
            db.rollback()
            print(f"\n❌  Registration failed: {exc}")
            traceback.print_exc()
            return False


if __name__ == "__main__":
    sys.exit(0 if register_night_mage() else 1)
