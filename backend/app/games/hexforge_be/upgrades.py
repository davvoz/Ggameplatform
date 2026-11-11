"""
Hexforge: building upgrades.

  levels   every building type goes from level 1 to 5. A level counts for the
           whole type: upgrading one Rune Tower upgrades them all, and towers
           forged later arrive at that level. Each level adds 10 % health,
           damage and production.
  core     no building may be above the Core's level: the Core leads.
  paths    reaching level 3, the player picks one of two paths for the type
           (like a hero's form); levels 4 and 5 push that path further.
  forge    an upgrade is a forge job: it takes a slot and time, costs more
           each level, and the buildings keep working meanwhile.

The table lives in `city["upgrades"]` ({type: {"level", "path"}}); every
building also carries its type's `level` and `path` (`stamp`), so the
economy and the battle read them straight from the building.
"""

from __future__ import annotations

from dataclasses import replace

from .catalog import BUILDINGS, CORE, BuildingType
from .errors import ActionError

MAX_LEVEL = 5
PATH_LEVEL = 3
GROWTH = 0.10                 # health, damage and production per level above 1
REACH_GROWTH = 0.25           # cells of reach per level above 1, for anything that shoots
VAULT_BASE = 400              # what a level-1 vault keeps safe, per material
UPGRADE_SECONDS = {2: 300, 3: 900, 4: 1800, 5: 3600}   # by new level: early levels come quickly; the Core takes twice as long

PATHS = {
    "rune_tower": ("sniper", "gatling"),
    "lightning_tower": ("storm", "overload"),
    "frost_tower": ("glacier", "blizzard"),
    "wall": ("bulwark", "spiked"),
    "rune_trap": ("inferno", "snare"),
    "rune_quarry": ("rich_vein", "deep_store"),
    "scrap_foundry": ("rich_vein", "deep_store"),
    "mana_well": ("rich_vein", "deep_store"),
    "data_node": ("rich_vein", "deep_store"),
    "vault": ("strongbox", "armored"),
    CORE: ("citadel", "beacon"),
}

# cost of reaching level 2; level L costs this × (L - 1)
BASE_COST = {
    CORE: {"rune_stone": 300, "scrap": 300, "mana": 150, "chips": 100},
    "vault": {"rune_stone": 250, "scrap": 200},
    "wall": {"rune_stone": 250},
    "rune_tower": {"rune_stone": 150, "scrap": 100},
    "lightning_tower": {"scrap": 120, "chips": 90, "mana": 60},
    "frost_tower": {"mana": 130, "rune_stone": 90},
    "rune_trap": {"mana": 80, "chips": 50},
    "rune_quarry": {"scrap": 120},
    "scrap_foundry": {"rune_stone": 120},
    "mana_well": {"rune_stone": 90, "scrap": 60},
    "data_node": {"scrap": 120, "mana": 60},
}


def ensure_upgrades(city: dict) -> None:
    city.setdefault("upgrades", {})
    stamp(city)


def level_of(city: dict, building_type: str) -> int:
    return city.get("upgrades", {}).get(building_type, {}).get("level", 1)


def path_of(city: dict, building_type: str):
    return city.get("upgrades", {}).get(building_type, {}).get("path")


def stamp(city: dict) -> None:
    """Copy every type's level and path onto its buildings."""
    for b in city["buildings"]:
        row = city.get("upgrades", {}).get(b["type"])
        if row and row["level"] > 1:
            b["level"] = row["level"]
            if row.get("path"):
                b["path"] = row["path"]
        else:
            b.pop("level", None)
            b.pop("path", None)


def path_step(level: int) -> int:
    """How far along its path a building is: 0 below level 3, then 1, 2, 3."""
    return max(0, level - PATH_LEVEL + 1)


