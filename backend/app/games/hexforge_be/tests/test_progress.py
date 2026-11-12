"""
Hexforge phase 5, step 1: the player's level, hero slots and level gifts.

    cd backend && python -m unittest discover -s app/games/hexforge_be/tests -t .
"""

import json
import unittest

from app.games.hexforge_be import economy, forge, progress
from app.games.hexforge_be.models import HexforgePlayer
from app.games.hexforge_be.player_service import PlayerService
from app.games.hexforge_be.tests.test_player import T0, memory_db


def fresh_city():
    city = economy.starter_city(T0)
    forge.ensure_forge(city)
    progress.ensure_progress(city)
    return city


class LevelCurveTest(unittest.TestCase):
    def test_level_one_needs_a_hundred_then_fifty_more_each_level(self):
        self.assertEqual(progress.level_of(0), (1, 0))
        self.assertEqual(progress.level_of(99), (1, 99))
        self.assertEqual(progress.level_of(100), (2, 0))
        self.assertEqual(progress.level_of(100 + 150), (3, 0))
        self.assertEqual(progress.level_of(100 + 150 + 200 + 10), (4, 10))

    def test_eight_hero_slots_at_level_one_and_one_more_per_level(self):
        city = fresh_city()
        self.assertEqual(progress.hero_slots(city), 8)
        city["progress"]["xp"] = 250
        self.assertEqual(progress.hero_slots(city), 10)

    def test_xp_rules(self):
        self.assertEqual(progress.xp_for_forging(120), 2)
        self.assertEqual(progress.xp_for_forging(3600), 60)
        self.assertEqual(progress.xp_for_collecting(74), 2)
        self.assertEqual(progress.xp_for_attack("outpost", True), 40)
        self.assertEqual(progress.xp_for_attack("rival", False), 20)


class GainTest(unittest.TestCase):
    def test_reaching_a_level_hands_out_its_gift_once(self):
        city = fresh_city()
        materials = {"rune_stone": 0, "scrap": 0, "mana": 0, "chips": 0}
        reached = progress.gain(city, materials, 120)
        self.assertEqual([r["level"] for r in reached], [2])
        self.assertEqual(materials, progress.level_gift(2))
        self.assertEqual(progress.gain(city, materials, 5), [])
        self.assertEqual(materials, progress.level_gift(2))

    def test_a_big_gain_can_cross_several_levels(self):
        city = fresh_city()
        materials = {}
        reached = progress.gain(city, materials, 100 + 150 + 200)
        self.assertEqual([r["level"] for r in reached], [2, 3, 4])
        self.assertEqual(materials["rune_stone"], 40 * (2 + 3 + 4))

    def test_level_five_opens_a_third_forge_slot(self):
        city = fresh_city()
        progress.gain(city, {}, 100 + 150 + 200 + 249)
        self.assertEqual(city["forge"]["slots"], 2)
        reached = progress.gain(city, {}, 1)
        self.assertEqual(reached[-1]["forge_slots"], 3)
        self.assertEqual(city["forge"]["slots"], 3)

    def test_the_hero_limit_follows_the_level(self):
        city = fresh_city()
        heroes = [{"id": i, "cls": "guardian"} for i in range(1, 9)]
        self.assertEqual(forge.room_for(city, heroes, "guardian"), 0)
        progress.gain(city, {}, 100)
        self.assertEqual(forge.room_for(city, heroes, "guardian"), 1)
        hero_row = next(r for r in forge.public_recipes(city, heroes) if r["id"] == "guardian")
        self.assertEqual(hero_row["limit"], 9)

    def test_a_shared_limit_also_counts_each_kind(self):
        city = fresh_city()
        heroes = [{"id": 1, "cls": "guardian"}, {"id": 2, "cls": "guardian"}, {"id": 3, "cls": "neon_blade"}]
        rows = {r["id"]: r for r in forge.public_recipes(city, heroes)}
        self.assertEqual((rows["guardian"]["mine"], rows["guardian"]["owned"]), (2, 3))
        self.assertEqual((rows["neon_blade"]["mine"], rows["neon_blade"]["owned"]), (1, 3))


class ServiceTest(unittest.TestCase):
    def test_an_old_save_starts_at_level_one(self):
        db = memory_db()()
        old_city = economy.starter_city(T0)
        db.add(HexforgePlayer(user_id="old", city_json=json.dumps(old_city),
                              heroes_json=json.dumps(economy.starter_heroes()),
                              materials_json=json.dumps(economy.STARTING_MATERIALS), version=1,
                              created_at=T0, updated_at=T0))
        db.commit()
        state = PlayerService(db).load("old", T0)
        self.assertEqual(progress.public_progress(state.city)["level"], 1)
        self.assertEqual(progress.public_progress(state.city)["hero_slots"], 8)
        db.close()

    def test_collecting_earns_xp(self):
        db = memory_db()()
        service = PlayerService(db)
        service.load("ada", T0)
        state, gained, earned = service.collect("ada", T0 + 3600)
        self.assertEqual(earned["xp"], sum(gained.values()) // progress.XP_COLLECT_UNITS)
        self.assertEqual(state.city["progress"]["xp"], earned["xp"])
        db.close()


if __name__ == "__main__":
    unittest.main()
