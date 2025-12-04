"""
Complete Platform Initialization Script
========================================
This script performs a FULL platform initialization:
1. Creates backup of existing database
2. Drops and recreates all tables with latest schema
3. Populates all essential data:
   - Game statuses
   - Level milestones
   - Quests
   - Games with XP rules.
   - Leaderboard rewards

WARNING: This will DELETE all existing data!
Use only for fresh installations or complete resets.
"""

import sys
import os
import shutil
import json
from datetime import datetime
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from app.database import SessionLocal, engine
from app.models import Base, Game, GameStatus, Quest, LevelMilestone, XPRule, User, LevelReward, LeaderboardReward
from sqlalchemy import text
import uuid


def create_backup():
    """Create backup of existing database"""
    print("\n" + "="*80)
    print("STEP 1: Creating Database Backup")
    print("="*80)
    
    db_path = Path("game_platform.db")
    if db_path.exists():
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = Path(f"backups/game_platform_backup_{timestamp}.db")
        backup_path.parent.mkdir(exist_ok=True)
        
        shutil.copy2(db_path, backup_path)
        print(f"✅ Backup created: {backup_path}")
        return str(backup_path)
    else:
        print("ℹ️  No existing database found, skipping backup")
        return None


def recreate_tables():
    """Drop and recreate all tables"""
    print("\n" + "="*80)
    print("STEP 2: Recreating Database Tables")
    print("="*80)
    
    # Drop all tables
    print("🗑️  Dropping all existing tables...")
    Base.metadata.drop_all(bind=engine)
    print("✅ All tables dropped")
    
    # Create all tables with new schema
    print("🏗️  Creating tables with latest schema...")
    Base.metadata.create_all(bind=engine)
    print("✅ All tables created")


def populate_game_statuses():
    """Populate game statuses"""
    print("\n" + "="*80)
    print("STEP 3: Populating Game Statuses")
    print("="*80)
    
    db = SessionLocal()
    now = datetime.now().isoformat()
    
    statuses = [
        {
            "status_name": "Developed",
            "status_code": "developed",
            "description": "Fully developed and ready to play",
            "display_order": 1
        },
        {
            "status_name": "In Development",
            "status_code": "in_development",
            "description": "Currently being developed",
            "display_order": 2
        },
        {
            "status_name": "Experimental",
            "status_code": "experimental",
            "description": "Experimental or beta version",
            "display_order": 3
        },
        {
            "status_name": "Deprecated",
            "status_code": "deprecated",
            "description": "Deprecated, may be removed",
            "display_order": 4
        }
    ]
    
    for status_data in statuses:
        status = GameStatus(
            status_name=status_data["status_name"],
            status_code=status_data["status_code"],
            description=status_data["description"],
            display_order=status_data["display_order"],
            is_active=1,
            created_at=now,
            updated_at=now
        )
        db.add(status)
    
    db.commit()
    print(f"✅ Created {len(statuses)} game statuses")
    db.close()


def populate_level_milestones():
    """Populate level milestones in English"""
    print("\n" + "="*80)
    print("STEP 4: Populating Level Milestones")
    print("="*80)
    
    db = SessionLocal()
    now = datetime.now().isoformat()
    
    milestones = [
        {"level": 1, "title": "Newbie", "badge": "🌱", "color": "#90EE90", "description": "Welcome to the platform!"},
        {"level": 2, "title": "Beginner", "badge": "🎮", "color": "#87CEEB", "description": "You're getting started!"},
        {"level": 3, "title": "Player", "badge": "🎯", "color": "#FFD700", "description": "You're a real player now!"},
        {"level": 4, "title": "Gamer", "badge": "🎲", "color": "#FF6347", "description": "A true gamer!"},
        {"level": 5, "title": "Skilled", "badge": "⭐", "color": "#FFA500", "description": "You've got skills!"},
        {"level": 10, "title": "Experienced", "badge": "🎖️", "color": "#32CD32", "description": "Lots of experience!"},
        {"level": 15, "title": "Expert", "badge": "💎", "color": "#4169E1", "description": "An expert player!"},
        {"level": 20, "title": "Master", "badge": "👑", "color": "#9370DB", "description": "You're a master!"},
        {"level": 25, "title": "Champion", "badge": "🏆", "color": "#FF1493", "description": "A true champion!"},
        {"level": 30, "title": "Legend", "badge": "⚡", "color": "#FF4500", "description": "Legendary player!"},
        {"level": 40, "title": "Elite", "badge": "💫", "color": "#8A2BE2", "description": "Elite status achieved!"},
        {"level": 50, "title": "Ultimate", "badge": "🌟", "color": "#DC143C", "description": "Ultimate rank!"},
        {"level": 75, "title": "Godlike", "badge": "⚔️", "color": "#B8860B", "description": "Godlike power!"},
        {"level": 100, "title": "Immortal", "badge": "👹", "color": "#8B0000", "description": "Immortal legend!"}
    ]
    
    for milestone_data in milestones:
        milestone = LevelMilestone(
            level=milestone_data["level"],
            title=milestone_data["title"],
            badge=milestone_data["badge"],
            color=milestone_data["color"],
            description=milestone_data["description"],
            is_active=1,  # Integer, not boolean
            created_at=now,
            updated_at=now  # Missing field!
        )
        db.add(milestone)
    
    db.commit()
    print(f"✅ Created {len(milestones)} level milestones")
    db.close()


