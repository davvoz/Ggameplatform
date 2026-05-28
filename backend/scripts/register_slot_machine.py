"""
Registration of the "Neon Jackpot: Arcade Paradise" game (slot machine) on the platform.
Registers the game, XP rules and specific quests.

Usage:
    python register_slot_machine.py [--force]
    --force    overwrites the game if it already exists
"""

import sys
import json
from pathlib import Path
from datetime import datetime, timezone

# Add the parent directory to the path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import get_db_session
from app.models import Game, XPRule, Quest

# ─── Game data ──────────────────────────────────────────────────────

GAME_ID = "slot_machine"

GAME_DATA = {
    "game_id": GAME_ID,
    "title": "Neon Jackpot: Arcade Paradise",
    "description": (
        "Neon slot machine with 5 reels × 3 rows and 20 paylines, "
        "wilds, scatters and mystery symbols. Free spins with multiplier, "
        "Treasure Vault mini-game, hot streak and progressive jackpot. "
        "'90s aesthetic / Electric Vegas. 100% procedural sound design."
    ),
    "author": "Cur8 Games",
    "version": "1.0.0",
    "thumbnail": "thumbnail.png",
    "entry_point": "index.html",
    "category": "casino",
    "tags": json.dumps(["casino", "slots", "arcade", "neon", "jackpot", "free-spins", "bonus"]),
    "status_id": 6,           # Fun
    "steem_rewards_enabled": 0,
    "extra_data": json.dumps({
        "controls": "Touch / Mouse / Keyboard (SPACE, ←/→, M=MAX, A=AUTO)",
        "reels": 5,
        "rows": 3,
        "paylines": 20,
        "startingBalance": 1000,
        "features": [
            "20 configurable paylines",
            "Free Spins (3+ scatters)",
            "Treasure Vault mini-game (3+ chests)",
            "Hot Streak combo multipliers",
            "Mystery Box morphing symbols",
            "Wild substitution",
            "Progressive Jackpot ticker",
            "Autoplay presets",
            "Procedural neon visuals + Web Audio synth",
        ],
    }),
}

# ─── XP rules ───────────────────────────────────────────────────────

NOW = datetime.now(timezone.utc).isoformat()

XP_RULES = [
    {
        "rule_id": "slot_machine_participation",
        "game_id": GAME_ID,
        "rule_name": "Participation Bonus",
        "rule_type": "flat",
        "parameters": json.dumps({"base_xp": 0.4}),
        "priority": 5,
        "is_active": 1,
    },
    {
        "rule_id": "slot_machine_win_threshold",
        "game_id": GAME_ID,
        "rule_name": "Total Winnings Threshold",
        "rule_type": "threshold",
        "parameters": json.dumps({
            "thresholds": [
                {"score": 25000, "xp": 20.0},
                {"score": 10000, "xp": 12.0},
                {"score": 5000,  "xp": 7.0},
                {"score": 2000,  "xp": 4.0},
                {"score": 1000,  "xp": 2.0},
                {"score": 250,   "xp": 0.75},
                {"score": 50,    "xp": 0.25},
            ]
        }),
        "priority": 15,
        "is_active": 1,
    },
    {
        "rule_id": "slot_machine_winnings_multiplier",
        "game_id": GAME_ID,
        "rule_name": "Winnings Multiplier",
        "rule_type": "score_multiplier",
        "parameters": json.dumps({"multiplier": 0.002, "max_xp": 15.0}),
        "priority": 10,
        "is_active": 1,
    },
    {
        "rule_id": "slot_machine_high_score_bonus",
        "game_id": GAME_ID,
        "rule_name": "High Score Bonus",
        "rule_type": "high_score_bonus",
        "parameters": json.dumps({"bonus_xp": 12.0}),
        "priority": 25,
        "is_active": 1,
    },
]

# ─── Specific quests ────────────────────────────────────────────────

