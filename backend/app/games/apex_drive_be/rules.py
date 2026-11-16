"""
What a race reported by the game can have done, given the car it started
with and the time it took on the server's clock. The race itself runs in the
browser, so these checks cannot prove a result; they turn away the
impossible ones: a lap faster than the car could drive it on nitro all the
way, more cash than the road holds, a race over before it could be.

Pure functions; a refused result raises CareerError.
"""

import math

from . import economy as eco
from .career import CareerError

# Bounds are cut by this share again: nothing honest ever comes near them.
SAFETY = 0.85
# The game's clock (60 ticks a second) may run a little ahead of the server's.
CLOCK_SLACK = 0.95


def min_lap(track: dict, stats: dict) -> float:
    return track["lapLength"] / eco.speed_bound(stats) * SAFETY


def min_race(track: dict, stats: dict) -> float:
    return track["laps"] * min_lap(track, stats)


def max_cash(track: dict, stats: dict) -> int:
    """Every cash pickup on every lap, and one more lap for the drive after the flag."""
    return math.ceil(track["cashPerLap"] * (track["laps"] + 1) * stats["cashBonus"])


def _fastest(stats: dict) -> dict:
    """The player's car or a stock one, whichever is faster: rivals end a race the player did not finish."""
    stock = eco.stats_of({}, [])
    return stats if eco.speed_bound(stats) >= eco.speed_bound(stock) else stock


def _check_lap(track: dict, stats: dict, best_lap) -> None:
    if best_lap is None:
        return
    if not isinstance(best_lap, (int, float)) or not math.isfinite(best_lap) or best_lap < min_lap(track, stats):
        raise CareerError("impossible_lap")


def check_career_race(track: dict, stats: dict, result: dict, elapsed: float) -> None:
    """A career race: its place, best lap and cash, `elapsed` seconds after it started."""
    position, cash = result["position"], result["cash"]
    if not 1 <= position <= eco.economy()["racers"]:
        raise CareerError("bad_position")
    if not 0 <= cash <= max_cash(track, stats):
        raise CareerError("impossible_cash")
    _check_lap(track, stats, result.get("bestLap"))
    if elapsed < min_race(track, _fastest(stats)):
        raise CareerError("too_soon")


def check_challenge_run(track: dict, stats: dict, time: float, best_lap, elapsed: float) -> None:
    """A challenge run: its race time and best lap, `elapsed` seconds after it started."""
    if not isinstance(time, (int, float)) or not math.isfinite(time) or time < min_race(track, stats):
        raise CareerError("impossible_time")
    _check_lap(track, stats, best_lap)
    if best_lap is not None and best_lap > time:
        raise CareerError("impossible_lap")
    if elapsed < time * CLOCK_SLACK:
        raise CareerError("too_soon")
