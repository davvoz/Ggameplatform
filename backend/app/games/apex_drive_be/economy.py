"""
The career's rules as data, read from economy.json: prices, what parts and
mods do to the car, prizes, worlds and tracks. The file is generated from the
game's own config (apex_drive/tools/export-economy.js; the game's tests fail
when it is out of date), so the server and the game never disagree.

Pure functions over that data; stats work as the game's sim/Build.js.
"""

import json
from functools import lru_cache
from pathlib import Path

FILE = Path(__file__).with_name("economy.json")

# A slipstream never cuts more than this share of the air drag (a speed bound must stay finite).
DRAFT_CAP = 0.9


@lru_cache(maxsize=1)
def economy() -> dict:
    return json.loads(FILE.read_text(encoding="utf-8"))


def apply_effect(stats: dict, effect: dict | None) -> dict:
    """`mul` multiplies a stat, then `add` adds to it, as the game does."""
    effect = effect or {}
    for key, factor in effect.get("mul", {}).items():
        stats[key] *= factor
    for key, amount in effect.get("add", {}).items():
        stats[key] += amount
    return stats


def stats_of(parts: dict, mods: list) -> dict:
    """The car's stats: the base, then every part installed, then every mod fitted."""
    data = economy()
    stats = dict(data["base"])
    for category, tier in parts.items():
        tiers = data["parts"].get(category, [])
        if 0 <= tier < len(tiers):
            apply_effect(stats, tiers[tier]["effect"])
    for mod_id in mods:
        if mod_id in data["mods"]:
            apply_effect(stats, data["mods"][mod_id]["effect"])
    stats["nitroCharges"] = max(0, min(data["physics"]["maxNitro"], round(stats["nitroCharges"])))
    return stats


def speed_bound(stats: dict) -> float:
    """
    A speed no car with these stats can pass, world units per second: the
    engine on nitro all the time, in the deepest slipstream, on a flat road
    with no rolling resistance (where power / speed equals the air drag).
    """
    draft = min(DRAFT_CAP, stats["draftBonus"])
    power = stats["power"] * max(1.0, stats["nitroPower"])
    return (power / (stats["drag"] * (1 - draft))) ** (1 / 3)


def track(track_id: str) -> dict | None:
    return economy()["tracks"].get(track_id)


def worlds() -> list:
    return economy()["worlds"]
