"""
Hexforge: the hand-built test city that every phase-1 attack targets.

The field is GRID x GRID cells. Row/column 0 and GRID-1 are left empty: the
attacking squad enters there. The city is deliberately uneven so the entry
side matters: the north is the most heavily defended, the south is rich in
production buildings but hides a trap, the west has a lightning tower.
"""

from __future__ import annotations

from .catalog import BUILDINGS, TRAP, WALL

GRID = 18

_RING_MIN, _RING_MAX = 5, 12

_LAYOUT: list[tuple[str, int, int]] = [
    ("core", 7, 7),
    # inside the walls
    ("lightning_tower", 10, 10),
    ("rune_tower", 6, 10),
    ("vault", 10, 6),
    # north: the strongest side
    ("rune_tower", 3, 2),
    ("rune_tower", 12, 2),
    ("data_node", 7, 2),
    (TRAP, 6, 4),
    (TRAP, 10, 4),
    # east
    ("frost_tower", 14, 7),
    ("mana_well", 14, 11),
    # south: rich but trapped
    ("rune_quarry", 3, 14),
    ("scrap_foundry", 7, 14),
    ("frost_tower", 12, 14),
    (TRAP, 8, 13),
    # west
    ("lightning_tower", 2, 8),
    ("rune_quarry", 2, 11),
]


def _wall_ring() -> list[tuple[str, int, int]]:
    cells = []
    for x in range(_RING_MIN, _RING_MAX + 1):
        for y in range(_RING_MIN, _RING_MAX + 1):
            if x in (_RING_MIN, _RING_MAX) or y in (_RING_MIN, _RING_MAX):
                cells.append((WALL, x, y))
    return cells


def demo_city() -> dict:
    """The test city as plain data: {grid, buildings:[{id,type,x,y,size,hp}]}."""
    buildings = []
    for index, (kind, x, y) in enumerate(_LAYOUT + _wall_ring()):
        spec = BUILDINGS[kind]
        buildings.append({"id": index, "type": kind, "x": x, "y": y,
                          "size": spec.size, "hp": spec.hp})
    return {"name": "Test bastion", "grid": GRID, "buildings": buildings}
