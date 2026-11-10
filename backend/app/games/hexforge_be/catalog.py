"""
Hexforge: unit and building stats for the phase-1 battle prototype.

Distances are in grid cells, times in seconds. These are first-pass values for
balancing, not final numbers.
"""

from __future__ import annotations

from dataclasses import dataclass

TOWERS = ("rune_tower", "lightning_tower", "frost_tower")
PRODUCTION = ("rune_quarry", "scrap_foundry", "mana_well", "data_node", "vault")
CORE = "core"
WALL = "wall"
TRAP = "rune_trap"


@dataclass(frozen=True)
class HeroClass:
    hp: int
    speed: float          # cells per second
    damage: int
    attack_range: float   # from the hero to the edge of the target
    cooldown: float
    jumps_walls: bool = False
    taunt_radius: float = 0.0
    nova_damage: int = 0
    nova_radius: float = 0.0
    nova_cooldown: float = 0.0


HEROES: dict[str, HeroClass] = {
    "guardian": HeroClass(hp=2000, speed=1.2, damage=45, attack_range=0.9, cooldown=1.0,
                          taunt_radius=4.0),
    "neon_blade": HeroClass(hp=750, speed=2.2, damage=110, attack_range=0.9, cooldown=0.8,
                            jumps_walls=True),
    "technomancer": HeroClass(hp=800, speed=1.3, damage=50, attack_range=3.5, cooldown=1.2,
                              nova_damage=160, nova_radius=2.0, nova_cooldown=6.0),
}


@dataclass(frozen=True)
class BuildingType:
    size: int
    hp: int
    category: str            # core | tower | production | wall | trap
    attack_range: float = 0.0
    damage: int = 0
    cooldown: float = 0.0
    chain_targets: int = 0   # lightning: extra heroes hit after the first
    chain_radius: float = 0.0
    splash_radius: float = 0.0
    slow_factor: float = 1.0
    slow_seconds: float = 0.0
    trigger_radius: float = 0.0


BUILDINGS: dict[str, BuildingType] = {
    CORE: BuildingType(size=3, hp=3200, category="core"),
    WALL: BuildingType(size=1, hp=650, category="wall"),
    "rune_tower": BuildingType(size=2, hp=950, category="tower",
                               attack_range=5.0, damage=70, cooldown=1.0),
    "lightning_tower": BuildingType(size=2, hp=850, category="tower",
                                    attack_range=4.0, damage=55, cooldown=1.5,
                                    chain_targets=2, chain_radius=2.5),
    "frost_tower": BuildingType(size=2, hp=900, category="tower",
                                attack_range=3.5, damage=30, cooldown=1.2,
                                splash_radius=1.5, slow_factor=0.5, slow_seconds=2.0),
    TRAP: BuildingType(size=1, hp=1, category="trap",
                       damage=380, splash_radius=1.6, trigger_radius=0.8),
    "rune_quarry": BuildingType(size=2, hp=700, category="production"),
    "scrap_foundry": BuildingType(size=2, hp=700, category="production"),
    "mana_well": BuildingType(size=2, hp=700, category="production"),
    "data_node": BuildingType(size=2, hp=700, category="production"),
    "vault": BuildingType(size=2, hp=1300, category="production"),
}

SIDES = ("north", "east", "south", "west")
PRIORITIES = ("towers", "core", "production")
TACTICS = ("compact", "spread", "split")
SQUAD_SIZE = 4


def public_catalog() -> dict:
    """Stats the client needs to label and draw units."""
    return {
        "heroes": {name: {"hp": h.hp, "speed": h.speed, "range": h.attack_range,
                          "jumps_walls": h.jumps_walls}
                   for name, h in HEROES.items()},
        "buildings": {name: {"size": b.size, "hp": b.hp, "category": b.category,
                             "range": b.attack_range}
                      for name, b in BUILDINGS.items()},
        "sides": list(SIDES),
        "priorities": list(PRIORITIES),
        "tactics": list(TACTICS),
        "squad_size": SQUAD_SIZE,
    }
