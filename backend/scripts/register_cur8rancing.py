"""
Script di censimento del gioco CUR8 Racing nella piattaforma.

Registra il gioco, le regole XP e le quest specifiche.
Uso: python register_cur8rancing.py [--force]
     --force  sovrascrive il gioco se già esistente
"""

import sys
import json
from pathlib import Path
from datetime import datetime, timezone

# Aggiunge la directory padre al path per importare i moduli dell'app
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import get_db_session
from app.models import Game, XPRule, Quest

# ─── Dati del gioco ──────────────────────────────────────────────────

GAME_ID = "cur8rancing"

GAME_DATA = {
    "game_id": GAME_ID,
    "title": "CUR8 Racing",
    "description": (
        "Corsa arcade in 3D! Scegli la tua auto, scendi in pista e "
        "battaglia contro avversari controllati dall'IA su tre giri. "
        "Controlli semplici, fisica arcade e camera al volante."
    ),
    "author": "Cur8 Games",
    "version": "1.0.0",
    "thumbnail": "thumbnail.png",
    "entry_point": "index.html",
    "category": "racing",
    "tags": json.dumps(["racing", "3d", "arcade", "cars", "race"]),
    "status_id": 6,           # Fun
    "steem_rewards_enabled": 0,
    "extra_data": json.dumps({
        "controls": "Touch / Keyboard (Arrows or WASD)",
        "laps": 3,
        "opponents": 3,
        "cars": 5,
        "features": [
            "5 auto selezionabili con statistiche diverse",
            "Avversari IA su waypoint",
            "Fisica arcade",
            "Camera inseguitrice",
        ],
    }),
}

# ─── Regole XP ───────────────────────────────────────────────────────

NOW = datetime.now(timezone.utc).isoformat()

XP_RULES = [
    {
        "rule_id": "cur8rancing_participation",
        "game_id": GAME_ID,
        "rule_name": "Participation Bonus",
        "rule_type": "flat",
        "parameters": json.dumps({"base_xp": 0.5}),
        "priority": 5,
        "is_active": 1,
    },
    {
        "rule_id": "cur8rancing_position_bonus",
        "game_id": GAME_ID,
        "rule_name": "Finish Position Bonus",
        "rule_type": "threshold",
        "parameters": json.dumps({
            "thresholds": [
                {"score": 1000, "xp": 8.0},
                {"score": 600,  "xp": 5.0},
                {"score": 400,  "xp": 3.0},
                {"score": 200,  "xp": 1.5},
                {"score": 100,  "xp": 0.75},
            ]
        }),
        "priority": 15,
        "is_active": 1,
    },
    {
        "rule_id": "cur8rancing_first_place",
        "game_id": GAME_ID,
        "rule_name": "First Place Bonus",
        "rule_type": "achievement",
        "parameters": json.dumps({
            "achievement_key": "first_place",
            "bonus_xp": 5.0,
        }),
        "priority": 20,
        "is_active": 1,
    },
    {
        "rule_id": "cur8rancing_high_score_bonus",
        "game_id": GAME_ID,
        "rule_name": "High Score Bonus",
        "rule_type": "high_score_bonus",
        "parameters": json.dumps({"bonus_xp": 10.0}),
        "priority": 25,
        "is_active": 1,
    },
]

# ─── Quest specifiche ────────────────────────────────────────────────

QUESTS = [
    {
        "title": "Racing: First Lap",
        "description": "Disputa la tua prima gara",
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
        "title": "Racing: Daily Driver",
        "description": "Disputa 5 gare",
        "quest_type": "play_games",
        "target_value": 5,
        "xp_reward": 30,
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
        "title": "Racing: Podium Finish",
        "description": "Concludi una gara sul podio (top 3)",
        "quest_type": "score",
        "target_value": 1,
        "xp_reward": 50,
        "reward_coins": 10,
        "is_active": 1,
        "config": json.dumps({
            "game_id": GAME_ID,
            "type": "podium_finish",
            "category": "skill",
            "reset_period": "daily",
            "reset_on_complete": True,
        }),
    },
    {
        "title": "Racing: Checkered Flag",
        "description": "Vinci una gara in prima posizione",
        "quest_type": "score",
        "target_value": 1,
        "xp_reward": 75,
        "reward_coins": 15,
        "is_active": 1,
        "config": json.dumps({
            "game_id": GAME_ID,
            "type": "first_place",
            "category": "skill",
            "reset_period": "daily",
            "reset_on_complete": True,
        }),
    },
    {
        "title": "Racing: Hat-Trick",
        "description": "Vinci 3 gare",
        "quest_type": "score",
        "target_value": 3,
        "xp_reward": 100,
        "reward_coins": 25,
        "is_active": 1,
        "config": json.dumps({
            "game_id": GAME_ID,
            "type": "first_place",
            "category": "skill",
            "reset_period": "daily",
            "reset_on_complete": True,
        }),
    },
]

# ─── Logica di registrazione ─────────────────────────────────────────

def register_cur8rancing(force: bool = False) -> bool:
    print("=" * 60)
    print("🏎️   REGISTRAZIONE GIOCO: CUR8 RACING")
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
            print(f"\n🎯  Aggiungo {len(QUESTS)} quest...")
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
    success = register_cur8rancing(force=force)
    sys.exit(0 if success else 1)
