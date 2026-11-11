"""
Hexforge: fusion, three maxed buildings (or heroes) forged into one.

  who      buildings whose type is at the top level (5) and heroes who have
           ascended (tier 3). Three of the same grade fuse: plain ones make a
           grade-1 fusion, three grade-1 fusions a grade 2, and so on.
  base     the player picks the base: it keeps its body (type, size, class,
           form, place on the map). The other two are consumed, and each gives
           the base its own power: a lightning tower fused into a rune tower
           adds its chain bolts, a mana well adds mana production, a guardian
           fused into a blade lends its taunt.
  parts    a fused element remembers what it is made of as parts
           [{"type", "path" | "form", "power"}]; power 1.0 is one maxed
           building or hero. At most MAX_PARTS different parts: more power of
           a kind it already has adds up, a new kind beyond the limit feeds
           the body instead.
  strength every fusion gives BONUS times the power of what went in, so the
           result is stronger than the three were together.
  forge    fusion is a forge job (cost and time grow with the grade). The two
           donors are consumed when it starts; the base keeps working (a
           building) or waits at the forge (a hero) until it is claimed.

Pure functions over plain dicts.
"""

from __future__ import annotations

from dataclasses import replace

from . import economy, evolution, upgrades
from .catalog import BUILDINGS, HEROES, TOWERS, TRAP, WALL, BuildingType, HeroClass
from .errors import ActionError

BONUS = 1.2
MAX_PARTS = 3
WALL_THORNS = 30                      # a wall fused into something gives at least this much spite
BASE_TYPES = (*TOWERS, "rune_quarry", "scrap_foundry", "mana_well", "data_node", WALL)
DONOR_TYPES = (*BASE_TYPES, TRAP)     # a trap gives its blast, but cannot be a body
FUSE_COST = {"rune_stone": 600, "scrap": 600, "mana": 400, "chips": 300}   # times the new grade
FUSE_SECONDS = {1: 4 * 3600, 2: 8 * 3600}
MAX_SECONDS = 12 * 3600


# ── what an element is made of ─────────────────────────────────────────
def grade_of(element: dict) -> int:
    return element.get("fusion", {}).get("grade", 0)


def building_parts(b: dict) -> list[dict]:
    if b.get("fusion"):
        return b["fusion"]["parts"]
    return [{"type": b["type"], "path": b.get("path"), "power": 1.0}]


def hero_parts(hero: dict) -> list[dict]:
    if hero.get("fusion"):
        return hero["fusion"]["parts"]
    return [{"type": hero["cls"], "form": hero.get("form"), "power": 1.0}]


def _key(part: dict) -> tuple:
    return part["type"], part.get("path", part.get("form"))


def combine(base: list, donors: list[list]) -> list[dict]:
    """The parts of the fused element: the base's first, then each donor's."""
    merged: dict[tuple, dict] = {}
    for part in [*base, *(p for parts in donors for p in parts)]:
        key = _key(part)
        if key in merged:
            merged[key]["power"] += part["power"]
        elif len(merged) < MAX_PARTS:
            merged[key] = dict(part)
        else:
            next(iter(merged.values()))["power"] += part["power"]   # the body takes it
    return [{**p, "power": round(p["power"] * BONUS, 3)} for p in merged.values()]


def cost_of(grade: int) -> dict:
    return {m: n * grade for m, n in FUSE_COST.items()}


def seconds_of(grade: int) -> int:
    return FUSE_SECONDS.get(grade, MAX_SECONDS)


# ── what a fused building does ─────────────────────────────────────────
def _part_spec(part: dict) -> BuildingType:
    return upgrades.spec_of(part["type"], upgrades.MAX_LEVEL, part.get("path"))


def building_kit(b: dict) -> tuple[BuildingType, list[BuildingType], list[BuildingType]]:
    """(body, weapons, blasts): the body's stats, what it shoots with, the blasts it keeps for heroes close by."""
    body = upgrades.spec_of(b["type"], b.get("level", 1), b.get("path"))
    if not b.get("fusion"):
        fires = body.damage and body.attack_range and body.category in ("tower", "core")
        return body, [body] if fires else [], []
    hp = thorns = 0
    weapons, blasts = [], []
    for part in b["fusion"]["parts"]:
        spec, power = _part_spec(part), part["power"]
        if spec.category == "trap":
            blasts.append(replace(spec, damage=round(spec.damage * power)))
            continue
        hp += spec.hp * power
        if spec.category == "tower":
            weapons.append(replace(spec, damage=round(spec.damage * power)))
        if part["type"] == WALL:
            thorns += max(spec.thorns, WALL_THORNS) * power
    body = replace(body, hp=round(hp), thorns=round(thorns),
                   attack_range=max((w.attack_range for w in weapons), default=0.0),
                   damage=weapons[0].damage if weapons else 0)
    return body, weapons, blasts


