"""
Idempotent registration script for Stunt Hill.

Registers (or fully updates) the game record, its XP rules and its quests so it
is launchable AND wired into the platform's XP / quest systems. Safe to run
multiple times — same result every run.

    python scripts/register_stunt_hill.py

NOTE on ranked / STEEM:
  For now the game is registered as status_id=6 ("fun"): visible and playable
  (Free Ride), but it does NOT feed the ranked weekly leaderboard and pays no
  STEEM. It will be promoted to status_id=5 ("ranked") + steem_rewards_enabled=1
  ONLY once the server-side score validation backend (stunt_hill_be) is in place.

XP / sessions:
  Both modes send a session (gameOver) so the player earns XP. The platform XP
  comes from extra_data (distance/coins/levels); the leaderboard from `score`.
  FREE RIDE sends score=0 (off the leaderboard) but keeps distance/coins → XP.
  → so the XP rules below are distance-based (work in both modes) + a score
    bonus that only pays out in RANKED (where score>0).
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
from app.models import Game, XPRule, Quest

GAME_ID = "stunt_hill"

# Status: 5 = ranked, 6 = fun. Stay on 6 until validation backend exists.
STATUS_ID = 6
STEEM_REWARDS = 0

NOW = datetime.now(timezone.utc).isoformat()

GAME_DATA = {
    "game_id": GAME_ID,
    "title": "Stunt Hill",
    "description": (
        "An acrobatic 2D hill racer across 5 wildly different worlds — flips and "
        "air-time charge your BOOST. Score = distance + trick combos with a growing "
        "multiplier. Free Ride to practice and unlock maps; weekly Ranked to compete in Leaderboard."
    ),
    "author": "Cur8 Games",
    "version": "0.2.0",
    "thumbnail": "thumbnail.png",
    "entry_point": "index.html",
    "category": "racing",
    "tags": json.dumps(["racing", "physics", "stunts", "arcade", "mobile", "ranked"]),
    "status_id": STATUS_ID,
    "steem_rewards_enabled": STEEM_REWARDS,
    "extra_data": json.dumps({
        "controls": "Touch (BRAKE / GAS / BOOST) or arrows + Space",
        "modes": ["Free Ride", "Ranked (weekly)"],
        "maps": 5,
        "features": [
            "5 distinct biomes with unique track types & panoramas",
            "Custom deterministic 2D vehicle physics (fixed timestep)",
            "Boost charged by tricks instead of fuel",
            "Stunts: loops, cannons, ski-jumps, tunnels, chasms",
            "Race-start 3·2·1 countdown",
        ],
    }),
}

# ─── XP rules ────────────────────────────────────────────────────────
# distance_bonus pays in BOTH modes (distance is always sent) → free ride earns
# XP. score_multiplier only pays in RANKED (free ride sends score=0).
XP_RULES = [
    {
        "rule_id": f"{GAME_ID}_distance",
        "game_id": GAME_ID,
        "rule_name": "Stunt Hill - Distance XP",
        "rule_type": "distance_bonus",
        "parameters": json.dumps({
            "milestone_distance": 50.0,   # 1 XP every 50 m  → ~30 XP for a full 1500 m run
            "xp_per_milestone":   1.0,
        }),
        "priority": 10,
        "is_active": 1,
    },
    {
        "rule_id": f"{GAME_ID}_ranked_score",
        "game_id": GAME_ID,
        "rule_name": "Stunt Hill - Ranked Score Bonus",
        "rule_type": "score_multiplier",
        "parameters": json.dumps({"multiplier": 0.0005, "max_xp": 50.0}),  # ranked only (free score=0)
        "priority": 20,
        "is_active": 1,
    },
]

# ─── Quests ──────────────────────────────────────────────────────────
# Three DIFFERENT objectives, all daily. They use quest_type "score", which the
# tracker treats as a generic accumulator over a session extra_data field
# (config.extra_data_field). distance/tricks/coins are sent in BOTH modes, so
# these progress in Free Ride too (no need to wait for ranked).
QUESTS = [
    {
        "title": "Stunt Hill: Road Trip",
        "description": "Drive 4,000 m total in Stunt Hill today",
        "quest_type": "score",
        "target_value": 4000,
        "xp_reward": 40,
        "reward_coins": 5,
        "is_active": 1,
        "config": json.dumps({
            "game_id": GAME_ID, "extra_data_field": "distance", "category": "gameplay",
            "reset_period": "daily", "reset_on_complete": True,
        }),
    },
    {
        "title": "Stunt Hill: Trick Star",
        "description": "Land 20 tricks in Stunt Hill today",
        "quest_type": "score",
        "target_value": 20,
        "xp_reward": 45,
        "reward_coins": 10,
        "is_active": 1,
        "config": json.dumps({
            "game_id": GAME_ID, "extra_data_field": "tricks", "category": "skill",
            "reset_period": "daily", "reset_on_complete": True,
        }),
    },
    {
        "title": "Stunt Hill: Gem Collector",
        "description": "Collect 150 gems in Stunt Hill today",
        "quest_type": "score",
        "target_value": 150,
        "xp_reward": 50,
        "reward_coins": 10,
        "is_active": 1,
        "config": json.dumps({
            "game_id": GAME_ID, "extra_data_field": "coins_collected", "category": "gameplay",
            "reset_period": "daily", "reset_on_complete": True,
        }),
    },
]

_QUEST_TITLES = {q["title"] for q in QUESTS}


# ─── Helpers ─────────────────────────────────────────────────────────

def _upsert_game(db, ts: str) -> str:
    existing = db.query(Game).filter(Game.game_id == GAME_ID).first()
    if existing:
        for key, value in GAME_DATA.items():
            if key != "game_id":
                setattr(existing, key, value)
        existing.updated_at = ts
        return "updated"
    db.add(Game(
        created_at=ts,
        updated_at=ts,
        **{k: v for k, v in GAME_DATA.items() if k not in ("created_at", "updated_at")},
    ))
    return "created"


def _replace_xp_rules(db) -> int:
    existing = db.query(XPRule).filter(XPRule.game_id == GAME_ID).all()
    removed = len(existing)
    for rule in existing:
        db.delete(rule)
    db.flush()
    for rule_data in XP_RULES:
        db.add(XPRule(created_at=NOW, updated_at=NOW, **rule_data))
    return removed


def _replace_quests(db) -> int:
    existing = db.query(Quest).filter(Quest.title.in_(_QUEST_TITLES)).all()
    removed = len(existing)
    for quest in existing:
        db.delete(quest)
    db.flush()
    for q_data in QUESTS:
        db.add(Quest(created_at=NOW, **q_data))
    return removed


def register_stunt_hill() -> bool:
    print("=" * 60)
    print("🏍️   REGISTERING GAME: STUNT HILL")
    print("=" * 60)
    with get_db_session() as db:
        try:
            ts = datetime.now(timezone.utc).isoformat()

            action = _upsert_game(db, ts)
            db.flush()
            print(f"\n✅  Game {action}: {GAME_DATA['title']} [{GAME_ID}]")

            removed_rules = _replace_xp_rules(db)
            if removed_rules:
                print(f"🗑️   Removed {removed_rules} existing XP rule(s)")
            print(f"⚡  Inserted {len(XP_RULES)} XP rules:")
            for r in XP_RULES:
                print(f"    - [{r['priority']:2d}] {r['rule_name']} ({r['rule_type']})")

            removed_quests = _replace_quests(db)
            if removed_quests:
                print(f"🗑️   Removed {removed_quests} existing quest(s)")
            print(f"🎯  Inserted {len(QUESTS)} quests:")
            for q in QUESTS:
                print(f"    - {q['title']} ({q['xp_reward']} XP, {q['reward_coins']} coins)")

            db.commit()

            print("\n" + "=" * 60)
            print("📋  SUMMARY")
            print("=" * 60)
            print(f"  Game:      {GAME_DATA['title']} ({GAME_ID})")
            print(f"  Status ID: {STATUS_ID} ({'ranked' if STATUS_ID == 5 else 'fun'})")
            print(f"  STEEM:     {STEEM_REWARDS}")
            print(f"  XP rules:  {len(XP_RULES)}")
            print(f"  Quests:    {len(QUESTS)}")
            print(f"  Entry:     /games/{GAME_ID}/{GAME_DATA['entry_point']}")
            print("=" * 60)
            print("\n✅  Registration completed.\n")
            return True
        except Exception as exc:
            db.rollback()
            print(f"\n❌  Registration failed: {exc}")
            traceback.print_exc()
            return False


if __name__ == "__main__":
    sys.exit(0 if register_stunt_hill() else 1)
