"""
Hexforge: computer-held outposts the player attacks with their own heroes.

  worlds   WORLDS worlds of five outposts each, from the easiest to the
           hardest. World 1 is the five hand-built cities; every later world
           turns and mirrors the same five maps and makes their buildings
           stronger: levels 2 to 5 first, then fused towers whose grade keeps
           climbing (about as fast as the raids of the defense test, so world
           N asks for roughly the squad that holds stage N there).
  order    the first outpost is always open; each victory opens the next, and
           the last outpost of a world opens the next world.
  once     an outpost is taken once: a cleared one cannot be raided again.
  loot     winning takes a share of the outpost's treasury (the battle's loot
           percent); every outpost holds more than the one before it.

Attacks cost one energy charge (5 max, +1 per hour, refilled lazily like
production). Heroes who go down are injured for a while and cannot attack.

Campaign progress and energy live inside the city JSON (`city["campaign"]`,
`city["energy"]`), added by `ensure_campaign` to older saves.
"""

from __future__ import annotations

from dataclasses import dataclass

from .catalog import BUILDINGS, TOWERS, TRAP, WALL
from .economy import MATERIALS
from .errors import ActionError
from .evolution import unit_of
from .fusion import building_kit, combine
from .items import carried_by
from .simulation import LOOT_WIN, simulate
from .upgrades import MAX_LEVEL, PATH_LEVEL, PATHS

ENERGY_MAX = 5
ENERGY_REGEN_SECONDS = 3600
INJURY_SECONDS = 900
SQUAD_SIZE = 4
GRID = 18

STAGES = 5                        # outposts in a world
FIRST_SCALES = (1.0, 1.5, 2.2, 3.0, 4.0)   # the treasury of world 1's outposts, times BASE_TREASURY
SCALE_STEP = 0.6                  # every later outpost holds this much more
BASE_TREASURY = {"rune_stone": 600, "scrap": 600, "mana": 400, "chips": 300}

# (world, its outposts' first word); world 1 keeps its own names
WORLD_NAMES = (
    ("The Borderlands", None), ("Ember Wastes", "Ember"), ("Glass Dunes", "Glass"),
    ("Iron Marsh", "Iron"), ("Thorn Wilds", "Thorn"), ("Ashen Reach", "Ashen"),
    ("Copper Coast", "Copper"), ("Wirewood", "Wire"), ("Obsidian Rift", "Obsidian"),
    ("Static Plains", "Static"), ("Moonfall", "Moon"), ("Cinder Peaks", "Cinder"),
    ("Rust Sea", "Rust"), ("Crystal Abyss", "Crystal"), ("Thunder Crown", "Thunder"),
    ("Void Steppe", "Void"), ("Sunken Forge", "Sunken"), ("Red Circuit", "Red"),
    ("Last Signal", "Signal"), ("Eclipse Throne", "Eclipse"),
)
WORLDS = len(WORLD_NAMES)
STAGE_WORDS = ("Hollow", "Gate", "Ward", "Spire", "Bastion")


def _ring(lo, hi, gaps=()):
    return tuple((WALL, x, y) for x in range(lo, hi + 1) for y in range(lo, hi + 1)
                 if (x in (lo, hi) or y in (lo, hi)) and (x, y) not in gaps)