QUESTS = [
    {
        "title": "Slot: First Spin",
        "description": "Play your first Neon Jackpot session",
        "quest_type": "play_games",
        "target_value": 1,
        "xp_reward": 15,
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
        "title": "Slot: Daily Roller",
        "description": "Play 5 Neon Jackpot sessions",
        "quest_type": "play_games",
        "target_value": 5,
        "xp_reward": 30,
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
        "title": "Slot: Big Win",
        "description": "Win at least 1000 coins in a single session",
        "quest_type": "score",
        "target_value": 1000,
        "xp_reward": 40,
        "reward_coins": 12,
        "is_active": 1,
        "config": json.dumps({
            "game_id": GAME_ID,
            "type": "score_threshold",
            "category": "skill",
            "reset_period": "daily",
            "reset_on_complete": True,
        }),
    },
    {
        "title": "Slot: High Roller",
        "description": "Win at least 5000 coins in a single session",
        "quest_type": "score",
        "target_value": 5000,
        "xp_reward": 80,
        "reward_coins": 25,
        "is_active": 1,
        "config": json.dumps({
            "game_id": GAME_ID,
            "type": "score_threshold",
            "category": "skill",
            "reset_period": "weekly",
            "reset_on_complete": True,
        }),
    },
    {
        "title": "Slot: Jackpot Hunter",
        "description": "Reach a total winnings of 25000 in a single session",
        "quest_type": "score",
        "target_value": 25000,
        "xp_reward": 200,
        "reward_coins": 50,
        "is_active": 1,
        "config": json.dumps({
            "game_id": GAME_ID,
            "type": "score_threshold",
            "category": "luck",
            "reset_period": "weekly",
            "reset_on_complete": True,
        }),
    },
]

# ─── Registration logic ─────────────────────────────────────────────

def _upsert_game(db, force: bool) -> bool:
    existing = db.query(Game).filter(Game.game_id == GAME_ID).first()
    if existing:
        if not force:
            print(f"\n⚠️  Game '{GAME_ID}' is already registered.")
            print("    Use --force to overwrite it.")
            return False
        print(f"\n🔄  Overwriting game '{GAME_ID}'...")
        db.delete(existing)
        db.flush()
    ts = datetime.now(timezone.utc).isoformat()
    game = Game(
        created_at=ts,
        updated_at=ts,
        **{k: v for k, v in GAME_DATA.items() if k not in ("created_at", "updated_at")},
    )
    db.add(game)
    db.flush()
    print(f"\n✅  Game added: {GAME_DATA['title']} [{GAME_ID}]")
    return True


def _replace_xp_rules(db) -> None:
    existing = db.query(XPRule).filter(XPRule.game_id == GAME_ID).all()
    if existing:
        for r in existing:
            db.delete(r)
        db.flush()
        print(f"🗑️   Removed {len(existing)} previous XP rules")
    print(f"\n⚡  Adding {len(XP_RULES)} XP rules...")
    for rule_data in XP_RULES:
        rule = XPRule(created_at=NOW, updated_at=NOW, **rule_data)
        db.add(rule)
        print(f"    - [{rule_data['priority']:2d}] {rule_data['rule_name']}")


def _replace_quests(db) -> None:
    print(f"\n🎯  Adding {len(QUESTS)} quests...")
    for q_data in QUESTS:
        quest = Quest(created_at=NOW, **q_data)
        db.add(quest)
        print(f"    - {q_data['title']} ({q_data['xp_reward']} XP, {q_data['reward_coins']} coins)")


def register_slot_machine(force: bool = False) -> bool:
    print("=" * 60)
    print("🎰  GAME REGISTRATION: NEON JACKPOT (slot_machine)")
    print("=" * 60)

    with get_db_session() as db:
        try:
            if not _upsert_game(db, force):
                return False
            _replace_xp_rules(db)
            _replace_quests(db)
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
            print("\n✅  Registration completed successfully!\n")
            return True
        except Exception as exc:
            db.rollback()
            print(f"\n❌  Error during registration: {exc}")
            import traceback
            traceback.print_exc()
            return False


if __name__ == "__main__":
    force = "--force" in sys.argv
    success = register_slot_machine(force=force)
    sys.exit(0 if success else 1)
