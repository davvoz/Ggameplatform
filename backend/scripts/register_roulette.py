"""
Script di censimento del gioco Roulette nella piattaforma.

Registra il gioco, le regole XP e le quest specifiche.
Uso: python register_roulette.py [--force]
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

GAME_ID = "roulette"

GAME_DATA = {
    "game_id": GAME_ID,
    "title": "Roulette Royale",
    "description": (
        "La ruota della fortuna in versione single-zero europea. "
        "Punta su numeri, dozzine, colori o sulle scommesse speciali "
        "guidate dall'heatmap (Hot/Cold/Snake/Mirror/Neighbours). "
        "Effetti casinò premium, fisica realistica della pallina, "
        "payout fino a 35:1."
    ),
    "author": "Cur8 Games",
    "version": "1.0.0",
    "thumbnail": "thumbnail.png",
    "entry_point": "index.html",
    "category": "casino",
    "tags": json.dumps([
        "casino", "roulette", "betting", "classic",
        "european", "single-zero", "heatmap", "wheel"
    ]),
    "status_id": 6,
    "steem_rewards_enabled": 0,
    "extra_data": json.dumps({
        "controls": "Touch / Mouse",
        "startBalance": 1000,
        "minBet": 1,
        "maxStraightBet": 500,
        "wheelType": "European single-zero (37 pockets)",
        "features": [
            "17 standard bets (straight, dozens, columns, even-money)",
            "6 special bets (Lucky 0, Hot, Cold, Neighbours, Snake, Mirror)",
            "Heatmap with hot/cold tracking over last 20 spins",
            "Rebet & ½-Max quick actions",
            "Procedural Web Audio sound design",
            "Realistic ball physics with bounce-settle",
        ],
    }),
}

# ─── Regole XP ───────────────────────────────────────────────────────

NOW = datetime.now(timezone.utc).isoformat()

XP_RULES = [
    {
        "rule_id": "roulette_participation",
        "game_id": GAME_ID,
        "rule_name": "Participation Bonus",
        "rule_type": "flat",
        "parameters": json.dumps({"base_xp": 0.5}),
        "priority": 5,
        "is_active": 1,
    },
    {
        "rule_id": "roulette_win_bonus",
        "game_id": GAME_ID,
        "rule_name": "Win Bonus",
        "rule_type": "threshold",
        "parameters": json.dumps({
            "thresholds": [
                {"score": 1000, "xp": 12.0},
                {"score": 500,  "xp": 8.0},
                {"score": 200,  "xp": 5.0},
                {"score": 100,  "xp": 3.0},
                {"score": 50,   "xp": 1.5},
                {"score": 20,   "xp": 0.75},
                {"score": 5,    "xp": 0.25},
            ]
        }),
        "priority": 15,
        "is_active": 1,
    },
    {
        "rule_id": "roulette_winnings_multiplier",
        "game_id": GAME_ID,
        "rule_name": "Winnings Multiplier",
        "rule_type": "score_multiplier",
        "parameters": json.dumps({"multiplier": 0.06, "max_xp": 15.0}),
        "priority": 10,
        "is_active": 1,
    },
    {
        "rule_id": "roulette_lucky_zero",
        "game_id": GAME_ID,
        "rule_name": "Lucky Zero Bonus",
        "rule_type": "achievement",
        "parameters": json.dumps({
            "achievement_key": "lucky_zero_hit",
            "bonus_xp": 8.0,
        }),
        "priority": 20,
        "is_active": 1,
    },
    {
        "rule_id": "roulette_big_win_bonus",
        "game_id": GAME_ID,
        "rule_name": "Big Win Bonus (10x wager)",
        "rule_type": "achievement",
        "parameters": json.dumps({
            "achievement_key": "big_win",
            "bonus_xp": 6.0,
        }),
        "priority": 22,
        "is_active": 1,
    },
    {
        "rule_id": "roulette_high_score_bonus",
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
        "title": "Roulette: First Spin",
        "description": "Esegui il tuo primo giro alla Roulette",
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
        "title": "Roulette: Daily Spinner",
        "description": "Esegui 10 giri alla Roulette",
        "quest_type": "play_games",
        "target_value": 10,
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
        "title": "Roulette: Hit Zero",
        "description": "Centra lo zero in un giro",
        "quest_type": "score",
        "target_value": 1,
        "xp_reward": 60,
        "reward_coins": 15,
        "is_active": 1,
        "config": json.dumps({
            "game_id": GAME_ID,
            "type": "lucky_zero_hit",
            "category": "luck",
            "reset_period": "daily",
            "reset_on_complete": True,
        }),
    },
    {
        "title": "Roulette: Big Win",
        "description": "Ottieni una vincita 10x superiore alla puntata",
        "quest_type": "score",
        "target_value": 1,
        "xp_reward": 75,
        "reward_coins": 20,
        "is_active": 1,
        "config": json.dumps({
            "game_id": GAME_ID,
            "type": "big_win",
            "category": "skill",
            "min_multiplier": 10,
            "reset_period": "daily",
            "reset_on_complete": True,
        }),
    },
    {
        "title": "Roulette: Lucky Streak",
        "description": "Vinci 3 giri di fila",
        "quest_type": "score",
        "target_value": 3,
        "xp_reward": 80,
        "reward_coins": 18,
        "is_active": 1,
        "config": json.dumps({
            "game_id": GAME_ID,
            "type": "win_streak",
            "category": "skill",
            "reset_period": "daily",
            "reset_on_complete": True,
        }),
    },
    {
        "title": "Roulette: Hot Hunter",
        "description": "Vinci una scommessa Hot Numbers",
        "quest_type": "score",
        "target_value": 1,
        "xp_reward": 50,
        "reward_coins": 12,
        "is_active": 1,
        "config": json.dumps({
            "game_id": GAME_ID,
            "type": "hot_bet_win",
            "category": "skill",
            "reset_period": "daily",
            "reset_on_complete": True,
        }),
    },
    {
        "title": "Roulette: High Roller",
        "description": "Vinci un giro con una puntata totale di 200 o più",
        "quest_type": "score",
        "target_value": 1,
        "xp_reward": 60,
        "reward_coins": 18,
        "is_active": 1,
        "config": json.dumps({
            "game_id": GAME_ID,
            "type": "win_with_high_bet",
            "category": "skill",
            "min_bet": 200,
            "reset_period": "daily",
            "reset_on_complete": True,
        }),
    },
]

# ─── Logica di registrazione ─────────────────────────────────────────

def register_roulette(force: bool = False) -> bool:
    print("=" * 60)
    print("🎰  REGISTRAZIONE GIOCO: ROULETTE ROYALE")
    print("=" * 60)

    with get_db_session() as db:
        try:
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

            print(f"\n🎯  Aggiungo {len(QUESTS)} quest...")
            for q_data in QUESTS:
                quest = Quest(
                    created_at=NOW,
                    **q_data,
                )
                db.add(quest)
                print(f"    - {q_data['title']} ({q_data['xp_reward']} XP, {q_data['reward_coins']} coins)")

            db.commit()

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
    success = register_roulette(force=force)
    sys.exit(0 if success else 1)
