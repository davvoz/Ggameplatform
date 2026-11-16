"""
How a race of Apex Drive reads in a ping (app/routers/pings.py): a career
race pays credits, not points, so its session's score is 0; the ping tells
the place on the track instead, a challenge run its time, a race or a run
left before the flag a DNF.

The session's extra_data comes from the browser: only what is checked here
reaches the ping. The track must be one of the game's (its name comes from
economy.json, never from the browser), the place one a race can have, the
times plain numbers within reason.
"""

from . import economy as eco

# A race time beyond this (seconds) is not believed: the time is left out.
LONGEST = 3600
ORDINALS = {1: "1ST", 2: "2ND", 3: "3RD"}


def ordinal(place: int) -> str:
    return ORDINALS.get(place, f"{place}TH")


def race_time(seconds: float) -> str:
    """1:23.45, as the game shows it."""
    hundredths = round(seconds * 100)
    minutes, rest = divmod(hundredths, 6000)
    return f"{minutes}:{rest // 100:02d}.{rest % 100:02d}"


def _seconds(value) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return float(value) if 0 < value < LONGEST else None


def _place(value) -> int | None:
    racers = eco.economy()["racers"]
    if isinstance(value, bool) or not isinstance(value, int):
        return None
    return value if 1 <= value <= racers else None


def _career(name: str, data: dict) -> dict | None:
    place = _place(data.get("position"))
    if place is None:
        return None
    lap = _seconds(data.get("best_lap"))
    best = f" (best lap {race_time(lap)})" if lap else ""
    if place == 1:
        headline = f"I won on {name} in Apex Drive! 🏆{best}"
    elif place <= eco.economy()["podium"]:
        headline = f"I finished {ordinal(place).lower()} on {name} in Apex Drive! 🏁{best}"
    else:
        headline = f"I raced {name} in Apex Drive: {ordinal(place).lower()} at the flag 🏁{best}"
    return {"headline": headline, "label": "PLACE", "value": ordinal(place)}


def _challenge(name: str, data: dict, score: int) -> dict | None:
    time = _seconds(data.get("time"))
    if time is None:
        return None
    headline = f"I drove the Apex Drive weekly challenge on {name} in {race_time(time)}! ⏱️ {score:,} points"
    return {"headline": headline, "label": "TIME", "value": race_time(time)}


def _unscored(name: str) -> dict:
    return {"headline": f"I took on the Apex Drive weekly challenge on {name} 🏁", "label": "CHALLENGE", "value": "DNF"}


def _retired(name: str) -> dict:
    return {"headline": f"I raced {name} in Apex Drive 🏁", "label": "PLACE", "value": "DNF"}


def ping_result(data: dict, score: int) -> dict | None:
    """The ping's headline and the card's label and value, or None to fall back to points."""
    track = eco.track(data.get("track")) if isinstance(data.get("track"), str) else None
    if not track:
        return None
    name = track["name"]
    mode = data.get("mode")
    if mode == "career":
        return _career(name, data)
    if mode == "challenge":
        return _challenge(name, data, score)
    if mode == "challenge_unscored":
        return _unscored(name)
    if mode == "career_dnf":
        return _retired(name)
    return None
