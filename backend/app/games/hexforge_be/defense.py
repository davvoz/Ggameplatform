"""
Hexforge: your city as a battlefield, and the tools to get it ready for PvP.

  - every tower has an aim: which hero in range it shoots first
    (a Guardian close to the tower still draws its fire)
  - the defence test throws a fixed set of standard raids at the city, from
    every side with every priority and tactic, and reports how many it holds
    plus the replay of the worst one. It costs nothing.
  - stages: the raids come at a stage. Stage 1 sends recruits; every later
    stage sends better farmed heroes: evolved, ascended, armed, then one hero
    of the squad more fused per stage, and once all four are, the next grade
    the same way, without end. Holding every raid of the highest
    stage unlocked unlocks the next one, saved in `city["defense"]["stage"]`;
    that is the only thing a test changes. Any unlocked stage can be re-run.

The tests are deterministic like every battle: the same city at the same stage
always gets the same report, so a better score always means a better city.
"""

from __future__ import annotations

from dataclasses import dataclass
from itertools import product

from .upgrades import building_spec
from .catalog import BUILDINGS, PRIORITIES, SIDES, TACTICS
from .errors import ActionError
from .fusion import combine
from .items import MAX_LEVEL as ITEM_MAX_LEVEL
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

# How the raid heroes are farmed at each stage: the n-th hero of a class in a
# squad takes the n-th form and weapon (so a Blade rush has both forms), the
# i-th hero of the squad the i-th spell.
RAID_FORMS = {"guardian": ("warlord", "bastion"), "neon_blade": ("reaper", "phantom"),
              "technomancer": ("archon", "arcanist")}
RAID_WEAPONS = {"guardian": ("rune_maul", "aegis_plate"), "neon_blade": ("plasma_edge", "flux_daggers"),
                "technomancer": ("storm_staff", "focus_lens")}
RAID_SPELLS = ("ward_sigil", "mending_rune", "haste_rune")


@dataclass(frozen=True)
class Stage:
    number: int
    tier: int          # 1 recruit, 2 evolved, 3 ascended
    item_level: int    # 0: no items
    grade: int         # the top fusion grade in the squad, 0: none fused
    fused: int         # how many heroes have `grade`; the others have one grade less

    @property
    def name(self) -> str:
        if self.grade:
            marks = "◆" * self.grade if self.grade <= 4 else f"◆×{self.grade}"
            who = "All heroes" if self.fused == SQUAD_SIZE else f"{self.fused} hero{'es' if self.fused > 1 else ''}"
            return f"{who} fused {marks}"
        if self.item_level:
            return f"Ascended, items Lv {self.item_level}"
        return {1: "Recruits", 2: "Evolved ★★", 3: "Ascended ★★★"}[self.tier]


SQUAD_SIZE = 4


def stage_of(number: int) -> Stage:
    """1 recruits, 2 evolved, 3 ascended, 4 items Lv 2, 5 items at the top level; from 6 on
    one hero more fused per stage, a grade more every four stages."""
    fixed = {1: (1, 0, 0, 0), 2: (2, 0, 0, 0), 3: (3, 0, 0, 0), 4: (3, 2, 0, 0), 5: (3, ITEM_MAX_LEVEL, 0, 0)}
    if number in fixed:
        return Stage(number, *fixed[number])
    step = number - 6
    return Stage(number, 3, ITEM_MAX_LEVEL, step // SQUAD_SIZE + 1, step % SQUAD_SIZE + 1)


def public_stage(stage: Stage) -> dict:
    return {"number": stage.number, "name": stage.name, "tier": stage.tier,
            "item_level": stage.item_level, "grade": stage.grade, "fused": stage.fused}


def unlocked_stage(city: dict) -> int:
    return city.get("defense", {}).get("stage", 1)


def _fusion_parts(cls: str, form: str, grade: int) -> list[dict]:
    """A hero fused `grade` times: first with one of its own form and one of the
    other form, then always with two copies of itself, as a player farms it."""
    other = next(f for f in RAID_FORMS[cls] if f != form)
    parts = combine([{"type": cls, "form": form, "power": 1.0}],
                    [[{"type": cls, "form": form, "power": 1.0}], [{"type": cls, "form": other, "power": 1.0}]])
    for _ in range(grade - 1):
        parts = combine(parts, [parts, parts])
    return parts


def stage_squad(raid: Raid, stage: Stage) -> list:
    """The raid's squad as the simulation gets it, farmed for the stage."""
    if stage.tier == 1:
        return list(raid.squad)
    seen: dict[str, int] = {}
    squad = []
    for i, cls in enumerate(raid.squad):
        n = seen.get(cls, 0)
        seen[cls] = n + 1
        unit = {"cls": cls, "form": RAID_FORMS[cls][n % 2], "tier": stage.tier}
        if stage.item_level:
            unit["items"] = [{"type": RAID_WEAPONS[cls][n % 2], "level": stage.item_level},
                             {"type": RAID_SPELLS[i % len(RAID_SPELLS)], "level": stage.item_level}]
        grade = stage.grade if i < stage.fused else max(0, stage.grade - 1)
        if grade:
            unit["fusion"] = _fusion_parts(cls, unit["form"], grade)
            unit["grade"] = grade
        squad.append(unit)
    return squad


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
        if b.get("fusion"):
            item["fusion"] = b["fusion"]
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


def run_defense_test(city: dict, stage_number: int | None = None) -> dict:
    """Every standard raid from every approach, at a stage (the highest unlocked by default);
    totals, per raid, per side, and the worst replay. Holding them all at the highest
    stage unlocks the next one: `advanced` says so, and the city is changed."""
    unlocked = unlocked_stage(city)
    number = unlocked if stage_number is None else stage_number
    if not 1 <= number <= unlocked:
        raise ActionError("stage_locked")
    stage = stage_of(number)
    target = battle_city(city)
    raids, sides = [], dict.fromkeys(SIDES, 0)
    held = destruction = downed = 0
    worst = worst_key = None
    for raid in RAIDS:
        raid_held = 0
        squad = stage_squad(raid, stage)
        for side, priority, tactic in APPROACHES:
            summary = simulate(target, squad, side, priority, tactic)["summary"]
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
    advanced = held == total and number == unlocked
    if advanced:
        city["defense"] = {**city.get("defense", {}), "stage": unlocked + 1}
    raid, side, priority, tactic = worst
    replay = simulate(target, stage_squad(raid, stage), side, priority, tactic)
    return {
        "stage": public_stage(stage),
        "unlocked": unlocked_stage(city),
        "advanced": advanced,
        "next": public_stage(stage_of(number + 1)),
        "held": held,
        "total": total,
        "avg_destruction": round(destruction / total),
        "heroes_downed": round(downed / total, 1),
        "raids": raids,
        "sides": {s: {"held": n, "total": len(RAIDS) * len(PRIORITIES) * len(TACTICS)} for s, n in sides.items()},
        "worst": {"raid": raid.id, "raid_name": raid.name, "side": side, "priority": priority,
                  "tactic": tactic, "city": target, **replay},
    }
