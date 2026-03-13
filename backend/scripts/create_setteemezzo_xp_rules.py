"""
Create XP rules for Sette e Mezzo card game.

Core formula: bet 10 + win → payout 20 → 20 × 0.05 = 1 XP
Scales linearly with bet size and payout.
"""
import sys
import os
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.database import create_xp_rule, get_game_xp_rules


def create_setteemezzo_xp_rules():
    """Create XP rules for Sette e Mezzo."""
    game_id = 'setteemezzo'

    print()
    print("=" * 60)
    print("  🃏 SETTE E MEZZO — XP RULES CREATION")
    print("=" * 60)
    print()

    # Check for existing rules
    existing_rules = get_game_xp_rules(game_id, active_only=False)
    if existing_rules:
        print(f"⚠️  Rules already exist ({len(existing_rules)} rules)")
        print("\nExisting rules:")
        for rule in existing_rules:
            print(f"  • {rule['rule_name']} ({rule['rule_type']}) — Priority: {rule['priority']}")
        print("\n   Skipping creation...")
        return

    print(f"📝 Creating XP rules for {game_id}...\n")

    # ── 1. Payout Multiplier (main XP source) ────────────────────
    # Score sent to platform = payout (total coins returned).
    #   Loss         → score = 0   → 0 XP
    #   Win  bet 10  → score = 20  → 20 × 0.05 = 1 XP
    #   Win  bet 50  → score = 100 → 100 × 0.05 = 5 XP
    #   7½   bet 10  → score = 30  → 30 × 0.05 = 1.5 XP
    #   7½   bet 50  → score = 150 → 150 × 0.05 = 7.5 XP
    create_xp_rule(
        game_id=game_id,
        rule_name="Payout Multiplier",
        rule_type="score_multiplier",
        parameters={
            "multiplier": 0.05,
            "max_xp": 50.0
        },
        priority=10
    )
    print("   ✅ Payout Multiplier (×0.05, max 50 XP)")
    print("      bet 10 + win  → 1 XP")
    print("      bet 50 + win  → 5 XP")
    print("      bet 10 + 7½   → 1.5 XP")

    # ── 2. High Score Bonus ───────────────────────────────────────
    # Flat 5 XP when beating personal best payout.
    create_xp_rule(
        game_id=game_id,
        rule_name="High Score Bonus",
        rule_type="high_score_bonus",
        parameters={
            "bonus_xp": 5.0
        },
        priority=15
    )
    print("   ✅ High Score Bonus (5 XP on new personal best)")

    # ── 3. Payout Milestones ──────────────────────────────────────
    # Bonus XP for reaching payout thresholds in a single round.
    create_xp_rule(
        game_id=game_id,
        rule_name="Payout Milestones",
        rule_type="threshold",
        parameters={
            "thresholds": [
                {"score": 500, "xp": 25},   # 7½ with huge bet
                {"score": 200, "xp": 10},   # Big win
                {"score": 100, "xp": 5},    # Solid win
                {"score": 40,  "xp": 2},    # Decent win
                {"score": 20,  "xp": 1},    # Minimum win (bet 10)
            ]
        },
        priority=20
    )
    print("   ✅ Payout Milestones (20→1, 40→2, 100→5, 200→10, 500→25)")

    # ── 4. Time Played Bonus ─────────────────────────────────────
    # Small reward for sustained play sessions.
    create_xp_rule(
        game_id=game_id,
        rule_name="Time Played Bonus",
        rule_type="time_bonus",
        parameters={
            "xp_per_minute": 0.1,
            "max_minutes": 10
        },
        priority=5
    )
    print("   ✅ Time Played Bonus (0.1 XP/min, max 10 min)")

    print()
    print("=" * 60)
    print("  ✅ XP RULES CREATED SUCCESSFULLY (4 rules)")
    print("=" * 60)
    print()
    print("  Formula (main): XP = payout × 0.05")
    print("  Examples:")
    print("    Bet 10, win        → payout 20  → 1 XP")
    print("    Bet 10, 7½         → payout 30  → 1.5 XP")
    print("    Bet 50, win        → payout 100 → 5 XP")
    print("    Bet 50, 7½         → payout 150 → 7.5 XP")
    print("    Bet 10, lose       → payout 0   → 0 XP")
    print()


if __name__ == "__main__":
    create_setteemezzo_xp_rules()
