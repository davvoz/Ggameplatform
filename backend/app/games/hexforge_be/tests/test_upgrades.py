"""Building upgrades: levels per type, the Core leads, a path at level 3, effects in battle and economy."""

import unittest

from app.games.hexforge_be import defense, economy, forge, pvp, upgrades
from app.games.hexforge_be.catalog import BUILDINGS
from app.games.hexforge_be.errors import ActionError
from app.games.hexforge_be.simulation import simulate

T0 = 1_000_000.0
RICH = {m: 100_000 for m in economy.MATERIALS}


def setup():
    city = economy.starter_city(T0)
    forge.ensure_forge(city)
    upgrades.ensure_upgrades(city)
    return city, dict(RICH)


def first(city, kind):
    return next(b for b in city["buildings"] if b["type"] == kind)


def level_up(city, materials, kind, path=None):
    job = upgrades.start(city, materials, first(city, kind)["id"], path, T0)
    return forge.claim(city, [], job["id"], job["ready_at"])


class UpgradeTest(unittest.TestCase):
    def code(self, fn):
        with self.assertRaises(ActionError) as caught:
            fn()
        return caught.exception.code

    def test_the_core_leads_and_a_level_counts_for_the_whole_type(self):
        city, materials = setup()
        tower = first(city, "rune_tower")
        self.assertEqual(self.code(lambda: upgrades.start(city, materials, tower["id"], None, T0)), "core_too_low")
        claimed = level_up(city, materials, "core")
        self.assertEqual((claimed["kind"], claimed["level"]), ("build_up", 2))
        level_up(city, materials, "wall")
        self.assertTrue(all(b.get("level") == 2 for b in city["buildings"] if b["type"] == "wall"))
        self.assertLess(materials["rune_stone"], RICH["rune_stone"])

    def test_level_three_needs_a_path_and_keeps_it(self):
        city, materials = setup()
        for _ in range(2):
            level_up(city, materials, "core", "citadel" if upgrades.level_of(city, "core") == 2 else None)
        level_up(city, materials, "rune_tower")
        tower = first(city, "rune_tower")
        self.assertEqual(self.code(lambda: upgrades.start(city, materials, tower["id"], "nope", T0)), "unknown_path")
        level_up(city, materials, "rune_tower", "sniper")
        self.assertEqual((tower["level"], tower["path"]), (3, "sniper"))
        self.assertGreater(upgrades.building_spec(tower).attack_range, BUILDINGS["rune_tower"].attack_range)

    def test_one_job_per_type_and_a_top_level(self):
        city, materials = setup()
        core = first(city, "core")
        upgrades.start(city, materials, core["id"], None, T0)
        self.assertEqual(self.code(lambda: upgrades.start(city, materials, core["id"], None, T0)), "already_upgrading")
        city["upgrades"]["core"] = {"level": 5, "path": "beacon"}
        city["forge"]["jobs"] = []
        self.assertEqual(self.code(lambda: upgrades.start(city, materials, core["id"], None, T0)), "max_level")

    def test_paths_change_the_numbers(self):
        self.assertGreater(upgrades.spec_of("lightning_tower", 5, "storm").chain_targets,
                           BUILDINGS["lightning_tower"].chain_targets)
        self.assertLess(upgrades.spec_of("rune_tower", 4, "gatling").cooldown, BUILDINGS["rune_tower"].cooldown)
        self.assertLess(upgrades.spec_of("frost_tower", 3, "glacier").slow_factor, BUILDINGS["frost_tower"].slow_factor)
        self.assertGreater(upgrades.spec_of("wall", 3, "spiked").thorns, 0)
        self.assertGreater(upgrades.spec_of("rune_trap", 3, "snare").slow_seconds, 0)
        self.assertGreater(upgrades.spec_of("core", 3, "beacon").damage, 0)

    def test_reach_grows_a_quarter_cell_each_level_and_counts_from_the_edge(self):
        base = BUILDINGS["rune_tower"].attack_range
        self.assertEqual(upgrades.spec_of("rune_tower", 5).attack_range, base + 1.0)
        # a mage at its full reach from a tower's edge is inside the Rune and Lightning towers' reach
        mage = 3.5
        self.assertGreaterEqual(BUILDINGS["rune_tower"].attack_range, mage)
        self.assertGreaterEqual(BUILDINGS["lightning_tower"].attack_range, mage)

    def test_production_and_vault(self):
        quarry = {"type": "rune_quarry", "collected_at": T0}
        rich = {**quarry, "level": 4, "path": "rich_vein"}
        deep = {**quarry, "level": 4, "path": "deep_store"}
        self.assertGreater(economy.pending(rich, T0 + 3600), economy.pending(quarry, T0 + 3600))
        self.assertGreater(economy.capacity("rune_quarry", deep), economy.capacity("rune_quarry"))
        city = {"upgrades": {"vault": {"level": 3, "path": "strongbox"}}}
        self.assertGreater(upgrades.vault_protects(city), pvp.VAULT_PROTECTS)
        self.assertEqual(pvp.loot_for({"rune_stone": 1000}, 20, upgrades.vault_protects(city))["rune_stone"],
                         int((1000 - upgrades.vault_protects(city)) * 0.2))

    def test_upgraded_defences_fight_harder(self):
        city, _ = setup()
        squad = ["guardian", "neon_blade", "neon_blade", "technomancer"]
        plain = simulate(defense.battle_city(city), squad, "south", "core", "compact")
        for kind in upgrades.PATHS:
            city["upgrades"][kind] = {"level": 5, "path": upgrades.PATHS[kind][0]}
        city["upgrades"]["core"]["path"] = "beacon"
        upgrades.stamp(city)
        strong = simulate(defense.battle_city(city), squad, "south", "core", "compact")
        self.assertLess(strong["summary"]["destruction"], plain["summary"]["destruction"])


if __name__ == "__main__":
    unittest.main()