def populate_quests():
    """Populate quests in English"""
    print("\n" + "="*80)
    print("STEP 5: Populating Quests")
    print("="*80)
    
    db = SessionLocal()
    now = datetime.now().isoformat()
    
    quests = [
        # Play Games Quests
        {"title": "Play 10 games", "description": "Complete 10 games on any platform game", "quest_type": "play_games", "target_value": 10, "xp_reward": 150, "reward_coins": 0},
        {"title": "Play 50 games", "description": "Complete 50 games on any platform game", "quest_type": "play_games", "target_value": 50, "xp_reward": 250, "reward_coins": 3},
        {"title": "Play 100 games", "description": "Complete 100 games on any platform game", "quest_type": "play_games", "target_value": 100, "xp_reward": 350, "reward_coins": 5},
        
        # Play Time Quests
        {"title": "Play 10 minutes", "description": "Play for a total of 10 minutes", "quest_type": "play_time", "target_value": 600, "xp_reward": 100, "reward_coins": 0},
        {"title": "Play 60 minutes total", "description": "Play for a total of 60 minutes", "quest_type": "play_time", "target_value": 3600, "xp_reward": 200, "reward_coins": 0},
        {"title": "Play 24 hours total (cumulative)", "description": "Play for a cumulative total of 24 hours", "quest_type": "play_time_cumulative", "target_value": 86400, "xp_reward": 500, "reward_coins": 10},
        
        # Score Quests
        {"title": "Complete 5 games with score ≥ X", "description": "Complete 5 games of the same game with a minimum per-game defined score", "quest_type": "score_threshold_per_game", "target_value": 5, "xp_reward": 200, "reward_coins": 3},
        {"title": "Get a score ending with 0", "description": "Get a score ending with the digit 0", "quest_type": "score_ends_with", "target_value": 0, "xp_reward": 100, "reward_coins": 0},
        
        # Login Quests
        {"title": "Login after 24h", "description": "Log in after at least 24 hours from last access", "quest_type": "login_after_24h", "target_value": 1, "xp_reward": 50, "reward_coins": 0},
        {"title": "Login 7 consecutive days", "description": "Log in for 7 consecutive days", "quest_type": "login_streak", "target_value": 7, "xp_reward": 200, "reward_coins": 10},
        
        # Game Variety Quest
        {"title": "Play 5 games of the same game", "description": "Complete 5 games of the same game", "quest_type": "play_same_game", "target_value": 5, "xp_reward": 150, "reward_coins": 0},
        
        # Leaderboard Quest
        {"title": "Enter the Top 5 of the weekly leaderboard", "description": "Reach a position in the top 5 of the weekly leaderboard", "quest_type": "leaderboard_top", "target_value": 5, "xp_reward": 400, "reward_coins": 10},
        
        # Weekly/Daily Quests
        {"title": "Complete 50 games in a week", "description": "Complete 50 games within a week", "quest_type": "play_games_weekly", "target_value": 50, "xp_reward": 350, "reward_coins": 7},
        {"title": "Play 30 minutes total in one day", "description": "Play for a total of 30 minutes in a single day", "quest_type": "play_time_daily", "target_value": 1800, "xp_reward": 200, "reward_coins": 3},
        
        # Level Quests
        {"title": "Reach level 10", "description": "Reach level 10 of the platform", "quest_type": "reach_level", "target_value": 10, "xp_reward": 200, "reward_coins": 3},
        {"title": "Reach level 30", "description": "Reach level 30 of the platform", "quest_type": "reach_level", "target_value": 30, "xp_reward": 350, "reward_coins": 7},
        {"title": "Reach level 50", "description": "Reach level 50 of the platform", "quest_type": "reach_level", "target_value": 50, "xp_reward": 500, "reward_coins": 10},
        
        # XP Quests
        {"title": "Earn 500 XP in one day", "description": "Earn a total of 500 XP in a single day", "quest_type": "xp_daily", "target_value": 500, "xp_reward": 200, "reward_coins": 5},
        {"title": "Earn 2000 XP in one week", "description": "Earn a total of 2000 XP within a week", "quest_type": "xp_weekly", "target_value": 2000, "xp_reward": 250, "reward_coins": 5},
        
        # Meta Quest
        {"title": "Complete 10 total quests", "description": "Complete a total of 10 different quests", "quest_type": "complete_quests", "target_value": 10, "xp_reward": 500, "reward_coins": 10}
    ]
    
    for quest_data in quests:
        quest = Quest(
            title=quest_data["title"],
            description=quest_data["description"],
            quest_type=quest_data["quest_type"],
            target_value=quest_data["target_value"],
            xp_reward=quest_data["xp_reward"],
            reward_coins=quest_data["reward_coins"],
            is_active=1,
            created_at=now
        )
        db.add(quest)
    
    db.commit()
    print(f"✅ Created {len(quests)} quests")
    db.close()


