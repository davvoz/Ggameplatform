"""
Master script to populate the entire database with:
- All games
- XP rules for each game
- Platform quests
- Initial leaderboard data
"""
import sys
import os
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from datetime import datetime
from app.database import create_game, create_xp_rule, get_game_xp_rules, get_db_session
from app.models import Quest, Game
import json

print("=" * 80)
print("🎮 GAME PLATFORM - DATABASE POPULATION SCRIPT")
print("=" * 80)
print()

# ============================================================================
# PHASE 1: REGISTER GAMES
# ============================================================================
print("📦 PHASE 1: REGISTERING GAMES")
print("-" * 80)

games_to_register = [
    {
        'gameId': 'snake',
        'title': 'Snake Mobile',
        'description': 'Classic snake game optimized for mobile with swipe controls! Eat food, grow longer, and avoid hitting walls or yourself.',
        'author': 'Platform Team',
        'version': '1.0.0',
        'entryPoint': 'index.html',
        'category': 'arcade',
        'tags': ['snake', 'arcade', 'mobile', 'classic'],
        'thumbnail': 'thumbnail.png',
        'metadata': {
            'difficulty': 'medium',
            'max_players': 1,
            'min_age': 7,
            'featured': True
        }
    },
    {
        'gameId': 'space-clicker-phaser',
        'title': 'Space Clicker - Phaser Edition',
        'description': 'An engaging space-themed clicker game built with Phaser 3! Click the rocket to increase your score.',
        'author': 'Ggameplatform',
        'version': '1.0.0',
        'entryPoint': 'index.html',
        'category': 'Clicker',
        'tags': ['clicker', 'space', 'phaser', 'idle', 'casual', 'arcade'],
        'thumbnail': 'thumbnail.png',
        'metadata': {
            'difficulty': 'easy',
            'max_players': 1,
            'min_age': 6,
            'featured': True
        }
    },
    {
        'gameId': 'bouncing-balls',
        'title': 'Bouncing Balls',
        'description': 'A fun physics-based game where you bounce balls and score points!',
        'author': 'Platform Team',
        'version': '1.0.0',
        'entryPoint': 'index.html',
        'category': 'arcade',
        'tags': ['physics', 'arcade', 'casual', 'balls'],
        'thumbnail': 'thumbnail.png',
        'metadata': {
            'difficulty': 'easy',
            'max_players': 1,
            'min_age': 5,
            'featured': False
        }
    },
    {
        'gameId': 'rainbow-rush',
        'title': 'Rainbow Rush',
        'description': 'Rush through colorful levels in this fast-paced arcade game!',
        'author': 'Platform Team',
        'version': '1.0.0',
        'entryPoint': 'index.html',
        'category': 'arcade',
        'tags': ['arcade', 'speed', 'colorful', 'rush'],
        'thumbnail': 'thumbnail.png',
        'metadata': {
            'difficulty': 'medium',
            'max_players': 1,
            'min_age': 7,
            'featured': True
        }
    },
    {
        'gameId': 'zombie-tower',
        'title': 'Zombie Tower Defense',
        'description': 'Defend your tower from waves of zombies in this strategic defense game!',
        'author': 'Platform Team',
        'version': '1.0.0',
        'entryPoint': 'index.html',
        'category': 'strategy',
        'tags': ['tower-defense', 'zombies', 'strategy', 'action'],
        'thumbnail': 'thumbnail.png',
        'metadata': {
            'difficulty': 'hard',
            'max_players': 1,
            'min_age': 10,
            'featured': True
        }
    },
    {
        'gameId': 'space-clicker',
        'title': 'Space Clicker Classic',
        'description': 'The classic version of Space Clicker - click your way to space glory!',
        'author': 'Platform Team',
        'version': '1.0.0',
        'entryPoint': 'index.html',
        'category': 'Clicker',
        'tags': ['clicker', 'space', 'idle', 'casual'],
        'thumbnail': 'thumbnail.png',
        'metadata': {
            'difficulty': 'easy',
            'max_players': 1,
            'min_age': 6,
            'featured': False
        }
    }
]

registered_count = 0
skipped_count = 0

for game_data in games_to_register:
    try:
        create_game(game_data)
        print(f"✅ {game_data['title']:40s} [{game_data['gameId']}]")
        registered_count += 1
    except Exception as e:
        if "UNIQUE constraint failed" in str(e):
            print(f"⚠️  {game_data['title']:40s} [Already exists]")
            skipped_count += 1
        else:
            print(f"❌ {game_data['title']:40s} [Error: {e}]")

