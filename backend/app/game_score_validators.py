"""
Server-side score validation (anti-cheat) for the platform leaderboard.

The platform normally trusts whatever score the client reports at session end.
This module lets specific games reject implausible scores BEFORE they're written
to the leaderboard, keeping the platform's single leaderboard as the source of
truth (no per-game leaderboard tables).

It is intentionally generic: `validate_game_score` dispatches by game_id, and any
game without a registered validator passes through unchanged.

A validator returns the (possibly adjusted) score plus an optional rejection
reason. Today the only validator is a PLAUSIBILITY gate (catches absurd values);
proving an exact score is legitimate would require deterministic replay.
"""

from typing import Optional, Tuple


def _validate_stunt_hill(score: int, duration_seconds: int, extra_data: dict) -> Tuple[int, Optional[str]]:
    ed = extra_data or {}
    # only RANKED runs compete; free ride submits score 0 → nothing to gate
    if ed.get("mode") != "ranked":
        return score, None
    # imported lazily so the platform core doesn't hard-depend on a game package
    from app.games.stunt_hill_be.service import check_ranked_run
    ok, reason = check_ranked_run(score, duration_seconds, ed)
    if not ok:
        return 0, reason          # void the score → never reaches the leaderboard
    return score, None


# game_id → validator(score, duration_seconds, extra_data) -> (score, reason|None)
_VALIDATORS = {
    "stunt_hill": _validate_stunt_hill,
}


def validate_game_score(game_id: str, score: int, duration_seconds: int,
                        extra_data: dict) -> Tuple[int, Optional[str]]:
    """
    Returns (validated_score, reason). For games without a validator the score is
    returned unchanged and reason is None. A rejected score is returned as 0 with a
    human-readable reason (so it can be logged / stored in extra_data).
    """
    fn = _VALIDATORS.get(game_id)
    if not fn:
        return score, None
    try:
        return fn(score, duration_seconds, extra_data)
    except Exception as e:                # never let validation crash session-end
        print(f"[VALIDATOR] {game_id} validation error: {e}")
        return score, None
