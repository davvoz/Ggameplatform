"""Fusion: three maxed buildings or heroes into one, base body plus the donors' powers, grades."""

import unittest

from app.games.hexforge_be import defense, economy, evolution, forge, fusion, upgrades
from app.games.hexforge_be.errors import ActionError
from app.games.hexforge_be.simulation import simulate

T0 = 1_000_000.0
RICH = {m: 100_000 for m in economy.MATERIALS}
MAXED = {"core": "citadel", "rune_tower": "sniper", "lightning_tower": "storm", "frost_tower": "glacier",
         "mana_well": "rich_vein", "wall": "spiked", "rune_trap": "inferno"}


def setup(maxed=MAXED):
    city = economy.starter_city(T0)
    forge.ensure_forge(city)
    city["forge"]["slots"] = 5
    city["upgrades"] = {kind: {"level": 5, "path": path} for kind, path in maxed.items()}
    for kind, x, y in (("lightning_tower", 1, 1), ("rune_trap", 15, 1), ("rune_tower", 1, 15), ("rune_tower", 4, 15)):
        city["buildings"].append({"id": city["next_id"], "type": kind, "x": x, "y": y})
        city["next_id"] += 1
    upgrades.ensure_upgrades(city)
    return city, dict(RICH)


def ids(city, kind):
    return [b["id"] for b in city["buildings"] if b["type"] == kind]


def maxed_heroes():
    return [{"id": i, "cls": cls, "form": form, "tier": 3, "xp": 900}
            for i, (cls, form) in enumerate([("guardian", "bastion"), ("neon_blade", "reaper"),
                                             ("technomancer", "archon"), ("neon_blade", "phantom"),
                                             ("guardian", "warlord"), ("technomancer", "arcanist")], start=1)]


def fuse(city, heroes, materials, kind, base, donors):
    job = fusion.start(city, heroes, materials, kind, base, donors, T0)
    return forge.claim(city, heroes, job["id"], job["ready_at"])


