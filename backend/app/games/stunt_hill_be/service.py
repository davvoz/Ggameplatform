"""
Stunt Hill ranked — server-authoritative WEEK + light structural run check.

There is NO separate leaderboard here: ranked scores go straight to the platform
leaderboard (via the normal session-end flow). This module only provides:

  * current_week()      — the map+seed of the week (deterministic, HMAC of the
                          ISO week) so everyone competes on the same track and it
                          can't be precomputed for future weeks or forced client-side.
  * check_ranked_run()  — a LIGHT structural check used by the platform's score
                          validator (app.game_score_validators) before a ranked
                          score is written to the leaderboard.

IMPORTANT — no magnitude caps: we deliberately do NOT cap score/tricks/coins/time.
A skilled player can score arbitrarily high or finish very fast, so ANY such cap
only risks false-positives (it can't tell a trick master from a cheat). The check
here is limited to impossible/tampered data and the fairness rule (right map). The
REAL anti-cheat for the score magnitude is the deterministic REPLAY (later phase),
which should land before the game is promoted to reward-paying ranked.
"""

import os
import hmac
import hashlib
from datetime import datetime, timezone

# Must mirror the client roster ORDER (js/config/maps.js) and car ids (cars.js).
MAP_IDS = ['green-hills', 'desert-dunes', 'snowy-peaks', 'canyon', 'moonlight']
MAP_NAMES = ['GREEN HILLS', 'DESERT DUNES', 'SNOWY PEAKS', 'CITY CANYON', 'MOONLIGHT']
CAR_IDS = ['rookie', 'comet', 'bulldog', 'jolt', 'titan', 'phantom']

LEVEL_LENGTH = 1500             # GameConfig.levelLength — hard track length (finish line)

_SECRET = os.environ.get('STUNT_HILL_SECRET', 'stunt-hill-weekly-v1').encode()


def _digest(week_id: str, salt: str) -> int:
    return int(hmac.new(_SECRET, f"{salt}:{week_id}".encode(), hashlib.sha256).hexdigest(), 16)


def current_week(now: datetime = None) -> dict:
    """Deterministic map+seed for the current ISO week (same for everyone)."""
    now = now or datetime.now(timezone.utc)
    y, w, _ = now.isocalendar()
    week_id = f"{y}-W{w:02d}"
    map_index = _digest(week_id, 'map') % len(MAP_IDS)
    seed = _digest(week_id, 'seed') % 2147483647 or 1
    return {
        "week_id": week_id,
        "map_index": map_index,
        "map_id": MAP_IDS[map_index],
        "map_name": MAP_NAMES[map_index],
        "seed": seed,
    }


def check_ranked_run(score, duration_seconds, extra_data) -> tuple:
    """
    LIGHT structural check for a RANKED stunt_hill run, from the session extra_data.
    Returns (ok: bool, reason: str).

    Only catches IMPOSSIBLE / TAMPERED data and enforces the fairness rule — it does
    NOT cap by magnitude (see module docstring: that only false-positives skilled
    play). `duration_seconds` is ignored. Score magnitude is trusted until the
    deterministic replay exists.
    """
    ed = extra_data or {}
    try:
        score = int(score)
        distance = int(ed.get("distance", 0))
        coins = int(ed.get("coins_collected", ed.get("coins", 0)))
        tricks = int(ed.get("tricks", 0))
        car = str(ed.get("car", ""))
        map_id = str(ed.get("map", ""))
    except (TypeError, ValueError):
        return False, "malformed session data"

    # fairness rule: the run MUST be on this week's server-decided map (no easy-map grinding)
    if map_id != current_week()["map_id"]:
        return False, "wrong map for the week"
    # impossible / tampered data only
    if car not in CAR_IDS:
        return False, "unknown car"
    if score < 0 or distance < 0 or tricks < 0 or coins < 0:
        return False, "negative value"
    if distance > LEVEL_LENGTH + 120:
        return False, "distance beyond track"
    return True, "ok"
