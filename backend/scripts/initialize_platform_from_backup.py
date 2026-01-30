#!/usr/bin/env python3
"""
Initialize Platform from Backup Script

Ripulisce completamente il database e lo reinizializza con le configurazioni
da un file di backup.

⚠️  ATTENZIONE: Questo script ELIMINA TUTTI I DATI dal database!

Tabelle che vengono ripulite e reinizializzate:
- game_statuses (Stati giochi)
- games (Giochi)
- quests (Quest)
- xp_rules (Regole XP)
- level_milestones (Livelli)
- level_rewards (Ricompense livello)
- leaderboard_rewards (Premi leaderboard)
- daily_login_reward_config (Configurazione daily reward)

Tabelle utente che vengono ELIMINATE:
- users
- game_sessions
- leaderboards
- user_quests
- user_coins
- coin_transactions
- weekly_leaderboards
- weekly_winners
- user_login_streak
- admin_users

Usage:
    python initialize_platform_from_backup.py <backup_file.json> [--force]
    
Options:
    --force     Salta la richiesta di conferma
"""

import sys
import os
import json
import bcrypt
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.models import (
    Base, Game, GameStatus, Quest, XPRule,
    LevelMilestone, LevelReward, LeaderboardReward,
    DailyLoginRewardConfig, User, GameSession, Leaderboard,
    UserQuest, UserCoins, CoinTransaction, WeeklyLeaderboard,
    WeeklyWinner, UserLoginStreak, AdminUser, PlatformConfig
)

# Database path (backend/data/game_platform.db)
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "game_platform.db")


def clear_all_tables(session):
    """Clear all tables in the correct order (respecting foreign keys)."""
    
    print("\n🗑️  Pulizia tabelle...")
    
    # Order matters! Delete tables with foreign keys first
    tables_to_clear = [
        # User data tables (depend on users/games)
        ("coin_transactions", CoinTransaction),
        ("user_coins", UserCoins),
        ("user_quests", UserQuest),
        ("weekly_winners", WeeklyWinner),
        ("weekly_leaderboards", WeeklyLeaderboard),
        ("user_login_streak", UserLoginStreak),
        ("leaderboards", Leaderboard),
        ("game_sessions", GameSession),
        
        # Configuration tables (depend on games/levels)
        ("xp_rules", XPRule),
        ("leaderboard_rewards", LeaderboardReward),
        ("level_rewards", LevelReward),
        
        # Base tables
        ("quests", Quest),
        ("level_milestones", LevelMilestone),
        ("games", Game),
        ("game_statuses", GameStatus),
        ("daily_login_reward_config", DailyLoginRewardConfig),
        ("platform_config", PlatformConfig),
        ("users", User),
        ("admin_users", AdminUser),
    ]
    
    for table_name, model in tables_to_clear:
        try:
            count = session.query(model).count()
            session.query(model).delete()
            print(f"   ✅ {table_name}: {count} records eliminati")
        except Exception as e:
            print(f"   ⚠️  {table_name}: {e}")
    
    session.commit()
    print("\n   ✅ Tutte le tabelle sono state pulite")


def insert_game_statuses(session, data: list):
    """Insert game statuses."""
    print(f"\n📥 Inserimento game_statuses ({len(data)} records)...")
    
    for item in data:
        status = GameStatus(
            status_id=item.get("status_id"),
            status_name=item["status_name"],
            status_code=item["status_code"],
            description=item.get("description"),
            display_order=item.get("display_order", 0),
            is_active=1 if item.get("is_active", True) else 0,
            created_at=item.get("created_at", datetime.now().isoformat()),
            updated_at=item.get("updated_at", datetime.now().isoformat())
        )
        session.add(status)
    
    session.commit()
    print(f"   ✅ {len(data)} stati gioco inseriti")


