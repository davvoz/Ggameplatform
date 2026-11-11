"""The Explorer: missions, surprise loot, its own items, never in a squad."""

import random
import unittest

from app.games.hexforge_be import economy, evolution, explorers, forge, items, outposts, progress, rewards
from app.games.hexforge_be.errors import ActionError

T0 = 1_000_000.0


def setup():
    city = economy.starter_city(T0)
    forge.ensure_forge(city)
    progress.ensure_progress(city)
    rewards.ensure_rewards(city, "ada", T0)
    items.ensure_items(city)
    heroes = economy.starter_heroes() + [{"id": 9, "cls": "explorer"}]
    return city, heroes, {m: 0 for m in economy.MATERIALS}


class ExplorerTest(unittest.TestCase):
    def code(self, fn):
        with self.assertRaises(ActionError) as caught:
            fn()
        return caught.exception.code

    def test_a_mission_brings_back_loot_once(self):
        city, heroes, materials = setup()
        explorers.start(city, heroes, 9, "expedition", T0, random.Random(1))
        self.assertEqual(self.code(lambda: explorers.start(city, heroes, 9, "scout", T0)), "on_mission")
        self.assertEqual(self.code(lambda: explorers.claim(city, heroes, materials, 9, T0 + 60)), "not_ready")
        loot = explorers.claim(city, heroes, materials, 9, T0 + 4 * 3600)
        self.assertGreater(sum(materials.values()), 600)
        self.assertEqual(loot["kind"], "expedition")
        self.assertNotIn("mission", heroes[-1])
        self.assertEqual(self.code(lambda: explorers.claim(city, heroes, materials, 9, T0 + 9 * 3600)), "no_mission")

    def test_the_loot_is_fixed_when_the_trip_starts(self):
        city, heroes, _ = setup()
        mission = explorers.start(city, heroes, 9, "voyage", T0, random.Random(7))
        self.assertEqual(explorers.loot_of(city, 9, mission), explorers.loot_of(city, 9, mission))
        self.assertTrue(explorers.loot_of(city, 9, mission)["bonuses"])     # a voyage always brings a bonus

    def test_only_explorers_explore_and_explorers_never_fight(self):
        city, heroes, _ = setup()
        self.assertEqual(self.code(lambda: explorers.start(city, heroes, 1, "scout", T0)), "not_an_explorer")
        self.assertEqual(self.code(lambda: outposts.squad_classes(heroes, [1, 2, 3, 9], T0, city)),
                         "explorer_cannot_fight")
        self.assertFalse(evolution.can_evolve({"id": 9, "cls": "explorer", "xp": 999}))

    def test_its_own_items_help_and_others_do_not_fit(self):
        city, heroes, _ = setup()
        boots = items.add(city, "trail_boots")
        ward = items.add(city, "ward_sigil")
        self.assertEqual(self.code(lambda: items.equip(city, heroes, 9, ward["id"])), "wrong_class")
        self.assertEqual(self.code(lambda: items.equip(city, heroes, 1, boots["id"])), "wrong_class")
        items.equip(city, heroes, 9, boots["id"])
        self.assertLess(explorers.trip_seconds(city, 9, "scout"), explorers.MISSIONS["scout"][0])
        mission = {"kind": "scout", "seed": 3}
        plain = sum(explorers.loot_of(city, 9, mission)["materials"].values())
        items.equip(city, heroes, 9, items.add(city, "treasure_map")["id"])
        self.assertGreater(sum(explorers.loot_of(city, 9, mission)["materials"].values()), plain)

    def test_the_explorer_is_forged_into_a_hero_slot(self):
        city, heroes, _ = setup()
        self.assertEqual(forge.RECIPES["explorer"].kind, "hero")
        self.assertEqual(forge.owned(city, heroes, forge.LIMIT_GROUPS["heroes"][0]), len(heroes))


class DismissTest(unittest.TestCase):
    def test_a_dismissed_hero_frees_its_slot_for_a_bonus(self):
        city, heroes, _ = setup()
        heroes.append({"id": 10, "cls": "guardian", "form": "bastion", "tier": 2})
        city["bonuses"] = {}
        item = items.add(city, "ward_sigil")
        items.equip(city, heroes, 10, item["id"])
        gift = forge.dismiss_hero(city, heroes, 10)
        self.assertEqual(gift, forge.DISMISS_GIFTS["2"])
        self.assertEqual(city["bonuses"]["golden_hourglass"], 1)
        self.assertIsNone(item["hero"])
        self.assertNotIn(10, [h["id"] for h in heroes])

    def test_four_fighters_stay_and_away_explorers_cannot_go(self):
        city, heroes, _ = setup()
        with self.assertRaises(ActionError) as caught:
            forge.dismiss_hero(city, heroes, 1)
        self.assertEqual(caught.exception.code, "last_squad")
        explorers.start(city, heroes, 9, "scout", T0)
        with self.assertRaises(ActionError) as caught:
            forge.dismiss_hero(city, heroes, 9)
        self.assertEqual(caught.exception.code, "on_mission")

    def test_the_tower_limit_grows_with_the_level(self):
        city, heroes, _ = setup()
        before = forge.limit_of(city, "towers")
        city["progress"]["xp"] = 100            # level 2
        self.assertEqual(forge.limit_of(city, "towers"), before + 1)


if __name__ == "__main__":
    unittest.main()


class ForgeSlotsTest(unittest.TestCase):
    """A forge slot every fifth level; saves that are behind catch up, none loses one."""

    def test_every_fifth_level_opens_a_forge_slot(self):
        from app.games.hexforge_be import progress
        self.assertEqual([progress.forge_slots_at(lv) for lv in (1, 4, 5, 9, 10, 15)], [2, 2, 3, 3, 4, 5])
        city = {"progress": {"xp": 0, "granted": 1}, "forge": {"slots": 2, "jobs": [], "next_job_id": 1}}
        xp = sum(progress.xp_for_next(lv) for lv in range(1, 10))      # straight to level 10
        reached = progress.gain(city, {}, xp)
        self.assertEqual(city["forge"]["slots"], 4)
        self.assertEqual([r["forge_slots"] for r in reached if r["forge_slots"]], [3, 4])
        self.assertEqual(progress.public_progress(city)["forge_slots"], 4)

    def test_old_saves_catch_up_and_never_lose_a_slot(self):
        from app.games.hexforge_be import progress
        xp = sum(progress.xp_for_next(lv) for lv in range(1, 12))      # level 12
        behind = {"progress": {"xp": xp, "granted": 12}, "forge": {"slots": 3}}
        progress.sync_forge_slots(behind)
        self.assertEqual(behind["forge"]["slots"], 4)
        ahead = {"progress": {"xp": 0, "granted": 1}, "forge": {"slots": 4}}
        progress.sync_forge_slots(ahead)
        self.assertEqual(ahead["forge"]["slots"], 4)
