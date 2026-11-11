"""
Hexforge: your city as a battlefield, and the tools to get it ready for PvP.

  - every tower has an aim: which hero in range it shoots first
    (a Guardian close to the tower still draws its fire)
  - the defence test throws a fixed set of standard raids at the city, from
    every side with every priority and tactic, and reports how many it holds
    plus the replay of the worst one. It changes nothing and costs nothing.

The tests are deterministic like every battle: the same city always gets the
same report, so a better score always means a better city.
"""

from __future__ import annotations

from dataclasses import dataclass
from itertools import product

from .upgrades import building_spec
from .catalog import BUILDINGS, PRIORITIES, SIDES, TACTICS
from .errors import ActionError
from .simulation import AIMS, DEFAULT_AIM, simulate


@dataclass(frozen=True)
class Raid:
    id: str
    name: str
    squad: tuple


RAIDS = (
    Raid("balanced", "Balanced squad", ("guardian", "neon_blade", "neon_blade", "technomancer")),
    Raid("blades", "Blade rush", ("neon_blade", "neon_blade", "neon_blade", "neon_blade")),
    Raid("casters", "Spellcasters", ("guardian", "technomancer", "technomancer", "neon_blade")),
    Raid("siege", "Heavy siege", ("guardian", "guardian", "technomancer", "technomancer")),
)
APPROACHES = tuple(product(SIDES, PRIORITIES, TACTICS))


def is_tower(building: dict) -> bool:
    return BUILDINGS[building["type"]].category == "tower"


def battle_city(city: dict) -> dict:
    """A saved city in the shape the simulation reads."""
    buildings = []
    for b in city["buildings"]:
        spec = building_spec(b)
        item = {"id": b["id"], "type": b["type"], "x": b["x"], "y": b["y"], "size": spec.size, "hp": spec.hp}
        if b.get("level", 1) > 1:
            item["level"] = b["level"]
            if b.get("path"):
                item["path"] = b["path"]
        if spec.category == "tower" or spec.attack_range:
            item["aim"] = b.get("aim", DEFAULT_AIM)
            item["range"] = spec.attack_range
        buildings.append(item)
    return {"grid": city["grid"], "buildings": buildings}


def set_aim(city: dict, building_id: int, aim: str) -> None:
    if aim not in AIMS:
        raise ActionError("unknown_aim")
    building = next((b for b in city["buildings"] if b["id"] == building_id), None)
    if building is None:
        raise ActionError("unknown_building")
    if not is_tower(building):
        raise ActionError("not_a_tower")
    building["aim"] = aim


def _severity(summary: dict) -> tuple:
    """How badly a raid went for the defender: core first, then destruction, then speed."""
    return summary["core_destroyed"], summary["destruction"], -summary["seconds"]


def run_defense_test(city: dict) -> dict:
    """Every standard raid from every approach; totals, per raid, per side, and the worst replay."""
    target = battle_city(city)
    raids, sides = [], dict.fromkeys(SIDES, 0)
    held = destruction = downed = 0
    worst = worst_key = None
    for raid in RAIDS:
        raid_held = 0
        for side, priority, tactic in APPROACHES:
            summary = simulate(target, list(raid.squad), side, priority, tactic)["summary"]
            destruction += summary["destruction"]
            downed += sum(not h["survived"] for h in summary["heroes"])
            if not summary["victory"]:
                raid_held += 1
                sides[side] += 1
            key = _severity(summary)
            if worst_key is None or key > worst_key:
                worst_key, worst = key, (raid, side, priority, tactic)
        held += raid_held
        raids.append({"id": raid.id, "name": raid.name, "squad": list(raid.squad),
                      "held": raid_held, "total": len(APPROACHES)})

    total = len(RAIDS) * len(APPROACHES)
    raid, side, priority, tactic = worst
    replay = simulate(target, list(raid.squad), side, priority, tactic)
    return {
        "held": held,
        "total": total,
        "avg_destruction": round(destruction / total),
        "heroes_downed": round(downed / total, 1),
        "raids": raids,
        "sides": {s: {"held": n, "total": len(RAIDS) * len(PRIORITIES) * len(TACTICS)} for s, n in sides.items()},
        "worst": {"raid": raid.id, "raid_name": raid.name, "side": side, "priority": priority,
                  "tactic": tactic, "city": target, **replay},
    }
