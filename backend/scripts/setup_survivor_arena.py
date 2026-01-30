"""
Complete setup for Survivor Arena game
Adds game to database, creates XP rules, and creates 3 daily quests
"""
import sys
import os
from pathlib import Path
from datetime import datetime
import json

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal, create_xp_rule, get_game_xp_rules
from app.models import Game, GameStatus, Quest

def setup_survivor_arena():
    """Complete setup for Survivor Arena game"""
    
    db = SessionLocal()
    game_id = 'survivor-arena'
    
    try:
        print()
        print("=" * 70)
        print("  ⚔️ SURVIVOR ARENA - COMPLETE SETUP")
        print("=" * 70)
        print()
        
        # ============================================
        # 1. ADD GAME TO DATABASE
        # ============================================
        print("📦 Step 1: Adding game to database...")
        
        existing_game = db.query(Game).filter(Game.game_id == game_id).first()
        
        if existing_game:
            print(f"⚠️  Game '{game_id}' already exists - updating...")
            existing_game.title = "Survivor Arena"
            existing_game.description = "Survive waves of enemies in a seamless toroidal arena! Collect weapons, level up, and face increasingly difficult hordes. How long can you survive?"
            existing_game.version = "1.0.0"
            existing_game.thumbnail = "thumbnail.png"
            existing_game.entry_point = "index.html"
            existing_game.category = "action"
            existing_game.tags = '["action", "survival", "arcade", "shooter", "roguelike"]'
            existing_game.updated_at = datetime.now().isoformat()
            print("✅ Game updated")
        else:
            # Get 'developed' status
            developed_status = db.query(GameStatus).filter(
                GameStatus.status_code == 'developed'
            ).first()
            
            if not developed_status:
                developed_status = GameStatus(
                    status_name='Developed',
                    status_code='developed',
                    description='Fully developed and ready to play',
                    display_order=1,
                    is_active=1,
                    created_at=datetime.now().isoformat(),
                    updated_at=datetime.now().isoformat()
                )
                db.add(developed_status)
                db.flush()
            
            now = datetime.now().isoformat()
            new_game = Game(
                game_id=game_id,
                title='Survivor Arena',
                description='Survive waves of enemies in a seamless toroidal arena! Collect weapons, level up, and face increasingly difficult hordes. How long can you survive?',
                author='Cur8 Games',
                version='1.0.0',
                thumbnail='thumbnail.png',
                entry_point='index.html',
                category='action',
                tags='["action", "survival", "arcade", "shooter", "roguelike"]',
                status_id=developed_status.status_id,
                steem_rewards_enabled=1,
                created_at=now,
                updated_at=now,
                extra_data='{}'
            )
            db.add(new_game)
            print("✅ Game added to database")
        
        db.commit()
        
        # ============================================
        # 2. CREATE XP RULES
        # ============================================
        print()
        print("⚡ Step 2: Creating XP rules...")
        
        existing_rules = get_game_xp_rules(game_id, active_only=False)
        if existing_rules:
            print(f"⚠️  XP rules already exist ({len(existing_rules)} rules) - skipping")
        else:
            # Rule 1: Base score multiplier (score = kills + time bonus)
            create_xp_rule(
                game_id=game_id,
                rule_name="Survival Score",
                rule_type="score_multiplier",
                parameters={
                    "multiplier": 0.001,
                    "max_xp": 50.0
                },
                priority=10
            )
            print("   ✅ Survival Score (0.001 XP per point, max 50)")
            
            # Rule 2: Kill count bonus (using custom strategy)
            create_xp_rule(
                game_id=game_id,
                rule_name="Kill Count",
                rule_type="custom",
                parameters={
                    "xp_per_kill": 0.01,
                    "max_kills": 2000
                },
                priority=12
            )
            print("   ✅ Kill Count (0.01 XP per kill, max 2000)")
            
            # Rule 3: Player level bonus (using custom strategy)
            create_xp_rule(
                game_id=game_id,
                rule_name="Player Level",
                rule_type="custom",
                parameters={
                    "xp_per_level": 1.0,
                    "max_level": 30
                },
                priority=11
            )
            print("   ✅ Player Level (1 XP per level, max 30)")
            
            # Rule 4: Level reached milestones (threshold uses score field)
            # We'll use extra_data level comparison in custom logic instead
            create_xp_rule(
                game_id=game_id,
                rule_name="Level Milestones",
                rule_type="custom",
                parameters={
                    "level_bonuses": [
                        {"level": 20, "xp": 20},
                        {"level": 15, "xp": 15},
                        {"level": 10, "xp": 10},
                        {"level": 7, "xp": 7},
                        {"level": 5, "xp": 5},
                        {"level": 3, "xp": 3}
                    ]
                },
                priority=15
            )
            print("   ✅ Level Milestones (3→3, 5→5, 7→7, 10→10, 15→15, 20→20 XP)")
            
            # Rule 5: New high score bonus
            create_xp_rule(
                game_id=game_id,
                rule_name="New High Score",
                rule_type="high_score_bonus",
                parameters={
                    "bonus_xp": 5.0
                },
                priority=14
            )
            print("   ✅ New High Score (5 XP)")
            
            # Rule 6: Completion bonus
            create_xp_rule(
                game_id=game_id,
                rule_name="Game Completion",
                rule_type="completion",
                parameters={
                    "base_xp": 2.0
                },
                priority=5
            )
            print("   ✅ Completion (2 XP)")
            
            print("✅ All XP rules created")
        
        # ============================================
        # 3. CREATE 3 DAILY QUESTS
        # ============================================
        print()
        print("🎯 Step 3: Creating daily quests...")
        
        now = datetime.now().isoformat()
        
        quests = [
            {
                'title': 'Survivor Arena: Daily Survivor',
                'description': 'Play 5 games of Survivor Arena',
                'quest_type': 'play_games',
                'target_value': 5,
                'xp_reward': 20,
                'reward_coins': 5,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': game_id,
                    'type': 'games_played',
                    'category': 'gameplay',
                    'reset_period': 'daily',
                    'reset_on_complete': True
                })
            },
            {
                'title': 'Survivor Arena: Slayer',
                'description': 'Kill 1000 enemies total',
                'quest_type': 'achievement',
                'target_value': 1000,
                'xp_reward': 50,
                'reward_coins': 10,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': game_id,
                    'type': 'total_kills',
                    'category': 'combat',
                    'reset_period': 'daily',
                    'reset_on_complete': True
                })
            },
            {
                'title': 'Survivor Arena: Endurance',
                'description': 'Survive 10 minutes total',
                'quest_type': 'achievement',
                'target_value': 600,  # 600 seconds = 10 minutes
                'xp_reward': 25,
                'reward_coins': 10,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': game_id,
                    'type': 'total_time_survived',
                    'category': 'survival',
                    'reset_period': 'daily',
                    'reset_on_complete': True
                })
            }
        ]
        
        added_count = 0
        updated_count = 0
        
        for quest_data in quests:
            existing_quest = db.query(Quest).filter(
                Quest.title == quest_data['title']
            ).first()
            
            if existing_quest:
                print(f"⚠️  Quest '{quest_data['title']}' exists - updating...")
                for key, value in quest_data.items():
                    if key != 'created_at':
                        setattr(existing_quest, key, value)
                updated_count += 1
            else:
                new_quest = Quest(**quest_data)
                db.add(new_quest)
                print(f"✅ Added: {quest_data['title']}")
                added_count += 1
        
        db.commit()
        
        print()
        print(f"✅ Quests setup complete: {added_count} added, {updated_count} updated")
        
        # ============================================
        # SUMMARY
        # ============================================
        print()
        print("=" * 70)
        print("✅ SURVIVOR ARENA SETUP COMPLETE!")
        print("=" * 70)
        print()
        print("📊 Summary:")
        print(f"   Game ID: {game_id}")
        print(f"   Title: Survivor Arena")
        print(f"   Category: action")
        print(f"   Entry Point: index.html")
        print(f"   STEEM Rewards: Enabled")
        print()
        print("⚡ XP Rules: 6 rules configured")
        print("   - Survival Score: 0.05 XP per point (max 50)")
        print("   - Kill Count: 0.1 XP per kill (max 30)")
        print("   - Time Survived: 0.1 XP per second (max 20)")
        print("   - Level Milestones: up to 20 XP")
        print("   - New High Score: 5 XP bonus")
        print("   - Completion: 2 XP")
        print()
        print("🎯 Daily Quests: 3 quests")
        print("   - Daily Survivor (5 games)")
        print("   - Slayer (100 kills)")
        print("   - Endurance (5 minutes)")
        print()
        print("🎮 Game ready at: /games/survivor-arena/index.html")
        print()
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    setup_survivor_arena()
