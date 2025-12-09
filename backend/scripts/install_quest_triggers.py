"""Install quest triggers in the existing database."""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.quest_triggers import setup_quest_triggers

if __name__ == "__main__":
    print("🔧 Installing quest triggers...")
    setup_quest_triggers()
    print("\n✅ Quest triggers installed successfully!")
    print("\nNow when you update:")
    print("  - user.login_streak → automatically updates login_streak quests")
    print("  - user.total_xp_earned → automatically updates reach_level quests")
