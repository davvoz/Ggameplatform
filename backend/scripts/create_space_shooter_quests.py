"""
Create daily quests for Space Shooter (original).

3 daily quests:
  1. Unstoppable Force  — Score 50,000+ points in a single run (high_score, daily reset)
  2. Endurance Run      — Reach level 15 in a single game (reach_level, daily reset)
  3. Speed Demon        — Play 5 games today (games_played, daily reset)

extra_data available from the game:
  level, wave, continued, xp_score
"""
import sys
import os
from pathlib import Path
from datetime import datetime
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models import Quest


def create_space_shooter_quests():
    """Create daily quests for Space Shooter (original)."""

    db = SessionLocal()

    try:
        print()
        print("=" * 70)
        print("  🚀 SPACE SHOOTER — DAILY QUEST CREATION")
        print("=" * 70)
        print()

        now = datetime.now().isoformat()

        quests = [
            {
                'title': 'Space Shooter: Unstoppable Force',
                'description': 'Score at least 1,000,000 points in a single run',
                'quest_type': 'achievement',
                'target_value': 1000000,
                'xp_reward': 100,
                'reward_coins': 35,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'space_shooter',
                    'type': 'high_score',
                    'category': 'skill',
                    'reset_period': 'daily',
                    'reset_on_complete': True,
                    'icon': '💥'
                })
            },
            {
                'title': 'Space Shooter: Endurance Run',
                'description': 'Reach level 15 in a single game',
                'quest_type': 'achievement',
                'target_value': 15,
                'xp_reward': 80,
                'reward_coins': 20,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'space_shooter',
                    'type': 'reach_level',
                    'category': 'skill',
                    'reset_period': 'daily',
                    'reset_on_complete': True,
                    'icon': '🛡️'
                })
            },
            {
                'title': 'Space Shooter: Speed Demon',
                'description': 'Play 5 games of Space Shooter today',
                'quest_type': 'play_games',
                'target_value': 5,
                'xp_reward': 60,
                'reward_coins': 10,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'space_shooter',
                    'type': 'games_played',
                    'category': 'gameplay',
                    'reset_period': 'daily',
                    'reset_on_complete': True,
                    'icon': '⚡'
                })
            }
        ]

        added_count = 0
        skipped_count = 0

        for quest_data in quests:
            existing = db.query(Quest).filter(Quest.title == quest_data['title']).first()
            if existing:
                print(f"⏭️  Skipped: '{quest_data['title']}' (already exists)")
                skipped_count += 1
                continue

            quest = Quest(
                title=quest_data['title'],
                description=quest_data['description'],
                quest_type=quest_data['quest_type'],
                target_value=quest_data['target_value'],
                xp_reward=quest_data['xp_reward'],
                reward_coins=quest_data['reward_coins'],
                is_active=quest_data['is_active'],
                created_at=quest_data['created_at'],
                config=quest_data['config']
            )
            db.add(quest)
            print(f"✅ Added: '{quest_data['title']}' ({quest_data['xp_reward']} XP, {quest_data['reward_coins']} coins)")
            added_count += 1

        db.commit()

        print()
        print("=" * 70)
        print(f"  ✅ Added {added_count} quests | ⏭️ Skipped {skipped_count}")
        print("=" * 70)
        print()
        print("📋 Quest summary:")
        print("  1. Unstoppable Force  — Score 50,000+ pts     (100 XP, 25 coins)")
        print("  2. Endurance Run      — Reach level 15        (80 XP, 20 coins)")
        print("  3. Speed Demon        — Play 5 games          (60 XP, 10 coins)")
        print()
        print("🔄 All quests reset daily after completion.")
        print()

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    create_space_shooter_quests()
