"""
Create quests for Briscola game
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

GAME_ID = 'briscola'

def create_briscola_quests():
    """Create quests for Briscola game"""
    
    db = SessionLocal()
    
    try:
        print("=" * 70)
        print("  🃏 BRISCOLA - QUEST CREATION")
        print("=" * 70)
        print()
        
        now = datetime.now().isoformat()
        
        quests = [
            # Gameplay quests
            {
                'title': 'Briscola: Prima Partita',
                'description': 'Completa la tua prima partita di Briscola',
                'quest_type': 'play_games',
                'target_value': 1,
                'xp_reward': 15,
                'reward_coins': 10,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': GAME_ID,
                    'type': 'games_played',
                    'category': 'gameplay',
                    'icon': '🃏'
                })
            },
            {
                'title': 'Briscola: Giocatore Assiduo',
                'description': 'Gioca 5 partite di Briscola',
                'quest_type': 'play_games',
                'target_value': 5,
                'xp_reward': 25,
                'reward_coins': 15,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': GAME_ID,
                    'type': 'games_played',
                    'category': 'gameplay',
                    'icon': '🎮'
                })
            },
            {
                'title': 'Briscola: Veterano',
                'description': 'Gioca 20 partite di Briscola',
                'quest_type': 'play_games',
                'target_value': 20,
                'xp_reward': 50,
                'reward_coins': 35,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': GAME_ID,
                    'type': 'games_played',
                    'category': 'gameplay',
                    'icon': '🎖️'
                })
            },
            # Victory quests
            {
                'title': 'Briscola: Prima Vittoria',
                'description': 'Vinci la tua prima partita',
                'quest_type': 'score',
                'target_value': 1,
                'xp_reward': 20,
                'reward_coins': 15,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': GAME_ID,
                    'type': 'wins',
                    'category': 'skill',
                    'icon': '🏆'
                })
            },
            {
                'title': 'Briscola: Campione',
                'description': 'Vinci 10 partite',
                'quest_type': 'score',
                'target_value': 10,
                'xp_reward': 75,
                'reward_coins': 50,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': GAME_ID,
                    'type': 'wins',
                    'category': 'skill',
                    'icon': '👑'
                })
            },
            {
                'title': 'Briscola: Maestro',
                'description': 'Vinci 50 partite',
                'quest_type': 'score',
                'target_value': 50,
                'xp_reward': 200,
                'reward_coins': 125,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': GAME_ID,
                    'type': 'wins',
                    'category': 'skill',
                    'icon': '🌟'
                })
            },
            # AI difficulty quests
            {
                'title': 'Briscola: Sfidante AI',
                'description': 'Sconfiggi l\'AI difficile',
                'quest_type': 'score',
                'target_value': 1,
                'xp_reward': 30,
                'reward_coins': 25,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': GAME_ID,
                    'type': 'hard_ai_wins',
                    'category': 'challenge',
                    'icon': '🤖'
                })
            },
            {
                'title': 'Briscola: Dominatore AI',
                'description': 'Sconfiggi l\'AI difficile 10 volte',
                'quest_type': 'score',
                'target_value': 10,
                'xp_reward': 100,
                'reward_coins': 75,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': GAME_ID,
                    'type': 'hard_ai_wins',
                    'category': 'challenge',
                    'icon': '🦾'
                })
            },
            # Special achievements
            {
                'title': 'Briscola: Cappotto!',
                'description': 'Vinci con 120 punti (tutti i punti)',
                'quest_type': 'score',
                'target_value': 1,
                'xp_reward': 100,
                'reward_coins': 75,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': GAME_ID,
                    'type': 'perfect_score',
                    'category': 'achievement',
                    'icon': '💯'
                })
            },
            {
                'title': 'Briscola: Dominatore',
                'description': 'Vinci con almeno 40 punti di scarto',
                'quest_type': 'score',
                'target_value': 1,
                'xp_reward': 40,
                'reward_coins': 30,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': GAME_ID,
                    'type': 'domination_win',
                    'category': 'achievement',
                    'icon': '💪'
                })
            },
            # Multiplayer quests
            {
                'title': 'Briscola: Prima Vittoria Online',
                'description': 'Vinci una partita in multiplayer',
                'quest_type': 'score',
                'target_value': 1,
                'xp_reward': 35,
                'reward_coins': 25,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': GAME_ID,
                    'type': 'multiplayer_wins',
                    'category': 'multiplayer',
                    'icon': '🌐'
                })
            },
            {
                'title': 'Briscola: Campione Online',
                'description': 'Vinci 10 partite in multiplayer',
                'quest_type': 'score',
                'target_value': 10,
                'xp_reward': 150,
                'reward_coins': 100,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': GAME_ID,
                    'type': 'multiplayer_wins',
                    'category': 'multiplayer',
                    'icon': '🏅'
                })
            },
            # Streak quests
            {
                'title': 'Briscola: Serie Vincente',
                'description': 'Vinci 3 partite di fila',
                'quest_type': 'score',
                'target_value': 3,
                'xp_reward': 50,
                'reward_coins': 40,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': GAME_ID,
                    'type': 'win_streak',
                    'category': 'skill',
                    'icon': '🔥'
                })
            },
            {
                'title': 'Briscola: Re delle Carte',
                'description': 'Vinci 10 partite di fila',
                'quest_type': 'score',
                'target_value': 10,
                'xp_reward': 250,
                'reward_coins': 150,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': GAME_ID,
                    'type': 'win_streak',
                    'category': 'skill',
                    'icon': '🃏👑'
                })
            }
        ]
        
        quests_created = 0
        quests_skipped = 0
        
        for quest_data in quests:
            # Check if quest already exists by title
            existing = db.query(Quest).filter(Quest.title == quest_data['title']).first()
            
            if existing:
                print(f"⏭️  Quest '{quest_data['title']}' already exists - skipping")
                quests_skipped += 1
                continue
            
            quest = Quest(**quest_data)
            db.add(quest)
            print(f"✅ Created quest: {quest_data['title']}")
            quests_created += 1
        
        db.commit()
        
        print()
        print("=" * 70)
        print(f"  ✅ QUEST CREATION COMPLETE")
        print(f"     Quests Created: {quests_created}")
        print(f"     Quests Skipped: {quests_skipped}")
        print("=" * 70)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == '__main__':
    create_briscola_quests()
