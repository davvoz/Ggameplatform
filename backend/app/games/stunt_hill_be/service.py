"""
Stunt Hill ranked — server-authoritative WEEK + score plausibility gate.

There is NO separate leaderboard here: ranked scores go straight to the platform
leaderboard (via the normal session-end flow). This module only provides:

  * current_week()      — the map+seed of the week (deterministic, HMAC of the
                          ISO week) so everyone competes on the same track and it
                          can't be precomputed for future weeks or forced client-side.
  * check_ranked_run()  — a cheap plausibility check used by the platform's score
                          validator (app.game_score_validators) BEFORE a ranked
                          score is written to the leaderboard. It rejects absurd
                          scores and runs on the wrong/forced map.

Plausibility != proof. The exact deterministic REPLAY check is a later phase.
"""

import os
import hmac
import hashlib
from datetime import datetime, timezone

# Must mirror the client roster ORDER (js/config/maps.js) and car ids (cars.js).
MAP_IDS = ['green-hills', 'desert-dunes', 'snowy-peaks', 'canyon', 'moonlight']
MAP_NAMES = ['GREEN HILLS', 'DESERT DUNES', 'SNOWY PEAKS', 'CITY CANYON', 'MOONLIGHT']
CAR_IDS = ['rookie', 'comet', 'bulldog', 'jolt', 'titan', 'phantom']

# Match GameConfig.js
LEVEL_LENGTH = 1500
TIME_LIMIT = 120
FINISH_BONUS = 1000
TIME_BONUS_PER_SEC = 30
MAX_TRICK_PER_SEC = 220          # generous skill ceiling for the plausibility cap

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
    Plausibility gate for a RANKED stunt_hill run, from the session extra_data.
    Returns (ok: bool, reason: str). Only ranked runs are checked — anything else
    is the caller's responsibility (free ride submits score 0 anyway).
    """
    ed = extra_data or {}
    try:
        score = int(score)
        distance = int(ed.get("distance", 0))
        tricks = int(ed.get("tricks", 0))
        coins = int(ed.get("coins_collected", ed.get("coins", 0)))
        duration = float(duration_seconds or 0)
        car = str(ed.get("car", ""))
        map_id = str(ed.get("map", ""))
    except (TypeError, ValueError):
        return False, "malformed session data"

    # the run MUST be on this week's server-decided map (no forcing an easy map)
    if map_id != current_week()["map_id"]:
        return False, "wrong map for the week"
    if car not in CAR_IDS:
        return False, "unknown car"
    if score < 0 or distance < 0 or tricks < 0 or coins < 0:
        return False, "negative value"
    if distance > LEVEL_LENGTH + 120:
        return False, "distance beyond track"
    if coins > 80:
        return False, "too many pickups"

    # cap the time used in the ceiling at the real play window (ignore idle/menu time)
    eff = max(3.0, min(duration, TIME_LIMIT + 20))
    if tricks > eff * 3:
        return False, "too many tricks"
    # generous theoretical ceiling: distance + finish + time bonus + trick allowance
    max_score = distance + FINISH_BONUS + TIME_BONUS_PER_SEC * TIME_LIMIT + eff * MAX_TRICK_PER_SEC
    if score > max_score:
        return False, "score exceeds plausible maximum"
    return True, "ok"
