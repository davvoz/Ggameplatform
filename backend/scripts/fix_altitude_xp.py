"""
Sostituisce le regole XP di Altitude con un'unica regola distance_bonus.

Tasso: 100 XP ogni 100.000 m  →  1 XP ogni 1.000 m
  milestone_distance = 1000 m
  xp_per_milestone   = 1.0 XP

Uso: python fix_altitude_xp.py
"""

import sys
import json
from pathlib import Path
from datetime import datetime, timezone

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import get_db_session
from app.models import XPRule

GAME_ID = "altitude"

NEW_RULE = {
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
}

def fix_altitude_xp() -> bool:
    print("=" * 60)
    print("⚡  FIX XP RULES: ALTITUDE")
    print("=" * 60)

    with get_db_session() as db:
        try:
            existing = db.query(XPRule).filter(XPRule.game_id == GAME_ID).all()
            if existing:
                print(f"\n🗑️   Rimosse {len(existing)} regole XP precedenti:")
                for r in existing:
                    print(f"    - {r.rule_id}  ({r.rule_type})")
                    db.delete(r)
                db.flush()
            else:
                print("\n⚠️   Nessuna regola XP trovata per altitude")

            now = datetime.now(timezone.utc).isoformat()
            rule = XPRule(created_at=now, updated_at=now, **NEW_RULE)
            db.add(rule)
            db.flush()

            print(f"\n✅  Aggiunta nuova regola:")
            print(f"    - {NEW_RULE['rule_name']}")
            print(f"      tipo: {NEW_RULE['rule_type']}")
            params = json.loads(NEW_RULE['parameters'])
            print(f"      milestone_distance : {params['milestone_distance']} m")
            print(f"      xp_per_milestone   : {params['xp_per_milestone']} XP")
            print(f"      → 100 XP ogni 100.000 m")

            db.commit()
            print("\n✅  Fatto!\n")
            return True

        except Exception as exc:
            db.rollback()
            print(f"\n❌  Errore: {exc}")
            import traceback
            traceback.print_exc()
            return False


if __name__ == "__main__":
    success = fix_altitude_xp()
    sys.exit(0 if success else 1)
