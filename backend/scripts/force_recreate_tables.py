"""
Force SQLAlchemy to recreate table metadata and include new columns
"""
from app.database import engine, Base
from app.models import UserQuest, Quest, User, Game, GameSession, Leaderboard, XPRule
import sqlite3

print("Dropping and recreating all tables with new schema...")

# Drop all tables
Base.metadata.drop_all(bind=engine)
print("✓ All tables dropped")

# Recreate all tables with updated schema
Base.metadata.create_all(bind=engine)
print("✓ All tables recreated with new schema")

# Verify UserQuest table has all columns
conn = sqlite3.connect('app/game_platform.db')
cursor = conn.cursor()
cursor.execute("PRAGMA table_info(user_quests)")
columns = [row[1] for row in cursor.fetchall()]
print(f"\n✓ UserQuest table columns: {columns}")

if 'is_claimed' in columns and 'claimed_at' in columns:
    print("✓ SUCCESS: is_claimed and claimed_at columns are present!")
else:
    print("✗ ERROR: Missing columns!")
    
conn.close()