class FusionTest(unittest.TestCase):
    def code(self, fn):
        with self.assertRaises(ActionError) as caught:
            fn()
        return caught.exception.code

    def test_only_maxed_buildings_fuse_and_the_core_never(self):
        city, materials = setup({"core": "citadel", "rune_tower": "sniper"})
        tower, other = ids(city, "rune_tower")[:2]
        frost = ids(city, "frost_tower")[0]
        self.assertEqual(self.code(lambda: fusion.plan(city, [], "building", tower, [other, frost])), "not_max_level")
        core = ids(city, "core")[0]
        self.assertEqual(self.code(lambda: fusion.plan(city, [], "building", core, [tower, other])), "cannot_fuse")
        self.assertEqual(self.code(lambda: fusion.plan(city, [], "building", tower, [tower, other])), "bad_fusion")

    def test_a_fused_tower_shoots_every_way_and_is_stronger_than_the_three(self):
        city, materials = setup()
        rune, lightning, frost = ids(city, "rune_tower")[0], ids(city, "lightning_tower")[0], ids(city, "frost_tower")[0]
        alone = [fusion.building_kit(b) for b in city["buildings"] if b["id"] in (rune, lightning, frost)]
        claimed = fuse(city, [], materials, "building", rune, [lightning, frost])
        self.assertEqual((claimed["kind"], claimed["grade"], claimed["count"]), ("fusion", 1, 1))
        self.assertEqual(ids(city, "lightning_tower"), [])                    # the donors are gone
        fused = next(b for b in city["buildings"] if b["id"] == rune)
        body, weapons, _ = fusion.building_kit(fused)
        self.assertEqual(body.size, 2)                                          # the base keeps its body
        self.assertEqual(len(weapons), 3)
        self.assertTrue(any(w.chain_targets for w in weapons) and any(w.slow_seconds for w in weapons))
        self.assertGreater(body.hp, sum(k[0].hp for k in alone))
        self.assertGreater(sum(w.damage for w in weapons), sum(k[0].damage for k in alone))
        self.assertLess(materials["chips"], RICH["chips"])

    def test_a_tower_with_a_well_makes_mana_and_a_trap_gives_a_blast(self):
        city, materials = setup()
        rune, well, trap = ids(city, "rune_tower")[0], ids(city, "mana_well")[0], ids(city, "rune_trap")[0]
        fuse(city, [], materials, "building", rune, [well, trap])
        fused = next(b for b in city["buildings"] if b["id"] == rune)
        self.assertGreater(economy.pending_all(fused, T0 + 3600 * 5)["mana"], 0)
        got = economy.collect(city, materials, T0 + 3600 * 5 + 30_000, [rune])
        self.assertGreater(got["mana"], 0)
        self.assertEqual(len(fusion.building_kit(fused)[2]), 1)
        stats = fusion.building_stats(fused)
        self.assertIn("produces", stats)
        self.assertIn("blast", stats)

    def test_grades_need_three_of_the_same(self):
        city, materials = setup()
        towers = ids(city, "rune_tower")
        fuse(city, [], materials, "building", towers[0], [ids(city, "lightning_tower")[0], ids(city, "frost_tower")[0]])
        code = self.code(lambda: fusion.plan(city, [], "building", towers[0], [towers[1], towers[2]]))
        self.assertEqual(code, "grade_mismatch")

    def test_parts_stay_at_three_and_the_body_takes_the_rest(self):
        a = [{"type": "rune_tower", "path": "sniper", "power": 1.2}, {"type": "mana_well", "path": "x", "power": 1.2},
             {"type": "wall", "path": "y", "power": 1.2}]
        b = [{"type": "frost_tower", "path": "glacier", "power": 3.6}]
        c = [{"type": "mana_well", "path": "x", "power": 3.6}]
        parts = fusion.combine(a, [b, c])
        self.assertEqual([p["type"] for p in parts], ["rune_tower", "mana_well", "wall"])
        self.assertAlmostEqual(parts[0]["power"], (1.2 + 3.6) * fusion.BONUS, places=2)
        self.assertAlmostEqual(parts[1]["power"], (1.2 + 3.6) * fusion.BONUS, places=2)

    def test_a_fused_city_fights(self):
        city, materials = setup()
        rune, lightning, trap = ids(city, "rune_tower")[0], ids(city, "lightning_tower")[0], ids(city, "rune_trap")[0]
        fuse(city, [], materials, "building", rune, [lightning, trap])
        target = defense.battle_city(city)
        self.assertTrue(any(b.get("fusion") for b in target["buildings"]))
        result = simulate(target, ["guardian", "neon_blade", "neon_blade", "technomancer"], "west", "towers", "compact")
        shooters = {e["building"] for e in result["events"] if e["type"] in ("shot", "bolt")}
        self.assertIn(rune, shooters)

    def test_heroes_fuse_into_one_with_every_power(self):
        city, materials = setup()
        heroes = maxed_heroes()
        city["items"] = [{"id": 1, "type": "ward_sigil", "level": 1, "hero": 1}]
        claimed = fuse(city, heroes, materials, "hero", 2, [1, 3])
        self.assertEqual(claimed["count"], 1)
        self.assertEqual(len(heroes), 4)
        self.assertIsNone(city["items"][0]["hero"])                         # the donors' items go back
        hero = next(h for h in heroes if h["id"] == 2)
        spec = fusion.hero_spec_of(hero)
        self.assertEqual(hero["cls"], "neon_blade")
        self.assertTrue(spec.jumps_walls and spec.taunt_radius and spec.nova_damage)
        alone = [evolution.spec_of(c, f, 3) for c, f in (("guardian", "bastion"), ("neon_blade", "reaper"),
                                                          ("technomancer", "archon"))]
        self.assertGreater(spec.hp, sum(s.hp for s in alone))
        unit = evolution.unit_of(hero)
        result = simulate(defense.battle_city(city), [unit, "guardian", "neon_blade", "technomancer"],
                          "west", "towers", "compact")
        self.assertEqual(result["squad"][0]["grade"], 1)

    def test_a_squad_must_remain(self):
        city, materials = setup()
        heroes = maxed_heroes()[:5]
        code = self.code(lambda: fusion.plan(city, heroes, "hero", 1, [2, 3]))
        self.assertEqual(code, "last_squad")

    def test_a_hero_must_have_ascended_and_waits_at_the_forge(self):
        city, materials = setup()
        heroes = maxed_heroes()
        heroes[0]["tier"] = 2
        self.assertEqual(self.code(lambda: fusion.plan(city, heroes, "hero", 1, [2, 3])), "not_max_level")
        fusion.start(city, heroes, materials, "hero", 2, [4, 5], T0)
        self.assertTrue(heroes[1].get("evolving"))
