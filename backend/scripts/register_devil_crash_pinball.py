"""
Idempotent registration script for Devil Crash Pinball.

Registers (or fully updates) the game, its XP rules, and its quests.
Safe to run multiple times — produces the same result on every run.

Usage: python register_devil_crash_pinball.py
"""

import sys
import json
import traceback
from pathlib import Path
from datetime import datetime, timezone

# Add the parent directory to the path so app modules can be imported.
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import get_db_session
from app.models import Game, XPRule, Quest

# ─── Game data ───────────────────────────────────────────────────────

GAME_ID = "devil_crash_pinball"

GAME_DATA = {
    "game_id": GAME_ID,
    "title": "Devil Crash Pinball",
    "description": (
        "A dark-fantasy pinball game inspired by the legendary Devil Crash / Naxat "
        "Pinball. Three vertical tables — Main, Upper, and Bonus Dungeon — "
        "connected by ramps and gates. Face the Demon boss across 3 phases, "
        "the Dragon and the Witch as mini-bosses, complete 6 missions, and "
        "climb the leaderboard with combos, stacking multipliers, and bank bonuses. "
        "Mobile-first: tap left/right halves for the flippers."
    ),
    "author": "Cur8 Games",
    "version": "1.0.0",
    "thumbnail": "thumbnail.png",
    "entry_point": "index.html",
    "category": "arcade",
    "tags": json.dumps(["pinball", "arcade", "dark fantasy", "boss fight", "mobile", "retro"]),
    "status_id": 6,                # Fun
    "steem_rewards_enabled": 0,
    "extra_data": json.dumps({
        "controls": "Touch (left/right halves) or Z/M keys",
        "sections": 3,
        "missions": 6,
        "bosses": ["Demon (3 phases)", "Dragon", "Witch"],
        "ballsPerGame": 3,
        "features": [
            "3 vertical tables connected by ramps and gates",
            "Demon boss with 3 distinct phases",
            "Dragon and Witch mini-bosses with FSM",
            "6 missions that alter the table state",
            "Stacking multiplier and combo system",
            "Ball save, tilt penalty, extra ball",
            "Procedural chiptune soundtrack",
            "Procedural pixel art",
        ],
    }),
}

# ─── XP rules ────────────────────────────────────────────────────────

NOW = datetime.now(timezone.utc).isoformat()

XP_RULES = [
    {
        "rule_id": f"{GAME_ID}_participation",
        "game_id": GAME_ID,
        "rule_name": "Participation Bonus",
        "rule_type": "flat",
        "parameters": json.dumps({"base_xp": 1.0}),
        "priority": 5,
        "is_active": 1,
    },
    {
        "rule_id": f"{GAME_ID}_score_thresholds",
        "game_id": GAME_ID,
        "rule_name": "Score Thresholds",
        "rule_type": "threshold",
        "parameters": json.dumps({
            "thresholds": [
                {"score": 5_000_000, "xp": 30.0},
                {"score": 2_000_000, "xp": 18.0},
                {"score": 1_000_000, "xp": 12.0},
                {"score":   500_000, "xp":  7.0},
                {"score":   200_000, "xp":  4.0},
                {"score":    50_000, "xp":  2.0},
                {"score":    10_000, "xp":  1.0},
            ]
        }),
        "priority": 15,
        "is_active": 1,
    },
    {
        "rule_id": f"{GAME_ID}_score_multiplier",
        "game_id": GAME_ID,
        "rule_name": "Score Multiplier",
        "rule_type": "score_multiplier",
        "parameters": json.dumps({"multiplier": 0.000005, "max_xp": 25.0}),
        "priority": 10,
        "is_active": 1,
    },
    {
        "rule_id": f"{GAME_ID}_mini_boss_slayer",
        "game_id": GAME_ID,
        "rule_name": "Mini Boss Slayer",
        "rule_type": "achievement",
        "parameters": json.dumps({
            "achievement_key": "mini_boss_slayer",
            "bonus_xp": 8.0,
        }),
        "priority": 20,
        "is_active": 1,
    },
    {
        "rule_id": f"{GAME_ID}_millionaire",
        "game_id": GAME_ID,
        "rule_name": "Millionaire",
        "rule_type": "achievement",
        "parameters": json.dumps({
            "achievement_key": "millionaire",
            "bonus_xp": 15.0,
        }),
        "priority": 22,
        "is_active": 1,
    },
    {
        "rule_id": f"{GAME_ID}_high_score_bonus",
        "game_id": GAME_ID,
        "rule_name": "High Score Bonus",
        "rule_type": "high_score_bonus",
        "parameters": json.dumps({"bonus_xp": 12.0}),
        "priority": 25,
        "is_active": 1,
    },
]

# ─── Quests ──────────────────────────────────────────────────────────

