#!/usr/bin/env python3
"""
Backup Platform Configuration Script

Crea un backup JSON delle tabelle di configurazione della piattaforma:
- games (Giochi)
- game_statuses (Stati giochi)
- quests (Quest)
- xp_rules (Regole XP)
- level_milestones (Livelli)
- level_rewards (Ricompense livello)
- leaderboard_rewards (Premi leaderboard)
- daily_login_reward_config (Configurazione daily reward)

Usage:
    python backup_platform_config.py [output_file]
"""

import sys
import os
import json
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import (
    Game, GameStatus, Quest, XPRule,
    LevelMilestone, LevelReward, LeaderboardReward,
    DailyLoginRewardConfig
)

# Database path (backend/data/game_platform.db)
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "game_platform.db")


def backup_table(session, model, table_name: str) -> list:
    """Backup a single table to a list of dictionaries."""
    print(f"  📦 Backup {table_name}...")
    
    try:
        records = session.query(model).all()
        data = [record.to_dict() for record in records]
        print(f"     ✅ {len(data)} records")
        return data
    except Exception as e:
        print(f"     ❌ Error: {e}")
        return []


def create_backup(output_file: str = None):
    """Create a full backup of platform configuration tables."""
    
    print("=" * 60)
    print("🔄 BACKUP CONFIGURAZIONE PIATTAFORMA")
    print("=" * 60)
    
    # Check database exists
    if not os.path.exists(DB_PATH):
        print(f"❌ Database non trovato: {DB_PATH}")
        sys.exit(1)
    
    print(f"📁 Database: {DB_PATH}")
    
    # Create engine and session
    engine = create_engine(f"sqlite:///{DB_PATH}")
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # Backup all configuration tables
        print("\n📋 Backup tabelle configurazione:\n")
        
        backup_data = {
            "backup_info": {
                "created_at": datetime.now().isoformat(),
                "database": DB_PATH,
                "version": "1.0"
            },
            "tables": {
                "game_statuses": backup_table(session, GameStatus, "game_statuses"),
                "games": backup_table(session, Game, "games"),
                "quests": backup_table(session, Quest, "quests"),
                "xp_rules": backup_table(session, XPRule, "xp_rules"),
                "level_milestones": backup_table(session, LevelMilestone, "level_milestones"),
                "level_rewards": backup_table(session, LevelReward, "level_rewards"),
                "leaderboard_rewards": backup_table(session, LeaderboardReward, "leaderboard_rewards"),
                "daily_login_reward_config": backup_table(session, DailyLoginRewardConfig, "daily_login_reward_config")
            }
        }
        
        # Generate output filename if not provided
        if not output_file:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                "backups",
                f"platform_config_{timestamp}.json"
            )
        
        # Ensure backup directory exists
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        
        # Write backup file
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(backup_data, f, indent=2, ensure_ascii=False)
        
        # Print summary
        print("\n" + "=" * 60)
        print("✅ BACKUP COMPLETATO!")
        print("=" * 60)
        print(f"\n📄 File: {output_file}")
        print(f"📊 Dimensione: {os.path.getsize(output_file) / 1024:.2f} KB")
        print("\n📈 Riepilogo:")
        for table_name, data in backup_data["tables"].items():
            print(f"   • {table_name}: {len(data)} records")
        
        total_records = sum(len(data) for data in backup_data["tables"].values())
        print(f"\n   Totale: {total_records} records")
        
        return output_file
        
    except Exception as e:
        print(f"\n❌ Errore durante il backup: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
        
    finally:
        session.close()


if __name__ == "__main__":
    output_file = sys.argv[1] if len(sys.argv) > 1 else None
    create_backup(output_file)
