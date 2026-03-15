"""
Script to add 3 new Platform Daily Quests.

These are a new concept: daily quests that are NOT tied to a specific game,
but instead track cross-game / cross-quest activity on the platform.

1) Play 10 Different Games    -> 20 XP, 20 coins
2) Complete Half of Game Daily Quests -> 30 XP, 30 coins
3) Complete All Daily Quests  -> 100 XP, 200 coins

All three reset daily via the DailyQuestScheduler (reset_period: "daily").

New quest_type values handled:
  - play_distinct_games_daily : counts distinct game_ids played today
  - complete_half_daily_game_quests : completed >= ceil(total_daily_game_quests / 2)
  - complete_all_daily_quests : completed == total_daily_game_quests

IMPORTANT: After running this script you must also update quest_tracker.py
to handle the new quest_type values (see the companion changes).
"""

import sys
import json
from pathlib import Path
from datetime import datetime

# Add the backend directory to the path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import get_db_session
from app.models import Quest


def create_platform_daily_quests():
    """Insert the 3 new platform daily quests."""

    with get_db_session() as db:
        now = datetime.utcnow().isoformat()

        new_quests = [
            {
                "title": "Play 10 Different Games",
                "description": "Play at least 10 different games today",
                "quest_type": "play_distinct_games_daily",
                "target_value": 10,
                "xp_reward": 20,
                "reward_coins": 20,
                "config": json.dumps({
                    "category": "platform_daily",
                    "reset_period": "daily"
                }),
            },
            {
                "title": "Complete Half of Daily Game Quests",
                "description": "Complete at least half of the game daily quests today",
                "quest_type": "complete_half_daily_game_quests",
                "target_value": 1,          # dynamic – will be recalculated at tracking time
                "xp_reward": 30,
                "reward_coins": 30,
                "config": json.dumps({
                    "category": "platform_daily",
                    "reset_period": "daily"
                }),
            },
            {
                "title": "Complete All Daily Quests",
                "description": "Complete every game daily quest today",
                "quest_type": "complete_all_daily_quests",
                "target_value": 1,          # dynamic – will be recalculated at tracking time
                "xp_reward": 100,
                "reward_coins": 200,
                "config": json.dumps({
                    "category": "platform_daily",
                    "reset_period": "daily"
                }),
            },
        ]

        print("=" * 70)
        print("  🌟 ADDING PLATFORM DAILY QUESTS")
        print("=" * 70)
        print()

        added_count = 0
        skipped_count = 0

        for quest_data in new_quests:
            existing = db.query(Quest).filter(Quest.title == quest_data["title"]).first()

            if existing:
                print(f"⏭️  Skipped: '{quest_data['title']}' (already exists, id={existing.quest_id})")
                skipped_count += 1
                continue

            quest = Quest(
                title=quest_data["title"],
                description=quest_data["description"],
                quest_type=quest_data["quest_type"],
                target_value=quest_data["target_value"],
                xp_reward=quest_data["xp_reward"],
                reward_coins=quest_data["reward_coins"],
                config=quest_data["config"],
                is_active=1,
                created_at=now,
            )
            db.add(quest)
            print(
                f"✅ Added: '{quest_data['title']}' "
                f"(type={quest_data['quest_type']}, "
                f"target={quest_data['target_value']}, "
                f"{quest_data['xp_reward']} XP, "
                f"{quest_data['reward_coins']} coins)"
            )
            added_count += 1

        db.commit()

        # Summary
        print()
        print("=" * 70)
        print(f"✅ Added: {added_count} new platform daily quests")
        print(f"⏭️  Skipped: {skipped_count} existing quests")

        total = db.query(Quest).count()
        print(f"📊 Total quests in database: {total}")
        print("=" * 70)


if __name__ == "__main__":
    create_platform_daily_quests()
