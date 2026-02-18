"""
Script to create XP rules for Space Shooter 2.

5 rules designed around the game's mechanics:
  - 30 levels with bosses every 5 levels
  - Score submitted with extra_data: level, enemiesKilled, ship, ultimate, victory, difficulty
  - Typical scores: 5k (early death) → 300k+ (full clear)

Rules:
  1. Level Completion Score  (level_score)           — main XP source, scales with level reached
  2. Score Milestones        (threshold)              — bonus for reaching score checkpoints
  3. High Score Bonus        (high_score_bonus)       — flat reward for beating personal best
  4. Survival Endurance      (combo)                  — reward sustained gameplay (score + time)
  5. Score Improvement       (percentile_improvement) — reward for improving over previous best
"""
import sys
import os
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.database import create_xp_rule, get_game_xp_rules


def create_space_shooter_2_xp_rules():
    """Create XP rules for Space Shooter 2."""
    game_id = 'space_shooter_2'

    print()
    print("=" * 60)
    print("  🚀 SPACE SHOOTER 2 — XP RULES CREATION")
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

    print(f"📝 Creating 5 XP rules for {game_id}...\n")

    # ── 1. Level Completion Score ─────────────────────────────────
    # XP = (score / 10000) * (1 + log₆(level)), max 80
    # Uses extra_data.level sent by the game.
    #
    # Examples:
    #   Level 1,  score  5 000  →  0.5 XP
    #   Level 5,  score 20 000  →  3.8 XP
    #   Level 10, score 50 000  → 11.5 XP
    #   Level 20, score 120 000 → 32.0 XP
    #   Level 30, score 250 000 → 72.5 XP
    create_xp_rule(
        game_id=game_id,
        rule_name="Level Completion Score",
        rule_type="level_score",
        parameters={
            "score_divisor": 10000,
            "log_base": 6,
            "max_xp": 80.0
        },
        priority=10
    )
    print("   ✅ Level Completion Score  (score/10000 × (1 + log₆(level)), max 80)")

    # ── 2. Score Milestones ───────────────────────────────────────
    # Flat XP bonus for the highest score threshold reached.
    # Only the highest matching threshold counts.
    create_xp_rule(
        game_id=game_id,
        rule_name="Score Milestones",
        rule_type="threshold",
        parameters={
            "thresholds": [
                {"score": 300000, "xp": 100},   # Full clear / high score
                {"score": 150000, "xp": 60},     # Deep progression
                {"score":  75000, "xp": 35},     # Solid run (mid-game)
                {"score":  25000, "xp": 15},     # Decent session
                {"score":   5000, "xp": 5},      # Early game minimum
            ]
        },
        priority=20
    )
    print("   ✅ Score Milestones        (5k→5, 25k→15, 75k→35, 150k→60, 300k→100)")

    # ── 3. High Score Bonus ───────────────────────────────────────
    # Flat 15 XP every time the player beats their personal best.
    create_xp_rule(
        game_id=game_id,
        rule_name="High Score Bonus",
        rule_type="high_score_bonus",
        parameters={
            "bonus_xp": 15.0
        },
        priority=15
    )
    print("   ✅ High Score Bonus        (15 XP for new personal best)")

    # ── 4. Survival Endurance ─────────────────────────────────────
    # Combo rule: score ≥ 30000 AND session ≥ 3 min → 20 XP.
    # Rewards players who survive long enough to earn a solid score.
    create_xp_rule(
        game_id=game_id,
        rule_name="Survival Endurance",
        rule_type="combo",
        parameters={
            "min_score": 30000,
            "min_duration": 180,    # 3 minutes in seconds
            "bonus_xp": 20.0
        },
        priority=12
    )
    print("   ✅ Survival Endurance      (score ≥ 30k + time ≥ 3min → 20 XP)")

    # ── 5. Score Improvement ──────────────────────────────────────
    # 0.5 XP per % improvement over previous high score, max 50 XP.
    # Encourages players to keep improving, even from a high base.
    create_xp_rule(
        game_id=game_id,
        rule_name="Score Improvement",
        rule_type="percentile_improvement",
        parameters={
            "xp_per_percent": 0.5,
            "max_xp": 50.0
        },
        priority=8
    )
    print("   ✅ Score Improvement       (0.5 XP per % improvement, max 50)")

    # ── Summary ───────────────────────────────────────────────────
    print()
    print("=" * 60)
    print("  ✅ ALL 5 XP RULES CREATED SUCCESSFULLY")
    print("=" * 60)

    # Verify
    final_rules = get_game_xp_rules(game_id, active_only=True)
    print(f"\n📊 Total active rules: {len(final_rules)}")
    print("\nActive rules summary:")
    for rule in final_rules:
        print(f"  • {rule['rule_name']} ({rule['rule_type']}) — Priority: {rule['priority']}")

    print()
    print("📈 XP Estimate per session (approximate):")
    print("  Early death (L1-3, ~5k score) ...... ~6 XP")
    print("  Decent run  (L8-10, ~50k score) .... ~47 XP")
    print("  Good run    (L15-20, ~120k score) ... ~92 XP")
    print("  Full clear  (L30, ~250k+ score) .... ~173+ XP")
    print("  + high score / improvement bonuses on top")
    print()


if __name__ == '__main__':
    try:
        create_space_shooter_2_xp_rules()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
