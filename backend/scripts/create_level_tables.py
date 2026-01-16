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
        now = datetime.utcnow().isoformat()

        # Milestones up to 500 (English titles). Ordered from least to most prestigious.
        # Each milestone uses a unique badge emoji and a distinct color.
        milestones = [
            (1,   "Novice",           "🌱",  "#10b981", "First steps into the game world"),
            (5,   "Explorer",         "🧭",  "#3b82f6", "You have started exploring the platform"),
            (10,  "Adventurer",       "🗡️",  "#8b5cf6", "Ready for new challenges"),
            (20,  "Specialist",       "🔰",  "#14b8a6", "You have honed your abilities"),
            (30,  "Veteran",          "🛡️",  "#f97316", "Experience leads the way"),
            (40,  "Advanced Veteran", "🏅",  "#0ea5e9", "Dedication and growing skill"),
            (50,  "Champion",         "🏆",  "#ef4444", "A recognized champion"),
            (75,  "Elite",            "⭐",  "#f59e0b", "You are among the best"),
            (100, "Master",           "👑",  "#a78bfa", "You have achieved mastery"),
            (125, "Grandmaster",      "🏵️",  "#06b6d4", "A superior level of skill"),
            (150, "Gladiator",        "⚔️",  "#fb7185", "You have fought many battles"),
            (175, "Hero",             "💎",  "#7c3aed", "A true hero of the platform"),
            (200, "Conqueror",        "🚀",  "#e11d48", "You have conquered new heights"),
            (250, "Legend",           "🌟",  "#0f766e", "Your name is legendary"),
            (300, "Supreme Legend",   "🏛️",  "#92400e", "A legend among players"),
            (350, "Mythic",           "🐉",  "#0f172a", "A near-mythic level"),
            (400, "Overlord",         "⚜️",  "#b45309", "You control the playing field"),
            (450, "Immortal",         "🔥",  "#0ea5a4", "You have reached immortality"),
            (500, "Eternal",          "✨",  "#dc2626", "You have reached the pinnacle of glory")
        ]

        print("\n🏆 Applying milestones (insert or update)...")
        processed = 0
        inserted = 0
        updated = 0
        for level, title, badge, color, description in milestones:
            # Check if this level exists
            exists = session.execute(text("SELECT COUNT(*) FROM level_milestones WHERE level = :level"), {"level": level}).fetchone()[0]
            if exists:
                # Update existing row to reflect new canonical data
                session.execute(text("""
                    UPDATE level_milestones
                    SET title = :title,
                        badge = :badge,
                        color = :color,
                        description = :description,
                        is_active = 1,
                        updated_at = :updated_at
                    WHERE level = :level
                """), {
                    "level": level,
                    "title": title,
                    "badge": badge,
                    "color": color,
                    "description": description,
                    "updated_at": now
                })
                print(f"   🔁 Updated Level {level}: {badge} {title}")
                updated += 1
            else:
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
                print(f"   ✅ Inserted Level {level}: {badge} {title}")
                inserted += 1
            processed += 1

        session.commit()
        print("\n" + "=" * 80)
        print(f"✅ Milestones processed: {processed}. Inserted: {inserted}. Updated: {updated}.")
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
