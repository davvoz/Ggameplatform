"""
Hexforge: the gremlins, a little game played on the city map.

Every GREMLIN_HOURS a gang of TOTAL mechanical gremlins is ready to raid the
city: the player starts it, the gremlins run from the edge of the map at the
buildings, and every one tapped before it gets there is caught. The client
reports how many were caught; like the anvil, it is not policed.

  loot      every gremlin caught drops a handful of one material (picked at
            random), more for a higher player level.
  bonus     catching the whole gang adds an Hourglass.

Pure functions over plain dicts.
"""

from __future__ import annotations

import random

from . import progress
from .economy import MATERIALS
from .errors import ActionError

GREMLIN_HOURS = 3
TOTAL = 12
BASE_LOOT = 12
LOOT_PER_LEVEL = 3


def ready_at(city: dict) -> float:
    return city.get("gremlins_at", 0)


def loot_per_gremlin(city: dict) -> int:
    level = progress.level_of(city["progress"]["xp"])[0] if "progress" in city else 1
    return BASE_LOOT + LOOT_PER_LEVEL * level


def catch(city: dict, materials: dict, caught: int, now: float, rng: random.Random | None = None) -> dict:
    """Hand out what the caught gremlins drop. Returns {loot, bonus, caught, ready_at}."""
    if ready_at(city) > now:
        raise ActionError("gremlins_away")
    if not 0 <= caught <= TOTAL:
        raise ActionError("bad_score")
    rng = rng or random.Random()
    each = loot_per_gremlin(city)
    loot: dict = {}
    for _ in range(caught):
        material = rng.choice(MATERIALS)
        loot[material] = loot.get(material, 0) + each
    for material, amount in loot.items():
        materials[material] = materials.get(material, 0) + amount
    bonus = None
    if caught == TOTAL:
        bonus = "hourglass"
        bonuses = city.setdefault("bonuses", {})
        bonuses[bonus] = bonuses.get(bonus, 0) + 1
    city["gremlins_at"] = now + GREMLIN_HOURS * 3600
    return {"loot": loot, "bonus": bonus, "caught": caught, "ready_at": city["gremlins_at"]}
