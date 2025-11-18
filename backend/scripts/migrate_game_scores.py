"""
Migration script to add game_scores column to users table.
Run this script once to migrate existing database.
"""

from app.database import migrate_add_game_scores, init_db

if __name__ == "__main__":
    print("Running migration: add game_scores column to users table...")
    
    # Ensure database exists
    init_db()
    
    # Run migration
    migrate_add_game_scores()
    
    print("Migration completed!")
