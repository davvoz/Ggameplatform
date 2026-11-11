"""
Hexforge: heroes grow by fighting and evolve at the forge.

  hero XP   every hero who fights earns XP: a base, more for the damage it
            dealt, more if it survived, more for a victory.
  evolve    at TIER_XP[2] the hero may evolve: the player picks one of the
            two forms of its class. At TIER_XP[3] that form ascends.
            Evolving is a forge job: it takes a forge slot, materials and
            time, and the hero cannot fight meanwhile (hourglasses work).
  forms     guardian      bastion (tougher, draws fire from farther)
                          warlord (harder hammer that hits an area)
            neon_blade    phantom (faster, strikes more often)
                          reaper  (harder blows, much harder on towers)
            technomancer  archon  (bigger, stronger, more frequent nova)
                          arcanist (reaches much farther, hits harder)

A hero dict gains "xp", "form", "tier" (1 = base) and, while at the forge,
"evolving" (the job id). A squad entry for the simulation is the class name
for a base hero, or {"cls", "form", "tier"} for an evolved one.
Pure functions over plain dicts.
"""

from __future__ import annotations

from dataclasses import replace

from .catalog import HEROES, HeroClass
from .errors import ActionError

TIER_XP = {2: 150, 3: 600}                 # total hero XP needed to evolve, then to ascend
TIER_GROWTH = {1: 1.0, 2: 1.1, 3: 1.25}    # health and damage, for both forms

FORMS = {
    "bastion": "guardian", "warlord": "guardian",
    "phantom": "neon_blade", "reaper": "neon_blade",
    "archon": "technomancer", "arcanist": "technomancer",
}

EVOLVE_SECONDS = {2: 7200, 3: 14400}
EVOLVE_COST = {
    "guardian": {"scrap": 300, "rune_stone": 200, "mana": 100},
    "neon_blade": {"scrap": 250, "chips": 150, "mana": 100},
    "technomancer": {"mana": 300, "chips": 150, "rune_stone": 100},
}
ASCEND_FACTOR = 2.5                        # ascending costs this much more than evolving


def _form_special(spec: HeroClass, form: str, tier: int) -> HeroClass:
    k = 0 if tier == 2 else 1              # tier 2 or 3
    if form == "bastion":
        return replace(spec, hp=round(spec.hp * (1.25, 1.45)[k]), taunt_radius=spec.taunt_radius + (1.5, 3.0)[k])
    if form == "warlord":
        return replace(spec, damage=round(spec.damage * (1.25, 1.5)[k]), splash_radius=(1.2, 1.6)[k])
    if form == "phantom":
        return replace(spec, speed=round(spec.speed * (1.25, 1.45)[k], 2),
                       cooldown=round(spec.cooldown * (0.85, 0.7)[k], 2))
    if form == "reaper":
        return replace(spec, damage=round(spec.damage * (1.2, 1.4)[k]), tower_bonus=(1.5, 1.8)[k])
    if form == "archon":
        return replace(spec, nova_damage=round(spec.nova_damage * (1.5, 2.0)[k]),
                       nova_radius=spec.nova_radius + (0.5, 1.0)[k],
                       nova_cooldown=round(spec.nova_cooldown * (0.8, 0.65)[k], 2))
    if form == "arcanist":
        return replace(spec, attack_range=spec.attack_range + (1.5, 2.5)[k], damage=round(spec.damage * (1.35, 1.7)[k]))
    raise ActionError("unknown_form")


def spec_of(cls: str, form: str | None = None, tier: int = 1) -> HeroClass:
    """The fighting stats of a hero of `cls`, evolved into `form` at `tier`."""
    base = HEROES[cls]
    if tier <= 1 or form is None:
        return base
    growth = TIER_GROWTH[tier]
    spec = replace(base, hp=round(base.hp * growth), damage=round(base.damage * growth),
                   nova_damage=round(base.nova_damage * growth))
    return _form_special(spec, form, tier)


def unit_of(hero: dict, carried: list | None = None):
    """The squad entry the simulation gets for this hero (and the items it carries)."""
    if hero.get("tier", 1) <= 1 and not carried:
        return hero["cls"]
    unit = {"cls": hero["cls"]}
    if hero.get("tier", 1) > 1:
        unit.update(form=hero["form"], tier=hero["tier"])
    if carried:
        unit["items"] = carried
    return unit


def parse_unit(unit) -> tuple[str, str | None, int, list]:
    if isinstance(unit, str):
        return unit, None, 1, []
    return unit["cls"], unit.get("form"), int(unit.get("tier", 1)), list(unit.get("items", []))