def fused_body(b: dict) -> BuildingType:
    return building_kit(b)[0]


outputs = economy.outputs


# ── what a fused hero does ─────────────────────────────────────────────
def hero_spec(cls: str, form, tier: int, parts: list | None) -> HeroClass:
    """A hero's fighting stats; a fused hero adds up its parts on its body's frame."""
    body = evolution.spec_of(cls, form, tier)
    if not parts:
        return body
    specs = [(evolution.spec_of(p["type"], p.get("form"), 3), p) for p in parts]
    novas = [(s, p["power"]) for s, p in specs if s.nova_damage]
    phantoms = [s for s, p in specs if p.get("form") == "phantom"]
    arcanists = [s for s, p in specs if p.get("form") == "arcanist"]
    return replace(
        body,
        hp=round(sum(s.hp * p["power"] for s, p in specs)),
        # every part strikes through the body: its damage per second, at the body's pace
        damage=round(sum(s.damage * p["power"] * body.cooldown / s.cooldown for s, p in specs)),
        speed=max([body.speed, *(s.speed for s in phantoms)]),
        cooldown=min([body.cooldown, *(s.cooldown for s in phantoms)]),
        attack_range=max([body.attack_range, *(s.attack_range for s in arcanists)]),
        jumps_walls=any(s.jumps_walls for s, _ in specs),
        taunt_radius=max(s.taunt_radius for s, _ in specs),
        splash_radius=max(s.splash_radius for s, _ in specs),
        tower_bonus=max(s.tower_bonus for s, _ in specs),
        nova_damage=round(sum(s.nova_damage * w for s, w in novas)),
        nova_radius=max((s.nova_radius for s, _ in novas), default=0.0),
        nova_cooldown=min((s.nova_cooldown for s, _ in novas), default=0.0),
    )


def hero_spec_of(hero: dict) -> HeroClass:
    return hero_spec(hero["cls"], hero.get("form"), hero.get("tier", 1), hero.get("fusion", {}).get("parts"))


def unit_spec(unit) -> HeroClass:
    """The stats of a squad entry (items not included)."""
    cls, form, tier, _ = evolution.parse_unit(unit)
    parts = unit.get("fusion") if isinstance(unit, dict) else None
    return hero_spec(cls, form, tier, parts)


# ── choosing and checking ──────────────────────────────────────────────
def _building_ready(city: dict, b: dict, as_base: bool) -> None:
    allowed = BASE_TYPES if as_base else DONOR_TYPES
    if b["type"] not in allowed:
        raise ActionError("cannot_fuse")
    if not b.get("fusion") and upgrades.level_of(city, b["type"]) < upgrades.MAX_LEVEL:
        raise ActionError("not_max_level")
    if b.get("fusing"):
        raise ActionError("already_fusing")


def _hero_ready(hero: dict) -> None:
    if hero["cls"] not in HEROES:
        raise ActionError("cannot_fuse")
    if not hero.get("fusion") and hero.get("tier", 1) < 3:
        raise ActionError("not_max_level")
    if hero.get("evolving"):
        raise ActionError("hero_evolving")
    if hero.get("mission"):
        raise ActionError("on_mission")


def _pick(rows: list, ids: list, unknown: str) -> list:
    by_id = {r["id"]: r for r in rows}
    if any(i not in by_id for i in ids):
        raise ActionError(unknown)
    return [by_id[i] for i in ids]


def plan(city: dict, heroes: list, kind: str, base_id: int, donor_ids: list) -> dict:
    """Check a fusion and say what it would make: {kind, base, grade, parts, type, cost, seconds}."""
    if len(donor_ids) != 2 or len({base_id, *donor_ids}) != 3:
        raise ActionError("bad_fusion")
    if kind == "building":
        base, *donors = _pick(city["buildings"], [base_id, *donor_ids], "unknown_building")
        _building_ready(city, base, as_base=True)
        for d in donors:
            _building_ready(city, d, as_base=False)
        parts_of, body = building_parts, base["type"]
    elif kind == "hero":
        base, *donors = _pick(heroes, [base_id, *donor_ids], "unknown_hero")
        for h in (base, *donors):
            _hero_ready(h)
        fighters = sum(1 for h in heroes if h["cls"] in HEROES)
        if fighters - 2 < SQUAD_MIN:
            raise ActionError("last_squad")
        parts_of, body = hero_parts, base["cls"]
    else:
        raise ActionError("bad_fusion")
    grades = {grade_of(e) for e in (base, *donors)}
    if len(grades) != 1:
        raise ActionError("grade_mismatch")
    grade = grades.pop() + 1
    parts = combine(parts_of(base), [parts_of(d) for d in donors])
    return {"kind": kind, "base": base_id, "donors": list(donor_ids), "grade": grade, "type": body,
            "parts": parts, "cost": cost_of(grade), "seconds": seconds_of(grade)}


