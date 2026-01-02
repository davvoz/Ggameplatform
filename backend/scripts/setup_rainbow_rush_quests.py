"""
Setup Rainbow Rush Daily Quests
Creates 3 balanced daily quests for the rainbow-rush game
"""
import sys
import os
import json
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models import Quest, UserQuest


# ============================================================================
# RAINBOW RUSH QUEST DEFINITIONS
# ============================================================================

RAINBOW_RUSH_QUESTS = [
    {
        "title": "Rainbow Rush:Level Runner",
        "description": "Complete 3 levels",
        "quest_type": "score",
        "target_value": 3,
        "xp_reward": 25,
        "reward_coins": 20,
        "config": {
            "game_id": "rainbow-rush",
            "type": "levels_completed",
            "category": "progression",
            "reset_period": "daily",
            "reset_on_complete": True
        }
    },
    {
        "title": "Rainbow Rush:Coin Collector",
        "description": "Collect 100 coins in total",
        "quest_type": "score",
        "target_value": 100,
        "xp_reward": 30,
        "reward_coins": 25,
        "config": {
            "game_id": "rainbow-rush",
            "type": "coins_collected",
            "category": "gameplay",
            "reset_period": "daily",
            "reset_on_complete": True
        }
    },
    {
        "title": "Rainbow Rush:High Scorer",
        "description": "Reach a score of 5000 points",
        "quest_type": "score",
        "target_value": 5000,
        "xp_reward": 35,
        "reward_coins": 30,
        "config": {
            "game_id": "rainbow-rush",
            "type": "high_score",
            "category": "skill",
            "reset_period": "daily",
            "reset_on_complete": True
        }
    },
]


def setup_quests():
    """Setup Rainbow Rush quests - deletes existing and recreates."""
    
    db = SessionLocal()
    
    try:
        print("=" * 70)
        print("  🌈 RAINBOW RUSH QUEST SETUP")
        print("=" * 70)
        print()
        
        # FIRST: Delete all existing Rainbow Rush quests (both old RR: and new Rainbow Rush: prefix)
        print("🗑️  Removing existing Rainbow Rush quests...")
        existing_quests = db.query(Quest).filter(
            (Quest.title.like('RR:%')) | (Quest.title.like('Rainbow Rush:%'))
        ).all()
        deleted_count = 0
        for quest in existing_quests:
            # Delete user progress first
            db.query(UserQuest).filter(UserQuest.quest_id == quest.quest_id).delete()
            db.delete(quest)
            deleted_count += 1
            print(f"   Deleted: {quest.title} (ID: {quest.quest_id})")
        
        if deleted_count > 0:
            db.commit()
            print(f"✅ Deleted {deleted_count} existing quests\n")
        else:
            print("   No existing quests found\n")
        
        # NOW: Create fresh quests
        created = 0
        updated = 0
        skipped = 0
        
        for quest_def in RAINBOW_RUSH_QUESTS:
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
        for quest_def in RAINBOW_RUSH_QUESTS:
            title = quest_def["title"]
            quests_with_title = db.query(Quest).filter(Quest.title == title).order_by(Quest.quest_id).all()
            
            if len(quests_with_title) > 1:
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
        rr_count = db.query(Quest).filter(
            (Quest.title.like('RR:%')) | (Quest.title.like('Rainbow Rush:%'))
        ).count()
        
        print()
        print("=" * 70)
        print(f"  Final count: {rr_count} Rainbow Rush quests")
        print("=" * 70)
        
    except Exception as e:
        print(f"[ERROR] {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    setup_quests()
