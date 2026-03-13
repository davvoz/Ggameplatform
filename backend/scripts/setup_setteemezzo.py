"""
Setup Sette e Mezzo — umbrella script.

Runs all setup scripts for Sette e Mezzo in order:
  1. Register game in DB
  2. Create XP rules
  3. Create daily quests

Usage:
  python scripts/setup_setteemezzo.py
"""
import sys
import os
import subprocess
from pathlib import Path

SCRIPTS_DIR = Path(__file__).parent


def run_script(name):
    """Run a sibling script and stream its output."""
    script = SCRIPTS_DIR / name
    if not script.exists():
        print(f"⚠️  Script not found: {name}")
        return False

    result = subprocess.run(
        [sys.executable, str(script)],
        text=True,
    )
    return result.returncode == 0


def main():
    print()
    print("=" * 70)
    print("  🃏 SETTE E MEZZO — COMPLETE SETUP")
    print("=" * 70)
    print()

    steps = [
        ("📝 Step 1: Register game",       "register_setteemezzo_game.py"),
        ("⭐ Step 2: Create XP rules",      "create_setteemezzo_xp_rules.py"),
        ("🎯 Step 3: Create daily quests",  "create_setteemezzo_quests.py"),
    ]

    results = []
    for label, script_name in steps:
        print(f"\n{label}")
        print("-" * 50)
        ok = run_script(script_name)
        results.append((label, ok))

    print()
    print("=" * 70)
    print("  📋 SETUP SUMMARY")
    print("=" * 70)
    for label, ok in results:
        status = "✅" if ok else "❌"
        print(f"  {status} {label}")
    print()
    print("=" * 70)
    print("  🎉 SETTE E MEZZO SETUP COMPLETE!")
    print("=" * 70)
    print()


if __name__ == "__main__":
    main()
