"""
Create daily quests for Space Shooter 2.

3 daily quests:
  1. Space Pilot         — Play 3 games (games_played, daily reset)
  2. Alien Exterminator  — Kill 150 enemies total (total_kills, daily reset)
  3. Deep Space Explorer — Reach level 10 in a single game (reach_level, daily reset)

extra_data available from the game:
  level, enemiesKilled, maxCombo, ship, ultimate, difficulty, victory
"""
import sys
import os
from pathlib import Path
from datetime import datetime
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models import Quest


def create_space_shooter_2_quests():
    """Create daily quests for Space Shooter 2."""

    db = SessionLocal()

    try:
        print()
        print("=" * 70)
        print("  🚀 SPACE SHOOTER 2 — DAILY QUEST CREATION")
        print("=" * 70)
        print()

        now = datetime.now().isoformat()

        quests = [
            {
                'title': 'Space Shooter 2: Space Pilot',
                'description': 'Play 3 games of Space Shooter 2',
                'quest_type': 'play_games',
                'target_value': 3,
                'xp_reward': 50,
                'reward_coins': 5,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'space_shooter_2',
                    'type': 'games_played',
                    'category': 'gameplay',
                    'reset_period': 'daily',
                    'reset_on_complete': True,
                    'icon': '🚀'
                })
            },
            {
                'title': 'Space Shooter 2: Alien Exterminator',
                'description': 'Kill 150 enemies in total today',
                'quest_type': 'achievement',
                'target_value': 150,
                'xp_reward': 60,
                'reward_coins': 10,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'space_shooter_2',
                    'type': 'total_kills',
                    'category': 'combat',
                    'reset_period': 'daily',
                    'reset_on_complete': True,
                    'icon': '👾'
                })
            },
            {
                'title': 'Space Shooter 2: Deep Space Explorer',
                'description': 'Reach level 10 in a single game',
                'quest_type': 'achievement',
                'target_value': 10,
                'xp_reward': 70,
                'reward_coins': 15,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'space_shooter_2',
                    'type': 'reach_level',
                    'category': 'skill',
                    'reset_period': 'daily',
                    'reset_on_complete': True,
                    'icon': '🌌'
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
        print("  1. Space Pilot          — Play 3 games         (50 XP, 5 coins)")
        print("  2. Alien Exterminator   — Kill 150 enemies      (60 XP, 10 coins)")
        print("  3. Deep Space Explorer  — Reach level 10        (70 XP, 15 coins)")
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
    create_space_shooter_2_quests()
