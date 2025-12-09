"""
Run all quest-related migrations
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from add_user_quest_extra_data import add_extra_data_column
from add_login_streak_columns import add_login_streak_columns

def main():
    print("=" * 60)
    print("Running Quest System Migrations")
    print("=" * 60)
    
    print("\n1. Adding extra_data column to user_quests table...")
    try:
        add_extra_data_column()
    except Exception as e:
        print(f"❌ Failed: {e}")
    
    print("\n2. Adding login streak columns to users table...")
    try:
        add_login_streak_columns()
    except Exception as e:
        print(f"❌ Failed: {e}")
    
    print("\n" + "=" * 60)
    print("✅ All migrations completed!")
    print("=" * 60)

if __name__ == "__main__":
    main()