def insert_games(session, data: list):
    """Insert games."""
    print(f"\n📥 Inserimento games ({len(data)} records)...")
    
    for item in data:
        # Handle tags - convert list to JSON string if needed
        tags = item.get("tags", [])
        if isinstance(tags, list):
            tags = json.dumps(tags)
        
        # Handle metadata/extra_data
        metadata = item.get("metadata", item.get("extra_data", {}))
        if isinstance(metadata, dict):
            metadata = json.dumps(metadata)
        
        game = Game(
            game_id=item["game_id"],
            title=item["title"],
            description=item.get("description", ""),
            author=item.get("author", ""),
            version=item.get("version", "1.0.0"),
            thumbnail=item.get("thumbnail", ""),
            entry_point=item["entry_point"],
            category=item.get("category", "uncategorized"),
            tags=tags,
            status_id=item.get("status_id"),
            steem_rewards_enabled=1 if item.get("steem_rewards_enabled", False) else 0,
            created_at=item.get("created_at", datetime.now().isoformat()),
            updated_at=item.get("updated_at", datetime.now().isoformat()),
            extra_data=metadata
        )
        session.add(game)
    
    session.commit()
    print(f"   ✅ {len(data)} giochi inseriti")


def insert_quests(session, data: list):
    """Insert quests."""
    print(f"\n📥 Inserimento quests ({len(data)} records)...")
    
    for item in data:
        # Handle config
        config = item.get("config", {})
        if isinstance(config, dict):
            config = json.dumps(config)
        
        quest = Quest(
            quest_id=item.get("quest_id"),
            title=item["title"],
            description=item.get("description"),
            quest_type=item["quest_type"],
            target_value=item["target_value"],
            xp_reward=item["xp_reward"],
            reward_coins=item.get("reward_coins", item.get("sats_reward", 0)),
            is_active=1 if item.get("is_active", True) else 0,
            created_at=item.get("created_at", datetime.now().isoformat()),
            config=config
        )
        session.add(quest)
    
    session.commit()
    print(f"   ✅ {len(data)} quest inserite")


def insert_xp_rules(session, data: list):
    """Insert XP rules."""
    print(f"\n📥 Inserimento xp_rules ({len(data)} records)...")
    
    for item in data:
        # Handle parameters
        parameters = item.get("parameters", {})
        if isinstance(parameters, dict):
            parameters = json.dumps(parameters)
        
        rule = XPRule(
            rule_id=item["rule_id"],
            game_id=item["game_id"],
            rule_name=item["rule_name"],
            rule_type=item["rule_type"],
            parameters=parameters,
            priority=item.get("priority", 0),
            is_active=1 if item.get("is_active", True) else 0,
            created_at=item.get("created_at", datetime.now().isoformat()),
            updated_at=item.get("updated_at", datetime.now().isoformat())
        )
        session.add(rule)
    
    session.commit()
    print(f"   ✅ {len(data)} regole XP inserite")


def insert_level_milestones(session, data: list):
    """Insert level milestones."""
    print(f"\n📥 Inserimento level_milestones ({len(data)} records)...")
    
    for item in data:
        milestone = LevelMilestone(
            level=item["level"],
            title=item["title"],
            badge=item["badge"],
            color=item["color"],
            description=item.get("description"),
            is_active=1 if item.get("is_active", True) else 0,
            created_at=item.get("created_at", datetime.now().isoformat()),
            updated_at=item.get("updated_at", datetime.now().isoformat())
        )
        session.add(milestone)
    
    session.commit()
    print(f"   ✅ {len(data)} milestone livello inseriti")


def insert_level_rewards(session, data: list):
    """Insert level rewards."""
    print(f"\n📥 Inserimento level_rewards ({len(data)} records)...")
    
    for item in data:
        reward = LevelReward(
            reward_id=item["reward_id"],
            level=item["level"],
            reward_type=item["reward_type"],
            reward_amount=item["reward_amount"],
            description=item.get("description"),
            is_active=1 if item.get("is_active", True) else 0,
            created_at=item.get("created_at", datetime.now().isoformat()),
            updated_at=item.get("updated_at", datetime.now().isoformat())
        )
        session.add(reward)
    
    session.commit()
    print(f"   ✅ {len(data)} ricompense livello inserite")


