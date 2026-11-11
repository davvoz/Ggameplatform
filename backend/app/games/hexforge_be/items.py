"""
Hexforge: hero items, forged and upgraded at the forge, carried into battle.

  slots    every hero carries one weapon (of its own class) and one spell
           (any class).
  forging  an item is a forge recipe like any other (kind "item"); it lands
           in the armoury (`city["items"]`) at level 1.
  upgrade  a forge job raises an item one level, up to MAX_LEVEL; it costs
           the recipe times the new level and takes as many times longer.
           The item keeps working while it is upgraded.
  effects  grow with the level (see EFFECTS); applied on top of the hero's
           class, form and tier when a squad is built.

An item is {"id", "type", "level", "hero": hero id or None}. A squad entry
for the simulation carries the items as [{"type", "level"}], so a replay
rebuilds the same battle. Pure functions over plain dicts.
"""

from __future__ import annotations

from dataclasses import replace

from .catalog import HeroClass
from .errors import ActionError

MAX_LEVEL = 5
ITEM_LIMIT = 24
UPGRADE_SECONDS = 1200        # times the new level

# type -> (slot, class or None for any, effect key, effect per level)
ITEMS = {
    "rune_maul": ("weapon", "guardian", "damage_pct", 6),
    "aegis_plate": ("weapon", "guardian", "hp_pct", 6),
    "plasma_edge": ("weapon", "neon_blade", "damage_pct", 6),
    "flux_daggers": ("weapon", "neon_blade", "haste_pct", 4),
    "storm_staff": ("weapon", "technomancer", "spell_pct", 6),
    "focus_lens": ("weapon", "technomancer", "range", 0.3),
    "ward_sigil": ("spell", None, "barrier_pct", 8),
    "mending_rune": ("spell", None, "regen_pct", 0.3),
    "haste_rune": ("spell", None, "speed_pct", 7),
    "treasure_map": ("weapon", "explorer", "loot_pct", 10),
    "trail_boots": ("spell", "explorer", "trip_pct", 6),
}

# the forge recipes: (seconds, cost)
RECIPES = {
    "rune_maul": (1200, {"scrap": 200, "rune_stone": 120}),
    "aegis_plate": (1200, {"rune_stone": 200, "scrap": 120}),
    "plasma_edge": (1200, {"chips": 120, "scrap": 150}),
    "flux_daggers": (1200, {"chips": 150, "mana": 80}),
    "storm_staff": (1200, {"mana": 200, "chips": 80}),
    "focus_lens": (1200, {"chips": 150, "rune_stone": 100}),
    "ward_sigil": (1500, {"mana": 150, "rune_stone": 100}),
    "mending_rune": (1500, {"mana": 180, "chips": 60}),
    "haste_rune": (1500, {"mana": 120, "scrap": 120}),
    "treasure_map": (1200, {"chips": 120, "rune_stone": 100}),
    "trail_boots": (1200, {"scrap": 150, "mana": 80}),
}


def ensure_items(city: dict) -> None:
    city.setdefault("items", [])
    city.setdefault("next_item_id", 1)


def effect(item_type: str, level: int) -> tuple[str, float]:
    _, _, key, per_level = ITEMS[item_type]
    return key, round(per_level * level, 2)


def apply(spec: HeroClass, carried: list) -> HeroClass:
    """The stats of a hero carrying `carried` ([{"type", "level"}])."""
    for item in carried:
        key, value = effect(item["type"], item["level"])
        if key == "damage_pct":
            spec = replace(spec, damage=round(spec.damage * (1 + value / 100)))
        elif key == "hp_pct":
            spec = replace(spec, hp=round(spec.hp * (1 + value / 100)))
        elif key == "haste_pct":
            spec = replace(spec, cooldown=round(spec.cooldown * (1 - value / 100), 3))
        elif key == "spell_pct":
            spec = replace(spec, damage=round(spec.damage * (1 + value / 100)),
                           nova_damage=round(spec.nova_damage * (1 + value / 100)))
        elif key == "range":
            spec = replace(spec, attack_range=round(spec.attack_range + value, 2))
        elif key == "barrier_pct":
            spec = replace(spec, barrier=round(spec.hp * value / 100))
        elif key == "regen_pct":
            spec = replace(spec, regen=round(spec.hp * value / 100, 2))
        elif key == "speed_pct":
            spec = replace(spec, speed=round(spec.speed * (1 + value / 100), 3))
    return spec


