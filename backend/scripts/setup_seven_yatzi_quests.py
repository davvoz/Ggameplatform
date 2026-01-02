"""
Setup Seven and Yatzi Quests - Safe initialization without duplicates
This script creates or updates Seven and Yatzi quests ensuring no duplicates are created.
"""
import sys
import os
import json
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models import Quest, UserQuest


# ============================================================================
# QUEST DEFINITIONS
# ============================================================================

SEVEN_QUESTS = [
    {
        "title": "Seven: First Roll",
        "description": "Play 10 rolls in Seven",
        "quest_type": "score",
        "target_value": 10,
        "xp_reward": 15,
        "reward_coins": 10,
        "config": {
            "game_id": "seven",
            "type": "rolls_played",
            "category": "gameplay",
            "reset_period": "daily",
            "reset_on_complete": True
        }
    },
    {
        "title": "Seven: Expert Player",
        "description": "Play 50 rolls in Seven",
        "quest_type": "score",
        "target_value": 50,
        "xp_reward": 35,
        "reward_coins": 30,
        "config": {
            "game_id": "seven",
            "type": "rolls_played",
            "category": "gameplay",
            "reset_period": "daily",
            "reset_on_complete": True
        }
    },
    {
        "title": "Seven: Lucky Streak",
        "description": "Win 3 bets in a row",
        "quest_type": "score",
        "target_value": 3,
        "xp_reward": 25,
        "reward_coins": 20,
        "config": {
            "game_id": "seven",
            "type": "win_streak",
            "category": "skill",
            "reset_period": "daily",
            "reset_on_complete": True
        }
    },
    {
        "title": "Seven: In The Black",
        "description": "Reach a total profit of 100 coins",
        "quest_type": "score",
        "target_value": 100,
        "xp_reward": 30,
        "reward_coins": 25,
        "config": {
            "game_id": "seven",
            "type": "total_profit",
            "category": "progression",
            "reset_period": "daily",
            "reset_on_complete": True
        }
    },
    {
        "title": "Seven: Cursed Seven",
        "description": "Roll a 7 (always loses) 3 times",
        "quest_type": "score",
        "target_value": 3,
        "xp_reward": 20,
        "reward_coins": 15,
        "config": {
            "game_id": "seven",
            "type": "roll_seven",
            "category": "luck",
            "reset_period": "daily",
            "reset_on_complete": True
        }
    },
    {
        "title": "Seven: Under Master",
        "description": "Win 5 bets on Under (<7)",
        "quest_type": "score",
        "target_value": 5,
        "xp_reward": 25,
        "reward_coins": 20,
        "config": {
            "game_id": "seven",
            "type": "win_under_bets",
            "category": "skill",
            "reset_period": "daily",
            "reset_on_complete": True
        }
    },
    {
        "title": "Seven: Over Winner",
        "description": "Win 10 bets on Over (>7)",
        "quest_type": "score",
        "target_value": 10,
        "xp_reward": 30,
        "reward_coins": 20,
        "config": {
            "game_id": "seven",
            "type": "win_over_bets",
            "category": "skill",
            "reset_period": "daily",
            "reset_on_complete": True
        }
    },
    {
        "title": "Seven: Bold Gambler",
        "description": "Win a bet of 50+ coins",
        "quest_type": "score",
        "target_value": 1,
        "xp_reward": 40,
        "reward_coins": 35,
        "config": {
            "game_id": "seven",
            "type": "win_with_high_bet",
            "category": "skill",
            "reset_period": "daily",
            "reset_on_complete": True
        }
    },
]

