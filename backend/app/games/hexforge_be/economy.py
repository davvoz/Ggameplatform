"""
Hexforge: materials, production and the city a new player starts with.

Pure functions over plain dicts; the clock is always passed in, so the rules
are testable without waiting and the service decides what "now" is.

Production is lazy: a production building stores when it was last collected,
and what it has made since is computed on read, up to CAP_HOURS of output.
"""

from __future__ import annotations

from .catalog import BUILDINGS
from .upgrades import cap_factor, rate_factor

MATERIALS = ("rune_stone", "scrap", "mana", "chips")

# building type -> (material, units per hour)
PRODUCTION: dict[str, tuple[str, int]] = {
    "rune_quarry": ("rune_stone", 60),
    "scrap_foundry": ("scrap", 60),
    "mana_well": ("mana", 45),
    "data_node": ("chips", 30),
}
CAP_HOURS = 8

STARTING_MATERIALS = {"rune_stone": 300, "scrap": 300, "mana": 200, "chips": 120}
STARTING_HEROES = ["guardian", "neon_blade", "neon_blade", "technomancer"]

GRID = 18                      # the battle field; the city itself is cells 1..GRID-2
BUILD_MIN, BUILD_MAX = 1, GRID - 2

_STARTER_LAYOUT = [
    ("core", 7, 7),
    ("rune_tower", 4, 7),
    ("frost_tower", 11, 7),
    ("vault", 7, 3),
    ("rune_quarry", 3, 11),
    ("scrap_foundry", 6, 12),
    ("mana_well", 9, 12),
    ("data_node", 12, 11),
]
_STARTER_RING = (6, 10)        # walls around the core


def starter_city(now: float) -> dict:
    layout = list(_STARTER_LAYOUT)
    lo, hi = _STARTER_RING
    for x in range(lo, hi + 1):
        for y in range(lo, hi + 1):
            if x in (lo, hi) or y in (lo, hi):
                layout.append(("wall", x, y))
    buildings = []
    for index, (kind, x, y) in enumerate(layout, start=1):
        b = {"id": index, "type": kind, "x": x, "y": y}
        if kind in PRODUCTION:
            b["collected_at"] = now
        buildings.append(b)
    return {"grid": GRID, "next_id": len(buildings) + 1, "buildings": buildings}


def starter_heroes() -> list[dict]:
    return [{"id": i, "cls": cls} for i, cls in enumerate(STARTING_HEROES, start=1)]


# ── production ─────────────────────────────────────────────────────────
def pending(building: dict, now: float) -> int:
    """Units a production building has made since it was last collected (all materials together)."""
    return sum(pending_all(building, now).values())


def outputs(building: dict) -> list[tuple[str, float, float]]:
    """[(material, units per hour, hours before full)]: one row for a plain producer,
    one per producing part for a fused building (see fusion.py)."""
    if not building.get("fusion"):
        made = PRODUCTION.get(building["type"])
        return [(made[0], rate_of(building), CAP_HOURS * cap_factor(building))] if made else []
    rows = []
    for part in building["fusion"]["parts"]:
        made = PRODUCTION.get(part["type"])
        if made is None:
            continue
        probe = {"type": part["type"], "level": 5, "path": part.get("path")}
        rows.append((made[0], made[1] * rate_factor(probe) * part["power"], CAP_HOURS * cap_factor(probe)))
    return rows


def pending_all(building: dict, now: float) -> dict:
    """{material: units made since the last collection}."""
    if "collected_at" not in building:
        return {}
    hours = max(0.0, now - building["collected_at"]) / 3600
    made: dict = {}
    for material, per_hour, cap_hours in outputs(building):
        made[material] = made.get(material, 0) + int(min(hours, cap_hours) * per_hour)
    return made


def rate_of(building: dict) -> float:
    """Units per hour, upgrades included."""
    return PRODUCTION[building["type"]][1] * rate_factor(building)


def capacity(building_type: str, building: dict | None = None) -> int:
    b = building or {"type": building_type}
    return int(CAP_HOURS * cap_factor(b) * rate_of(b))


def collect(city: dict, materials: dict, now: float, building_ids=None) -> dict:
    """Move what production buildings have made into the stock.

    Mutates `city` and `materials`; returns {material: units collected}.
    `building_ids` limits the collection to those buildings (default: all).
    """
    gained = dict.fromkeys(MATERIALS, 0)
    wanted = None if building_ids is None else set(building_ids)
    for b in city["buildings"]:
        if wanted is not None and b["id"] not in wanted:
            continue
        made = {m: n for m, n in pending_all(b, now).items() if n > 0}
        if not made:
            continue
        for material, amount in made.items():
            materials[material] = materials.get(material, 0) + amount
            gained[material] += amount
        rows = outputs(b)
        if len(rows) > 1 or now - b["collected_at"] >= rows[0][2] * 3600:
            b["collected_at"] = now        # a full store (or several materials) starts again from now
        else:
            # keep the fraction of a unit already made
            b["collected_at"] += made[rows[0][0]] * 3600 / rows[0][1]
    return gained


# ── placement ──────────────────────────────────────────────────────────
def footprint(building_type: str, x: int, y: int) -> set[tuple[int, int]]:
    size = BUILDINGS[building_type].size
    return {(cx, cy) for cx in range(x, x + size) for cy in range(y, y + size)}


def placement_error(city: dict, building_type: str, x: int, y: int, ignore_id=None):
    """Why a building of this type cannot stand at (x, y), or None if it can."""
    size = BUILDINGS[building_type].size
    if x < BUILD_MIN or y < BUILD_MIN or x + size - 1 > BUILD_MAX or y + size - 1 > BUILD_MAX:
        return "outside_city"
    wanted = footprint(building_type, x, y)
    for other in city["buildings"]:
        if other["id"] == ignore_id:
            continue
        if wanted & footprint(other["type"], other["x"], other["y"]):
            return "occupied"
    return None
