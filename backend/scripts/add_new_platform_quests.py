"""
Script to add new platform quests (200, 500, 1000 games, Top 10 leaderboard, 20 quests)
Run this AFTER populate_quests.py to add additional quests
"""

import sys
from pathlib import Path
from datetime import datetime

# Add the backend directory to the path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import get_db_session
from app.models import Quest

def add_new_platform_quests():
    """Add new platform quests to complement existing ones."""
    
    with get_db_session() as db:
        now = datetime.utcnow().isoformat()
        
        # Define new quests to add
        new_quests = [
            {
                "title": "Play 200 Games",
                "description": "Complete 200 games on any platform game",
                "quest_type": "play_games",
                "target_value": 200,
                "xp_reward": 500,
                "reward_coins": 10
            },
            {
                "title": "Play 500 Games",
                "description": "Complete 500 games on any platform game",
                "quest_type": "play_games",
                "target_value": 500,
                "xp_reward": 750,
                "reward_coins": 20
            },
            {
                "title": "Play 1000 Games",
                "description": "Complete 1000 games on any platform game",
                "quest_type": "play_games",
                "target_value": 1000,
                "xp_reward": 1000,
                "reward_coins": 50
            },
            {
                "title": "Enter Top 10 Weekly Leaderboard",
                "description": "Reach a position in the top 10 of the weekly leaderboard",
                "quest_type": "leaderboard_top",
                "target_value": 10,
                "xp_reward": 300,
                "reward_coins": 7
            },
            {
                "title": "Complete 20 Quests",
                "description": "Complete a total of 20 different quests",
                "quest_type": "complete_quests",
                "target_value": 20,
                "xp_reward": 750,
                "reward_coins": 20
            }
        ]
        
        print("=" * 70)
        print("  🎯 ADDING NEW PLATFORM QUESTS")
        print("=" * 70)
        print()
        
        # Check if quests already exist
        added_count = 0
        skipped_count = 0
        
        for quest_data in new_quests:
            # Check if quest with same title already exists
            existing = db.query(Quest).filter(Quest.title == quest_data["title"]).first()
            
            if existing:
                print(f"⏭️  Skipped: '{quest_data['title']}' (already exists)")
                skipped_count += 1
                continue
            
            # Add new quest
            quest = Quest(
                title=quest_data["title"],
                description=quest_data["description"],
                quest_type=quest_data["quest_type"],
                target_value=quest_data["target_value"],
                xp_reward=quest_data["xp_reward"],
                reward_coins=quest_data["reward_coins"],
                is_active=1,
                created_at=now
            )
            db.add(quest)
            print(f"✅ Added: '{quest_data['title']}' ({quest_data['xp_reward']} XP, {quest_data['reward_coins']} coins)")
            added_count += 1
        
        db.commit()
        
        # Summary
        print()
        print("=" * 70)
        print(f"✅ Added: {added_count} new quests")
        print(f"⏭️  Skipped: {skipped_count} existing quests")
        
        # Display all platform quests
        total = db.query(Quest).count()
        print(f"📊 Total quests in database: {total}")
        print("=" * 70)

if __name__ == "__main__":
    add_new_platform_quests()
