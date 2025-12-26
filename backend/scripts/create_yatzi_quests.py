"""
Create quests for Yatzi 3D game
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

def create_yatzi_quests():
    """Create quests for Yatzi 3D game"""
    
    db = SessionLocal()
    
    try:
        print("=" * 70)
        print("  YATZI 3D - QUEST CREATION")
        print("=" * 70)
        print()
        
        now = datetime.now().isoformat()
        
        quests = [
            {
                'title': 'Yatzi: First Game',
                'description': 'Complete your first Yatzi game',
                'quest_type': 'play_games',
                'target_value': 1,
                'xp_reward': 15,
                'reward_coins': 10,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'yatzi_3d_by_luciogiolli',
                    'type': 'games_played',
                    'category': 'gameplay'
                })
            },
            {
                'title': 'Yatzi: Novice Player',
                'description': 'Play 5 games of Yatzi',
                'quest_type': 'play_games',
                'target_value': 5,
                'xp_reward': 25,
                'reward_coins': 15,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'yatzi_3d_by_luciogiolli',
                    'type': 'games_played',
                    'category': 'gameplay'
                })
            },
            {
                'title': 'Yatzi: First Victory',
                'description': 'Win your first game against AI',
                'quest_type': 'score',
                'target_value': 1,
                'xp_reward': 20,
                'reward_coins': 15,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'yatzi_3d_by_luciogiolli',
                    'type': 'wins',
                    'category': 'skill'
                })
            },
            {
                'title': 'Yatzi: Winning Streak',
                'description': 'Win 3 games in a row',
                'quest_type': 'score',
                'target_value': 3,
                'xp_reward': 40,
                'reward_coins': 30,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'yatzi_3d_by_luciogiolli',
                    'type': 'win_streak',
                    'category': 'skill'
                })
            },
            {
                'title': 'Yatzi: Skilled Player',
                'description': 'Score 200+ points in a single game',
                'quest_type': 'score',
                'target_value': 200,
                'xp_reward': 30,
                'reward_coins': 25,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'yatzi_3d_by_luciogiolli',
                    'type': 'high_score',
                    'category': 'progression'
                })
            },
            {
                'title': 'Yatzi: Expert Scorer',
                'description': 'Score 250+ points in a single game',
                'quest_type': 'score',
                'target_value': 250,
                'xp_reward': 45,
                'reward_coins': 35,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'yatzi_3d_by_luciogiolli',
                    'type': 'high_score',
                    'category': 'progression'
                })
            },
            {
                'title': 'Yatzi: Upper Bonus',
                'description': 'Get the upper section bonus (63+ points)',
                'quest_type': 'score',
                'target_value': 63,
                'xp_reward': 25,
                'reward_coins': 20,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'yatzi_3d_by_luciogiolli',
                    'type': 'upper_section_bonus',
                    'category': 'achievement'
                })
            },
            {
                'title': 'Yatzi: Five of a Kind',
                'description': 'Roll a Yatzi (5 of the same number)',
                'quest_type': 'score',
                'target_value': 1,
                'xp_reward': 35,
                'reward_coins': 30,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'yatzi_3d_by_luciogiolli',
                    'type': 'roll_yatzi',
                    'category': 'luck'
                })
            },
            {
                'title': 'Yatzi: Full House Master',
                'description': 'Score 3 Full Houses',
                'quest_type': 'score',
                'target_value': 3,
                'xp_reward': 30,
                'reward_coins': 25,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'yatzi_3d_by_luciogiolli',
                    'type': 'full_houses',
                    'category': 'skill'
                })
            },
            {
                'title': 'Yatzi: Long Straight',
                'description': 'Roll a Large Straight (1-2-3-4-5 or 2-3-4-5-6)',
                'quest_type': 'score',
                'target_value': 1,
                'xp_reward': 30,
                'reward_coins': 25,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'yatzi_3d_by_luciogiolli',
                    'type': 'large_straight',
                    'category': 'luck'
                })
            }
        ]
        
        created_count = 0
        for quest_data in quests:
            quest = Quest(**quest_data)
            db.add(quest)
            created_count += 1
            print(f"[OK] {quest_data['title']}")
            print(f"   {quest_data['description']}")
            print(f"   Reward: {quest_data['xp_reward']} XP + {quest_data['reward_coins']} coins")
            print()
        
        db.commit()
        
        print("=" * 70)
        print(f"  Successfully created {created_count} quests for Yatzi 3D")
        print("=" * 70)
        
    except Exception as e:
        print(f"[ERROR] {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_yatzi_quests()