YATZI_QUESTS = [
    {
        "title": "Yatzi: First Game",
        "description": "Play 1 game of Yatzi",
        "quest_type": "score",
        "target_value": 1,
        "xp_reward": 10,
        "reward_coins": 5,
        "config": {
            "game_id": "yatzi_3d_by_luciogiolli",
            "type": "games_played",
            "category": "gameplay",
            "reset_period": "daily",
            "reset_on_complete": True
        }
    },
    {
        "title": "Yatzi: Novice Player",
        "description": "Play 5 games of Yatzi",
        "quest_type": "score",
        "target_value": 5,
        "xp_reward": 25,
        "reward_coins": 15,
        "config": {
            "game_id": "yatzi_3d_by_luciogiolli",
            "type": "games_played",
            "category": "gameplay",
            "reset_period": "daily",
            "reset_on_complete": True
        }
    },
    {
        "title": "Yatzi: First Victory",
        "description": "Win 1 game against the AI",
        "quest_type": "score",
        "target_value": 1,
        "xp_reward": 20,
        "reward_coins": 15,
        "config": {
            "game_id": "yatzi_3d_by_luciogiolli",
            "type": "wins",
            "category": "skill",
            "reset_period": "daily",
            "reset_on_complete": True
        }
    },
    {
        "title": "Yatzi: Winning Streak",
        "description": "Win 3 games in a row",
        "quest_type": "score",
        "target_value": 3,
        "xp_reward": 40,
        "reward_coins": 30,
        "config": {
            "game_id": "yatzi_3d_by_luciogiolli",
            "type": "win_streak",
            "category": "skill",
            "reset_period": "daily",
            "reset_on_complete": True
        }
    },
    {
        "title": "Yatzi: Skilled Player",
        "description": "Score 200+ points in a game",
        "quest_type": "score",
        "target_value": 200,
        "xp_reward": 30,
        "reward_coins": 25,
        "config": {
            "game_id": "yatzi_3d_by_luciogiolli",
            "type": "high_score",
            "category": "progression",
            "reset_period": "daily",
            "reset_on_complete": True
        }
    },
    {
        "title": "Yatzi: Expert Scorer",
        "description": "Score 300+ points in a game",
        "quest_type": "score",
        "target_value": 300,
        "xp_reward": 50,
        "reward_coins": 40,
        "config": {
            "game_id": "yatzi_3d_by_luciogiolli",
            "type": "high_score",
            "category": "progression",
            "reset_period": "daily",
            "reset_on_complete": True
        }
    },
    {
        "title": "Yatzi: Upper Bonus",
        "description": "Get the upper section bonus (63+ points)",
        "quest_type": "score",
        "target_value": 1,
        "xp_reward": 35,
        "reward_coins": 30,
        "config": {
            "game_id": "yatzi_3d_by_luciogiolli",
            "type": "upper_section_bonus",
            "category": "achievement",
            "reset_period": "daily",
            "reset_on_complete": True
        }
    },
    {
        "title": "Yatzi: Five of a Kind",
        "description": "Roll a Yatzi (5 of the same number)",
        "quest_type": "score",
        "target_value": 1,
        "xp_reward": 45,
        "reward_coins": 35,
        "config": {
            "game_id": "yatzi_3d_by_luciogiolli",
            "type": "roll_yatzi",
            "category": "luck",
            "reset_period": "daily",
            "reset_on_complete": True
        }
    },
    {
        "title": "Yatzi: Full House Master",
        "description": "Score 3 Full Houses",
        "quest_type": "score",
        "target_value": 3,
        "xp_reward": 30,
        "reward_coins": 25,
        "config": {
            "game_id": "yatzi_3d_by_luciogiolli",
            "type": "full_houses",
            "category": "skill",
            "reset_period": "daily",
            "reset_on_complete": True
        }
    },
    {
        "title": "Yatzi: Long Straight",
        "description": "Score 2 Large Straights",
        "quest_type": "score",
        "target_value": 2,
        "xp_reward": 35,
        "reward_coins": 30,
        "config": {
            "game_id": "yatzi_3d_by_luciogiolli",
            "type": "large_straight",
            "category": "luck",
            "reset_period": "daily",
            "reset_on_complete": True
        }
    },
]


def setup_quests():
    """Setup Seven and Yatzi quests without creating duplicates."""
    
    db = SessionLocal()
    
    try:
        print("=" * 70)
        print("  🎮 SEVEN & YATZI QUEST SETUP")
        print("=" * 70)
        print()
        
        all_quests = SEVEN_QUESTS + YATZI_QUESTS
        created = 0
        updated = 0
        skipped = 0
        
        for quest_def in all_quests:
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
        
        db.commit()
        
        print()
        print("=" * 70)
        print(f"  Summary: {created} created, {updated} updated, {skipped} skipped")
        print("=" * 70)
        
        # Check for duplicates and clean up
        print()
        print("🔍 Checking for duplicates...")
        
        duplicates_removed = 0
        for quest_def in all_quests:
            title = quest_def["title"]
            quests_with_title = db.query(Quest).filter(Quest.title == title).order_by(Quest.quest_id).all()
            
            if len(quests_with_title) > 1:
                # Keep the first one, delete the rest
                for duplicate in quests_with_title[1:]:
                    # Delete user progress for this quest
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
        seven_count = db.query(Quest).filter(Quest.title.like('Seven:%')).count()
        yatzi_count = db.query(Quest).filter(Quest.title.like('Yatzi:%')).count()
        
        print()
        print("=" * 70)
        print(f"  Final counts: {seven_count} Seven quests, {yatzi_count} Yatzi quests")
        print("=" * 70)
        
    except Exception as e:
        print(f"[ERROR] {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    setup_quests()