def insert_leaderboard_rewards(session, data: list):
    """Insert leaderboard rewards."""
    print(f"\n📥 Inserimento leaderboard_rewards ({len(data)} records)...")
    
    for item in data:
        reward = LeaderboardReward(
            reward_id=item["reward_id"],
            game_id=item.get("game_id"),
            rank_start=item["rank_start"],
            rank_end=item["rank_end"],
            steem_reward=item.get("steem_reward", 0.0),
            coin_reward=item.get("coin_reward", 0),
            description=item.get("description"),
            is_active=1 if item.get("is_active", True) else 0,
            created_at=item.get("created_at", datetime.now().isoformat()),
            updated_at=item.get("updated_at", datetime.now().isoformat())
        )
        session.add(reward)
    
    session.commit()
    print(f"   ✅ {len(data)} premi leaderboard inseriti")


def insert_daily_login_config(session, data: list):
    """Insert daily login reward configuration."""
    print(f"\n📥 Inserimento daily_login_reward_config ({len(data)} records)...")
    
    for item in data:
        config = DailyLoginRewardConfig(
            day=item["day"],
            coins_reward=item["coins_reward"],
            emoji=item.get("emoji", "🪙"),
            is_active=1 if item.get("is_active", True) else 0,
            created_at=item.get("created_at", datetime.now().isoformat()),
            updated_at=item.get("updated_at", datetime.now().isoformat())
        )
        session.add(config)
    
    session.commit()
    print(f"   ✅ {len(data)} configurazioni daily login inserite")


def create_default_admin(session, username: str = "admin", password: str = "admin123"):
    """Create default admin user for DB Viewer access."""
    print(f"\n👤 Creazione admin user di default...")
    
    # Hash password with bcrypt
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    admin = AdminUser(
        username=username,
        password_hash=password_hash,
        email=f"{username}@gameplatform.local",
        is_active=1,
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat()
    )
    session.add(admin)
    session.commit()
    
    print(f"   ✅ Admin user creato!")
    print(f"   📧 Username: {username}")
    print(f"   🔑 Password: {password}")


def set_platform_epoch(session) -> str:
    """Set a new platform epoch to invalidate all existing user sessions."""
    print(f"\n🔄 Impostazione platform epoch...")
    
    epoch = datetime.now().isoformat()
    
    config = PlatformConfig(
        key="platform_epoch",
        value=epoch,
        description="Timestamp of last platform reset. Users with older epoch are logged out.",
        updated_at=datetime.now().isoformat()
    )
    session.add(config)
    session.commit()
    
    print(f"   ✅ Platform epoch impostato: {epoch}")
    return epoch


