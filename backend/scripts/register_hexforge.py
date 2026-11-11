"""
Idempotent registration script for Hexforge.

Registers (or updates) the game record, its XP rules and its daily quests.
Safe to run multiple times: the play count and the players' quest progress
are kept.

    python scripts/register_hexforge.py

Fun section, no STEEM:
  Hexforge is a city-and-heroes strategy game with its own permanent trophy
  ranking, so it lives in the Fun section (status_id=6) and never feeds the
  weekly ranked leaderboard. STEEM is off when the game is created; afterwards
  the script never touches that switch.

XP / sessions:
  Every attack (outpost or player) is one platform session: it starts when the
  squad launches and ends with the battle. The score is the destruction %, and
  extra_data carries attacks / victories / destruction for the quests.
"""

import sys
import json
import traceback
from pathlib import Path
from datetime import datetime, timezone

# Windows console (cp1252) can't encode emoji — force UTF-8 output.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import get_db_session
from app.models import Game, Quest, XPRule

GAME_ID = "hexforge"
FUN_STATUS_ID = 6

NOW = datetime.now(timezone.utc).isoformat()

GAME_DATA = {
    "game_id": GAME_ID,
    "title": "Hexforge",
    "description": (
        "Build a city of iron and runes, forge towers and heroes, and raid the "
        "cities of other players. Your squad of four fights on its own: pick the "
        "side, the target and the formation, then watch the replay. Evolve your "
        "heroes, upgrade every building, fuse three into one, and climb the "
        "permanent trophy ranking."
    ),
    "author": "Cur8 Games",
    "version": "1.0.0",
    "thumbnail": "thumbnail.png",
    "entry_point": "index.html",
    "category": "strategy",
    "tags": json.dumps(["strategy", "city-builder", "pvp", "heroes", "isometric", "fun"]),
    "status_id": FUN_STATUS_ID,
    "steem_rewards_enabled": 0,  # only for a new game, see above
    "extra_data": json.dumps({
        "controls": "Touch or mouse: tap buildings, drag to pan, pinch or wheel to zoom",
        "modes": ["City", "Outposts", "PvP raids"],
        "features": [
            "Your own city, saved forever, producing while you are away",
            "Server-simulated battles you watch as replays",
            "Hero evolution, items, building upgrades and fusion",
            "Permanent trophy ranking, raid log and revenge",
        ],
    }),
}

XP_RULES = [
    {
        "rule_id": f"{GAME_ID}_attack",
        "game_id": GAME_ID,
        "rule_name": "Hexforge - Attack XP",
        "rule_type": "flat",
        "parameters": json.dumps({"base_xp": 5.0}),
        "priority": 5,
        "is_active": 1,
    },
    {
        "rule_id": f"{GAME_ID}_destruction",
        "game_id": GAME_ID,
        "rule_name": "Hexforge - Destruction XP",
        "rule_type": "score_multiplier",
        "parameters": json.dumps({"multiplier": 0.25, "max_xp": 25.0}),  # 100 % destruction → 25 XP
        "priority": 10,
        "is_active": 1,
    },
]

QUESTS = [
    {
        "title": "Hexforge: Raider",
        "description": "Launch 3 attacks in Hexforge today",
        "quest_type": "score",
        "target_value": 3,
        "xp_reward": 40,
        "reward_coins": 5,
        "is_active": 1,
        "config": json.dumps({
            "game_id": GAME_ID, "extra_data_field": "attacks", "category": "gameplay",
            "reset_period": "daily", "reset_on_complete": True,
        }),
    },
    {
        "title": "Hexforge: Core Breaker",
        "description": "Win 2 battles in Hexforge today (bring down the core)",
        "quest_type": "score",
        "target_value": 2,
        "xp_reward": 50,
        "reward_coins": 10,
        "is_active": 1,
        "config": json.dumps({
            "game_id": GAME_ID, "extra_data_field": "victories", "category": "skill",
            "reset_period": "daily", "reset_on_complete": True,
        }),
    },
    {
        "title": "Hexforge: Demolisher",
        "description": "Destroy 200% of cities in Hexforge today (destruction adds up)",
        "quest_type": "score",
        "target_value": 200,
        "xp_reward": 45,
        "reward_coins": 10,
        "is_active": 1,
        "config": json.dumps({
            "game_id": GAME_ID, "extra_data_field": "destruction", "category": "gameplay",
            "reset_period": "daily", "reset_on_complete": True,
        }),
    },
]

_QUEST_TITLES = {q["title"] for q in QUESTS}


def _upsert_game(db, ts: str) -> str:
    existing = db.query(Game).filter(Game.game_id == GAME_ID).first()
    if existing:
        # The STEEM switch is set by hand in the admin: keep it.
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


def register_hexforge() -> bool:
    print("=" * 60)
    print("⚒️   REGISTERING GAME: HEXFORGE")
    print("=" * 60)
    with get_db_session() as db:
        try:
            ts = datetime.now(timezone.utc).isoformat()
            action = _upsert_game(db, ts)
            db.flush()
            _replace_xp_rules(db)
            _upsert_quests(db)
            db.commit()

            print(f"\n✅  Game {action}: {GAME_DATA['title']} [{GAME_ID}]")
            print(f"  Status ID: {FUN_STATUS_ID} (fun)")
            steem = db.query(Game.steem_rewards_enabled).filter(Game.game_id == GAME_ID).scalar()
            print(f"  STEEM:     {'on' if steem else 'off'}")
            print(f"  XP rules:  {len(XP_RULES)}")
            print(f"  Quests:    {len(QUESTS)}")
            print(f"  Entry:     /games/{GAME_ID}/{GAME_DATA['entry_point']}")
            return True
        except Exception as exc:
            db.rollback()
            print(f"\n❌  Registration failed: {exc}")
            traceback.print_exc()
            return False


if __name__ == "__main__":
    sys.exit(0 if register_hexforge() else 1)
