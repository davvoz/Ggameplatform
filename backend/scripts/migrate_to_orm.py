"""
Migration script from raw SQL to SQLAlchemy ORM
Migrates data from old schema (with 'metadata' column) to new schema (with 'extra_data' column)
"""
import sqlite3
import json
from pathlib import Path
from datetime import datetime
import shutil

# Paths
OLD_DB_PATH = Path(__file__).parent / "app" / "game_platform.db"
NEW_DB_PATH = Path(__file__).parent / "app" / "game_platform_new.db"
BACKUP_DIR = Path(__file__).parent / "backups"

def create_backup():
    """Create backup before migration"""
    print("📦 Creating backup...")
    BACKUP_DIR.mkdir(exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = BACKUP_DIR / f"game_platform_pre_migration_{timestamp}.db"
    
    if OLD_DB_PATH.exists():
        shutil.copy2(OLD_DB_PATH, backup_path)
        print(f"✅ Backup created: {backup_path}")
        return backup_path
    else:
        print("⚠️  No existing database found")
        return None

def create_new_schema():
    """Create new database schema with 'extra_data' instead of 'metadata'"""
    print("\n🔧 Creating new database schema...")
    
    conn = sqlite3.connect(str(NEW_DB_PATH))
    cursor = conn.cursor()
    
    # Games table with extra_data
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS games (
            game_id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            author TEXT,
            version TEXT,
            thumbnail TEXT,
            entry_point TEXT NOT NULL,
            category TEXT,
            tags TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            extra_data TEXT
        )
    """)
    
    # Users table with extra_data
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            username TEXT UNIQUE,
            email TEXT UNIQUE,
            password_hash TEXT,
            steem_username TEXT UNIQUE,
            is_anonymous INTEGER DEFAULT 0,
            cur8_multiplier REAL DEFAULT 1.0,
            total_cur8_earned REAL DEFAULT 0.0,
            game_scores TEXT DEFAULT '{}',
            avatar TEXT,
            created_at TEXT NOT NULL,
            last_login TEXT,
            extra_data TEXT
        )
    """)
    
    # Game sessions table with extra_data
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS game_sessions (
            session_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            game_id TEXT NOT NULL,
            score INTEGER DEFAULT 0,
            cur8_earned REAL DEFAULT 0.0,
            duration_seconds INTEGER DEFAULT 0,
            started_at TEXT NOT NULL,
            ended_at TEXT,
            extra_data TEXT,
            FOREIGN KEY (user_id) REFERENCES users(user_id),
            FOREIGN KEY (game_id) REFERENCES games(game_id)
        )
    """)
    
    # User achievements table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_achievements (
            achievement_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            game_id TEXT NOT NULL,
            achievement_type TEXT NOT NULL,
            achievement_value TEXT,
            earned_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(user_id),
            FOREIGN KEY (game_id) REFERENCES games(game_id)
        )
    """)
    
    # Leaderboards table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS leaderboards (
            entry_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            game_id TEXT NOT NULL,
            score INTEGER NOT NULL,
            rank INTEGER,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(user_id),
            FOREIGN KEY (game_id) REFERENCES games(game_id)
        )
    """)
    
    conn.commit()
    conn.close()
    print("✅ New schema created")

def migrate_data():
    """Migrate data from old database to new database"""
    if not OLD_DB_PATH.exists():
        print("⚠️  No old database found, skipping migration")
        return
    
    print("\n🔄 Migrating data...")
    
    old_conn = sqlite3.connect(str(OLD_DB_PATH))
    old_conn.row_factory = sqlite3.Row
    new_conn = sqlite3.connect(str(NEW_DB_PATH))
    
    old_cursor = old_conn.cursor()
    new_cursor = new_conn.cursor()
    
    # Migrate games
    print("  📦 Migrating games...")
    old_cursor.execute("SELECT * FROM games")
    games = old_cursor.fetchall()
    
    for game in games:
        new_cursor.execute("""
            INSERT INTO games (
                game_id, title, description, author, version,
                thumbnail, entry_point, category, tags,
                created_at, updated_at, extra_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            game['game_id'],
            game['title'],
            game['description'],
            game['author'],
            game['version'],
            game['thumbnail'],
            game['entry_point'],
            game['category'],
            game['tags'],
            game['created_at'],
            game['updated_at'],
            game['metadata']  # Old 'metadata' -> new 'extra_data'
        ))
    
    print(f"  ✅ Migrated {len(games)} games")
    
    # Migrate users
    print("  👥 Migrating users...")
    old_cursor.execute("SELECT * FROM users")
    users = old_cursor.fetchall()
    
    for user in users:
        # Safely get values that might not exist in old schema
        user_dict = dict(user)
        
        new_cursor.execute("""
            INSERT INTO users (
                user_id, username, email, password_hash, steem_username,
                is_anonymous, cur8_multiplier, total_cur8_earned, game_scores,
                avatar, created_at, last_login, extra_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_dict.get('user_id'),
            user_dict.get('username'),
            user_dict.get('email'),
            user_dict.get('password_hash'),
            user_dict.get('steem_username'),  # May not exist in old schema
            user_dict.get('is_anonymous', 0),
            user_dict.get('cur8_multiplier', 1.0),
            user_dict.get('total_cur8_earned', 0.0),
            user_dict.get('game_scores', '{}'),
            user_dict.get('avatar'),
            user_dict.get('created_at'),
            user_dict.get('last_login'),
            user_dict.get('metadata', '{}')  # Old 'metadata' -> new 'extra_data'
        ))
    
    print(f"  ✅ Migrated {len(users)} users")
    
    # Migrate game_sessions
    print("  🎮 Migrating game sessions...")
    old_cursor.execute("SELECT * FROM game_sessions")
    sessions = old_cursor.fetchall()
    
    for session in sessions:
        session_dict = dict(session)
        
        new_cursor.execute("""
            INSERT INTO game_sessions (
                session_id, user_id, game_id, score, cur8_earned,
                duration_seconds, started_at, ended_at, extra_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            session_dict.get('session_id'),
            session_dict.get('user_id'),
            session_dict.get('game_id'),
            session_dict.get('score', 0),
            session_dict.get('cur8_earned', 0.0),
            session_dict.get('duration_seconds', 0),
            session_dict.get('started_at'),
            session_dict.get('ended_at'),
            session_dict.get('metadata', '{}')  # Old 'metadata' -> new 'extra_data'
        ))
    
    print(f"  ✅ Migrated {len(sessions)} game sessions")
    
    # Migrate user_achievements
    print("  🏆 Migrating achievements...")
    old_cursor.execute("SELECT * FROM user_achievements")
    achievements = old_cursor.fetchall()
    
    for achievement in achievements:
        new_cursor.execute("""
            INSERT INTO user_achievements (
                achievement_id, user_id, game_id, achievement_type,
                achievement_value, earned_at
            ) VALUES (?, ?, ?, ?, ?, ?)
        """, (
            achievement['achievement_id'],
            achievement['user_id'],
            achievement['game_id'],
            achievement['achievement_type'],
            achievement['achievement_value'],
            achievement['earned_at']
        ))
    
    print(f"  ✅ Migrated {len(achievements)} achievements")
    
    # Migrate leaderboards
    print("  📊 Migrating leaderboard...")
    old_cursor.execute("SELECT * FROM leaderboards")
    leaderboard = old_cursor.fetchall()
    
    for entry in leaderboard:
        new_cursor.execute("""
            INSERT INTO leaderboards (
                entry_id, user_id, game_id, score, rank, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
        """, (
            entry['entry_id'],
            entry['user_id'],
            entry['game_id'],
            entry['score'],
            entry['rank'],
            entry['created_at']
        ))
    
    print(f"  ✅ Migrated {len(leaderboard)} leaderboard entries")
    
    new_conn.commit()
    old_conn.close()
    new_conn.close()
    
    print("\n✅ Data migration completed")

