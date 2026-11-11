"""
Hexforge phase 3, step 1: tower aim and the defence test.

    cd backend && python -m unittest discover -s app/games/hexforge_be/tests -t .
"""

import itertools
import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.database import get_db
from app.games.hexforge_be import defense, economy, outposts
from app.games.hexforge_be.errors import ActionError
from app.games.hexforge_be.router import get_now, limiter, router
from app.games.hexforge_be.simulation import Battle, simulate
from app.games.hexforge_be.tests.test_player import T0, memory_db
from app.user_auth import get_current_user_id

COMBOS = list(itertools.product(("north", "east", "south", "west"),
                                ("towers", "core", "production"), ("compact", "spread", "split")))


def saved_city(battle_city):
    """An outpost layout in the shape a player's city is saved in."""
    return {"grid": battle_city["grid"],
            "buildings": [{k: b[k] for k in ("id", "type", "x", "y")} for b in battle_city["buildings"]]}


def tower(aim):
    return {"id": 1, "type": "rune_tower", "x": 8, "y": 8, "size": 2, "hp": 950, "aim": aim}


class AimTest(unittest.TestCase):
    """One rune tower at the centre (9, 9); heroes placed by hand around it."""

    def pick(self, aim, guardian_at=(1.0, 1.0)):
        squad = ["guardian", "neon_blade", "technomancer", "neon_blade"]
        battle = Battle({"grid": 18, "buildings": [tower(aim)]}, squad, "south", "core", "compact")
        guardian, near_blade, mage, hurt_blade = battle.heroes
        guardian.x, guardian.y = guardian_at
        near_blade.x, near_blade.y = 11.0, 9.0      # 2 cells away
        mage.x, mage.y = 9.0, 13.0                  # 4 cells away
        hurt_blade.x, hurt_blade.y = 9.0, 6.0       # 3 cells away, almost dead
        hurt_blade.hp = 100
        return battle._tower_target(battle.buildings[0]).id

    def test_closest_shoots_the_nearest_hero(self):
        self.assertEqual(self.pick("closest"), 1)

    def test_weakest_finishes_off_the_hurt_hero(self):
        self.assertEqual(self.pick("weakest"), 3)

    def test_back_line_hunts_the_ranged_hero(self):
        self.assertEqual(self.pick("ranged"), 2)

    def test_a_guardian_close_by_draws_the_fire_whatever_the_aim(self):
        for aim in ("closest", "weakest", "ranged"):
            self.assertEqual(self.pick(aim, guardian_at=(9.0, 12.5)), 0, aim)

    def test_aim_changes_how_battles_end(self):
        def held(aim):
            city = outposts.outpost_city(2)
            for b in city["buildings"]:
                b["aim"] = aim
            squad = ["guardian", "technomancer", "technomancer", "neon_blade"]
            return sum(not simulate(city, squad, *c)["summary"]["victory"] for c in COMBOS)
        self.assertNotEqual(held("closest"), held("ranged"))


class SetAimTest(unittest.TestCase):
    def setUp(self):
        self.city = economy.starter_city(T0)
        self.tower = next(b for b in self.city["buildings"] if b["type"] == "rune_tower")
        self.wall = next(b for b in self.city["buildings"] if b["type"] == "wall")

    def test_the_aim_is_saved_on_the_tower_and_reaches_the_battle(self):
        defense.set_aim(self.city, self.tower["id"], "weakest")
        battle_tower = next(b for b in defense.battle_city(self.city)["buildings"] if b["id"] == self.tower["id"])
        self.assertEqual(battle_tower["aim"], "weakest")

    def test_towers_without_an_aim_shoot_the_closest(self):
        battle_tower = next(b for b in defense.battle_city(self.city)["buildings"] if b["id"] == self.tower["id"])
        self.assertEqual(battle_tower["aim"], "closest")

    def test_only_towers_take_an_aim(self):
        for building_id, aim, code in ((self.wall["id"], "weakest", "not_a_tower"),
                                       (999, "weakest", "unknown_building"),
                                       (self.tower["id"], "sideways", "unknown_aim")):
            with self.assertRaises(ActionError) as caught:
                defense.set_aim(self.city, building_id, aim)
            self.assertEqual(caught.exception.code, code)


class DefenseTestTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.starter = defense.run_defense_test(economy.starter_city(T0))
        cls.fortress = defense.run_defense_test(saved_city(outposts.outpost_city(5)))

    def test_every_raid_comes_from_every_approach(self):
        report = self.fortress
        self.assertEqual(report["total"], len(defense.RAIDS) * len(COMBOS))
        self.assertEqual(report["held"], sum(r["held"] for r in report["raids"]))
        self.assertEqual(report["held"], sum(s["held"] for s in report["sides"].values()))

    def test_a_stronger_city_holds_more_raids(self):
        self.assertLess(self.starter["held"], self.fortress["held"])
        self.assertGreater(self.starter["avg_destruction"], self.fortress["avg_destruction"])

    def test_the_worst_raid_comes_with_its_replay(self):
        worst = self.fortress["worst"]
        raid = next(r for r in defense.RAIDS if r.id == worst["raid"])
        self.assertEqual([h["cls"] for h in worst["squad"]], list(raid.squad))
        self.assertTrue(worst["frames"])
        self.assertEqual(worst["summary"],
                         simulate(worst["city"], list(raid.squad), worst["side"], worst["priority"], worst["tactic"])["summary"])

    def test_the_same_city_always_gets_the_same_report(self):
        again = defense.run_defense_test(saved_city(outposts.outpost_city(5)))
        self.assertEqual(again["held"], self.fortress["held"])
        self.assertEqual(again["worst"]["events"], self.fortress["worst"]["events"])


class DefenseApiTest(unittest.TestCase):
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

    def test_set_a_tower_aim(self):
        body = self.client.get("/api/hexforge/me").json()
        rune = next(b for b in body["city"]["buildings"] if b["type"] == "rune_tower")
        self.assertEqual(rune["aim"], "closest")
        response = self.client.post(f"/api/hexforge/me/buildings/{rune['id']}/aim", json={"aim": "ranged"})
        self.assertEqual(response.status_code, 200)
        saved = next(b for b in response.json()["city"]["buildings"] if b["id"] == rune["id"])
        self.assertEqual(saved["aim"], "ranged")

    def test_a_wall_takes_no_aim(self):
        body = self.client.get("/api/hexforge/me").json()
        wall = next(b for b in body["city"]["buildings"] if b["type"] == "wall")
        self.assertNotIn("aim", wall)
        response = self.client.post(f"/api/hexforge/me/buildings/{wall['id']}/aim", json={"aim": "weakest"})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "not_a_tower")

    def test_the_defence_test_changes_nothing(self):
        before = self.client.get("/api/hexforge/me").json()
        report = self.client.post("/api/hexforge/me/defense/test").json()
        self.assertEqual(report["total"], len(defense.RAIDS) * len(COMBOS))
        self.assertEqual(self.client.get("/api/hexforge/me").json()["version"], before["version"])


if __name__ == "__main__":
    unittest.main()