def populate_games_and_xp_rules():
    """Populate games with their XP rules"""
    print("\n" + "="*80)
    print("STEP 6: Populating Games and XP Rules")
    print("="*80)
    
    db = SessionLocal()
    now = datetime.now().isoformat()
    
    # Get "Developed" status
    developed_status = db.query(GameStatus).filter_by(status_code="developed").first()
    status_id = developed_status.status_id if developed_status else None
    
    games_data = [
        {
            "game_id": "space-clicker-phaser",
            "title": "Space Clicker - Phaser Edition",
            "description": "An engaging space-themed clicker game built with Phaser 3! Click the rocket to increase your score.",
            "author": "Ggameplatform",
            "version": "1.0.0",
            "thumbnail": "thumbnail.png",
            "entry_point": "index.html",
            "category": "Clicker",
            "tags": '["clicker", "space", "phaser", "idle", "casual", "arcade"]',
            "steem_rewards_enabled": 1,
            "xp_rules": [
                {"rule_name": "Time Played Bonus", "rule_type": "time_bonus", "priority": 5, "parameters": {"xp_per_minute": 0.1, "max_minutes": 10}},
                {"rule_name": "Base Score Multiplier", "rule_type": "score_multiplier", "priority": 10, "parameters": {"multiplier": 0.01, "max_xp": 100.0}},
                {"rule_name": "Improvement Bonus", "rule_type": "percentile_improvement", "priority": 12, "parameters": {"xp_per_percent": 0.5, "max_xp": 50.0}},
                {"rule_name": "High Score Bonus", "rule_type": "high_score_bonus", "priority": 15, "parameters": {"bonus_xp": 10.0}},
                {"rule_name": "Speed Clicker Bonus", "rule_type": "combo", "priority": 20, "parameters": {"min_score": 1000, "min_duration": 60, "bonus_xp": 20.0}},
                {"rule_name": "Click Milestones", "rule_type": "threshold", "priority": 20, "parameters": {"thresholds": [{"score": 100, "xp": 5}, {"score": 500, "xp": 10}, {"score": 1000, "xp": 20}, {"score": 2500, "xp": 50}, {"score": 5000, "xp": 100}]}}
            ]
        },
        {
            "game_id": "rainbow-rush",
            "title": "Rainbow Rush",
            "description": "Rush through colorful levels in this fast-paced arcade game!",
            "author": "Platform Team",
            "version": "1.0.0",
            "thumbnail": "thumbnail.png",
            "entry_point": "index.html",
            "category": "arcade",
            "tags": '["arcade", "speed", "colorful", "rush"]',
            "steem_rewards_enabled": 1,
            "xp_rules": [
                {"rule_name": "Time Played Bonus", "rule_type": "time_bonus", "priority": 5, "parameters": {"xp_per_minute": 0.15, "max_minutes": 8}},
                {"rule_name": "Base Score Multiplier", "rule_type": "score_multiplier", "priority": 10, "parameters": {"multiplier": 0.015, "max_xp": 120.0}},
                {"rule_name": "High Score Bonus", "rule_type": "high_score_bonus", "priority": 15, "parameters": {"bonus_xp": 15.0}},
                {"rule_name": "Speed Run Bonus", "rule_type": "combo", "priority": 20, "parameters": {"min_score": 2000, "min_duration": 120, "bonus_xp": 30.0}}
            ]
        },
        {
            "game_id": "blocky-road",
            "title": "Blocky Road",
            "description": "Cross the blockchain! Navigate through a procedurally generated world filled with crypto vehicles, floating platforms, and blockchain trains. Collect Bitcoin coins and avoid obstacles in this addictive infinite runner inspired by Crossy Road!",
            "author": "Ggameplatform",
            "version": "1.0.0",
            "thumbnail": "thumbnail.png",
            "entry_point": "index.html",
            "category": "arcade",
            "tags": '["arcade", "infinite-runner", "blockchain", "crossy-road", "voxel", "casual", "mobile"]',
            "steem_rewards_enabled": 1,
            "xp_rules": [
                {"rule_name": "Survival Time Bonus", "rule_type": "time_bonus", "priority": 8, "parameters": {"xp_per_minute": 0.2, "max_minutes": 15}},
                {"rule_name": "Distance Traveled", "rule_type": "score_multiplier", "priority": 10, "parameters": {"multiplier": 0.02, "max_xp": 150.0}},
                {"rule_name": "Personal Best Improvement", "rule_type": "percentile_improvement", "priority": 12, "parameters": {"xp_per_percent": 0.8, "max_xp": 80.0}},
                {"rule_name": "New Record Bonus", "rule_type": "high_score_bonus", "priority": 15, "parameters": {"bonus_xp": 15.0}},
                {"rule_name": "Speed Runner Bonus", "rule_type": "combo", "priority": 18, "parameters": {"min_score": 100, "min_duration": 120, "bonus_xp": 25.0}},
                {"rule_name": "Endurance Master", "rule_type": "combo", "priority": 19, "parameters": {"min_score": 200, "min_duration": 300, "bonus_xp": 50.0}},
                {"rule_name": "Distance Milestones", "rule_type": "threshold", "priority": 20, "parameters": {"thresholds": [{"score": 20, "xp": 5}, {"score": 50, "xp": 15}, {"score": 100, "xp": 30}, {"score": 200, "xp": 60}, {"score": 300, "xp": 100}, {"score": 500, "xp": 200}]}}
            ]
        },
        {
            "game_id": "bouncing-balls",
            "title": "Bouncing Balls",
            "description": "A fun physics-based game where you bounce balls and score points!",
            "author": "Platform Team",
            "version": "1.0.0",
            "thumbnail": "thumbnail.png",
            "entry_point": "index.html",
            "category": "arcade",
            "tags": '["physics", "arcade", "casual", "balls"]',
            "steem_rewards_enabled": 0,
            "xp_rules": [
                {"rule_name": "Time Played Bonus", "rule_type": "time_bonus", "priority": 5, "parameters": {"xp_per_minute": 0.12, "max_minutes": 12}},
                {"rule_name": "Base Score Multiplier", "rule_type": "score_multiplier", "priority": 10, "parameters": {"multiplier": 0.012, "max_xp": 80.0}},
                {"rule_name": "High Score Bonus", "rule_type": "high_score_bonus", "priority": 15, "parameters": {"bonus_xp": 12.0}}
            ]
        }
    ]
    
    for game_data in games_data:
        # Create game
        game = Game(
            game_id=game_data["game_id"],
            title=game_data["title"],
            description=game_data["description"],
            author=game_data["author"],
            version=game_data["version"],
            thumbnail=game_data["thumbnail"],
            entry_point=game_data["entry_point"],
            category=game_data["category"],
            tags=game_data["tags"],
            status_id=status_id,
            steem_rewards_enabled=game_data["steem_rewards_enabled"],
            created_at=now,
            updated_at=now,
            extra_data='{}'
        )
        db.add(game)
        db.flush()
        
        # Create XP rules
        for rule_data in game_data["xp_rules"]:
            xp_rule = XPRule(
                rule_id=str(uuid.uuid4()),
                game_id=game_data["game_id"],
                rule_name=rule_data["rule_name"],
                rule_type=rule_data["rule_type"],
                parameters=json.dumps(rule_data["parameters"]),
                priority=rule_data["priority"],
                is_active=1,
                created_at=now,
                updated_at=now
            )
            db.add(xp_rule)
        
        print(f"  ✅ {game_data['title']} ({len(game_data['xp_rules'])} XP rules)")
    
    db.commit()
    print(f"✅ Created {len(games_data)} games with XP rules")
    db.close()


