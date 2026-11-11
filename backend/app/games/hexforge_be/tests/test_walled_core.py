"""A target ringed tight by walls (no cell to strike it from) is breached, not stared at."""

import unittest

from app.games.hexforge_be.simulation import simulate


def walled_core():
    """A core inside a ring of walls that touches it, with towers pressed against the ring."""
    buildings = [{"id": 1, "type": "core", "x": 7, "y": 7, "size": 3, "hp": 3200}]
    next_id = 2
    for x in range(6, 11):
        for y in range(6, 11):
            if x in (6, 10) or y in (6, 10):
                buildings.append({"id": next_id, "type": "wall", "x": x, "y": y, "size": 1, "hp": 650})
                next_id += 1
    for x, y in ((7, 11), (9, 11)):                       # towers pressed against the south of the ring
        buildings.append({"id": next_id, "type": "rune_tower", "x": x, "y": y, "size": 2, "hp": 950})
        next_id += 1
    return {"grid": 18, "buildings": buildings}


class WalledCoreTest(unittest.TestCase):
    def test_blades_sent_at_the_core_break_in_instead_of_standing_still(self):
        for side in ("north", "south", "east", "west"):
            result = simulate(walled_core(), ["neon_blade", "neon_blade", "neon_blade", "neon_blade"], side, "core", "compact")
            dealt = [h["dealt"] for h in result["summary"]["heroes"]]
            self.assertTrue(all(d > 0 for d in dealt), f"{side}: {dealt}")
