"""
Hexforge: attacking other players.

  arena    opens when you clear the first outpost. Until then you cannot
           attack players and nobody can attack you.
  scouting "Find a rival" picks a player of similar strength who can be
           attacked; asking again picks another. Only the scouted rival can
           be attacked. The rival's towers keep their aim secret.
  attack   1 energy, like an outpost. The rival's city fights exactly as
           saved. A win takes 20 % of what lies above the vault's
           protection (30 % if the core falls): the rival loses what you take.
  shield   whoever is attacked cannot be attacked again for a while;
           attacking a player ends your own shield.
  revenge  for a day after a raid, the defender may scout the raider
           directly (if the raider can be attacked).
  trophies the PvP score, never reset. A win takes trophies from the rival,
           a defeat hands some to them; beating a stronger rival pays more.
           Leagues are names for trophy bands.

Pure rules over plain dicts; the service loads and saves both players.
"""

from __future__ import annotations

import random

from .catalog import BUILDINGS, TRAP
from .economy import MATERIALS
from .errors import ActionError

ARENA_OUTPOST = 1
SHIELD_SECONDS = 3 * 3600
VAULT_PROTECTS = 400          # per material, never lootable
CLOSEST_RIVALS = 5            # the scout picks among this many of similar trophies
REVENGE_SECONDS = 24 * 3600
TROPHY_WIN, TROPHY_LOSS = 30, 20
TROPHY_GAP_STEP = 25          # every 25 trophies of difference move the stakes by 1
LEAGUES = ((2000, "Mythic"), (1000, "Neon"), (500, "Gold"), (200, "Silver"), (0, "Bronze"))


def ensure_pvp(city: dict) -> None:
    city.setdefault("pvp", {"scout": None, "shield_until": 0})


def in_arena(city: dict) -> bool:
    return ARENA_OUTPOST in city.get("campaign", {}).get("cleared", [])


def shield_until(city: dict) -> float:
    return city.get("pvp", {}).get("shield_until", 0)


def strength(city: dict) -> int:
    """Rough defensive strength for matchmaking: towers and traps standing."""
    return sum(BUILDINGS[b["type"]].category in ("tower", "trap") for b in city["buildings"])


def attackable(city: dict, now: float) -> bool:
    has_tower = any(BUILDINGS[b["type"]].category == "tower" for b in city["buildings"])
    return in_arena(city) and shield_until(city) <= now and has_tower


def lootable(materials: dict) -> dict:
    return {m: max(0, materials.get(m, 0) - VAULT_PROTECTS) for m in MATERIALS}


def loot_for(materials: dict, percent: int) -> dict:
    return {m: int(amount * percent / 100) for m, amount in lootable(materials).items()}


def choose_rival(my_city: dict, my_trophies: int, candidates: list, now: float,
                 rng: random.Random | None = None):
    """A user id from [(user_id, city, trophies)], or None when nobody can be attacked.

    Picks among the CLOSEST_RIVALS players nearest in trophies (then in
    strength), avoiding the rival already scouted when there is anyone else.
    """
    rng = rng or random.Random()
    mine = strength(my_city)
    pool = [(abs(trophies - my_trophies), abs(strength(city) - mine), uid)
            for uid, city, trophies in candidates if attackable(city, now)]
    if not pool:
        return None
    pool.sort()
    nearest = [uid for _, _, uid in pool[:CLOSEST_RIVALS]]
    current = my_city["pvp"]["scout"]
    fresh = [uid for uid in nearest if uid != current]
    return rng.choice(fresh or nearest)


def public_rival(name: str, battle_city: dict, materials: dict, available: bool,
                 trophies: int = 0, my_trophies: int = 0) -> dict:
    """What the attacker may see: the layout without tower aims or traps, and the loot at stake."""
    buildings = [{k: v for k, v in b.items() if k != "aim"}
                 for b in battle_city["buildings"] if b["type"] != TRAP]
    return {
        "name": name,
        "strength": strength(battle_city),
        "city": {"grid": battle_city["grid"], "buildings": buildings},
        "available": available,
        "trophies": trophies,
        "league": league(trophies),
        "stakes": trophy_stakes(my_trophies, trophies),
        "loot_on_win": loot_for(materials, 20),
        "loot_on_core": loot_for(materials, 30),
    }


def settle_attack(attacker_city: dict, defender_city: dict, attacker_materials: dict,
                  defender_materials: dict, summary: dict, now: float) -> dict:
    """Move the loot, raise the defender's shield, drop the attacker's; returns the loot."""
    if summary["victory"]:
        loot = loot_for(defender_materials, summary["loot_percent"])
    else:
        loot = dict.fromkeys(MATERIALS, 0)
    for m, amount in loot.items():
        defender_materials[m] = defender_materials.get(m, 0) - amount
        attacker_materials[m] = attacker_materials.get(m, 0) + amount
    ensure_pvp(defender_city)
    defender_city["pvp"]["shield_until"] = now + SHIELD_SECONDS
    attacker_city["pvp"]["shield_until"] = 0
    attacker_city["pvp"]["scout"] = None
    return loot


def require_arena(city: dict) -> None:
    if not in_arena(city):
        raise ActionError("arena_locked")


# ── trophies ───────────────────────────────────────────────────────────
def league(trophies: int) -> str:
    return next(name for floor, name in LEAGUES if trophies >= floor)


def next_league(trophies: int):
    """(name, trophies needed) of the next league up, or None at the top."""
    above = [(floor, name) for floor, name in LEAGUES if floor > trophies]
    if not above:
        return None
    floor, name = min(above)
    return {"name": name, "at": floor}


def trophy_stakes(attacker: int, defender: int) -> dict:
    """What a raid is worth: trophies won on a victory, lost on a defeat."""
    shift = round((defender - attacker) / TROPHY_GAP_STEP)
    return {"win": max(5, min(50, TROPHY_WIN + shift)),
            "loss": max(5, min(40, TROPHY_LOSS - shift))}


def settle_trophies(attacker: int, defender: int, victory: bool) -> tuple[int, int, int]:
    """New (attacker, defender) trophies and the attacker's change. Nobody goes below 0."""
    stakes = trophy_stakes(attacker, defender)
    if victory:
        return attacker + stakes["win"], max(0, defender - stakes["win"]), stakes["win"]
    lost = min(stakes["loss"], attacker)
    return attacker - lost, defender + stakes["loss"], -lost


def can_revenge(my_city: dict, raided_at: float, raider_city, now: float) -> bool:
    """Whether the defender may scout this raider now."""
    return (in_arena(my_city) and now - raided_at <= REVENGE_SECONDS
            and raider_city is not None and attackable(raider_city, now))
