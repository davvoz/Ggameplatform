"""
Create level_milestones and level_rewards tables for DB management
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.database import get_db_session
from sqlalchemy import text

def create_level_tables():
    """Create tables for level system management"""
    
    print("=" * 80)
    print("🎮 CREATING LEVEL SYSTEM TABLES")
    print("=" * 80)
    
    with get_db_session() as session:
        # Create level_milestones table
        print("\n📊 Creating level_milestones table...")
        session.execute(text("""
            CREATE TABLE IF NOT EXISTS level_milestones (
                level INTEGER PRIMARY KEY,
                title TEXT NOT NULL,
                badge TEXT NOT NULL,
                color TEXT NOT NULL,
                description TEXT,
                is_active BOOLEAN DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """))
        print("   ✅ Table level_milestones created")
        
        # Create level_rewards table
        print("\n💰 Creating level_rewards table...")
        session.execute(text("""
            CREATE TABLE IF NOT EXISTS level_rewards (
                reward_id TEXT PRIMARY KEY,
                level INTEGER NOT NULL,
                reward_type TEXT NOT NULL,
                reward_amount INTEGER NOT NULL,
                description TEXT,
                is_active BOOLEAN DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (level) REFERENCES level_milestones(level)
            )
        """))
        print("   ✅ Table level_rewards created")
        
        session.commit()
        print("\n" + "=" * 80)
        print("✅ Tables created successfully!")
        print("=" * 80)

def populate_default_data():
    """Populate tables with default milestone and reward data"""
    from datetime import datetime
    import uuid
    
    print("\n" + "=" * 80)
    print("📝 POPULATING DEFAULT DATA")
    print("=" * 80)
    
    with get_db_session() as session:
        # Check if data already exists
        result = session.execute(text("SELECT COUNT(*) FROM level_milestones")).fetchone()
        if result[0] > 0:
            print("\n⚠️  Data already exists. Skipping population.")
            return
        
        now = datetime.utcnow().isoformat()
        
        # Default milestones
        milestones = [
            (1, "Novizio", "🌱", "#10b981", "Primo passo nel mondo del gioco"),
            (5, "Esploratore", "🎮", "#3b82f6", "Hai iniziato ad esplorare le possibilità"),
            (10, "Avventuriero", "⚔️", "#8b5cf6", "Sei pronto per nuove sfide"),
            (20, "Veterano", "🛡️", "#ec4899", "L'esperienza ti precede"),
            (30, "Maestro", "👑", "#f59e0b", "Hai raggiunto la maestria"),
            (40, "Campione", "🏆", "#ef4444", "Sei un campione riconosciuto"),
            (50, "Leggenda", "⭐", "#fbbf24", "Il tuo nome è leggendario"),
            (75, "Eroe", "💎", "#06b6d4", "Un vero eroe della piattaforma"),
            (100, "Immortale", "🔥", "#dc2626", "Hai raggiunto l'immortalità")
        ]
        
        print("\n🏆 Inserting milestones...")
        for level, title, badge, color, description in milestones:
            session.execute(text("""
                INSERT INTO level_milestones (level, title, badge, color, description, is_active, created_at, updated_at)
                VALUES (:level, :title, :badge, :color, :description, 1, :created_at, :updated_at)
            """), {
                "level": level,
                "title": title,
                "badge": badge,
                "color": color,
                "description": description,
                "created_at": now,
                "updated_at": now
            })
            print(f"   ✅ Level {level}: {badge} {title}")
        
        # Default rewards (coins)
        rewards = [
            (5, 50),
            (10, 100),
            (15, 150),
            (20, 200),
            (25, 250),
            (30, 300),
            (40, 400),
            (50, 500),
            (60, 600),
            (75, 750),
            (100, 1000)
        ]
        
        print("\n💰 Inserting coin rewards...")
        for level, coins in rewards:
            reward_id = f"reward_{uuid.uuid4().hex[:16]}"
            session.execute(text("""
                INSERT INTO level_rewards (reward_id, level, reward_type, reward_amount, description, is_active, created_at, updated_at)
                VALUES (:reward_id, :level, :reward_type, :reward_amount, :description, 1, :created_at, :updated_at)
            """), {
                "reward_id": reward_id,
                "level": level,
                "reward_type": "coins",
                "reward_amount": coins,
                "description": f"Ricompensa per aver raggiunto il livello {level}",
                "created_at": now,
                "updated_at": now
            })
            print(f"   ✅ Level {level}: 🪙 {coins} coins")
        
        session.commit()
        print("\n" + "=" * 80)
        print("✅ Default data populated successfully!")
        print("=" * 80)

if __name__ == "__main__":
    create_level_tables()
    populate_default_data()
    
    print("\n📊 Summary:")
    with get_db_session() as session:
        milestones_count = session.execute(text("SELECT COUNT(*) FROM level_milestones")).fetchone()[0]
        rewards_count = session.execute(text("SELECT COUNT(*) FROM level_rewards")).fetchone()[0]
        print(f"   Milestones: {milestones_count}")
        print(f"   Rewards: {rewards_count}")
    print()