def replace_old_database():
    """Replace old database with new one"""
    print("\n🔄 Replacing old database with new one...")
    
    # Create final backup of old database
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    final_backup = BACKUP_DIR / f"game_platform_old_{timestamp}.db"
    
    if OLD_DB_PATH.exists():
        shutil.copy2(OLD_DB_PATH, final_backup)
        print(f"  ✅ Old database backed up to: {final_backup}")
        OLD_DB_PATH.unlink()
    
    # Move new database to old location
    shutil.move(str(NEW_DB_PATH), str(OLD_DB_PATH))
    print(f"  ✅ New database is now active at: {OLD_DB_PATH}")

def verify_migration():
    """Verify that migration was successful"""
    print("\n🔍 Verifying migration...")
    
    conn = sqlite3.connect(str(OLD_DB_PATH))
    cursor = conn.cursor()
    
    # Count records in each table
    tables = ['games', 'users', 'game_sessions', 'user_achievements', 'leaderboards']
    
    for table in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        print(f"  ✅ {table}: {count} records")
    
    # Verify schema
    cursor.execute("PRAGMA table_info(games)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'extra_data' in columns and 'metadata' not in columns:
        print("  ✅ Schema verification: 'metadata' renamed to 'extra_data'")
    else:
        print("  ⚠️  Schema verification: column names may need checking")
    
    conn.close()
    print("\n✅ Migration verification complete")

def main():
    """Main migration process"""
    print("=" * 60)
    print("  DATABASE MIGRATION TO SQLALCHEMY ORM")
    print("=" * 60)
    
    # Step 1: Create backup
    create_backup()
    
    # Step 2: Create new schema
    create_new_schema()
    
    # Step 3: Migrate data
    migrate_data()
    
    # Step 4: Replace old database
    replace_old_database()
    
    # Step 5: Verify migration
    verify_migration()
    
    print("\n" + "=" * 60)
    print("  ✅ MIGRATION COMPLETED SUCCESSFULLY!")
    print("=" * 60)
    print("\n📝 Next steps:")
    print("  1. Replace 'database.py' with 'database_new.py'")
    print("  2. Update all routers to use the new ORM")
    print("  3. Test all API endpoints")
    print("  4. Backups are stored in:", BACKUP_DIR.absolute())

if __name__ == "__main__":
    main()