SQUAD_MIN = 4


def preview(city: dict, heroes: list, kind: str, base_id: int, donor_ids: list) -> dict:
    """What the fusion would make, with the stats it would have; changes nothing."""
    p = plan(city, heroes, kind, base_id, donor_ids)
    if kind == "building":
        base = next(b for b in city["buildings"] if b["id"] == base_id)
        probe = {**base, "fusion": {"grade": p["grade"], "parts": p["parts"]}}
        p["stats"] = building_stats(probe)
    else:
        base = next(h for h in heroes if h["id"] == base_id)
        p["stats"] = evolution.stats_of(hero_spec(base["cls"], base.get("form"), 3, p["parts"]))
    return p


# ── at the forge ───────────────────────────────────────────────────────
def start(city: dict, heroes: list, materials: dict, kind: str, base_id: int, donor_ids: list,
          now: float) -> dict:
    p = plan(city, heroes, kind, base_id, donor_ids)
    forge = city["forge"]
    if len(forge["jobs"]) >= forge["slots"]:
        raise ActionError("forge_busy")
    if any(materials.get(m, 0) < n for m, n in p["cost"].items()):
        raise ActionError("not_enough_materials")
    for m, n in p["cost"].items():
        materials[m] -= n
    job = {"id": forge["next_job_id"], "recipe": "fuse", "kind": kind, "base": base_id, "type": p["type"],
           "grade": p["grade"], "parts": p["parts"], "started_at": now, "ready_at": now + p["seconds"]}
    forge["next_job_id"] += 1
    forge["jobs"].append(job)
    body = p["parts"][0]
    job["path" if kind == "building" else "form"] = body.get("path", body.get("form"))
    if kind == "building":
        economy.collect(city, materials, now, building_ids=donor_ids)
        city["buildings"] = [b for b in city["buildings"] if b["id"] not in donor_ids]
        next(b for b in city["buildings"] if b["id"] == base_id)["fusing"] = job["id"]
    else:
        for item in city.get("items", []):
            if item.get("hero") in donor_ids:
                item["hero"] = None
        heroes[:] = [h for h in heroes if h["id"] not in donor_ids]
        base = next(h for h in heroes if h["id"] == base_id)
        base["evolving"] = job["id"]          # it waits at the forge like an evolving hero
        base["fusing"] = True
    return job


def finish(city: dict, heroes: list, job: dict, now: float) -> dict:
    result = {"item": job["type"], "kind": "fusion", "count": 0, "grade": job["grade"],
              "seconds": seconds_of(job["grade"])}
    fusion = {"grade": job["grade"], "parts": job["parts"]}
    if job["kind"] == "building":
        b = next((b for b in city["buildings"] if b["id"] == job["base"]), None)
        if b is None:
            return result
        b.pop("fusing", None)
        b["fusion"] = fusion
        if outputs(b) and "collected_at" not in b:
            b["collected_at"] = now
        result.update(count=1, building=b["id"])
    else:
        hero = next((h for h in heroes if h["id"] == job["base"]), None)
        if hero is None:
            return result
        hero.pop("evolving", None)
        hero.pop("fusing", None)
        hero["fusion"] = fusion
        result.update(count=1, hero=hero["id"])
    return result


# ── what the client sees ───────────────────────────────────────────────
def building_stats(b: dict) -> dict:
    body, weapons, blasts = building_kit(b)
    out = {"hp": body.hp}
    if weapons:
        out["weapons"] = [{"type": w_type, **_weapon_stats(w)} for w_type, w in _typed(b, weapons)]
    if body.thorns:
        out["thorns"] = body.thorns
    if blasts:
        out["blast"] = sum(x.damage for x in blasts)
    made = outputs(b)
    if made:
        out["produces"] = [{"material": m, "per_hour": round(r), "capacity": round(r * h)} for m, r, h in made]
    return out


def _typed(b: dict, weapons: list) -> list:
    towers = [p["type"] for p in building_parts(b) if BUILDINGS[p["type"]].category == "tower"]
    return list(zip(towers, weapons))


def _weapon_stats(w: BuildingType) -> dict:
    out = {"damage": w.damage, "range": w.attack_range, "cooldown": w.cooldown}
    if w.chain_targets:
        out["chain"] = w.chain_targets + 1
    if w.splash_radius:
        out["area"] = w.splash_radius
    if w.slow_seconds:
        out["slow"] = round((1 - w.slow_factor) * 100)
    return out


def public_fusion() -> dict:
    return {"bonus": BONUS, "max_parts": MAX_PARTS, "base_types": list(BASE_TYPES), "donor_types": list(DONOR_TYPES),
            "costs": {str(g): {"cost": cost_of(g), "seconds": seconds_of(g)} for g in range(1, 6)}}