# the five maps, from the easiest to the hardest: (name in world 1, layout)
MAPS = (
    ("Scrap Hollow", (
        ("core", 7, 7), ("rune_tower", 11, 6),
        ("rune_quarry", 3, 4), ("scrap_foundry", 3, 11), ("mana_well", 12, 12),
        *((WALL, x, 6) for x in range(6, 11)),
    )),
    ("Rune Gate", (
        ("core", 7, 7), ("rune_tower", 10, 10), ("rune_tower", 6, 10), ("rune_tower", 2, 7), ("frost_tower", 13, 7),
        ("data_node", 12, 2), ("rune_quarry", 3, 13), ("scrap_foundry", 2, 2),
        (TRAP, 8, 13),
        *_ring(5, 12),
    )),
    ("Frost Ward", (
        ("core", 7, 7), ("frost_tower", 10, 10), ("rune_tower", 6, 10),
        ("frost_tower", 2, 2), ("rune_tower", 13, 2), ("lightning_tower", 13, 13),
        (TRAP, 8, 3), (TRAP, 3, 8),
        ("mana_well", 2, 13), ("data_node", 7, 14), ("vault", 10, 6),
        *_ring(5, 12),
    )),
    ("Storm Spire", (
        ("core", 7, 7), ("lightning_tower", 10, 10), ("rune_tower", 6, 10), ("frost_tower", 10, 6),
        ("rune_quarry", 2, 2), ("lightning_tower", 13, 13), ("rune_tower", 13, 2), ("frost_tower", 2, 13),
        (TRAP, 8, 3), (TRAP, 3, 8), (TRAP, 14, 8),
        ("data_node", 7, 14), ("mana_well", 7, 1),
        *_ring(5, 12),
    )),
    ("The Black Bastion", (
        ("core", 7, 7), ("lightning_tower", 10, 10), ("rune_tower", 6, 10), ("vault", 10, 6),
        ("rune_tower", 3, 2), ("rune_tower", 12, 2), ("data_node", 7, 2), (TRAP, 6, 4), (TRAP, 10, 4),
        ("frost_tower", 14, 7), ("mana_well", 14, 11),
        ("rune_quarry", 3, 14), ("scrap_foundry", 7, 14), ("frost_tower", 12, 14), (TRAP, 8, 13),
        ("lightning_tower", 2, 8), ("rune_quarry", 2, 11),
        ("rune_tower", 14, 4), ("lightning_tower", 1, 5), (TRAP, 13, 10),
        *_ring(5, 12),
    )),
)


@dataclass(frozen=True)
class Outpost:
    id: int
    world: int
    stage: int             # 1..STAGES inside its world
    name: str
    treasury: dict
    layout: tuple          # ((type, x, y), ...) already turned for its world
    level: int             # every building's level
    grade: int             # the top fusion grade of its towers (0: none fused)
    fused: int             # of every four towers, how many have `grade` (the others one less)

    @property
    def difficulty(self) -> int:
        return self.stage


def world_power(world: int) -> tuple[int, int, int]:
    """(level, grade, fused) of a world's buildings: levels first, then fused towers."""
    if world <= MAX_LEVEL:
        return world, 0, 0
    step = (world - MAX_LEVEL - 1) * 3 // 2       # towers grow faster than fused heroes do
    return MAX_LEVEL, step // SQUAD_SIZE + 1, step % SQUAD_SIZE + 1


def _turn(kind: str, x: int, y: int, world: int) -> tuple[int, int]:
    """A world sees the map turned a quarter more each time, and mirrored every four worlds."""
    size = BUILDINGS[kind].size
    for _ in range((world - 1) % 4):
        x, y = GRID - y - size, x
    if (world - 1) // 4 % 2:
        x = GRID - x - size
    return x, y


def _scale(number: int) -> float:
    return FIRST_SCALES[number - 1] if number <= STAGES else FIRST_SCALES[-1] + SCALE_STEP * (number - STAGES)


def _outpost(world: int, stage: int) -> Outpost:
    number = (world - 1) * STAGES + stage
    name, layout = MAPS[stage - 1]
    first_word = WORLD_NAMES[world - 1][1]
    return Outpost(
        id=number, world=world, stage=stage,
        name=f"{first_word} {STAGE_WORDS[stage - 1]}" if first_word else name,
        treasury={m: int(v * _scale(number)) for m, v in BASE_TREASURY.items()},
        layout=tuple((kind, *_turn(kind, x, y, world)) for kind, x, y in layout),
        level=world_power(world)[0], grade=world_power(world)[1], fused=world_power(world)[2],
    )