def carried_by(city: dict, hero_id: int) -> list:
    return [{"type": i["type"], "level": i["level"]} for i in city.get("items", []) if i.get("hero") == hero_id]


# ── forging, equipping, upgrading ──────────────────────────────────────
def add(city: dict, item_type: str) -> dict:
    item = {"id": city["next_item_id"], "type": item_type, "level": 1, "hero": None}
    city["next_item_id"] += 1
    city["items"].append(item)
    return item


def _item(city: dict, item_id: int) -> dict:
    item = next((i for i in city["items"] if i["id"] == item_id), None)
    if item is None:
        raise ActionError("unknown_item")
    return item


def equip(city: dict, heroes: list, hero_id: int, item_id: int) -> dict:
    """Give an item to a hero (taking it from whoever had it); it replaces what was in that slot."""
    hero = next((h for h in heroes if h["id"] == hero_id), None)
    if hero is None:
        raise ActionError("unknown_hero")
    item = _item(city, item_id)
    slot, cls, _, _ = ITEMS[item["type"]]
    if cls is not None and cls != hero["cls"]:
        raise ActionError("wrong_class")
    if cls is None and hero["cls"] == "explorer":      # the Explorer carries only its own gear
        raise ActionError("wrong_class")
    for other in city["items"]:
        if other["hero"] == hero_id and ITEMS[other["type"]][0] == slot:
            other["hero"] = None
    item["hero"] = hero_id
    return item


def unequip(city: dict, item_id: int) -> dict:
    item = _item(city, item_id)
    item["hero"] = None
    return item


def start_upgrade(city: dict, materials: dict, item_id: int, now: float) -> dict:
    item = _item(city, item_id)
    if item["level"] >= MAX_LEVEL:
        raise ActionError("max_level")
    forge = city["forge"]
    if any(j["recipe"] == "upgrade" and j["item"] == item_id for j in forge["jobs"]):
        raise ActionError("already_upgrading")
    if len(forge["jobs"]) >= forge["slots"]:
        raise ActionError("forge_busy")
    level = item["level"] + 1
    cost = upgrade_cost(item["type"], level)
    if any(materials.get(m, 0) < n for m, n in cost.items()):
        raise ActionError("not_enough_materials")
    for m, n in cost.items():
        materials[m] -= n
    job = {"id": forge["next_job_id"], "recipe": "upgrade", "item": item_id, "type": item["type"],
           "level": level, "started_at": now, "ready_at": now + UPGRADE_SECONDS * level}
    forge["next_job_id"] += 1
    forge["jobs"].append(job)
    return job


def finish_upgrade(city: dict, job: dict) -> dict:
    item = next((i for i in city["items"] if i["id"] == job["item"]), None)
    if item is not None:
        item["level"] = max(item["level"], job["level"])
    return {"item": job["type"], "kind": "upgrade", "count": 1 if item else 0, "item_id": job["item"],
            "level": job["level"], "seconds": UPGRADE_SECONDS * job["level"]}


def upgrade_cost(item_type: str, level: int) -> dict:
    _, cost = RECIPES[item_type]
    return {m: n * level for m, n in cost.items()}


# ── what the client sees ───────────────────────────────────────────────
def public_items() -> dict:
    """What every item does at every level, and what upgrades cost."""
    table = {}
    for item_type, (slot, cls, key, _) in ITEMS.items():
        table[item_type] = {
            "slot": slot, "cls": cls, "effect": key,
            "levels": [effect(item_type, lv)[1] for lv in range(1, MAX_LEVEL + 1)],
            "upgrades": {str(lv): {"cost": upgrade_cost(item_type, lv), "seconds": UPGRADE_SECONDS * lv}
                         for lv in range(2, MAX_LEVEL + 1)},
        }
    return {"max_level": MAX_LEVEL, "limit": ITEM_LIMIT, "items": table}
