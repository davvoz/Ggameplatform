"""
Hexforge: computer-held outposts the player attacks with their own heroes.

Five hand-built cities of rising difficulty. The first is always open; each
victory opens the next. Winning takes a share of the outpost's treasury
(20 %, or 30 % if the core falls); an outpost already cleared pays half.

Attacks cost one energy charge (5 max, +1 per hour, refilled lazily like
production). Heroes who go down are injured for a while and cannot attack.

Campaign progress and energy live inside the city JSON (`city["campaign"]`,
`city["energy"]`), added by `ensure_campaign` to older saves.
"""

from __future__ import annotations

from dataclasses import dataclass

from .catalog import BUILDINGS, TRAP, WALL
from .economy import MATERIALS
from .errors import ActionError
from .evolution import unit_of
from .items import carried_by
from .simulation import LOOT_WIN, simulate

ENERGY_MAX = 5
ENERGY_REGEN_SECONDS = 3600
INJURY_SECONDS = 900
REPEAT_SHARE = 0.5
SQUAD_SIZE = 4


@dataclass(frozen=True)
class Outpost:
    id: int
    name: str
    difficulty: int
    treasury: dict
    layout: tuple


def _ring(lo, hi, gaps=()):
    return tuple((WALL, x, y) for x in range(lo, hi + 1) for y in range(lo, hi + 1)
                 if (x in (lo, hi) or y in (lo, hi)) and (x, y) not in gaps)


def _treasury(scale):
    base = {"rune_stone": 600, "scrap": 600, "mana": 400, "chips": 300}
    return {m: int(v * scale) for m, v in base.items()}


OUTPOSTS: dict[int, Outpost] = {o.id: o for o in (
    Outpost(1, "Scrap Hollow", 1, _treasury(1.0), (
        ("core", 7, 7), ("rune_tower", 11, 6),
        ("rune_quarry", 3, 4), ("scrap_foundry", 3, 11), ("mana_well", 12, 12),
        *((WALL, x, 6) for x in range(6, 11)),
    )),
    Outpost(2, "Rune Gate", 2, _treasury(1.5), (
        ("core", 7, 7), ("rune_tower", 10, 10), ("rune_tower", 6, 10), ("rune_tower", 2, 7), ("frost_tower", 13, 7),
        ("data_node", 12, 2), ("rune_quarry", 3, 13), ("scrap_foundry", 2, 2),
        (TRAP, 8, 13),
        *_ring(5, 12),
    )),
    Outpost(3, "Frost Ward", 3, _treasury(2.2), (
        ("core", 7, 7), ("frost_tower", 10, 10), ("rune_tower", 6, 10),
        ("frost_tower", 2, 2), ("rune_tower", 13, 2), ("lightning_tower", 13, 13),
        (TRAP, 8, 3), (TRAP, 3, 8),
        ("mana_well", 2, 13), ("data_node", 7, 14), ("vault", 10, 6),
        *_ring(5, 12),
    )),
    Outpost(4, "Storm Spire", 4, _treasury(3.0), (
        ("core", 7, 7), ("lightning_tower", 10, 10), ("rune_tower", 6, 10), ("frost_tower", 10, 6),
        ("lightning_tower", 2, 2), ("lightning_tower", 13, 13), ("rune_tower", 13, 2), ("frost_tower", 2, 13),
        (TRAP, 8, 3), (TRAP, 3, 8), (TRAP, 14, 8),
        ("data_node", 7, 14), ("mana_well", 7, 1),
        *_ring(5, 12),
    )),
    Outpost(5, "The Black Bastion", 5, _treasury(4.0), (
        ("core", 7, 7), ("lightning_tower", 10, 10), ("rune_tower", 6, 10), ("vault", 10, 6),
        ("rune_tower", 3, 2), ("rune_tower", 12, 2), ("data_node", 7, 2), (TRAP, 6, 4), (TRAP, 10, 4),
        ("frost_tower", 14, 7), ("mana_well", 14, 11),
        ("rune_quarry", 3, 14), ("scrap_foundry", 7, 14), ("frost_tower", 12, 14), (TRAP, 8, 13),
        ("lightning_tower", 2, 8), ("rune_quarry", 2, 11),
        ("rune_tower", 14, 4), ("lightning_tower", 1, 5), (TRAP, 13, 10),
        *_ring(5, 12),
    )),
)}


def outpost_city(outpost_id: int) -> dict:
    """The outpost as a battle city: {grid, buildings:[{id,type,x,y,size,hp}]}."""
    outpost = OUTPOSTS[outpost_id]
    buildings = []
    for index, (kind, x, y) in enumerate(outpost.layout):
        spec = BUILDINGS[kind]
        item = {"id": index, "type": kind, "x": x, "y": y, "size": spec.size, "hp": spec.hp}
        if spec.category == "tower":
            item["range"] = spec.attack_range
        buildings.append(item)
    return {"name": outpost.name, "grid": 18, "buildings": buildings}


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


def public_outposts(city: dict) -> list[dict]:
    campaign = city["campaign"]
    rows = []
    for o in OUTPOSTS.values():
        cleared = o.id in campaign["cleared"]
        rows.append({
            "id": o.id, "name": o.name, "difficulty": o.difficulty,
            "unlocked": is_unlocked(campaign, o.id), "cleared": cleared,
            "best": campaign["best"].get(str(o.id), 0),
            "loot_on_win": loot_for(o, LOOT_WIN, cleared),
            "city": outpost_city(o.id),
        })
    return rows


def loot_for(outpost: Outpost, percent: int, already_cleared: bool) -> dict:
    share = percent / 100 * (REPEAT_SHARE if already_cleared else 1.0)
    return {m: int(outpost.treasury[m] * share) for m in MATERIALS}


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
    if not is_unlocked(campaign, outpost_id):
        raise ActionError("outpost_locked")
    classes = squad_classes(heroes, hero_ids, now, city)
    spend_energy(city, now)

    target = outpost_city(outpost_id)
    battle = simulate(target, classes, side, priority, tactic)
    summary = battle["summary"]

    already = outpost_id in campaign["cleared"]
    loot = loot_for(outpost, summary["loot_percent"], already) if summary["victory"] else dict.fromkeys(MATERIALS, 0)
    for m, amount in loot.items():
        materials[m] = materials.get(m, 0) + amount

    injured = injure_fallen(heroes, hero_ids, summary, now)

    key = str(outpost_id)
    campaign["best"][key] = max(campaign["best"].get(key, 0), summary["destruction"])
    first_clear = summary["victory"] and not already
    if first_clear:
        campaign["cleared"].append(outpost_id)
    unlocked = outpost_id + 1 if first_clear and (outpost_id + 1) in OUTPOSTS else None

    return {"outpost": outpost_id, "city": target, **battle,
            "rewards": {"loot": loot, "first_clear": first_clear, "injured": injured, "unlocked": unlocked}}
