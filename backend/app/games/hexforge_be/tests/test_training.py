"""
Hexforge: the training dummy gives a hero XP.

    cd backend && python -m unittest discover -s app/games/hexforge_be/tests -t .
"""

import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.database import get_db
from app.games.hexforge_be import evolution, fusion, training
from app.games.hexforge_be.errors import ActionError
from app.games.hexforge_be.router import get_now, limiter, router
from app.games.hexforge_be.tests.test_player import T0, memory_db
from app.user_auth import get_current_user_id


class TrainingTest(unittest.TestCase):
    def heroes(self):
        return [{"id": 1, "cls": "guardian", "xp": 0},
                {"id": 2, "cls": "neon_blade", "xp": 300, "form": "reaper", "tier": 2},
                {"id": 3, "cls": "technomancer", "xp": 700, "form": "archon", "tier": 3},
                {"id": 4, "cls": "explorer"}]

    def test_a_session_is_worth_a_share_of_the_next_tier(self):
        heroes = self.heroes()
        self.assertEqual(training.max_xp(heroes[0]), 15)
        self.assertEqual(training.max_xp(heroes[1]), 60)
        result = training.train(heroes, 2, 10, 0, T0)
        self.assertEqual(result["xp"], 60)
        self.assertEqual(heroes[1]["xp"], 360)
        self.assertEqual(training.train(heroes, 2, 4, 4, T0)["xp"], 36)   # good beats count half

    def test_a_session_can_make_a_hero_ready_to_evolve(self):
        heroes = [{"id": 1, "cls": "guardian", "xp": 140}]
        self.assertTrue(training.train(heroes, 1, 10, 0, T0)["ready"])

    def test_three_sessions_a_day_per_hero(self):
        heroes = self.heroes()
        for left in (2, 1, 0):
            self.assertEqual(training.train(heroes, 1, 5, 5, T0)["sessions_left"], left)
        self.assertRaisesCode("no_sessions_left", heroes, 1, 5, 5, T0)
        self.assertEqual(training.train(heroes, 2, 5, 5, T0)["sessions_left"], 2)   # another hero has its own
        tomorrow = T0 + training.DAY
        self.assertEqual(training.sessions_left(heroes[0], tomorrow), 3)
        self.assertEqual(training.train(heroes, 1, 5, 5, tomorrow)["sessions_left"], 2)

    def test_who_cannot_train(self):
        heroes = self.heroes()
        heroes[1]["evolving"] = 7
        self.assertRaisesCode("cannot_train", heroes, 4, 5, 5, T0)
        self.assertRaisesCode("hero_evolving", heroes, 2, 5, 5, T0)
        heroes[0]["injured_until"] = T0 + 60
        self.assertRaisesCode("hero_injured", heroes, 1, 5, 5, T0)
        heroes[0]["injured_until"] = None
        self.assertRaisesCode("bad_score", heroes, 1, 8, 5, T0)
        self.assertRaisesCode("unknown_hero", heroes, 99, 5, 5, T0)

    def assertRaisesCode(self, code, *args):
        with self.assertRaises(ActionError) as caught:
            training.train(*args)
        self.assertEqual(caught.exception.code, code)


class MasteryTest(unittest.TestCase):
    def test_an_ascended_hero_trains_for_mastery(self):
        heroes = [{"id": 3, "cls": "technomancer", "xp": 700, "form": "archon", "tier": 3, "mastery": 90}]
        result = training.train(heroes, 3, 10, 0, T0)
        self.assertEqual((result["xp"], result["mastery"]), (0, training.MASTERY_SESSION))
        self.assertEqual(result["mastery_points"], 120)
        self.assertEqual(result["mastery_level"], 1)
        self.assertTrue(result["level_up"])
        self.assertEqual(heroes[0]["xp"], 700)

    def test_a_hero_below_the_top_trains_for_xp_only(self):
        heroes = [{"id": 1, "cls": "guardian", "xp": 0}]
        result = training.train(heroes, 1, 10, 0, T0)
        self.assertEqual((result["xp"], result["mastery"]), (15, 0))
        self.assertNotIn("mastery", heroes[0])

    def test_mastery_stops_at_the_top_level(self):
        cap = evolution.MASTERY_LEVELS * evolution.MASTERY_PER_LEVEL
        heroes = [{"id": 3, "cls": "guardian", "form": "warlord", "tier": 3, "mastery": cap - 5}]
        result = training.train(heroes, 3, 10, 0, T0)
        self.assertEqual((result["mastery"], heroes[0]["mastery"]), (5, cap))
        self.assertEqual(training.train(heroes, 3, 10, 0, T0)["mastery"], 0)

    def test_mastery_makes_a_hero_stronger_in_battle(self):
        plain = {"id": 1, "cls": "guardian", "form": "warlord", "tier": 3}
        master = {**plain, "mastery": 500}
        self.assertEqual(evolution.unit_of(master)["mastery"], 5)
        self.assertNotIn("mastery", evolution.unit_of(plain))
        base, strong = fusion.unit_spec(evolution.unit_of(plain)), fusion.unit_spec(evolution.unit_of(master))
        self.assertEqual(strong.hp, round(base.hp * 1.05))
        self.assertEqual(strong.damage, round(base.damage * 1.05))
        self.assertEqual(fusion.hero_spec_of(master).hp, strong.hp)


class TrainingApiTest(unittest.TestCase):
    def setUp(self):
        sessions = memory_db()

        def db_override():
            db = sessions()
            try:
                yield db
            finally:
                db.close()

        app = FastAPI()
        app.state.limiter = limiter
        app.include_router(router)
        app.dependency_overrides = {get_db: db_override, get_now: lambda: T0,
                                    get_current_user_id: lambda: "ada"}
        self.client = TestClient(app)

    def test_train_a_hero(self):
        body = self.client.get("/api/hexforge/me").json()
        hero = next(h for h in body["heroes"] if h["cls"] != "explorer")
        self.assertEqual(body["training"]["left"][str(hero["id"])], 3)
        response = self.client.post(f"/api/hexforge/me/heroes/{hero['id']}/train", json={"perfect": 10, "good": 0})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["training_result"]["xp"], 15)
        self.assertEqual(data["training"]["left"][str(hero["id"])], 2)
        trained = next(h for h in data["heroes"] if h["id"] == hero["id"])
        self.assertEqual(trained["xp"], hero.get("xp", 0) + 15)

    def test_a_bad_score_is_refused(self):
        body = self.client.get("/api/hexforge/me").json()
        hero = body["heroes"][0]
        response = self.client.post(f"/api/hexforge/me/heroes/{hero['id']}/train", json={"perfect": 11, "good": 0})
        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