OUTPOSTS: dict[int, Outpost] = {o.id: o for o in (
    _outpost(w, s) for w in range(1, WORLDS + 1) for s in range(1, STAGES + 1))}
LAST = max(OUTPOSTS)


def world_ids(world: int) -> list[int]:
    return [o.id for o in OUTPOSTS.values() if o.world == world]


def _tower_parts(kind: str, path, grade: int) -> list[dict]:
    """A tower fused `grade` times with copies of itself."""
    parts = [{"type": kind, "path": path, "power": 1.0}]
    for _ in range(grade):
        parts = combine(parts, [parts, parts])
    return parts


def outpost_city(outpost_id: int) -> dict:
    """The outpost as a battle city: {name, grid, buildings:[{id,type,x,y,size,hp,...}]}."""
    outpost = OUTPOSTS[outpost_id]
    buildings, towers = [], 0
    for index, (kind, x, y) in enumerate(outpost.layout):
        item = {"id": index, "type": kind, "x": x, "y": y, "size": BUILDINGS[kind].size}
        if outpost.level > 1:
            item["level"] = outpost.level
            if outpost.level >= PATH_LEVEL:
                item["path"] = PATHS[kind][(outpost.world + index) % 2]
        if outpost.grade and kind in TOWERS:
            grade = outpost.grade if towers % SQUAD_SIZE < outpost.fused else outpost.grade - 1
            towers += 1
            if grade:
                item["fusion"] = {"grade": grade, "parts": _tower_parts(kind, item.get("path"), grade)}
        body = building_kit(item)[0]
        item["hp"] = body.hp
        if BUILDINGS[kind].category == "tower" or body.attack_range:
            item["range"] = body.attack_range
        buildings.append(item)
    return {"name": outpost.name, "grid": GRID, "buildings": buildings}


# ── progress and energy ────────────────────────────────────────────────
def ensure_campaign(city: dict, now: float) -> None:
    city.setdefault("campaign", {"cleared": [], "best": {}})
    city.setdefault("energy", {"charges": ENERGY_MAX, "updated_at": now})