print()
print(f"Summary: ✅ {registered_count} registered | ⚠️  {skipped_count} skipped")
print()

# ============================================================================
# PHASE 2: CREATE XP RULES
# ============================================================================
print("📊 PHASE 2: CREATING XP RULES FOR GAMES")
print("-" * 80)

xp_rules_config = {
    'snake': [
        {
            'rule_name': 'Base Score Multiplier',
            'rule_type': 'score_multiplier',
            'parameters': {'multiplier': 0.01, 'max_xp': 100.0},
            'priority': 10
        },
        {
            'rule_name': 'Time Played Bonus',
            'rule_type': 'time_bonus',
            'parameters': {'xp_per_minute': 0.1, 'max_minutes': 10},
            'priority': 5
        },
        {
            'rule_name': 'High Score Bonus',
            'rule_type': 'high_score_bonus',
            'parameters': {'bonus_xp': 10.0},
            'priority': 15
        },
        {
            'rule_name': 'Snake Milestones',
            'rule_type': 'threshold',
            'parameters': {
                'thresholds': [
                    {'score': 5000, 'xp': 100},
                    {'score': 2500, 'xp': 50},
                    {'score': 1000, 'xp': 25},
                    {'score': 500, 'xp': 10}
                ]
            },
            'priority': 20
        }
    ],
    'space-clicker-phaser': [
        {
            'rule_name': 'Base Score Multiplier',
            'rule_type': 'score_multiplier',
            'parameters': {'multiplier': 0.01, 'max_xp': 100.0},
            'priority': 10
        },
        {
            'rule_name': 'Time Played Bonus',
            'rule_type': 'time_bonus',
            'parameters': {'xp_per_minute': 0.1, 'max_minutes': 10},
            'priority': 5
        },
        {
            'rule_name': 'High Score Bonus',
            'rule_type': 'high_score_bonus',
            'parameters': {'bonus_xp': 10.0},
            'priority': 15
        },
        {
            'rule_name': 'Speed Clicker Bonus',
            'rule_type': 'combo',
            'parameters': {'min_score': 1000, 'min_duration': 60, 'bonus_xp': 20.0},
            'priority': 20
        },
        {
            'rule_name': 'Click Milestones',
            'rule_type': 'threshold',
            'parameters': {
                'thresholds': [
                    {'score': 5000, 'xp': 100},
                    {'score': 2500, 'xp': 50},
                    {'score': 1000, 'xp': 20},
                    {'score': 500, 'xp': 10},
                    {'score': 100, 'xp': 5}
                ]
            },
            'priority': 20
        },
        {
            'rule_name': 'Improvement Bonus',
            'rule_type': 'percentile_improvement',
            'parameters': {'xp_per_percent': 0.5, 'max_xp': 50.0},
            'priority': 12
        }
    ],
    'rainbow-rush': [
        {
            'rule_name': 'Base Score Multiplier',
            'rule_type': 'score_multiplier',
            'parameters': {'multiplier': 0.015, 'max_xp': 120.0},
            'priority': 10
        },
        {
            'rule_name': 'Time Played Bonus',
            'rule_type': 'time_bonus',
            'parameters': {'xp_per_minute': 0.15, 'max_minutes': 8},
            'priority': 5
        },
        {
            'rule_name': 'High Score Bonus',
            'rule_type': 'high_score_bonus',
            'parameters': {'bonus_xp': 15.0},
            'priority': 15
        },
        {
            'rule_name': 'Speed Run Bonus',
            'rule_type': 'combo',
            'parameters': {'min_score': 2000, 'min_duration': 120, 'bonus_xp': 30.0},
            'priority': 20
        }
    ],
    'bouncing-balls': [
        {
            'rule_name': 'Base Score Multiplier',
            'rule_type': 'score_multiplier',
            'parameters': {'multiplier': 0.012, 'max_xp': 80.0},
            'priority': 10
        },
        {
            'rule_name': 'Time Played Bonus',
            'rule_type': 'time_bonus',
            'parameters': {'xp_per_minute': 0.12, 'max_minutes': 12},
            'priority': 5
        },
        {
            'rule_name': 'High Score Bonus',
            'rule_type': 'high_score_bonus',
            'parameters': {'bonus_xp': 12.0},
            'priority': 15
        }
    ],
    'zombie-tower': [
        {
            'rule_name': 'Base Score Multiplier',
            'rule_type': 'score_multiplier',
            'parameters': {'multiplier': 0.02, 'max_xp': 150.0},
            'priority': 10
        },
        {
            'rule_name': 'Time Played Bonus',
            'rule_type': 'time_bonus',
            'parameters': {'xp_per_minute': 0.2, 'max_minutes': 15},
            'priority': 5
        },
        {
            'rule_name': 'High Score Bonus',
            'rule_type': 'high_score_bonus',
            'parameters': {'bonus_xp': 20.0},
            'priority': 15
        },
        {
            'rule_name': 'Survival Milestones',
            'rule_type': 'threshold',
            'parameters': {
                'thresholds': [
                    {'score': 10000, 'xp': 150},
                    {'score': 5000, 'xp': 75},
                    {'score': 2000, 'xp': 30},
                    {'score': 1000, 'xp': 15}
                ]
            },
            'priority': 20
        }
    ],
    'space-clicker': [
        {
            'rule_name': 'Base Score Multiplier',
            'rule_type': 'score_multiplier',
            'parameters': {'multiplier': 0.01, 'max_xp': 100.0},
            'priority': 10
        },
        {
            'rule_name': 'Time Played Bonus',
            'rule_type': 'time_bonus',
            'parameters': {'xp_per_minute': 0.1, 'max_minutes': 10},
            'priority': 5
        },
        {
            'rule_name': 'High Score Bonus',
            'rule_type': 'high_score_bonus',
            'parameters': {'bonus_xp': 10.0},
            'priority': 15
        }
    ]
}

