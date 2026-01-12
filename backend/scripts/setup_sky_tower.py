"""
Complete setup for Sky Tower game
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

def setup_sky_tower():
    """Complete setup for Sky Tower game"""
    
    db = SessionLocal()
    game_id = 'sky-tower'
    
    try:
        print()
        print("=" * 70)
        print("  🏗️ SKY TOWER - COMPLETE SETUP")
        print("=" * 70)
        print()
        
        # ============================================
        # 1. ADD GAME TO DATABASE
        # ============================================
        print("📦 Step 1: Adding game to database...")
        
        existing_game = db.query(Game).filter(Game.game_id == game_id).first()
        
        if existing_game:
            print(f"⚠️  Game '{game_id}' already exists - updating...")
            existing_game.title = "Sky Tower"
            existing_game.description = "Build the highest tower you can! Stack blocks perfectly to reach the sky. Perfect alignment keeps blocks full size and earns combo bonuses."
            existing_game.version = "1.0.0"
            existing_game.thumbnail = "thumbnail.png"
            existing_game.entry_point = "index.html"
            existing_game.category = "arcade"
            existing_game.tags = '["arcade", "skill", "3d", "casual", "stacking"]'
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
                title='Sky Tower',
                description='Build the highest tower you can! Stack blocks perfectly to reach the sky. Perfect alignment keeps blocks full size and earns combo bonuses.',
                author='GamePlatform Team',
                version='1.0.0',
                thumbnail='thumbnail.png',
                entry_point='index.html',
                category='arcade',
                tags='["arcade", "skill", "3d", "casual", "stacking"]',
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
            # Rule 1: Base height multiplier
            create_xp_rule(
                game_id=game_id,
                rule_name="Tower Height",
                rule_type="score_multiplier",
                parameters={
                    "multiplier": 0.11,
                    "max_xp": 11.0
                },
                priority=10
            )
            print("   ✅ Tower Height (0.11 XP per level, max 11)")
            
            # Rule 2: Perfect stacks bonus
            create_xp_rule(
                game_id=game_id,
                rule_name="Perfect Stacks Bonus",
                rule_type="perfect_bonus",
                parameters={
                    "xp_per_perfect": 0.22,
                    "max_xp": 6.0
                },
                priority=12
            )
            print("   ✅ Perfect Stacks (0.22 XP per perfect, max 6)")
            
            # Rule 3: Height milestones
            create_xp_rule(
                game_id=game_id,
                rule_name="Height Milestones",
                rule_type="threshold",
                parameters={
                    "thresholds": [
                        {"score": 50, "xp": 11},
                        {"score": 30, "xp": 6},
                        {"score": 20, "xp": 4},
                        {"score": 10, "xp": 2},
                        {"score": 5, "xp": 1}
                    ]
                },
                priority=15
            )
            print("   ✅ Milestones (5→1, 10→2, 20→4, 30→6, 50→11 XP)")
            
            # Rule 4: New record bonus
            create_xp_rule(
                game_id=game_id,
                rule_name="New Record Bonus",
                rule_type="high_score_bonus",
                parameters={
                    "bonus_xp": 1.0
                },
                priority=14
            )
            print("   ✅ New Record (1 XP)")
            
            # Rule 5: Combo bonus
            create_xp_rule(
                game_id=game_id,
                rule_name="Combo Streak",
                rule_type="combo_bonus",
                parameters={
                    "xp_per_combo": 0.06,
                    "min_combo": 3,
                    "max_xp": 3.0
                },
                priority=11
            )
            print("   ✅ Combo Streak (0.06 XP per combo level, min 3, max 3)")
            
            # Rule 6: Completion bonus
            create_xp_rule(
                game_id=game_id,
                rule_name="Game Completion",
                rule_type="completion",
                parameters={
                    "base_xp": 0.7
                },
                priority=5
            )
            print("   ✅ Completion (0.7 XP)")
            
            print("✅ All XP rules created")
        
        # ============================================
        # 3. CREATE 3 DAILY QUESTS
        # ============================================
        print()
        print("🎯 Step 3: Creating daily quests...")
        
        now = datetime.now().isoformat()
        
        quests = [
            {
                'title': 'Sky Tower: Daily Builder',
                'description': 'Play 5 games',
                'quest_type': 'play_games',
                'target_value': 5,
                'xp_reward': 60,
                'reward_coins': 15,
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
                'title': 'Sky Tower: Perfect Architect',
                'description': 'Stack 15 perfect blocks in a single game',
                'quest_type': 'achievement',
                'target_value': 15,
                'xp_reward': 150,
                'reward_coins': 35,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': game_id,
                    'type': 'perfect_stacks_in_game',
                    'category': 'skill',
                    'reset_period': 'daily'
                })
            },
            {
                'title': 'Sky Tower: Combo Master',
                'description': 'Achieve a combo of 10 in a single game',
                'quest_type': 'achievement',
                'target_value': 10,
                'xp_reward': 130,
                'reward_coins': 30,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': game_id,
                    'type': 'max_combo_in_game',
                    'category': 'skill',
                    'reset_period': 'daily'
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
        print("✅ SKY TOWER SETUP COMPLETE!")
        print("=" * 70)
        print()
        print("📊 Summary:")
        print(f"   Game ID: {game_id}")
        print(f"   Title: Sky Tower")
        print(f"   Category: arcade")
        print(f"   Entry Point: index.html")
        print(f"   STEEM Rewards: Enabled")
        print()
        print("⚡ XP Rules: 6 rules configured")
        print("   - Tower Height: 3 XP per level")
        print("   - Perfect Stacks: 5 XP per perfect")
        print("   - Height Milestones: up to 400 XP")
        print("   - New Record: 30 XP bonus")
        print("   - Combo Streak: 2 XP per combo")
        print("   - Completion: 15 XP")
        print()
        print("🎯 Daily Quests: 3 quests")
        print("   - Daily Builder (5 games)")
        print("   - Reach the Clouds (15 blocks)")
        print("   - Perfect Architect (5 perfect stacks)")
        print()
        print("🎮 Game ready at: /games/sky-tower/index.html")
        print()
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    setup_sky_tower()
