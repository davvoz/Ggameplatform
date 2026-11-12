"""
Hexforge: the gremlins' raid on the map.

    cd backend && python -m unittest discover -s app/games/hexforge_be/tests -t .
"""

import random
import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.database import get_db
from app.games.hexforge_be import economy, forge, gremlins, progress
from app.games.hexforge_be.errors import ActionError
from app.games.hexforge_be.router import get_now, limiter, router
from app.games.hexforge_be.tests.test_player import T0, memory_db
from app.user_auth import get_current_user_id

HOUR = 3600


def city_at_level_one():
    city = economy.starter_city(T0)
    forge.ensure_forge(city)
    progress.ensure_progress(city)
    return city


class GremlinsTest(unittest.TestCase):
    def test_every_gremlin_caught_drops_loot(self):
        city, materials = city_at_level_one(), {}
        result = gremlins.catch(city, materials, 5, T0, random.Random(1))
        each = gremlins.loot_per_gremlin(city)
        self.assertEqual(each, gremlins.BASE_LOOT + gremlins.LOOT_PER_LEVEL)
        self.assertEqual(sum(result["loot"].values()), 5 * each)
        self.assertEqual(materials, result["loot"])
        self.assertIsNone(result["bonus"])

    def test_the_whole_gang_adds_an_hourglass(self):
        city = city_at_level_one()
        result = gremlins.catch(city, {}, gremlins.TOTAL, T0, random.Random(2))
        self.assertEqual(result["bonus"], "hourglass")
        self.assertEqual(city["bonuses"]["hourglass"], 1)

    def test_the_gremlins_come_back_hours_later(self):
        city = city_at_level_one()
        gremlins.catch(city, {}, 3, T0)
        with self.assertRaises(ActionError) as caught:
            gremlins.catch(city, {}, 3, T0 + HOUR)
        self.assertEqual(caught.exception.code, "gremlins_away")
        gremlins.catch(city, {}, 3, T0 + gremlins.GREMLIN_HOURS * HOUR)

    def test_a_bad_count_is_refused(self):
        with self.assertRaises(ActionError) as caught:
            gremlins.catch(city_at_level_one(), {}, gremlins.TOTAL + 1, T0)
        self.assertEqual(caught.exception.code, "bad_score")

    def test_more_loot_at_a_higher_level(self):
        city = city_at_level_one()
        low = gremlins.loot_per_gremlin(city)
        progress.gain(city, {}, 5000)
        self.assertGreater(gremlins.loot_per_gremlin(city), low)


class GremlinsApiTest(unittest.TestCase):
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

    def test_catch_gremlins(self):
        body = self.client.get("/api/hexforge/me").json()
        self.assertEqual(body["gremlins"]["ready_at"], 0)
        response = self.client.post("/api/hexforge/me/gremlins", json={"caught": 4})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(sum(data["gremlins_result"]["loot"].values()), 4 * body["gremlins"]["loot_each"])
        self.assertEqual(data["gremlins"]["ready_at"], T0 + gremlins.GREMLIN_HOURS * HOUR)
        again = self.client.post("/api/hexforge/me/gremlins", json={"caught": 4})
        self.assertEqual(again.json()["detail"], "gremlins_away")


if __name__ == "__main__":
    unittest.main()
