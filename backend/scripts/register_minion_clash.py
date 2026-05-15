"""
Idempotent registration script for Minion Clash.

Registers (or fully updates) the game, its XP rules, and its quests.
Safe to run multiple times — produces the same result on every run.

Usage: python register_minion_clash.py
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

GAME_ID = "minion_clash"

GAME_DATA = {
    "game_id": GAME_ID,
    "title": "Minion Clash",
    "description": (
        "A real-time strategy card game heavily inspired by Minion Masters. "
        "Pick a hero (Warrior, Mage, Archer, Robot), build a 10-card deck "
        "from a roster of 30 cards (units + spells), then face the AI in a "
        "5-level campaign. Defeat enemy minions, push to the enemy tower, and "
        "destroy it before time runs out. Mana regenerates over time — play "
        "smart, react fast. Multiplayer coming later."
    ),
    "author": "Cur8 Games",
    "version": "1.0.0",
    "thumbnail": "thumbnail.png",
    "entry_point": "index.html",
    "category": "strategy",
    "tags": json.dumps(["strategy", "cards", "real-time", "tower-defense", "mobile", "rts"]),
    "status_id": 6,                # Fun
    "steem_rewards_enabled": 0,
    "extra_data": json.dumps({
        "controls": "Touch (drag cards from hand onto your half of the field)",
        "modes": ["Campaign (5 levels)"],
        "heroes": 4,
        "deckSize": 10,
        "cardRoster": 30,
        "features": [
            "4 unique heroes with distinct stats",
            "30-card data-driven roster (25 units + 5 spells)",
            "5 hand-crafted campaign levels with AI profiles",
            "Behavior strategies: Advance, Patrol, Static",
            "Attack strategies: Melee, Ranged, Null (support)",
            "Auras, on-death effects, on-hit effects, taunts, low-hp rage",
            "Mana economy and per-card cooldowns",
            "Spatial-grid combat with soft-body separation",
            "Scalable system ready for multiplayer extension",
        ],
    }),
}

# ─── XP rules ────────────────────────────────────────────────────────

NOW = datetime.now(timezone.utc).isoformat()

# XP logic: score = 0 on loss; score = (MATCH_TIME_LIMIT - matchTime) * 10 on win.
# Faster victory → higher score → more XP. Loss always yields 0 XP.
# MATCH_TIME_LIMIT = 240 s  →  realistic score range ≈ 300 (slow win) … 2100 (very fast win).
XP_RULES = [
    {
        "rule_id": f"{GAME_ID}_speed_victory",
        "game_id": GAME_ID,
        "rule_name": "Speed Victory",
        "rule_type": "score_multiplier",
        "parameters": json.dumps({"multiplier": 0.02, "max_xp": 50.0}),
        "priority": 10,
        "is_active": 1,
    },
]

# ─── Quests ──────────────────────────────────────────────────────────

QUESTS = [
    {
        "title": "Minion Clash: First Battle",
        "description": "Play your first match of Minion Clash",
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
        "title": "Minion Clash: Daily Skirmish",
        "description": "Play 5 matches of Minion Clash",
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
        "title": "Minion Clash: Tactician",
        "description": "Win a match in under 140 seconds (score ≥ 1,000)",
        "quest_type": "score",
        "target_value": 1000,
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
        "title": "Minion Clash: Warlord",
        "description": "Win a match in under 80 seconds (score ≥ 1,600)",
        "quest_type": "score",
        "target_value": 1600,
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
        "title": "Minion Clash: Champion",
        "description": "Win a match in under 40 seconds (score ≥ 2,000)",
        "quest_type": "score",
        "target_value": 2000,
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

def register_minion_clash() -> bool:
    print("=" * 60)
    print("⚔️   REGISTERING GAME: MINION CLASH")
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
    success = register_minion_clash()
    sys.exit(0 if success else 1)