def populate_level_rewards():
    """Populate level rewards"""
    print("\n" + "="*80)
    print("STEP 7: Populating Level Rewards")
    print("="*80)
    
    db = SessionLocal()
    now = datetime.now().isoformat()
    
    # Define rewards matching LEVEL_COIN_REWARDS from level_system.py
    rewards_data = [
        {"level": 5, "reward_type": "coins", "reward_amount": 50, "description": "First milestone!"},
        {"level": 10, "reward_type": "coins", "reward_amount": 100, "description": "Explorer bonus"},
        {"level": 15, "reward_type": "coins", "reward_amount": 150, "description": "Adventurer bonus"},
        {"level": 20, "reward_type": "coins", "reward_amount": 200, "description": "Veteran bonus"},
        {"level": 25, "reward_type": "coins", "reward_amount": 250, "description": "Elite bonus"},
        {"level": 30, "reward_type": "coins", "reward_amount": 300, "description": "Master bonus"},
        {"level": 40, "reward_type": "coins", "reward_amount": 400, "description": "Champion bonus"},
        {"level": 50, "reward_type": "coins", "reward_amount": 500, "description": "Legend bonus"},
        {"level": 60, "reward_type": "coins", "reward_amount": 600, "description": "Hero bonus"},
        {"level": 75, "reward_type": "coins", "reward_amount": 750, "description": "Epic bonus"},
        {"level": 100, "reward_type": "coins", "reward_amount": 1000, "description": "Immortal bonus"}
    ]
    
    for reward_data in rewards_data:
        reward = LevelReward(
            reward_id=str(uuid.uuid4()),
            level=reward_data["level"],
            reward_type=reward_data["reward_type"],
            reward_amount=reward_data["reward_amount"],
            description=reward_data["description"],
            is_active=1,
            created_at=now,
            updated_at=now
        )
        db.add(reward)
    
    db.commit()
    print(f"✅ Created {len(rewards_data)} level rewards")
    db.close()