# ── what a level and a path do ─────────────────────────────────────────
def spec_of(building_type: str, level: int = 1, path=None) -> BuildingType:
    base = BUILDINGS[building_type]
    if level <= 1:
        return base
    g = 1 + GROWTH * (level - 1)
    spec = replace(base, hp=max(1, round(base.hp * g)), damage=round(base.damage * g),
                   attack_range=round(base.attack_range + REACH_GROWTH * (level - 1), 2) if base.attack_range else 0.0)
    k = path_step(level) if path else 0
    if k == 0:
        return spec
    if path == "sniper":
        return replace(spec, attack_range=round(spec.attack_range + 0.5 * k, 2), damage=round(spec.damage * (1 + 0.12 * k)))
    if path == "gatling":
        return replace(spec, cooldown=round(spec.cooldown * (1 - 0.13 * k), 3))
    if path == "storm":
        return replace(spec, chain_targets=spec.chain_targets + k, chain_radius=round(spec.chain_radius + 0.3 * k, 2))
    if path == "overload":
        return replace(spec, damage=round(spec.damage * (1 + 0.3 * k)))
    if path == "glacier":
        return replace(spec, slow_factor=round(max(0.2, spec.slow_factor - 0.1 * k), 2),
                       slow_seconds=round(spec.slow_seconds + 0.6 * k, 2))
    if path == "blizzard":
        return replace(spec, splash_radius=round(spec.splash_radius + 0.35 * k, 2), damage=round(spec.damage * (1 + 0.25 * k)))
    if path in ("bulwark", "citadel"):
        return replace(spec, hp=round(spec.hp * (1 + 0.25 * k)))
    if path == "armored":
        return replace(spec, hp=round(spec.hp * (1 + 0.4 * k)))
    if path == "spiked":
        return replace(spec, thorns=20 * k)
    if path == "inferno":
        return replace(spec, damage=round(spec.damage * (1 + 0.25 * k)), splash_radius=round(spec.splash_radius + 0.2 * k, 2))
    if path == "snare":
        return replace(spec, slow_factor=0.1, slow_seconds=round(1.0 + 0.7 * k, 2))
    if path == "beacon":
        return replace(spec, attack_range=4.0, damage=35 + 15 * k, cooldown=1.3)
    return spec                      # production and strongbox paths work outside the battle


def building_spec(building: dict) -> BuildingType:
    if building.get("fusion"):
        from .fusion import fused_body          # late: fusion builds on this module
        return fused_body(building)
    return spec_of(building["type"], building.get("level", 1), building.get("path"))


def rate_factor(building: dict) -> float:
    """Production speed of an upgraded building, as a multiplier."""
    level = building.get("level", 1)
    k = path_step(level) if building.get("path") == "rich_vein" else 0
    return (1 + GROWTH * (level - 1)) * (1 + 0.2 * k)


def cap_factor(building: dict) -> float:
    """How much more an upgraded building holds before it is full."""
    k = path_step(building.get("level", 1)) if building.get("path") == "deep_store" else 0
    return 1 + 0.4 * k


def vault_protects(city: dict) -> int:
    level = level_of(city, "vault")
    k = path_step(level) if path_of(city, "vault") == "strongbox" else 0
    return round(VAULT_BASE * (1 + GROWTH * (level - 1))) + 150 * k


# ── upgrading at the forge ─────────────────────────────────────────────
def cost_of(building_type: str, level: int) -> dict:
    return {m: n * (level - 1) for m, n in BASE_COST[building_type].items()}


def seconds_of(building_type: str, level: int) -> int:
    return UPGRADE_SECONDS[level] * (2 if building_type == CORE else 1)


