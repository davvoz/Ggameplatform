"""
Create daily quests for Sette e Mezzo.

4 daily quests:
  1. Play 3 hands       → 10 XP, 10 coins
  2. Get Sette e Mezzo  → 50 XP, 50 coins
  3. Win 5 hands        → 50 XP, 70 coins
  4. Lose 4 hands       → 20 XP, 20 coins
"""
import sys
import os
from pathlib import Path
from datetime import datetime
import json

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models import Quest


def create_setteemezzo_quests():
    """Create daily quests for Sette e Mezzo."""

    db = SessionLocal()

    try:
        print("=" * 70)
        print("  🃏 SETTE E MEZZO — DAILY QUEST CREATION")
        print("=" * 70)
        print()

        now = datetime.now().isoformat()

        quests = [
            {
                'title': 'Sette e Mezzo: Card Player',
                'description': 'Play 3 hands',
                'quest_type': 'play_games',
                'target_value': 3,
                'xp_reward': 10,
                'reward_coins': 10,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'setteemezzo',
                    'type': 'games_played',
                    'category': 'gameplay',
                    'reset_period': 'daily',
                    'reset_on_complete': True
                })
            },
            {
                'title': 'Sette e Mezzo: Perfect Hand',
                'description': 'Get a Sette e Mezzo (7½)',
                'quest_type': 'score',
                'target_value': 1,
                'xp_reward': 50,
                'reward_coins': 50,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'setteemezzo',
                    'type': 'sette_e_mezzo',
                    'category': 'skill',
                    'extra_data_field': 'sette_e_mezzo',
                    'reset_period': 'daily',
                    'reset_on_complete': True
                })
            },
            {
                'title': 'Sette e Mezzo: Winner',
                'description': 'Win 5 hands',
                'quest_type': 'score',
                'target_value': 5,
                'xp_reward': 50,
                'reward_coins': 70,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'setteemezzo',
                    'type': 'wins',
                    'category': 'skill',
                    'extra_data_field': 'result',
                    'extra_data_value': 'win',
                    'reset_period': 'daily',
                    'reset_on_complete': True
                })
            },
            {
                'title': 'Sette e Mezzo: Bad Luck',
                'description': 'Lose 4 hands',
                'quest_type': 'score',
                'target_value': 4,
                'xp_reward': 20,
                'reward_coins': 20,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'setteemezzo',
                    'type': 'losses',
                    'category': 'gameplay',
                    'extra_data_field': 'result',
                    'extra_data_value': 'lose',
                    'reset_period': 'daily',
                    'reset_on_complete': True
                })
            },
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

            config = json.loads(quest_data['config'])
            print(f"✅ Added: '{quest_data['title']}'")
            print(f"   {quest_data['description']}")
            print(f"   Rewards: {quest_data['xp_reward']} XP, {quest_data['reward_coins']} coins")
            print(f"   Reset: {config.get('reset_period', 'none')}")
            print()

            added_count += 1

        db.commit()

        print("=" * 70)
        print(f"  ✅ Added {added_count} quests, skipped {skipped_count}")
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
    create_setteemezzo_quests()