rules_created = 0
rules_skipped = 0

for game_id, rules in xp_rules_config.items():
    # Check if rules already exist
    existing_rules = get_game_xp_rules(game_id, active_only=False)
    
    if existing_rules:
        print(f"⚠️  {game_id:30s} [{len(existing_rules)} rules already exist]")
        rules_skipped += len(rules)
        continue
    
    print(f"   {game_id}:")
    for rule in rules:
        try:
            create_xp_rule(
                game_id=game_id,
                rule_name=rule['rule_name'],
                rule_type=rule['rule_type'],
                parameters=rule['parameters'],
                priority=rule['priority']
            )
            print(f"      ✅ {rule['rule_name']}")
            rules_created += 1
        except Exception as e:
            print(f"      ❌ {rule['rule_name']} [Error: {e}]")

print()
print(f"Summary: ✅ {rules_created} rules created | ⚠️  {rules_skipped} skipped")
print()

# ============================================================================
# PHASE 3: POPULATE QUESTS
# ============================================================================
print("🎯 PHASE 3: POPULATING QUESTS")
print("-" * 80)

with get_db_session() as db:
    now = datetime.utcnow().isoformat()
    
    quests_data = [
        {
            "title": "Gioca 10 partite",
            "description": "Completa 10 partite su qualsiasi gioco della piattaforma",
            "quest_type": "play_games",
            "target_value": 10,
            "xp_reward": 150,
            "sats_reward": 0
        },
        {
            "title": "Gioca 50 partite",
            "description": "Completa 50 partite su qualsiasi gioco della piattaforma",
            "quest_type": "play_games",
            "target_value": 50,
            "xp_reward": 250,
            "sats_reward": 3
        },
        {
            "title": "Gioca 100 partite",
            "description": "Completa 100 partite su qualsiasi gioco della piattaforma",
            "quest_type": "play_games",
            "target_value": 100,
            "xp_reward": 350,
            "sats_reward": 5
        },
        {
            "title": "Gioca 10 minuti",
            "description": "Gioca per un totale di 10 minuti",
            "quest_type": "play_time",
            "target_value": 600,
            "xp_reward": 100,
            "sats_reward": 0
        },
        {
            "title": "Gioca 60 minuti totali",
            "description": "Gioca per un totale di 60 minuti",
            "quest_type": "play_time",
            "target_value": 3600,
            "xp_reward": 200,
            "sats_reward": 0
        },
        {
            "title": "Gioca 24 ore totali (cumulative)",
            "description": "Gioca per un totale cumulativo di 24 ore",
            "quest_type": "play_time_cumulative",
            "target_value": 86400,
            "xp_reward": 500,
            "sats_reward": 10
        },
        {
            "title": "Completa 5 partite di un gioco con punteggio ≥ X",
            "description": "Completa 5 partite dello stesso gioco con un punteggio minimo definito per-game",
            "quest_type": "score_threshold_per_game",
            "target_value": 5,
            "xp_reward": 200,
            "sats_reward": 3
        },
        {
            "title": "Login dopo 24h",
            "description": "Effettua il login dopo almeno 24 ore dall'ultimo accesso",
            "quest_type": "login_after_24h",
            "target_value": 1,
            "xp_reward": 50,
            "sats_reward": 0
        },
        {
            "title": "Login 7 giorni consecutivi",
            "description": "Effettua il login per 7 giorni consecutivi",
            "quest_type": "login_streak",
            "target_value": 7,
            "xp_reward": 200,
            "sats_reward": 10
        },
        {
            "title": "Gioca 5 partite dello stesso gioco",
            "description": "Completa 5 partite dello stesso gioco",
            "quest_type": "play_same_game",
            "target_value": 5,
            "xp_reward": 150,
            "sats_reward": 0
        },
        {
            "title": "Ottieni un punteggio che termina con 0",
            "description": "Ottieni un punteggio che termina con la cifra 0",
            "quest_type": "score_ends_with",
            "target_value": 0,
            "xp_reward": 100,
            "sats_reward": 0
        },
        {
            "title": "Entra nella Top 5 della leaderboard settimanale",
            "description": "Raggiungi una posizione nella top 5 della classifica settimanale",
            "quest_type": "leaderboard_top",
            "target_value": 5,
            "xp_reward": 400,
            "sats_reward": 10
        },
        {
            "title": "Completa 50 partite in una settimana",
            "description": "Completa 50 partite nell'arco di una settimana",
            "quest_type": "play_games_weekly",
            "target_value": 50,
            "xp_reward": 350,
            "sats_reward": 7
        },
        {
            "title": "Gioca 30 minuti totali in un giorno",
            "description": "Gioca per un totale di 30 minuti in un singolo giorno",
            "quest_type": "play_time_daily",
            "target_value": 1800,
            "xp_reward": 200,
            "sats_reward": 3
        },
        {
            "title": "Raggiungi livello 10",
            "description": "Raggiungi il livello 10 della piattaforma",
            "quest_type": "reach_level",
            "target_value": 10,
            "xp_reward": 200,
            "sats_reward": 3
        },
        {
            "title": "Guadagna 500 XP in un giorno",
            "description": "Guadagna un totale di 500 XP in un singolo giorno",
            "quest_type": "xp_daily",
            "target_value": 500,
            "xp_reward": 200,
            "sats_reward": 5
        },
        {
            "title": "Guadagna 2000 XP in una settimana",
            "description": "Guadagna un totale di 2000 XP nell'arco di una settimana",
            "quest_type": "xp_weekly",
            "target_value": 2000,
            "xp_reward": 250,
            "sats_reward": 5
        },
        {
            "title": "Raggiungi livello 30",
            "description": "Raggiungi il livello 30 della piattaforma",
            "quest_type": "reach_level",
            "target_value": 30,
            "xp_reward": 350,
            "sats_reward": 7
        },
        {
            "title": "Raggiungi livello 50",
            "description": "Raggiungi il livello 50 della piattaforma",
            "quest_type": "reach_level",
            "target_value": 50,
            "xp_reward": 500,
            "sats_reward": 10
        },
        {
            "title": "Completa 10 quest totali",
            "description": "Completa un totale di 10 quest diverse",
            "quest_type": "complete_quests",
            "target_value": 10,
            "xp_reward": 500,
            "sats_reward": 10
        }
    ]
    
    existing_count = db.query(Quest).count()
    if existing_count > 0:
        print(f"⚠️  Found {existing_count} existing quests. Skipping...")
    else:
        for quest_data in quests_data:
            quest = Quest(
                title=quest_data["title"],
                description=quest_data["description"],
                quest_type=quest_data["quest_type"],
                target_value=quest_data["target_value"],
                xp_reward=quest_data["xp_reward"],
                sats_reward=quest_data["sats_reward"],
                is_active=1,
                created_at=now
            )
            db.add(quest)
        
        db.commit()
        print(f"✅ Successfully created {len(quests_data)} quests!")

print()

# ============================================================================
# PHASE 4: VERIFICATION
# ============================================================================
print("🔍 PHASE 4: DATABASE VERIFICATION")
print("-" * 80)

with get_db_session() as db:
    games_count = db.query(Game).count()
    quests_count = db.query(Quest).count()
    
    print(f"📦 Games:       {games_count}")
    print(f"🎯 Quests:      {quests_count}")
    
    print()
    print("Games in database:")
    games = db.query(Game).all()
    for game in games:
        xp_rules = get_game_xp_rules(game.game_id, active_only=False)
        print(f"   • {game.title:40s} [{game.game_id:25s}] - {len(xp_rules)} XP rules")

print()
print("=" * 80)
print("✅ DATABASE POPULATION COMPLETE!")
print("=" * 80)
print()
print("Next steps:")
print("1. Start the platform: docker-compose up -d")
print("2. Visit: http://localhost:3000")
print("3. Play games and earn XP!")
print()
