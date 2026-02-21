"""
Migrate Space Shooter 2 XP rules:
- Disattiva la regola 'threshold' (Score Milestones) a soglie fisse
- Disattiva la eventuale regola 'score_multiplier' lineare
- Aggiunge una regola 'score_power' con radice quadrata (se non esiste già)
  Formula: XP = 0.9 × √score

Idempotente: può essere eseguito più volte senza effetti collaterali.

Usage:
    cd backend
    python -m scripts.migrate_ss2_xp_rules
"""

import sys
import os
import json
import uuid
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import get_db_session
from app.models import XPRule

GAME_ID = 'space_shooter_2'
THRESHOLD_RULE_ID = 'xpr_7d6d2b9ba90342d7'
LINEAR_RULE_NAME = 'Score XP (Linear)'        # vecchia regola da disattivare se presente
NEW_RULE_NAME = 'Score XP (Power)'
NEW_RULE_TYPE = 'score_power'
NEW_PARAMS = {"multiplier": 0.9, "power": 0.5}  # XP = 0.9 × √score


def migrate():
    """Disattiva threshold e score_multiplier lineare, crea score_power."""
    
    with get_db_session() as session:
        now = datetime.utcnow().isoformat()
        changes = 0
        
        # 1. Disattiva la regola threshold
        threshold_rule = session.query(XPRule).filter(
            XPRule.rule_id == THRESHOLD_RULE_ID
        ).first()
        
        if threshold_rule:
            if threshold_rule.is_active:
                threshold_rule.is_active = 0
                threshold_rule.updated_at = now
                changes += 1
                print(f"✅ Regola '{threshold_rule.rule_name}' (threshold) disattivata")
            else:
                print(f"ℹ️  Regola '{threshold_rule.rule_name}' (threshold) già disattivata")
        else:
            print(f"⚠️  Regola threshold {THRESHOLD_RULE_ID} non trovata (skip)")
        
        # 2. Disattiva eventuale vecchia regola lineare (Score XP Linear)
        old_linear = session.query(XPRule).filter(
            XPRule.game_id == GAME_ID,
            XPRule.rule_name == LINEAR_RULE_NAME
        ).first()
        
        if old_linear:
            if old_linear.is_active:
                old_linear.is_active = 0
                old_linear.updated_at = now
                changes += 1
                print(f"✅ Regola '{LINEAR_RULE_NAME}' (lineare) disattivata")
            else:
                print(f"ℹ️  Regola '{LINEAR_RULE_NAME}' (lineare) già disattivata")
        
        # 3. Controlla se la regola power esiste già
        existing_power = session.query(XPRule).filter(
            XPRule.game_id == GAME_ID,
            XPRule.rule_type == NEW_RULE_TYPE,
            XPRule.rule_name == NEW_RULE_NAME
        ).first()
        
        if existing_power:
            print(f"ℹ️  Regola '{NEW_RULE_NAME}' già presente (rule_id: {existing_power.rule_id}, active: {bool(existing_power.is_active)})")
        else:
            rule_id = f"xpr_{uuid.uuid4().hex[:16]}"
            new_rule = XPRule(
                rule_id=rule_id,
                game_id=GAME_ID,
                rule_name=NEW_RULE_NAME,
                rule_type=NEW_RULE_TYPE,
                parameters=json.dumps(NEW_PARAMS),
                priority=20,
                is_active=1,
                created_at=now,
                updated_at=now
            )
            session.add(new_rule)
            changes += 1
            print(f"✅ Regola '{NEW_RULE_NAME}' creata (rule_id: {rule_id})")
            print(f"   Formula: XP = {NEW_PARAMS['multiplier']} × score^{NEW_PARAMS['power']}")
            print(f"   Parametri: {json.dumps(NEW_PARAMS)}")
        
        session.flush()
        
        # 3. Riepilogo regole attive
        print(f"\n{'='*50}")
        print(f"Regole XP attive per {GAME_ID}:")
        print(f"{'='*50}")
        active_rules = session.query(XPRule).filter(
            XPRule.game_id == GAME_ID,
            XPRule.is_active == 1
        ).order_by(XPRule.priority.desc()).all()
        
        for rule in active_rules:
            params = json.loads(rule.parameters) if rule.parameters else {}
            print(f"  [{rule.priority:2d}] {rule.rule_name} ({rule.rule_type})")
            print(f"       {json.dumps(params)}")
        
        print(f"\nModifiche applicate: {changes}")


if __name__ == "__main__":
    print("=" * 50)
    print("Migration: Space Shooter 2 XP Rules")
    print("  threshold → score_power (√score)")
    print("=" * 50)
    print()
    migrate()
    print("\nDone!")
