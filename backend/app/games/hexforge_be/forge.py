"""
Hexforge: the forge, the storage and dismantling.

Everything new is forged from a fixed recipe: exact cost, exact result, no
randomness. A job takes real time; when it is ready the player claims it.
Forged buildings go to storage and are placed on the grid from there;
forged heroes join the roster.

The forge and the storage live inside the city JSON (`city["forge"]`,
`city["storage"]`); `ensure_forge` adds them to cities saved before they
existed. All functions mutate the dicts they get and raise ActionError on a
broken rule, leaving them untouched.
"""

from __future__ import annotations

from dataclasses import dataclass

from . import economy, evolution, progress
from .catalog import BUILDINGS, HEROES
from .errors import ActionError

FORGE_SLOTS = 2
REFUND_SHARE = 0.5
UNDISMANTLABLE = ("core", "vault")


@dataclass(frozen=True)
class Recipe:
    item: str
    kind: str              # building | hero
    cost: dict
    seconds: int
    yields: int = 1


def _r(item, kind, seconds, yields=1, **cost):
    return Recipe(item=item, kind=kind, cost=cost, seconds=seconds, yields=yields)


RECIPES: dict[str, Recipe] = {r.item: r for r in (
    _r("wall", "building", 120, yields=5, rune_stone=60),
    _r("rune_tower", "building", 600, rune_stone=120, scrap=60),
    _r("lightning_tower", "building", 900, scrap=80, chips=60, mana=40),
    _r("frost_tower", "building", 900, mana=100, rune_stone=60),
    _r("rune_trap", "building", 300, mana=40, chips=20),
    _r("rune_quarry", "building", 480, scrap=80),
    _r("scrap_foundry", "building", 480, rune_stone=80),
    _r("mana_well", "building", 600, rune_stone=60, scrap=40),
    _r("data_node", "building", 720, scrap=80, mana=40),
    _r("guardian", "hero", 3600, scrap=150, rune_stone=60),
    _r("neon_blade", "hero", 3600, scrap=100, chips=60),
    _r("technomancer", "hero", 5400, mana=120, chips=50),
)}

# How many of a kind a player may own (placed + stored + being forged).
LIMIT_GROUPS: dict[str, tuple[tuple[str, ...], int]] = {
    "walls": (("wall",), 60),
    "towers": (("rune_tower", "lightning_tower", "frost_tower"), 8),
    "traps": (("rune_trap",), 6),
    "rune_quarry": (("rune_quarry",), 2),
    "scrap_foundry": (("scrap_foundry",), 2),
    "mana_well": (("mana_well",), 2),
    "data_node": (("data_node",), 2),
    "heroes": (tuple(HEROES), 8),     # the real limit grows with the player's level
}
_GROUP_OF = {item: name for name, (items, _) in LIMIT_GROUPS.items() for item in items}


def ensure_forge(city: dict) -> None:
    city.setdefault("forge", {"slots": FORGE_SLOTS, "jobs": [], "next_job_id": 1})
    city.setdefault("storage", {})


# ── counting and limits ───────────────────────────────────────────────
def owned(city: dict, heroes: list, items) -> int:
    """Placed + stored + being forged, for these items."""
    items = set(items)
    count = sum(1 for b in city["buildings"] if b["type"] in items)
    count += sum(n for item, n in city["storage"].items() if item in items)
    count += sum(1 for h in heroes if h["cls"] in items)
    count += sum(RECIPES[j["recipe"]].yields for j in city["forge"]["jobs"] if j["recipe"] in items)
    return count


def limit_of(city: dict, group: str) -> int:
    """How many of a group the player may own; heroes grow with the player's level."""
    if group == "heroes" and "progress" in city:
        return progress.hero_slots(city)
    return LIMIT_GROUPS[group][1]


def room_for(city: dict, heroes: list, item: str) -> int:
    group = _GROUP_OF[item]
    return limit_of(city, group) - owned(city, heroes, LIMIT_GROUPS[group][0])


