"""
The weekly challenge: one track for everybody, a new one every Monday (UTC,
as the platform's weekly leaderboard), the tracks taken in turn. Everybody
races it with their own car against the same rivals (one seed a week), and
the time becomes the leaderboard's score: the higher the faster.

Pure functions of the clock and the economy.
"""

from datetime import datetime, timedelta, timezone

from . import economy as eco

# A Monday: week 0 of the rotation.
EPOCH = datetime(2026, 1, 5, tzinfo=timezone.utc)
# Points for a race as fast as the par time; twice as fast would be twice as many.
POINTS = 10_000


def track_order() -> list:
    return [track_id for world in eco.worlds() for track_id in world["tracks"]]


def week_of(now: float) -> tuple:
    """The ISO week id ('2026-W47') and the number of weeks since EPOCH."""
    moment = datetime.fromtimestamp(now, timezone.utc)
    year, week, _ = moment.isocalendar()
    monday = (moment - timedelta(days=moment.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    return f"{year}-W{week:02d}", (monday - EPOCH).days // 7


def seed_of(week_id: str) -> int:
    """The rivals' seed of a week: the same for everybody (FNV-1a, as the game's other weekly modes)."""
    value = 0x811C9DC5
    for char in f"apex-drive:{week_id}":
        value = ((value ^ ord(char)) * 0x01000193) & 0xFFFFFFFF
    return value % 2_147_483_647 or 1


def challenge_of(now: float) -> dict:
    week_id, index = week_of(now)
    order = track_order()
    track_id = order[index % len(order)]
    return {"weekId": week_id, "trackId": track_id, "laps": eco.track(track_id)["laps"], "seed": seed_of(week_id)}


def par_of(track: dict) -> float:
    """The race at the reference speed all the way: no car really gets there."""
    return track["laps"] * track["lapLength"] / eco.economy()["physics"]["refSpeed"]


def score_of(track: dict, time: float) -> int:
    return round(POINTS * par_of(track) / time)
