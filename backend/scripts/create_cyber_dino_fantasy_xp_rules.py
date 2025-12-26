"""
Create XP rules for Cyber Dino Fantasy Tactics game
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

def create_cyber_dino_fantasy_xp_rules():
    """Create XP rules for Cyber Dino Fantasy Tactics game"""
    
    db = SessionLocal()
    
    try:
        print("=" * 70)
        print("  CYBER DINO FANTASY TACTICS - XP RULES CREATION")
        print("=" * 70)
        print()
        
        # Check if rules already exist
        existing = db.query(XPRule).filter(XPRule.game_id == 'cyber_dino_fantasy_tactics').first()
        if existing:
            print("[WARNING] XP rules for cyber_dino_fantasy_tactics already exist!")
            response = input("Do you want to delete and recreate them? (y/N): ")
            if response.lower() != 'y':
                print("Aborted.")
                return
            
            # Delete existing rules
            deleted = db.query(XPRule).filter(XPRule.game_id == 'cyber_dino_fantasy_tactics').delete()
            db.commit()
            print(f"[DELETED] {deleted} existing rules")
            print()
        
        now = datetime.now().isoformat()
        
        rules = [
            # Basic score multiplier (for battles won, enemies defeated)
            {
                'rule_id': f"xpr_{uuid.uuid4().hex[:16]}",
                'game_id': 'cyber_dino_fantasy_tactics',
                'rule_name': 'Score Multiplier',
                'rule_type': 'score_multiplier',
                'parameters': json.dumps({
                    'multiplier': 0.2,  # 20 XP per 100 points
                    'max_xp': 100
                }),
                'priority': 1,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            # Victory bonus
            {
                'rule_id': f"xpr_{uuid.uuid4().hex[:16]}",
                'game_id': 'cyber_dino_fantasy_tactics',
                'rule_name': 'Victory Bonus',
                'rule_type': 'threshold',
                'parameters': json.dumps({
                    'threshold_field': 'extra_data.victory',
                    'threshold_value': True,
                    'xp_reward': 50
                }),
                'priority': 2,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            # Floor progression bonuses
            {
                'rule_id': f"xpr_{uuid.uuid4().hex[:16]}",
                'game_id': 'cyber_dino_fantasy_tactics',
                'rule_name': 'Floor 5 Reached',
                'rule_type': 'threshold',
                'parameters': json.dumps({
                    'threshold_field': 'extra_data.floor',
                    'threshold_value': 5,
                    'xp_reward': 20
                }),
                'priority': 3,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': f"xpr_{uuid.uuid4().hex[:16]}",
                'game_id': 'cyber_dino_fantasy_tactics',
                'rule_name': 'Floor 10 Reached',
                'rule_type': 'threshold',
                'parameters': json.dumps({
                    'threshold_field': 'extra_data.floor',
                    'threshold_value': 10,
                    'xp_reward': 40
                }),
                'priority': 4,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': f"xpr_{uuid.uuid4().hex[:16]}",
                'game_id': 'cyber_dino_fantasy_tactics',
                'rule_name': 'Floor 15 Reached',
                'rule_type': 'threshold',
                'parameters': json.dumps({
                    'threshold_field': 'extra_data.floor',
                    'threshold_value': 15,
                    'xp_reward': 60
                }),
                'priority': 5,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            # Party size bonus (full party)
            {
                'rule_id': f"xpr_{uuid.uuid4().hex[:16]}",
                'game_id': 'cyber_dino_fantasy_tactics',
                'rule_name': 'Full Party Bonus',
                'rule_type': 'threshold',
                'parameters': json.dumps({
                    'threshold_field': 'extra_data.party_size',
                    'threshold_value': 4,
                    'xp_reward': 25
                }),
                'priority': 6,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            # Enemies defeated milestones
            {
                'rule_id': f"xpr_{uuid.uuid4().hex[:16]}",
                'game_id': 'cyber_dino_fantasy_tactics',
                'rule_name': 'Defeat 10 Enemies',
                'rule_type': 'threshold',
                'parameters': json.dumps({
                    'threshold_field': 'extra_data.enemies_defeated',
                    'threshold_value': 10,
                    'xp_reward': 15
                }),
                'priority': 7,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': f"xpr_{uuid.uuid4().hex[:16]}",
                'game_id': 'cyber_dino_fantasy_tactics',
                'rule_name': 'Defeat 25 Enemies',
                'rule_type': 'threshold',
                'parameters': json.dumps({
                    'threshold_field': 'extra_data.enemies_defeated',
                    'threshold_value': 25,
                    'xp_reward': 30
                }),
                'priority': 8,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': f"xpr_{uuid.uuid4().hex[:16]}",
                'game_id': 'cyber_dino_fantasy_tactics',
                'rule_name': 'Defeat 50 Enemies',
                'rule_type': 'threshold',
                'parameters': json.dumps({
                    'threshold_field': 'extra_data.enemies_defeated',
                    'threshold_value': 50,
                    'xp_reward': 50
                }),
                'priority': 9,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            # Perfect run bonus (no character deaths)
            {
                'rule_id': f"xpr_{uuid.uuid4().hex[:16]}",
                'game_id': 'cyber_dino_fantasy_tactics',
                'rule_name': 'Perfect Run',
                'rule_type': 'threshold',
                'parameters': json.dumps({
                    'threshold_field': 'extra_data.character_deaths',
                    'threshold_value': 0,
                    'threshold_operator': 'equals',
                    'xp_reward': 35
                }),
                'priority': 10,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            # Time bonus (for quick tactical decisions)
            {
                'rule_id': f"xpr_{uuid.uuid4().hex[:16]}",
                'game_id': 'cyber_dino_fantasy_tactics',
                'rule_name': 'Time Bonus',
                'rule_type': 'time_bonus',
                'parameters': json.dumps({
                    'xp_per_minute': 0.5,
                    'max_minutes': 30
                }),
                'priority': 11,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
        ]
        
        print("Creating XP rules:")
        print()
        
        for rule in rules:
            xp_rule = XPRule(**rule)
            db.add(xp_rule)
            
            params = json.loads(rule['parameters'])
            print(f"  ✓ {rule['rule_name']}")
            print(f"    Type: {rule['rule_type']}")
            print(f"    Priority: {rule['priority']}")
            print(f"    Parameters: {params}")
            print()
        
        db.commit()
        
        print("=" * 70)
        print(f"✅ Successfully created {len(rules)} XP rules!")
        print("=" * 70)
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_cyber_dino_fantasy_xp_rules()