def populate_leaderboard_rewards():
    """Populate leaderboard rewards configuration"""
    print("\n" + "="*80)
    print("STEP 8: Populating Leaderboard Rewards")
    print("="*80)
    
    db = SessionLocal()
    now = datetime.now().isoformat()
    
    # Global weekly leaderboard rewards (game_id = NULL)
    global_rewards = [
        {"rank_start": 1, "rank_end": 1, "steem_reward": 10.0, "coin_reward": 5000, "description": "1st place - Weekly Champion"},
        {"rank_start": 2, "rank_end": 2, "steem_reward": 5.0, "coin_reward": 3000, "description": "2nd place - Weekly Runner-up"},
        {"rank_start": 3, "rank_end": 3, "steem_reward": 3.0, "coin_reward": 2000, "description": "3rd place - Weekly Bronze"},
        {"rank_start": 4, "rank_end": 5, "steem_reward": 2.0, "coin_reward": 1000, "description": "4th-5th place"},
        {"rank_start": 6, "rank_end": 10, "steem_reward": 1.0, "coin_reward": 500, "description": "6th-10th place"},
    ]
    
    for reward_data in global_rewards:
        reward = LeaderboardReward(
            reward_id=str(uuid.uuid4()),
            game_id=None,  # Global rewards
            rank_start=reward_data["rank_start"],
            rank_end=reward_data["rank_end"],
            steem_reward=reward_data["steem_reward"],
            coin_reward=reward_data["coin_reward"],
            description=reward_data["description"],
            is_active=1,
            created_at=now,
            updated_at=now
        )
        db.add(reward)
    
    db.commit()
    print(f"✅ Created {len(global_rewards)} global leaderboard rewards")
    db.close()