def settle_energy(energy: dict, now: float) -> None:
    """Add the charges regained since the last update."""
    if energy["charges"] >= ENERGY_MAX:
        energy["updated_at"] = now
        return
    gained = int((now - energy["updated_at"]) // ENERGY_REGEN_SECONDS)
    if gained <= 0:
        return
    energy["charges"] = min(ENERGY_MAX, energy["charges"] + gained)
    if energy["charges"] >= ENERGY_MAX:
        energy["updated_at"] = now
    else:
        energy["updated_at"] += gained * ENERGY_REGEN_SECONDS


def public_energy(energy: dict, now: float) -> dict:
    settled = dict(energy)
    settle_energy(settled, now)
    full = settled["charges"] >= ENERGY_MAX
    return {"charges": settled["charges"], "max": ENERGY_MAX,
            "next_at": None if full else settled["updated_at"] + ENERGY_REGEN_SECONDS}


def is_unlocked(campaign: dict, outpost_id: int) -> bool:
    return outpost_id == 1 or (outpost_id - 1) in campaign["cleared"]


def frontier(campaign: dict) -> int:
    """The first outpost not cleared yet (the last one once everything is)."""
    cleared = set(campaign["cleared"])
    return next((i for i in sorted(OUTPOSTS) if i not in cleared), LAST)


def public_world(city: dict) -> dict:
    campaign = city["campaign"]
    world = OUTPOSTS[frontier(campaign)].world
    return {"number": world, "name": WORLD_NAMES[world - 1][0], "total": WORLDS,
            "complete": all(i in campaign["cleared"] for i in OUTPOSTS)}


def public_outposts(city: dict) -> list[dict]:
    """The outposts of the world the player is in."""
    campaign = city["campaign"]
    rows = []
    for i in world_ids(OUTPOSTS[frontier(campaign)].world):
        o = OUTPOSTS[i]
        rows.append({
            "id": o.id, "name": o.name, "world": o.world, "stage": o.stage, "difficulty": o.difficulty,
            "unlocked": is_unlocked(campaign, o.id), "cleared": o.id in campaign["cleared"],
            "best": campaign["best"].get(str(o.id), 0),
            "loot_on_win": loot_for(o, LOOT_WIN),
            "city": outpost_city(o.id),
        })
    return rows


def loot_for(outpost: Outpost, percent: int) -> dict:
    return {m: int(outpost.treasury[m] * percent / 100) for m in MATERIALS}


# ── the attack ─────────────────────────────────────────────────────────
def squad_classes(heroes: list, hero_ids: list, now: float, city: dict | None = None) -> list:
    """The squad entries of 4 different, fit heroes the player owns (or a refusal)."""
    if len(hero_ids) != SQUAD_SIZE or len(set(hero_ids)) != SQUAD_SIZE:
        raise ActionError("bad_squad")
    by_id = {h["id"]: h for h in heroes}
    if any(i not in by_id for i in hero_ids):
        raise ActionError("bad_squad")
    if any(by_id[i].get("injured_until", 0) > now for i in hero_ids):
        raise ActionError("hero_injured")
    if any(by_id[i].get("evolving") for i in hero_ids):
        raise ActionError("hero_evolving")
    if any(by_id[i]["cls"] == "explorer" for i in hero_ids):
        raise ActionError("explorer_cannot_fight")
    return [unit_of(by_id[i], carried_by(city, i) if city else None) for i in hero_ids]


def spend_energy(city: dict, now: float) -> None:
    energy = city["energy"]
    settle_energy(energy, now)
    if energy["charges"] < 1:
        raise ActionError("no_energy")
    if energy["charges"] >= ENERGY_MAX:
        energy["updated_at"] = now          # regeneration starts with the first spent charge
    energy["charges"] -= 1


def injure_fallen(heroes: list, hero_ids: list, summary: dict, now: float) -> list[int]:
    """Heroes who went down rest for a while; returns their ids."""
    injured = []
    by_id = {h["id"]: h for h in heroes}
    for slot, result in enumerate(summary["heroes"]):
        if not result["survived"]:
            hero = by_id[hero_ids[slot]]
            hero["injured_until"] = now + INJURY_SECONDS
            injured.append(hero["id"])
    return injured


def attack(city: dict, heroes: list, materials: dict, outpost_id: int, hero_ids: list,
           side: str, priority: str, tactic: str, now: float) -> dict:
    """Run an attack and apply its consequences; returns the replay and rewards."""
    outpost = OUTPOSTS.get(outpost_id)
    if outpost is None:
        raise ActionError("unknown_outpost")
    campaign = city["campaign"]
    if outpost_id in campaign["cleared"]:
        raise ActionError("outpost_cleared")
    if not is_unlocked(campaign, outpost_id):
        raise ActionError("outpost_locked")
    classes = squad_classes(heroes, hero_ids, now, city)
    spend_energy(city, now)

    target = outpost_city(outpost_id)
    battle = simulate(target, classes, side, priority, tactic)
    summary = battle["summary"]

    won = summary["victory"]
    loot = loot_for(outpost, summary["loot_percent"]) if won else dict.fromkeys(MATERIALS, 0)
    for m, amount in loot.items():
        materials[m] = materials.get(m, 0) + amount

    injured = injure_fallen(heroes, hero_ids, summary, now)

    key = str(outpost_id)
    campaign["best"][key] = max(campaign["best"].get(key, 0), summary["destruction"])
    if won:
        campaign["cleared"].append(outpost_id)
    unlocked = outpost_id + 1 if won and (outpost_id + 1) in OUTPOSTS else None
    new_world = OUTPOSTS[unlocked].world if unlocked and OUTPOSTS[unlocked].stage == 1 else None

    return {"outpost": outpost_id, "city": target, **battle,
            "rewards": {"loot": loot, "first_clear": won, "injured": injured, "unlocked": unlocked,
                        "new_world": new_world}}