# ── forging ────────────────────────────────────────────────────────────
def start(city: dict, heroes: list, materials: dict, recipe_id: str, now: float) -> dict:
    recipe = RECIPES.get(recipe_id)
    if recipe is None:
        raise ActionError("unknown_recipe")
    forge = city["forge"]
    if len(forge["jobs"]) >= forge["slots"]:
        raise ActionError("forge_busy")
    if room_for(city, heroes, recipe.item) < recipe.yields:
        raise ActionError("limit_reached")
    if any(materials.get(m, 0) < amount for m, amount in recipe.cost.items()):
        raise ActionError("not_enough_materials")
    for m, amount in recipe.cost.items():
        materials[m] -= amount
    job = {"id": forge["next_job_id"], "recipe": recipe_id,
           "started_at": now, "ready_at": now + recipe.seconds}
    forge["next_job_id"] += 1
    forge["jobs"].append(job)
    return job


def claim(city: dict, heroes: list, job_id: int, now: float) -> dict:
    forge = city["forge"]
    job = next((j for j in forge["jobs"] if j["id"] == job_id), None)
    if job is None:
        raise ActionError("unknown_job")
    if job["ready_at"] > now:
        raise ActionError("not_ready")
    if job["recipe"] == "evolve":
        forge["jobs"].remove(job)
        return evolution.finish(job, heroes)
    recipe = RECIPES[job["recipe"]]
    forge["jobs"].remove(job)
    if recipe.kind == "hero":
        next_id = max((h["id"] for h in heroes), default=0) + 1
        for i in range(recipe.yields):
            heroes.append({"id": next_id + i, "cls": recipe.item})
    else:
        city["storage"][recipe.item] = city["storage"].get(recipe.item, 0) + recipe.yields
    return {"item": recipe.item, "kind": recipe.kind, "count": recipe.yields, "seconds": recipe.seconds}


# ── storage and dismantling ────────────────────────────────────────────
def place(city: dict, building_type: str, x: int, y: int, now: float) -> dict:
    if city["storage"].get(building_type, 0) <= 0:
        raise ActionError("not_in_storage")
    error = economy.placement_error(city, building_type, x, y)
    if error:
        raise ActionError(error)
    building = {"id": city["next_id"], "type": building_type, "x": x, "y": y}
    if building_type in economy.PRODUCTION:
        building["collected_at"] = now
    city["next_id"] += 1
    city["buildings"].append(building)
    city["storage"][building_type] -= 1
    if city["storage"][building_type] == 0:
        del city["storage"][building_type]
    return building


def refund_of(building_type: str) -> dict:
    recipe = RECIPES.get(building_type)
    if recipe is None:
        return {}
    return {m: int(amount * REFUND_SHARE / recipe.yields) for m, amount in recipe.cost.items()}


def dismantle(city: dict, materials: dict, building_id: int, now: float) -> dict:
    building = next((b for b in city["buildings"] if b["id"] == building_id), None)
    if building is None:
        raise ActionError("unknown_building")
    if building["type"] in UNDISMANTLABLE:
        raise ActionError("cannot_dismantle")
    economy.collect(city, materials, now, building_ids=[building_id])
    refund = refund_of(building["type"])
    for m, amount in refund.items():
        materials[m] = materials.get(m, 0) + amount
    city["buildings"].remove(building)
    return refund


def public_recipes(city: dict, heroes: list) -> list[dict]:
    rows = []
    for recipe in RECIPES.values():
        group = _GROUP_OF[recipe.item]
        items, limit = LIMIT_GROUPS[group][0], limit_of(city, group)
        rows.append({
            "id": recipe.item, "kind": recipe.kind, "cost": recipe.cost,
            "seconds": recipe.seconds, "yields": recipe.yields,
            "size": BUILDINGS[recipe.item].size if recipe.kind == "building" else None,
            "refund": refund_of(recipe.item) if recipe.kind == "building" else None,
            "group": _GROUP_OF[recipe.item], "owned": owned(city, heroes, items), "limit": limit,
        })
    return rows
