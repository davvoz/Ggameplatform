"""Things to do while waiting: the anvil and the merchant; and quicker early timers."""

import random
import unittest

from app.games.hexforge_be import anvil, economy, evolution, forge, items, merchant, upgrades
from app.games.hexforge_be.errors import ActionError

T0 = 1_000_000.0


def city_with_job(seconds=3600):
    city = economy.starter_city(T0)
    forge.ensure_forge(city)
    city["forge"]["jobs"].append({"id": 1, "recipe": "wall", "started_at": T0, "ready_at": T0 + seconds})
    return city


class AnvilTest(unittest.TestCase):
    def code(self, fn):
        with self.assertRaises(ActionError) as caught:
            fn()
        return caught.exception.code

    def test_strikes_take_time_off_three_rounds_at_most(self):
        city = city_with_job(10_000)
        job = city["forge"]["jobs"][0]
        result = anvil.hammer(city, 1, 3, 2, T0, random.Random(1))
        self.assertEqual(result["cut"], round(10_000 * (3 * 0.02 + 2 * 0.008)))
        self.assertEqual(job["ready_at"], T0 + 10_000 - result["cut"])
        anvil.hammer(city, 1, 5, 0, T0)
        anvil.hammer(city, 1, 0, 0, T0)
        self.assertEqual(self.code(lambda: anvil.hammer(city, 1, 5, 0, T0)), "no_rounds_left")
        self.assertGreaterEqual(job["ready_at"], T0 + 10_000 * 0.7 - 1)          # at most 30 % off

    def test_bad_scores_and_finished_jobs_are_refused(self):
        city = city_with_job()
        self.assertEqual(self.code(lambda: anvil.hammer(city, 1, 4, 2, T0)), "bad_score")
        self.assertEqual(self.code(lambda: anvil.hammer(city, 1, 1, 0, T0 + 4000)), "already_ready")

    def test_five_perfect_strikes_may_leave_an_hourglass(self):
        found = 0
        for seed in range(40):
            city = city_with_job()
            if anvil.hammer(city, 1, 5, 0, T0, random.Random(seed))["bonus"]:
                found += 1
                self.assertEqual(city["bonuses"]["hourglass"], 1)
        self.assertTrue(0 < found < 40)


class MerchantTest(unittest.TestCase):
    def test_four_offers_a_day_the_same_all_day(self):
        day = merchant.day_of(T0)
        offers = merchant.offers_for("ada", day)
        self.assertEqual(len(offers), 4)
        self.assertEqual(offers, merchant.offers_for("ada", day))
        self.assertNotEqual(offers, merchant.offers_for("ada", day + 1))
        self.assertIn("item", offers[3]["gives"])

    def test_buying_pays_gives_and_sells_out(self):
        city = economy.starter_city(T0)
        items.ensure_items(city)
        materials = {m: 10_000 for m in economy.MATERIALS}
        for offer in merchant.offers_for("ada", merchant.day_of(T0)):
            merchant.buy(city, materials, "ada", offer["id"], T0)
        self.assertEqual(len(city["items"]), 1)
        with self.assertRaises(ActionError) as caught:
            merchant.buy(city, materials, "ada", 0, T0)
        self.assertEqual(caught.exception.code, "sold_out")
        merchant.buy(city, materials, "ada", 0, T0 + merchant.DAY)                 # a new day, new stock

    def test_not_enough_materials(self):
        city = economy.starter_city(T0)
        with self.assertRaises(ActionError) as caught:
            merchant.buy(city, {}, "ada", 0, T0)
        self.assertEqual(caught.exception.code, "not_enough_materials")


class TimersTest(unittest.TestCase):
    def test_early_levels_come_quickly(self):
        self.assertEqual(upgrades.seconds_of("rune_tower", 2), 300)
        self.assertEqual(upgrades.seconds_of("core", 2), 600)
        self.assertLess(evolution.EVOLVE_SECONDS[2], evolution.EVOLVE_SECONDS[3])


if __name__ == "__main__":
    unittest.main()