# ── hero XP ────────────────────────────────────────────────────────────
def battle_xp(dealt: int, survived: bool, victory: bool) -> int:
    return 10 + min(30, dealt // 100) + (5 if survived else 0) + (10 if victory else 0)


def gain_hero_xp(heroes: list, hero_ids: list, summary: dict) -> list[dict]:
    """XP for every hero who fought (in squad order); returns [{id, xp, ready}]."""
    by_id = {h["id"]: h for h in heroes}
    gains = []
    for hero_id, report in zip(hero_ids, summary["heroes"]):
        hero = by_id[hero_id]
        xp = battle_xp(report["dealt"], report["survived"], summary["victory"])
        hero["xp"] = hero.get("xp", 0) + xp
        gains.append({"id": hero_id, "xp": xp, "ready": can_evolve(hero)})
    return gains


def next_tier(hero: dict) -> int | None:
    tier = hero.get("tier", 1)
    return tier + 1 if tier < 3 else None


def can_evolve(hero: dict) -> bool:
    if hero["cls"] not in HEROES:          # the Explorer does not evolve
        return False
    nxt = next_tier(hero)
    return nxt is not None and hero.get("xp", 0) >= TIER_XP[nxt] and not hero.get("evolving")


def evolve_cost(cls: str, tier: int) -> dict:
    factor = 1 if tier == 2 else ASCEND_FACTOR
    return {m: round(n * factor) for m, n in EVOLVE_COST[cls].items()}


# ── at the forge ───────────────────────────────────────────────────────
def start(city: dict, heroes: list, materials: dict, hero_id: int, form: str | None, now: float) -> dict:
    hero = next((h for h in heroes if h["id"] == hero_id), None)
    if hero is None:
        raise ActionError("unknown_hero")
    if hero["cls"] not in HEROES:
        raise ActionError("cannot_evolve")
    tier = next_tier(hero)
    if tier is None:
        raise ActionError("fully_evolved")
    if hero.get("evolving"):
        raise ActionError("already_evolving")
    if hero.get("xp", 0) < TIER_XP[tier]:
        raise ActionError("not_enough_xp")
    if hero.get("injured_until", 0) > now:
        raise ActionError("hero_injured")
    if tier == 2:
        if FORMS.get(form) != hero["cls"]:
            raise ActionError("unknown_form")
    else:
        form = hero["form"]                # ascending keeps the form
    forge = city["forge"]
    if len(forge["jobs"]) >= forge["slots"]:
        raise ActionError("forge_busy")
    cost = evolve_cost(hero["cls"], tier)
    if any(materials.get(m, 0) < n for m, n in cost.items()):
        raise ActionError("not_enough_materials")
    for m, n in cost.items():
        materials[m] -= n
    job = {"id": forge["next_job_id"], "recipe": "evolve", "hero": hero_id, "form": form, "tier": tier,
           "started_at": now, "ready_at": now + EVOLVE_SECONDS[tier]}
    forge["next_job_id"] += 1
    forge["jobs"].append(job)
    hero["evolving"] = job["id"]
    return job


def finish(job: dict, heroes: list) -> dict:
    """The forge hands the hero back, evolved."""
    hero = next((h for h in heroes if h["id"] == job["hero"]), None)
    if hero is None:                       # dismissed meanwhile: nothing to evolve
        return {"item": "evolve", "kind": "evolution", "count": 0, "seconds": EVOLVE_SECONDS[job["tier"]]}
    hero["form"] = job["form"]
    hero["tier"] = job["tier"]
    hero.pop("evolving", None)
    return {"item": hero["cls"], "kind": "evolution", "count": 1, "hero": hero["id"],
            "form": job["form"], "tier": job["tier"], "seconds": EVOLVE_SECONDS[job["tier"]]}


# ── what the client sees ───────────────────────────────────────────────
def stats_of(spec: HeroClass) -> dict:
    """The stats the client shows for a hero."""
    return _stats(spec)


def _stats(spec: HeroClass) -> dict:
    return {"hp": spec.hp, "damage": spec.damage, "speed": spec.speed, "range": spec.attack_range,
            "cooldown": spec.cooldown, "nova_damage": spec.nova_damage, "nova_radius": spec.nova_radius,
            "taunt_radius": spec.taunt_radius, "splash_radius": spec.splash_radius,
            "tower_bonus": spec.tower_bonus}


def public_evolution() -> dict:
    """Thresholds, costs and the stats of every class, form and tier (for the hero card)."""
    stats = {cls: {"base": _stats(spec_of(cls))} for cls in HEROES}
    for form, cls in FORMS.items():
        stats[cls][form] = {str(t): _stats(spec_of(cls, form, t)) for t in (2, 3)}
    costs = {cls: {str(t): {"cost": evolve_cost(cls, t), "seconds": EVOLVE_SECONDS[t]} for t in (2, 3)}
             for cls in HEROES}
    forms = {cls: [f for f, c in FORMS.items() if c == cls] for cls in HEROES}
    return {"tier_xp": {str(t): xp for t, xp in TIER_XP.items()}, "forms": forms, "stats": stats, "costs": costs}
