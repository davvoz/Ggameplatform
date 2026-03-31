"""
Script di censimento del gioco Pixel Arena Pong nella piattaforma.

Registra il gioco, regole XP e 3 quest giornaliere.
Uso: python register_modern_pong.py [--force]
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

GAME_ID = "modern_pong"

GAME_DATA = {
    "game_id": GAME_ID,
    "title": "Pixel Arena Pong",
    "description": (
        "Pong tattico in stile Battle Flip Shot! Scegli il tuo personaggio, "
        "raccogli power-up e sfida la CPU o altri giocatori in tempo reale. "
        "6 personaggi unici, 10 power-up e grafica pixel-art procedurale."
    ),
    "author": "Cur8 Games",
    "version": "1.0.0",
    "thumbnail": "thumbnail.png",
    "entry_point": "index.html",
    "category": "arcade",
    "tags": json.dumps(["arcade", "pong", "multiplayer", "pvp", "pixel-art", "power-ups"]),
    "status_id": 6,           # Fun
    "steem_rewards_enabled": 0,
    "extra_data": json.dumps({
        "controls": "Touch Joystick / WASD / Arrow Keys",
        "characters": 6,
        "powerUps": 10,
        "modes": ["VS CPU", "Multiplayer"],
        "features": [
            "6 personaggi con statistiche uniche",
            "10 power-up tattici",
            "Sprite pixel-art procedurali",
            "Multiplayer in tempo reale con scommesse",
            "3 livelli di difficoltà CPU",
        ],
    }),
}

# ─── Regole XP ────────────────────────────────────────────────────────

NOW = datetime.now(timezone.utc).isoformat()

XP_RULES = [
    {
        "rule_id": "modern_pong_score",
        "game_id": GAME_ID,
        "rule_name": "Match Score",
        "rule_type": "score_multiplier",
        "parameters": json.dumps({
            "multiplier": 1.5,
            "max_xp": 50.0,
        }),
        "priority": 10,
        "is_active": 1,
    },
    {
        "rule_id": "modern_pong_time",
        "game_id": GAME_ID,
        "rule_name": "Match Duration Bonus",
        "rule_type": "time_bonus",
        "parameters": json.dumps({
            "xp_per_minute": 0.5,
            "max_minutes": 10,
        }),
        "priority": 8,
        "is_active": 1,
    },
    {
        "rule_id": "modern_pong_high_score",
        "game_id": GAME_ID,
        "rule_name": "New Record Bonus",
        "rule_type": "high_score_bonus",
        "parameters": json.dumps({
            "bonus_xp": 15.0,
        }),
        "priority": 15,
        "is_active": 1,
    },
    {
        "rule_id": "modern_pong_improvement",
        "game_id": GAME_ID,
        "rule_name": "Personal Best Improvement",
        "rule_type": "percentile_improvement",
        "parameters": json.dumps({
            "xp_per_percent": 0.8,
            "max_xp": 60.0,
        }),
        "priority": 12,
        "is_active": 1,
    },
    {
        "rule_id": "modern_pong_milestones",
        "game_id": GAME_ID,
        "rule_name": "Score Milestones",
        "rule_type": "threshold",
        "parameters": json.dumps({
            "thresholds": [
                {"score": 3, "xp": 3},
                {"score": 5, "xp": 8},
                {"score": 7, "xp": 15},
                {"score": 10, "xp": 25},
            ],
        }),
        "priority": 20,
        "is_active": 1,
    },
    {
        "rule_id": "modern_pong_participation",
        "game_id": GAME_ID,
        "rule_name": "Participation Bonus",
        "rule_type": "flat",
        "parameters": json.dumps({"base_xp": 2.0}),
        "priority": 5,
        "is_active": 1,
    },
]

# ─── 3 Quest giornaliere ─────────────────────────────────────────────

QUESTS = [
    {
        "title": "Pong: First Match",
        "description": "Play your first Pixel Arena Pong match",
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
        "title": "Pong: Champion of the Day",
        "description": "Win 3 Pixel Arena Pong matches",
        "quest_type": "score",
        "target_value": 3,
        "xp_reward": 50,
        "reward_coins": 10,
        "is_active": 1,
        "config": json.dumps({
            "game_id": GAME_ID,
            "type": "wins",
            "category": "skill",
            "reset_period": "daily",
            "reset_on_complete": True,
        }),
    },
    {
        "title": "Pong: Power-Up Hunter",
        "description": "Collect 10 power-ups in a day",
        "quest_type": "score",
        "target_value": 10,
        "xp_reward": 35,
        "reward_coins": 8,
        "is_active": 1,
        "config": json.dumps({
            "game_id": GAME_ID,
            "type": "powerups_collected",
            "category": "gameplay",
            "reset_period": "daily",
            "reset_on_complete": True,
        }),
    },
]

# ─── Logica di registrazione ─────────────────────────────────────────

def register_modern_pong(force: bool = False) -> bool:
    print("=" * 60)
    print("🏓  REGISTRAZIONE GIOCO: PIXEL ARENA PONG")
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
    success = register_modern_pong(force=force)
    sys.exit(0 if success else 1)
