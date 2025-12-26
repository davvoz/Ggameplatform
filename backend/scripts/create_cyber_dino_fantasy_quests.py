"""
Create quests for Cyber Dino Fantasy Tactics game
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

def create_cyber_dino_fantasy_quests():
    """Create quests for Cyber Dino Fantasy Tactics game"""
    
    db = SessionLocal()
    
    try:
        print("=" * 70)
        print("  CYBER DINO FANTASY TACTICS - QUEST CREATION")
        print("=" * 70)
        print()
        
        now = datetime.now().isoformat()
        
        quests = [
            # Beginner quests
            {
                'title': 'Cyber Dino: First Battle',
                'description': 'Complete your first tactical battle',
                'quest_type': 'play_games',
                'target_value': 1,
                'xp_reward': 20,
                'reward_coins': 15,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'cyber_dino_fantasy_tactics',
                    'type': 'games_played',
                    'category': 'gameplay'
                })
            },
            {
                'title': 'Cyber Dino: Tactician Recruit',
                'description': 'Play 5 tactical battles',
                'quest_type': 'play_games',
                'target_value': 5,
                'xp_reward': 30,
                'reward_coins': 20,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'cyber_dino_fantasy_tactics',
                    'type': 'games_played',
                    'category': 'gameplay'
                })
            },
            {
                'title': 'Cyber Dino: First Victory',
                'description': 'Win your first battle',
                'quest_type': 'score',
                'target_value': 1,
                'xp_reward': 25,
                'reward_coins': 20,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'cyber_dino_fantasy_tactics',
                    'type': 'victories',
                    'category': 'skill'
                })
            },
            # Floor progression quests
            {
                'title': 'Cyber Dino: Floor 5',
                'description': 'Reach floor 5 in the dungeon',
                'quest_type': 'score',
                'target_value': 5,
                'xp_reward': 30,
                'reward_coins': 25,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'cyber_dino_fantasy_tactics',
                    'type': 'floor_reached',
                    'category': 'progression'
                })
            },
            {
                'title': 'Cyber Dino: Floor 10',
                'description': 'Reach floor 10 in the dungeon',
                'quest_type': 'score',
                'target_value': 10,
                'xp_reward': 50,
                'reward_coins': 40,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'cyber_dino_fantasy_tactics',
                    'type': 'floor_reached',
                    'category': 'progression'
                })
            },
            {
                'title': 'Cyber Dino: Floor 15',
                'description': 'Reach floor 15 in the dungeon',
                'quest_type': 'score',
                'target_value': 15,
                'xp_reward': 75,
                'reward_coins': 60,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'cyber_dino_fantasy_tactics',
                    'type': 'floor_reached',
                    'category': 'progression'
                })
            },
            # Combat quests
            {
                'title': 'Cyber Dino: Hunter',
                'description': 'Defeat 10 enemies',
                'quest_type': 'score',
                'target_value': 10,
                'xp_reward': 25,
                'reward_coins': 20,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'cyber_dino_fantasy_tactics',
                    'type': 'enemies_defeated',
                    'category': 'combat'
                })
            },
            {
                'title': 'Cyber Dino: Warrior',
                'description': 'Defeat 25 enemies',
                'quest_type': 'score',
                'target_value': 25,
                'xp_reward': 40,
                'reward_coins': 35,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'cyber_dino_fantasy_tactics',
                    'type': 'enemies_defeated',
                    'category': 'combat'
                })
            },
            {
                'title': 'Cyber Dino: Slayer',
                'description': 'Defeat 50 enemies',
                'quest_type': 'score',
                'target_value': 50,
                'xp_reward': 60,
                'reward_coins': 50,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'cyber_dino_fantasy_tactics',
                    'type': 'enemies_defeated',
                    'category': 'combat'
                })
            },
            # Party building quests
            {
                'title': 'Cyber Dino: Recruiter',
                'description': 'Build a party of 2 characters',
                'quest_type': 'score',
                'target_value': 2,
                'xp_reward': 20,
                'reward_coins': 15,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'cyber_dino_fantasy_tactics',
                    'type': 'party_size',
                    'category': 'team'
                })
            },
            {
                'title': 'Cyber Dino: Squad Leader',
                'description': 'Build a party of 3 characters',
                'quest_type': 'score',
                'target_value': 3,
                'xp_reward': 30,
                'reward_coins': 25,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'cyber_dino_fantasy_tactics',
                    'type': 'party_size',
                    'category': 'team'
                })
            },
            {
                'title': 'Cyber Dino: Commander',
                'description': 'Build a full party of 4 characters',
                'quest_type': 'score',
                'target_value': 4,
                'xp_reward': 45,
                'reward_coins': 35,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'cyber_dino_fantasy_tactics',
                    'type': 'party_size',
                    'category': 'team'
                })
            },
            # Skill-based quests
            {
                'title': 'Cyber Dino: Perfect Run',
                'description': 'Complete a run without losing any characters',
                'quest_type': 'score',
                'target_value': 1,
                'xp_reward': 50,
                'reward_coins': 40,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'cyber_dino_fantasy_tactics',
                    'type': 'perfect_run',
                    'category': 'skill'
                })
            },
            {
                'title': 'Cyber Dino: Ability Master',
                'description': 'Use 20 special abilities in combat',
                'quest_type': 'score',
                'target_value': 20,
                'xp_reward': 35,
                'reward_coins': 30,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'cyber_dino_fantasy_tactics',
                    'type': 'abilities_used',
                    'category': 'skill'
                })
            },
            {
                'title': 'Cyber Dino: Item Collector',
                'description': 'Collect 10 items during runs',
                'quest_type': 'score',
                'target_value': 10,
                'xp_reward': 30,
                'reward_coins': 25,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'cyber_dino_fantasy_tactics',
                    'type': 'items_collected',
                    'category': 'collection'
                })
            },
            # Score-based quests
            {
                'title': 'Cyber Dino: High Scorer',
                'description': 'Score 1000+ points in a single run',
                'quest_type': 'score',
                'target_value': 1000,
                'xp_reward': 40,
                'reward_coins': 35,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'cyber_dino_fantasy_tactics',
                    'type': 'high_score',
                    'category': 'progression'
                })
            },
            {
                'title': 'Cyber Dino: Elite Tactician',
                'description': 'Score 2500+ points in a single run',
                'quest_type': 'score',
                'target_value': 2500,
                'xp_reward': 60,
                'reward_coins': 50,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': 'cyber_dino_fantasy_tactics',
                    'type': 'high_score',
                    'category': 'progression'
                })
            },
        ]
        
        # Check for existing quests
        existing = db.query(Quest).filter(
            Quest.config.like('%cyber_dino_fantasy_tactics%')
        ).first()
        
        if existing:
            print("[WARNING] Some quests for Cyber Dino Fantasy Tactics may already exist!")
            response = input("Do you want to delete all existing Cyber Dino quests and recreate? (y/N): ")
            if response.lower() == 'y':
                deleted = db.query(Quest).filter(
                    Quest.config.like('%cyber_dino_fantasy_tactics%')
                ).delete(synchronize_session=False)
                db.commit()
                print(f"[DELETED] {deleted} existing quests")
                print()
            else:
                print("Aborted.")
                return
        
        print("Creating quests:")
        print()
        
        for quest_data in quests:
            quest = Quest(**quest_data)
            db.add(quest)
            print(f"  ✓ {quest_data['title']}")
            print(f"    {quest_data['description']}")
            print(f"    Reward: {quest_data['xp_reward']} XP + {quest_data['reward_coins']} coins")
            print()
        
        db.commit()
        
        print("=" * 70)
        print(f"✅ Successfully created {len(quests)} quests!")
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
    create_cyber_dino_fantasy_quests()