def start(city: dict, materials: dict, building_id: int, path, now: float) -> dict:
    building = next((b for b in city["buildings"] if b["id"] == building_id), None)
    if building is None:
        raise ActionError("unknown_building")
    kind = building["type"]
    if kind not in PATHS:
        raise ActionError("cannot_upgrade")
    forge = city["forge"]
    if any(j["recipe"] == "build_up" and j["type"] == kind for j in forge["jobs"]):
        raise ActionError("already_upgrading")
    level = level_of(city, kind) + 1
    if level > MAX_LEVEL:
        raise ActionError("max_level")
    if kind != CORE and level > level_of(city, CORE):
        raise ActionError("core_too_low")
    if level == PATH_LEVEL:
        if path not in PATHS[kind]:
            raise ActionError("unknown_path")
    else:
        path = path_of(city, kind)
    if len(forge["jobs"]) >= forge["slots"]:
        raise ActionError("forge_busy")
    cost = cost_of(kind, level)
    if any(materials.get(m, 0) < n for m, n in cost.items()):
        raise ActionError("not_enough_materials")
    for m, n in cost.items():
        materials[m] -= n
    job = {"id": forge["next_job_id"], "recipe": "build_up", "type": kind, "level": level, "path": path,
           "started_at": now, "ready_at": now + seconds_of(kind, level)}
    forge["next_job_id"] += 1
    forge["jobs"].append(job)
    return job


def finish(city: dict, job: dict) -> dict:
    row = city.setdefault("upgrades", {}).setdefault(job["type"], {"level": 1, "path": None})
    row["level"] = max(row["level"], job["level"])
    if job.get("path"):
        row["path"] = job["path"]
    stamp(city)
    return {"item": job["type"], "kind": "build_up", "count": 1, "level": job["level"], "path": job.get("path"),
            "seconds": seconds_of(job["type"], job["level"])}


# ── what the client sees ───────────────────────────────────────────────
def stats_of(building_type: str, level: int = 1, path=None) -> dict:
    """The numbers worth showing for a type at a level and path."""
    spec = spec_of(building_type, level, path)
    probe = {"type": building_type, "level": level, "path": path}
    category = spec.category
    out = {"hp": spec.hp} if category != "trap" else {}
    if category == "tower" or (category == "core" and spec.damage):
        out.update(damage=spec.damage, range=spec.attack_range, cooldown=spec.cooldown)
    if spec.chain_targets:
        out["chain"] = spec.chain_targets + 1
    if category == "tower" and spec.splash_radius:
        out["area"] = spec.splash_radius
    if spec.slow_seconds:
        out.update(slow=round((1 - spec.slow_factor) * 100), slow_seconds=spec.slow_seconds)
    if category == "trap":
        out.update(damage=spec.damage, area=spec.splash_radius)
    if spec.thorns:
        out["thorns"] = spec.thorns
    if building_type in _PRODUCERS:
        from .economy import CAP_HOURS, PRODUCTION
        per_hour = PRODUCTION[building_type][1] * rate_factor(probe)
        out.update(per_hour=round(per_hour), capacity=round(per_hour * CAP_HOURS * cap_factor(probe)))
    if building_type == "vault":
        out["protects"] = vault_protects({"upgrades": {"vault": {"level": level, "path": path}}})
    return out


_PRODUCERS = ("rune_quarry", "scrap_foundry", "mana_well", "data_node")


def public_upgrades(city: dict) -> dict:
    table = {}
    for kind, paths in PATHS.items():
        stats = {"1": stats_of(kind)}
        for level in range(2, MAX_LEVEL + 1):
            if level < PATH_LEVEL:
                stats[str(level)] = stats_of(kind, level)
            else:
                stats[str(level)] = {p: stats_of(kind, level, p) for p in paths}
        table[kind] = {
            "paths": list(paths), "stats": stats,
            "costs": {str(lv): {"cost": cost_of(kind, lv), "seconds": seconds_of(kind, lv)}
                      for lv in range(2, MAX_LEVEL + 1)},
        }
    levels = {kind: {"level": level_of(city, kind), "path": path_of(city, kind)} for kind in PATHS}
    return {"max_level": MAX_LEVEL, "path_level": PATH_LEVEL, "table": table, "levels": levels}
