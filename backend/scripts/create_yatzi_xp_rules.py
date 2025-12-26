"""
Create XP rules for Yatzi 3D game
"""
import sys
import os
import json
import uuid
from pathlib import Path
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models import XPRule

def create_yatzi_xp_rules():
    """Create XP rules for Yatzi 3D game"""
    
    db = SessionLocal()
    
    try:
        print("=" * 70)
        print("  YATZI 3D - XP RULES CREATION")
        print("=" * 70)
        print()
        
        # Check if rules already exist
        existing = db.query(XPRule).filter(XPRule.game_id == 'yatzi_3d_by_luciogiolli').first()
        if existing:
            print("[WARNING] XP rules for yatzi_3d_by_luciogiolli already exist!")
            response = input("Do you want to delete and recreate them? (y/N): ")
            if response.lower() != 'y':
                print("Aborted.")
                return
            
            # Delete existing rules
            deleted = db.query(XPRule).filter(XPRule.game_id == 'yatzi_3d_by_luciogiolli').delete()
            db.commit()
            print(f"[DELETED] {deleted} existing rules")
            print()
        
        now = datetime.now().isoformat()
        
        rules = [
            # Basic score multiplier
            {
                'rule_id': f"xpr_{uuid.uuid4().hex[:16]}",
                'game_id': 'yatzi_3d_by_luciogiolli',
                'rule_name': 'Score Multiplier',
                'rule_type': 'score_multiplier',
                'parameters': json.dumps({
                    'multiplier': 0.1,  # 10 XP per 100 points
                    'max_xp': 50
                }),
                'priority': 1,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            # Win bonus
            {
                'rule_id': f"xpr_{uuid.uuid4().hex[:16]}",
                'game_id': 'yatzi_3d_by_luciogiolli',
                'rule_name': 'Win Bonus',
                'rule_type': 'threshold',
                'parameters': json.dumps({
                    'threshold_field': 'extra_data.winner',
                    'threshold_value': 'player',
                    'xp_reward': 30
                }),
                'priority': 2,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            # High score tiers
            {
                'rule_id': f"xpr_{uuid.uuid4().hex[:16]}",
                'game_id': 'yatzi_3d_by_luciogiolli',
                'rule_name': 'Score 150+',
                'rule_type': 'threshold',
                'parameters': json.dumps({
                    'threshold_field': 'score',
                    'threshold_value': 150,
                    'xp_reward': 15
                }),
                'priority': 3,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': f"xpr_{uuid.uuid4().hex[:16]}",
                'game_id': 'yatzi_3d_by_luciogiolli',
                'rule_name': 'Score 200+',
                'rule_type': 'threshold',
                'parameters': json.dumps({
                    'threshold_field': 'score',
                    'threshold_value': 200,
                    'xp_reward': 25
                }),
                'priority': 4,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': f"xpr_{uuid.uuid4().hex[:16]}",
                'game_id': 'yatzi_3d_by_luciogiolli',
                'rule_name': 'Score 250+',
                'rule_type': 'threshold',
                'parameters': json.dumps({
                    'threshold_field': 'score',
                    'threshold_value': 250,
                    'xp_reward': 35
                }),
                'priority': 5,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            }
        ]
        
        created_count = 0
        for rule_data in rules:
            rule = XPRule(**rule_data)
            db.add(rule)
            created_count += 1
            params = json.loads(rule_data['parameters'])
            print(f"[OK] Created: {rule_data['rule_name']} - {rule_data['rule_type']}")
        
        db.commit()
        
        print()
        print("=" * 70)
        print(f"  Successfully created {created_count} XP rules for Yatzi 3D")
        print("=" * 70)
        print()
        
        # Display summary
        print("XP RULES SUMMARY:")
        print("-" * 70)
        print(f"{'Rule Name':<25} {'Type':<20} {'Parameters':<25}")
        print("-" * 70)
        
        for rule in rules:
            rule_name = rule['rule_name']
            rule_type = rule['rule_type']
            params = json.loads(rule['parameters'])
            params_str = str(params)[:22] + "..."
            print(f"{rule_name:<25} {rule_type:<20} {params_str:<25}")
        
        print("-" * 70)
        print()
        
    except Exception as e:
        print(f"[ERROR] {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_yatzi_xp_rules()