def initialize_platform(backup_file: str, force: bool = False):
    """Initialize platform from backup file."""
    
    print("=" * 60)
    print("🔄 INIZIALIZZAZIONE PIATTAFORMA DA BACKUP")
    print("=" * 60)
    
    # Check backup file exists
    if not os.path.exists(backup_file):
        print(f"❌ File di backup non trovato: {backup_file}")
        sys.exit(1)
    
    print(f"📄 File backup: {backup_file}")
    print(f"📁 Database: {DB_PATH}")
    
    # Load backup data
    try:
        with open(backup_file, 'r', encoding='utf-8') as f:
            backup_data = json.load(f)
    except Exception as e:
        print(f"❌ Errore lettura backup: {e}")
        sys.exit(1)
    
    # Show backup info
    if "backup_info" in backup_data:
        info = backup_data["backup_info"]
        print(f"\n📋 Info backup:")
        print(f"   • Creato: {info.get('created_at', 'N/A')}")
        print(f"   • Versione: {info.get('version', 'N/A')}")
    
    # Show what will be restored
    tables = backup_data.get("tables", {})
    print(f"\n📊 Tabelle da ripristinare:")
    total_records = 0
    for table_name, data in tables.items():
        count = len(data) if data else 0
        total_records += count
        print(f"   • {table_name}: {count} records")
    print(f"\n   Totale: {total_records} records")
    
    # Confirmation
    if not force:
        print("\n" + "⚠️ " * 20)
        print("⚠️  ATTENZIONE: Questa operazione ELIMINERÀ TUTTI I DATI!")
        print("⚠️  Inclusi: utenti, sessioni, punteggi, progressi quest, ecc.")
        print("⚠️ " * 20)
        
        confirm = input("\nSei sicuro di voler procedere? (scrivi 'SI' per confermare): ")
        if confirm.strip().upper() != "SI":
            print("\n❌ Operazione annullata")
            sys.exit(0)
    
    # Ensure database directory exists
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    # Create engine and session
    engine = create_engine(f"sqlite:///{DB_PATH}")
    
    # Create all tables (if not exist)
    print("\n🔧 Creazione schema database...")
    Base.metadata.create_all(engine)
    print("   ✅ Schema creato")
    
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # Clear all tables
        clear_all_tables(session)
        
        # Insert data in correct order (respecting foreign keys)
        print("\n" + "=" * 60)
        print("📥 RIPRISTINO DATI")
        print("=" * 60)
        
        # 1. Game statuses (no dependencies)
        if "game_statuses" in tables and tables["game_statuses"]:
            insert_game_statuses(session, tables["game_statuses"])
        
        # 2. Games (depends on game_statuses)
        if "games" in tables and tables["games"]:
            insert_games(session, tables["games"])
        
        # 3. Quests (no dependencies)
        if "quests" in tables and tables["quests"]:
            insert_quests(session, tables["quests"])
        
        # 4. XP Rules (depends on games)
        if "xp_rules" in tables and tables["xp_rules"]:
            insert_xp_rules(session, tables["xp_rules"])
        
        # 5. Level milestones (no dependencies)
        if "level_milestones" in tables and tables["level_milestones"]:
            insert_level_milestones(session, tables["level_milestones"])
        
        # 6. Level rewards (depends on level_milestones)
        if "level_rewards" in tables and tables["level_rewards"]:
            insert_level_rewards(session, tables["level_rewards"])
        
        # 7. Leaderboard rewards (depends on games, but game_id can be NULL)
        if "leaderboard_rewards" in tables and tables["leaderboard_rewards"]:
            insert_leaderboard_rewards(session, tables["leaderboard_rewards"])
        
        # 8. Daily login config (no dependencies)
        if "daily_login_reward_config" in tables and tables["daily_login_reward_config"]:
            insert_daily_login_config(session, tables["daily_login_reward_config"])
        
        # 9. Create default admin user
        create_default_admin(session)
        
        # 10. Set platform epoch (invalidates all existing sessions)
        set_platform_epoch(session)
        
        # Final summary
        print("\n" + "=" * 60)
        print("✅ INIZIALIZZAZIONE COMPLETATA!")
        print("=" * 60)
        
        # Verify counts
        print("\n📈 Verifica dati inseriti:")
        print(f"   • game_statuses: {session.query(GameStatus).count()}")
        print(f"   • games: {session.query(Game).count()}")
        print(f"   • quests: {session.query(Quest).count()}")
        print(f"   • xp_rules: {session.query(XPRule).count()}")
        print(f"   • level_milestones: {session.query(LevelMilestone).count()}")
        print(f"   • level_rewards: {session.query(LevelReward).count()}")
        print(f"   • leaderboard_rewards: {session.query(LeaderboardReward).count()}")
        print(f"   • daily_login_reward_config: {session.query(DailyLoginRewardConfig).count()}")
        print(f"   • admin_users: {session.query(AdminUser).count()}")
        
        print("\n🎉 La piattaforma è pronta per essere usata!")
        print("\n🔐 Accedi al DB Viewer con:")
        print("   URL: /admin/login")
        print("   Username: admin")
        print("   Password: admin123")
        
    except Exception as e:
        session.rollback()
        print(f"\n❌ Errore durante l'inizializzazione: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
        
    finally:
        session.close()


def print_usage():
    """Print usage information."""
    print("""
Uso: python initialize_platform_from_backup.py <backup_file.json> [--force]

Argomenti:
    backup_file.json    File di backup creato con backup_platform_config.py
    --force             Salta la richiesta di conferma

Esempio:
    python initialize_platform_from_backup.py ../backups/platform_config_20240101_120000.json
    python initialize_platform_from_backup.py ../backups/platform_config_20240101_120000.json --force
""")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print_usage()
        sys.exit(1)
    
    backup_file = sys.argv[1]
    force = "--force" in sys.argv
    
    initialize_platform(backup_file, force)