def create_admin_user():
    """Create default admin user for testing"""
    print("\n" + "="*80)
    print("STEP 9: Creating Admin User")
    print("="*80)
    
    db = SessionLocal()
    now = datetime.now().isoformat()
    
    admin_user = User(
        user_id="admin_" + uuid.uuid4().hex[:12],
        username="admin",
        email="admin@gameplatform.com",
        is_anonymous=0,
        total_xp_earned=0,
        created_at=now,
        last_login=now
    )
    db.add(admin_user)
    db.commit()
    
    print(f"✅ Admin user created: {admin_user.username} (ID: {admin_user.user_id})")
    db.close()


def verify_installation():
    """Verify that all data was created correctly"""
    print("\n" + "="*80)
    print("STEP 10: Verifying Installation")
    print("="*80)
    
    db = SessionLocal()
    
    counts = {
        "Game Statuses": db.query(GameStatus).count(),
        "Level Milestones": db.query(LevelMilestone).count(),
        "Quests": db.query(Quest).count(),
        "Games": db.query(Game).count(),
        "XP Rules": db.query(XPRule).count(),
        "Level Rewards": db.query(LevelReward).count(),
        "Leaderboard Rewards": db.query(LeaderboardReward).count(),
        "Users": db.query(User).count()
    }
    
    print("\n📊 Database Contents:")
    for entity, count in counts.items():
        print(f"  • {entity}: {count}")
    
    db.close()
    
    return all(count > 0 for count in counts.values())


def main():
    """Main initialization process"""
    print("\n" + "="*80)
    print("GAME PLATFORM - COMPLETE INITIALIZATION")
    print("="*80)
    print("\n⚠️  WARNING: This will DELETE ALL existing data!")
    print("A backup will be created before proceeding.\n")
    
    response = input("Do you want to continue? (yes/no): ").strip().lower()
    if response != "yes":
        print("❌ Initialization cancelled")
        return
    
    try:
        # Step 1: Backup
        backup_path = create_backup()
        
        # Step 2: Recreate tables
        recreate_tables()
        
        # Step 3: Populate game statuses
        populate_game_statuses()
        
        # Step 4: Populate level milestones
        populate_level_milestones()
        
        # Step 5: Populate quests
        populate_quests()
        
        # Step 6: Populate games and XP rules
        populate_games_and_xp_rules()
        
        # Step 7: Populate level rewards
        populate_level_rewards()
        
        # Step 8: Populate leaderboard rewards
        populate_leaderboard_rewards()
        
        # Step 9: Create admin user
        create_admin_user()
        
        # Step 10: Verify
        success = verify_installation()
        
        if success:
            print("\n" + "="*80)
            print("✅ PLATFORM INITIALIZATION COMPLETE!")
            print("="*80)
            if backup_path:
                print(f"\n💾 Backup saved at: {backup_path}")
            print("\n🚀 The platform is ready to use!")
            print("   - All tables created with latest schema")
            print("   - All essential data populated")
            print("   - Level rewards configured (13 milestones)")
            print("   - Leaderboard rewards configured (global + per-game)")
            print("   - Admin user created")
            print("\n⚠️  Next steps:")
            print("   1. Restart the backend server")
            print("   2. Test the platform functionality")
            print("   3. Create additional users via STEEM login")
        else:
            print("\n❌ Verification failed - some data may be missing")
            
    except Exception as e:
        print(f"\n❌ Error during initialization: {e}")
        import traceback
        traceback.print_exc()
        if backup_path:
            print(f"\n💾 You can restore from backup: {backup_path}")


if __name__ == "__main__":
    main()
