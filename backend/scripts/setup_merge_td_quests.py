"""
Setup Merge Tower Defense Daily Quests
Creates 3 balanced daily quests for the merge-tower-defense game
"""
import sys
import os
import json
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models import Quest, UserQuest


# ============================================================================
# MERGE TOWER DEFENSE QUEST DEFINITIONS
# ============================================================================

MERGE_TD_QUESTS = [
    {
        "title": "MTD: Wave Defender",
        "description": "Reach wave 5 in a single game",
        "quest_type": "score",
        "target_value": 5,
        "xp_reward": 25,
        "reward_coins": 20,
        "config": {
            "game_id": "merge-tower-defense",
            "type": "max_wave",
            "category": "progression",
            "reset_period": "daily",
            "reset_on_complete": True
        }
    },
    {
        "title": "MTD: Merge Master",
        "description": "Merge 10 towers in total",
        "quest_type": "score",
        "target_value": 10,
        "xp_reward": 30,
        "reward_coins": 25,
        "config": {
            "game_id": "merge-tower-defense",
            "type": "tower_merges",
            "category": "gameplay",
            "reset_period": "daily",
            "reset_on_complete": True
        }
    },
    {
        "title": "MTD: Zombie Slayer",
        "description": "Kill 50 enemies in total",
        "quest_type": "score",
        "target_value": 50,
        "xp_reward": 35,
        "reward_coins": 30,
        "config": {
            "game_id": "merge-tower-defense",
            "type": "total_kills",
            "category": "combat",
            "reset_period": "daily",
            "reset_on_complete": True
        }
    },
]


def setup_quests():
    """Setup Merge Tower Defense quests without creating duplicates."""
    
    db = SessionLocal()
    
    try:
        print("=" * 70)
        print("  🏰 MERGE TOWER DEFENSE QUEST SETUP")
        print("=" * 70)
        print()
        
        created = 0
        updated = 0
        skipped = 0
        
        for quest_def in MERGE_TD_QUESTS:
            title = quest_def["title"]
            
            # Check if quest already exists
            existing = db.query(Quest).filter(Quest.title == title).first()
            
            if existing:
                # Check if config needs update
                existing_config = json.loads(existing.config) if existing.config else {}
                new_config = quest_def["config"]
                
                # Update config if different
                if existing_config != new_config:
                    existing.config = json.dumps(new_config)
                    existing.description = quest_def["description"]
                    existing.target_value = quest_def["target_value"]
                    existing.xp_reward = quest_def["xp_reward"]
                    existing.reward_coins = quest_def["reward_coins"]
                    updated += 1
                    print(f"🔄 Updated: {title}")
                else:
                    skipped += 1
                    print(f"⏭️  Skipped (no changes): {title}")
            else:
                # Create new quest
                now = datetime.utcnow().isoformat()
                new_quest = Quest(
                    title=title,
                    description=quest_def["description"],
                    quest_type=quest_def["quest_type"],
                    target_value=quest_def["target_value"],
                    xp_reward=quest_def["xp_reward"],
                    reward_coins=quest_def["reward_coins"],
                    is_active=1,
                    created_at=now,
                    config=json.dumps(quest_def["config"])
                )
                db.add(new_quest)
                created += 1
                print(f"✅ Created: {title}")
                print(f"   📝 {quest_def['description']}")
                print(f"   🎯 Target: {quest_def['target_value']}")
                print(f"   ⭐ XP: {quest_def['xp_reward']} | 🪙 Coins: {quest_def['reward_coins']}")
                print()
        
        db.commit()
        
        print()
        print("=" * 70)
        print(f"  Summary: {created} created, {updated} updated, {skipped} skipped")
        print("=" * 70)
        
        # Check for duplicates and clean up
        print()
        print("🔍 Checking for duplicates...")
        
        duplicates_removed = 0
        for quest_def in MERGE_TD_QUESTS:
            title = quest_def["title"]
            quests_with_title = db.query(Quest).filter(Quest.title == title).order_by(Quest.quest_id).all()
            
            if len(quests_with_title) > 1:
                # Keep the first one, delete the rest
                for duplicate in quests_with_title[1:]:
                    db.query(UserQuest).filter(UserQuest.quest_id == duplicate.quest_id).delete()
                    db.delete(duplicate)
                    duplicates_removed += 1
                    print(f"🗑️  Removed duplicate: {title} (ID: {duplicate.quest_id})")
        
        if duplicates_removed > 0:
            db.commit()
            print(f"\n🧹 Cleaned up {duplicates_removed} duplicate quests")
        else:
            print("✨ No duplicates found")
        
        # Final count
        mtd_count = db.query(Quest).filter(Quest.title.like('MTD:%')).count()
        
        print()
        print("=" * 70)
        print(f"  Final count: {mtd_count} Merge Tower Defense quests")
        print("=" * 70)
        
    except Exception as e:
        print(f"[ERROR] {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    setup_quests()
