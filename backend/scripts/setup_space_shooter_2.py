"""
Space Shooter 2 — Full Setup Script
Runs all configuration scripts for the game:
  1. XP Rules
  2. Daily Quests
"""
import sys
import os
from pathlib import Path

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))


def main():
    print()
    print("=" * 70)
    print("  🚀 SPACE SHOOTER 2 — FULL SETUP")
    print("=" * 70)
    print()

    # 1. XP Rules
    print("━" * 70)
    print("  [1/2] XP Rules")
    print("━" * 70)
    from create_space_shooter_2_xp_rules import create_space_shooter_2_xp_rules
    create_space_shooter_2_xp_rules()

    # 2. Daily Quests
    print("━" * 70)
    print("  [2/2] Daily Quests")
    print("━" * 70)
    from create_space_shooter_2_quests import create_space_shooter_2_quests
    create_space_shooter_2_quests()

    print("=" * 70)
    print("  ✅ SPACE SHOOTER 2 SETUP COMPLETE")
    print("=" * 70)
    print()


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
