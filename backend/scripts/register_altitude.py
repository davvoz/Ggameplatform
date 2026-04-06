"""
Script di censimento del gioco Altitude nella piattaforma.

Registra il gioco, regole XP e 3 quest giornaliere.
Uso: python register_altitude.py [--force]
     --force  sovrascrive il gioco se già esistente
"""

import sys
import json
from pathlib import Path
from datetime import datetime, timezone

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import get_db_session
from app.models import Game, XPRule, Quest

# ─── Dati del gioco ──────────────────────────────────────────────────

GAME_ID = "altitude"

GAME_DATA = {
    "game_id": GAME_ID,
    "title": "Altitude",
    "description": (
        "Tactical vertical jumper! Jump higher and higher collecting coins, "
        "defeating enemies and powering up with permanent upgrades. "
        "6 platform types, 5 unique enemies and 18 upgrades to unlock."
    ),
    "author": "Cur8 Games",
    "version": "1.0.0",
    "thumbnail": "thumbnail.png",
    "entry_point": "index.html",
    "category": "arcade",
    "tags": json.dumps(["arcade", "jumper", "platformer", "upgrades", "endless", "pixel-art"]),
    "status_id": 6,           # Fun
    "steem_rewards_enabled": 0,
    "extra_data": json.dumps({
        "controls": "← → Movement / SPACE Jump / Z Glide",
        "platforms": 6,
        "enemies": 5,
        "powerUps": 6,
        "upgrades": 18,
        "features": [
            "6 platform types (normal, fragile, moving, bouncy, cloud, deadly)",
            "5 enemies with unique AI (floater, chaser, shooter, bat, ghost)",
            "6 temporary power-ups (jetpack, shield, magnet, spring boots, slow-time, double coins)",
            "18 permanent upgrades in 4 categories",
            "Combo system for score multiplier",
            "Progressive zones with increasing difficulty",
        ],
    }),
}

# ─── Regole XP ────────────────────────────────────────────────────────

NOW = datetime.now(timezone.utc).isoformat()

XP_RULES = [
    {
        "rule_id": "altitude_distance",
        "game_id": GAME_ID,
        "rule_name": "Altitude - Distance XP",
        "rule_type": "distance_bonus",
        "parameters": json.dumps({
            "milestone_distance": 1000.0,   # 1 XP ogni 1.000 m
            "xp_per_milestone":   1.0,      # → 100 XP ogni 100.000 m
        }),
        "priority": 10,
        "is_active": 1,
    },
]

# ─── 3 Quest giornaliere ─────────────────────────────────────────────

QUESTS = [
    {
        "title": "Altitude: First Climb",
        "description": "Play your first Altitude session",
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
        "title": "Altitude: Sky Hunter",
        "description": "Defeat 15 enemies today",
        "quest_type": "score",
        "target_value": 15,
        "xp_reward": 45,
        "reward_coins": 10,
        "is_active": 1,
        "config": json.dumps({
            "game_id": GAME_ID,
            "type": "total_enemies_defeated",
            "category": "skill",
            "reset_period": "daily",
            "reset_on_complete": True,
        }),
    },
    {
        "title": "Altitude: Coin Collector",
        "description": "Collect 100 coins in total today",
        "quest_type": "score",
        "target_value": 100,
        "xp_reward": 35,
        "reward_coins": 8,
        "is_active": 1,
        "config": json.dumps({
            "game_id": GAME_ID,
            "type": "total_coins",
            "category": "gameplay",
            "reset_period": "daily",
            "reset_on_complete": True,
        }),
    },
]

# ─── Logica di registrazione ─────────────────────────────────────────

def register_altitude(force: bool = False) -> bool:
    print("=" * 60)
    print("🚀  REGISTRAZIONE GIOCO: ALTITUDE")
    print("=" * 60)

    with get_db_session() as db:
        try:
            # ── Gioco ──────────────────────────────────────────────
            existing_game = db.query(Game).filter(Game.game_id == GAME_ID).first()

            if existing_game:
                if not force:
                    print(f"\n⚠️  Il gioco '{GAME_ID}' è già registrato.")
                    print("    Usa --force per sovrascriverlo.")
                    return False
                print(f"\n🔄  Sovrascrivo il gioco '{GAME_ID}'...")
                db.delete(existing_game)
                db.flush()

            ts = datetime.now(timezone.utc).isoformat()
            game = Game(
                created_at=ts,
                updated_at=ts,
                **{k: v for k, v in GAME_DATA.items() if k not in ("created_at", "updated_at")},
            )
            db.add(game)
            db.flush()
            print(f"\n✅  Gioco aggiunto: {GAME_DATA['title']} [{GAME_ID}]")

            # ── Regole XP ──────────────────────────────────────────
            existing_rules = db.query(XPRule).filter(XPRule.game_id == GAME_ID).all()
            if existing_rules:
                for r in existing_rules:
                    db.delete(r)
                db.flush()
                print(f"🗑️   Rimosse {len(existing_rules)} regole XP precedenti")

            print(f"\n⚡  Aggiungo {len(XP_RULES)} regole XP...")
            for rule_data in XP_RULES:
                rule = XPRule(
                    created_at=NOW,
                    updated_at=NOW,
                    **rule_data,
                )
                db.add(rule)
                print(f"    - [{rule_data['priority']:2d}] {rule_data['rule_name']}")

            # ── Quest ──────────────────────────────────────────────
            print(f"\n🎯  Aggiungo {len(QUESTS)} quest giornaliere...")
            for q_data in QUESTS:
                quest = Quest(
                    created_at=NOW,
                    **q_data,
                )
                db.add(quest)
                print(f"    - {q_data['title']} ({q_data['xp_reward']} XP, {q_data['reward_coins']} coins)")

            db.commit()

            # ── Riepilogo ──────────────────────────────────────────
            print("\n" + "=" * 60)
            print("📋  RIEPILOGO")
            print("=" * 60)
            print(f"  Gioco:       {GAME_DATA['title']} ({GAME_ID})")
            print(f"  Categoria:   {GAME_DATA['category']}")
            print(f"  Status ID:   {GAME_DATA['status_id']}  (Fun)")
            print(f"  Regole XP:   {len(XP_RULES)}")
            print(f"  Quest:       {len(QUESTS)}")
            print("=" * 60)
            print("\n✅  Registrazione completata con successo!\n")
            return True

        except Exception as exc:
            db.rollback()
            print(f"\n❌  Errore durante la registrazione: {exc}")
            import traceback
            traceback.print_exc()
            return False


# ─── Entry point ─────────────────────────────────────────────────────

if __name__ == "__main__":
    force = "--force" in sys.argv
    success = register_altitude(force=force)
    sys.exit(0 if success else 1)
