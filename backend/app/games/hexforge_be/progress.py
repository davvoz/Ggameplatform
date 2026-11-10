"""
Hexforge: the player's level.

Playing earns experience (XP): collecting, forging, attacking. Levels follow
a gentle curve; every level adds one hero slot (8 at level 1) and a gift of
materials, and some levels unlock more (a third forge slot at level 5).

Progress lives inside the city JSON (`city["progress"]`), added by
`ensure_progress` to older saves. `granted` is the highest level whose gifts
were handed out, so a gift is never given twice.
"""

from __future__ import annotations

BASE_HERO_SLOTS = 7            # + level: 8 hero slots at level 1
FORGE_SLOT_LEVELS = {5: 3}     # level -> forge slots from then on

XP_COLLECT_UNITS = 25          # 1 XP per this many units collected
XP_ATTACK = {"outpost": (40, 15), "rival": (50, 20)}   # (win, loss)


def ensure_progress(city: dict) -> None:
    city.setdefault("progress", {"xp": 0, "granted": 1})


def xp_for_next(level: int) -> int:
    """XP needed to go from `level` to `level + 1`."""
    return 100 + 50 * (level - 1)


def level_of(xp: int) -> tuple[int, int]:
    """(level, XP already earned inside that level)."""
    level = 1
    while xp >= xp_for_next(level):
        xp -= xp_for_next(level)
        level += 1
    return level, xp


def hero_slots(city: dict) -> int:
    return BASE_HERO_SLOTS + level_of(city["progress"]["xp"])[0]


def level_gift(level: int) -> dict:
    """The materials handed out on reaching `level`."""
    return {"rune_stone": 40 * level, "scrap": 40 * level, "mana": 25 * level, "chips": 20 * level}


def xp_for_forging(seconds: int) -> int:
    """Longer jobs teach more: about one XP per minute at the anvil, at least 2."""
    return max(2, round(seconds / 60))


def xp_for_collecting(units: int) -> int:
    return units // XP_COLLECT_UNITS


def xp_for_attack(kind: str, victory: bool) -> int:
    win, loss = XP_ATTACK[kind]
    return win if victory else loss


def gain(city: dict, materials: dict, xp: int) -> list[dict]:
    """Add XP; hand out the gifts of every level reached. Returns those levels with their gifts."""
    progress = city["progress"]
    progress["xp"] += max(0, int(xp))
    level, _ = level_of(progress["xp"])
    reached = []
    while progress["granted"] < level:
        progress["granted"] += 1
        new = progress["granted"]
        gift = level_gift(new)
        for material, amount in gift.items():
            materials[material] = materials.get(material, 0) + amount
        slots = FORGE_SLOT_LEVELS.get(new)
        if slots and city.get("forge", {}).get("slots", 0) < slots:
            city["forge"]["slots"] = slots
        reached.append({"level": new, "gift": gift, "hero_slots": BASE_HERO_SLOTS + new,
                        "forge_slots": slots})
    return reached


def public_progress(city: dict) -> dict:
    xp = city["progress"]["xp"]
    level, into = level_of(xp)
    return {"level": level, "xp": xp, "into_level": into, "for_next": xp_for_next(level),
            "hero_slots": BASE_HERO_SLOTS + level,
            # what reaching this level gave, for the client's celebration
            "gift": level_gift(level) if level > 1 else {},
            "unlocked_forge_slots": FORGE_SLOT_LEVELS.get(level),
            "next_unlock": _next_unlock(level)}


def _next_unlock(level: int) -> dict | None:
    """What the next level adds besides a hero slot and its gift, if anything."""
    slots = FORGE_SLOT_LEVELS.get(level + 1)
    return {"level": level + 1, "forge_slots": slots} if slots else None
