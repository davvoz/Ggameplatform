"""
Hexforge: the Explorer, a hero who never fights but goes on missions.

  forge     the Explorer is forged like any hero and takes a hero slot;
            a player may have several.
  missions  the player picks how long (1 h, 4 h or 8 h); the loot stays a
            surprise until the Explorer comes back. Longer trips bring more
            and a better chance of bonuses and items.
  items     the Explorer carries only its own: the Treasure Map (more loot)
            and the Trail Boots (shorter trips).
  loot      drawn from a seed fixed when the trip starts, so claiming is
            repeatable and cannot be re-rolled.

Pure rules over plain dicts, like the other modules.
"""

from __future__ import annotations

import random

from . import items, rewards
from .economy import MATERIALS
from .errors import ActionError

EXPLORER = "explorer"

# kind -> (seconds, materials in total, chance of a bonus, chance of an item, player XP)
MISSIONS = {
    "scout": (3600, 240, 0.35, 0.06, 15),
    "expedition": (4 * 3600, 700, 0.7, 0.18, 40),
    "voyage": (8 * 3600, 1300, 1.0, 0.4, 70),
}
BONUS_ODDS = (("hourglass", 5), ("salve", 3), ("flask", 3), ("golden_hourglass", 1))


def is_explorer(hero: dict) -> bool:
    return hero["cls"] == EXPLORER


def _effect(city: dict, hero_id: int, key: str) -> float:
    total = 0.0
    for carried in items.carried_by(city, hero_id):
        k, value = items.effect(carried["type"], carried["level"])
        if k == key:
            total += value
    return total


def trip_seconds(city: dict, hero_id: int, kind: str) -> int:
    """The trip's length, shortened by the Trail Boots."""
    return round(MISSIONS[kind][0] * (1 - _effect(city, hero_id, "trip_pct") / 100))


def start(city: dict, heroes: list, hero_id: int, kind: str, now: float, rng: random.Random | None = None) -> dict:
    hero = next((h for h in heroes if h["id"] == hero_id), None)
    if hero is None:
        raise ActionError("unknown_hero")
    if not is_explorer(hero):
        raise ActionError("not_an_explorer")
    if kind not in MISSIONS:
        raise ActionError("unknown_mission")
    if hero.get("mission"):
        raise ActionError("on_mission")
    seconds = trip_seconds(city, hero_id, kind)
    hero["mission"] = {"kind": kind, "started_at": now, "ready_at": now + seconds,
                       "seed": (rng or random.Random()).getrandbits(32)}
    return hero["mission"]


def loot_of(city: dict, hero_id: int, mission: dict) -> dict:
    """What the trip brings back: fixed by the trip's seed and the map carried at the start of the claim."""
    _, total, bonus_chance, item_chance, xp = MISSIONS[mission["kind"]]
    rng = random.Random(mission["seed"])
    total = round(total * (1 + _effect(city, hero_id, "loot_pct") / 100))
    weights = [rng.random() + 0.3 for _ in MATERIALS]
    materials = {m: round(total * w / sum(weights)) for m, w in zip(MATERIALS, weights)}
    loot = {"materials": materials, "bonuses": {}, "item": None, "xp": xp}
    picks = 2 if mission["kind"] == "voyage" and rng.random() < 0.35 else 1
    for _ in range(picks):
        if rng.random() < bonus_chance:
            names, odds = zip(*BONUS_ODDS)
            bonus = rng.choices(names, odds)[0]
            loot["bonuses"][bonus] = loot["bonuses"].get(bonus, 0) + 1
    if rng.random() < item_chance:
        loot["item"] = rng.choice(sorted(items.ITEMS))
    return loot


def claim(city: dict, heroes: list, materials: dict, hero_id: int, now: float) -> dict:
    """Bring the Explorer home and hand over the loot (an item only when the armoury has room)."""
    hero = next((h for h in heroes if h["id"] == hero_id), None)
    if hero is None:
        raise ActionError("unknown_hero")
    mission = hero.get("mission")
    if not mission:
        raise ActionError("no_mission")
    if mission["ready_at"] > now:
        raise ActionError("not_ready")
    loot = rewards.grant(city, materials, loot_of(city, hero_id, mission))   # adds "levels"
    if loot["item"]:
        items.ensure_items(city)
        if len(city["items"]) < items.ITEM_LIMIT:
            loot["item_id"] = items.add(city, loot["item"])["id"]
        else:
            loot["item"] = None
    del hero["mission"]
    loot["kind"] = mission["kind"]
    return loot


def public_missions() -> dict:
    return {kind: {"seconds": s, "loot": total, "bonus_chance": b, "item_chance": i}
            for kind, (s, total, b, i, _) in MISSIONS.items()}