QUESTS = [
    {
        "title": "Devil Crash: First Plunge",
        "description": "Play your first game of Devil Crash Pinball",
        "quest_type": "play_games",
        "target_value": 1,
        "xp_reward": 20,
        "reward_coins": 5,
        "is_active": 1,
        "config": json.dumps({
            "game_id": GAME_ID,
            "type": "games_played",
            "category": "gameplay",
            "reset_period": "daily",
            "reset_on_complete": True,
        }),
    },
    {
        "title": "Devil Crash: Daily Pinball",
        "description": "Play 5 games of Devil Crash Pinball",
        "quest_type": "play_games",
        "target_value": 5,
        "xp_reward": 35,
        "reward_coins": 8,
        "is_active": 1,
        "config": json.dumps({
            "game_id": GAME_ID,
            "type": "games_played",
            "category": "gameplay",
            "reset_period": "daily",
            "reset_on_complete": True,
        }),
    },
    {
        "title": "Devil Crash: Score Hunter",
        "description": "Reach 100,000 points in a single game",
        "quest_type": "score",
        "target_value": 100_000,
        "xp_reward": 40,
        "reward_coins": 10,
        "is_active": 1,
        "config": json.dumps({
            "game_id": GAME_ID,
            "type": "single_game_score",
            "category": "skill",
            "reset_period": "daily",
            "reset_on_complete": True,
        }),
    },
    {
        "title": "Devil Crash: Half Million",
        "description": "Reach 500,000 points in a single game",
        "quest_type": "score",
        "target_value": 500_000,
        "xp_reward": 80,
        "reward_coins": 20,
        "is_active": 1,
        "config": json.dumps({
            "game_id": GAME_ID,
            "type": "single_game_score",
            "category": "skill",
            "reset_period": "weekly",
            "reset_on_complete": True,
        }),
    },
    {
        "title": "Devil Crash: Slay The Dragon",
        "description": "Defeat a mini-boss (Dragon or Witch)",
        "quest_type": "score",
        "target_value": 1,
        "xp_reward": 60,
        "reward_coins": 15,
        "is_active": 1,
        "config": json.dumps({
            "game_id": GAME_ID,
            "type": "mini_boss_slayer",
            "category": "skill",
            "reset_period": "daily",
            "reset_on_complete": True,
        }),
    },
    {
        "title": "Devil Crash: Millionaire",
        "description": "Score over 1,000,000 points in a single game",
        "quest_type": "score",
        "target_value": 1_000_000,
        "xp_reward": 150,
        "reward_coins": 40,
        "is_active": 1,
        "config": json.dumps({
            "game_id": GAME_ID,
            "type": "single_game_score",
            "category": "mastery",
            "reset_period": "weekly",
            "reset_on_complete": True,
        }),
    },
]

# ─── Helpers ─────────────────────────────────────────────────────────

_QUEST_TITLES = {q["title"] for q in QUESTS}


def _upsert_game(db, ts: str) -> str:
    """Insert or update the game record. Returns 'created' or 'updated'."""
    existing = db.query(Game).filter(Game.game_id == GAME_ID).first()
    if existing:
        for key, value in GAME_DATA.items():
            if key != "game_id":
                setattr(existing, key, value)
        existing.updated_at = ts
        return "updated"

    game = Game(
        created_at=ts,
        updated_at=ts,
        **{k: v for k, v in GAME_DATA.items() if k not in ("created_at", "updated_at")},
    )
    db.add(game)
    return "created"


def _replace_xp_rules(db) -> int:
    """Delete all existing XP rules for the game, then insert the canonical set."""
    existing = db.query(XPRule).filter(XPRule.game_id == GAME_ID).all()
    removed = len(existing)
    for rule in existing:
        db.delete(rule)
    db.flush()

    for rule_data in XP_RULES:
        db.add(XPRule(created_at=NOW, updated_at=NOW, **rule_data))

    return removed


def _replace_quests(db) -> int:
    """Delete existing quests for this game (matched by title), then insert the canonical set."""
    existing = db.query(Quest).filter(Quest.title.in_(_QUEST_TITLES)).all()
    removed = len(existing)
    for quest in existing:
        db.delete(quest)
    db.flush()

    for q_data in QUESTS:
        db.add(Quest(created_at=NOW, **q_data))

    return removed


# ─── Registration entry point ────────────────────────────────────────

def register_devil_crash_pinball() -> bool:
    print("=" * 60)
    print("👹  REGISTERING GAME: DEVIL CRASH PINBALL")
    print("=" * 60)

    with get_db_session() as db:
        try:
            ts = datetime.now(timezone.utc).isoformat()

            game_action = _upsert_game(db, ts)
            db.flush()
            print(f"\n✅  Game {game_action}: {GAME_DATA['title']} [{GAME_ID}]")

            removed_rules = _replace_xp_rules(db)
            if removed_rules:
                print(f"🗑️   Removed {removed_rules} existing XP rule(s)")
            print(f"⚡  Inserted {len(XP_RULES)} XP rules:")
            for rule_data in XP_RULES:
                print(f"    - [{rule_data['priority']:2d}] {rule_data['rule_name']}")

            removed_quests = _replace_quests(db)
            if removed_quests:
                print(f"🗑️   Removed {removed_quests} existing quest(s)")
            print(f"🎯  Inserted {len(QUESTS)} quests:")
            for q_data in QUESTS:
                print(f"    - {q_data['title']} ({q_data['xp_reward']} XP, {q_data['reward_coins']} coins)")

            db.commit()

            print("\n" + "=" * 60)
            print("📋  SUMMARY")
            print("=" * 60)
            print(f"  Game:        {GAME_DATA['title']} ({GAME_ID})")
            print(f"  Category:    {GAME_DATA['category']}")
            print(f"  Status ID:   {GAME_DATA['status_id']}  (Fun)")
            print(f"  XP rules:    {len(XP_RULES)}")
            print(f"  Quests:      {len(QUESTS)}")
            print("=" * 60)
            print("\n✅  Registration completed successfully.\n")
            return True

        except Exception as exc:
            db.rollback()
            print(f"\n❌  Registration failed: {exc}")
            traceback.print_exc()
            return False


if __name__ == "__main__":
    success = register_devil_crash_pinball()
    sys.exit(0 if success else 1)
