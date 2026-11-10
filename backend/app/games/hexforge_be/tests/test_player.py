"""
Hexforge phase 2, step 1: saved player state, production and moving buildings.

    cd backend && python -m unittest discover -s app/games/hexforge_be/tests -t .
"""

import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import get_db
from app.games.hexforge_be import economy
from app.games.hexforge_be.models import HexforgeAttack, HexforgePlayer
from app.games.hexforge_be.player_service import ActionError, PlayerService, StaleState
from app.games.hexforge_be.router import get_now, limiter, router
from app.models import User
from app.user_auth import get_current_user_id

HOUR = 3600.0
T0 = 1_800_000_000.0


def memory_db():
    engine = create_engine("sqlite://", poolclass=StaticPool,
                           connect_args={"check_same_thread": False})
    for table in (HexforgePlayer.__table__, HexforgeAttack.__table__, User.__table__):
        table.create(engine)
    return sessionmaker(bind=engine)


class StarterCityTest(unittest.TestCase):
    def test_every_starter_building_has_a_legal_spot(self):
        city = economy.starter_city(T0)
        for b in city["buildings"]:
            self.assertIsNone(economy.placement_error(city, b["type"], b["x"], b["y"], ignore_id=b["id"]),
                              f"{b['type']} #{b['id']}")

    def test_the_starter_city_has_a_core_and_every_producer(self):
        types = [b["type"] for b in economy.starter_city(T0)["buildings"]]
        self.assertEqual(types.count("core"), 1)
        for producer in economy.PRODUCTION:
            self.assertIn(producer, types)


class ProductionTest(unittest.TestCase):
    def quarry(self):
        return {"id": 1, "type": "rune_quarry", "x": 1, "y": 1, "collected_at": T0}

    def test_production_grows_with_time(self):
        self.assertEqual(economy.pending(self.quarry(), T0), 0)
        self.assertEqual(economy.pending(self.quarry(), T0 + 2 * HOUR), 120)

    def test_production_stops_at_the_cap(self):
        self.assertEqual(economy.pending(self.quarry(), T0 + 30 * HOUR),
                         economy.CAP_HOURS * 60)

    def test_collect_moves_production_into_the_stock(self):
        city = {"buildings": [self.quarry()]}
        materials = {"rune_stone": 10}
        gained = economy.collect(city, materials, T0 + HOUR)
        self.assertEqual(gained["rune_stone"], 60)
        self.assertEqual(materials["rune_stone"], 70)
        self.assertEqual(economy.pending(city["buildings"][0], T0 + HOUR), 0)

    def test_collect_keeps_the_part_of_a_unit_already_made(self):
        well = {"id": 1, "type": "mana_well", "x": 1, "y": 1, "collected_at": T0}   # 45/h = one per 80 s
        city = {"buildings": [well]}
        materials = {}
        economy.collect(city, materials, T0 + 100)       # 1 unit, 20 s towards the next
        economy.collect(city, materials, T0 + 160)       # 60 s later: the 2nd unit is done
        self.assertEqual(materials["mana"], 2)

    def test_collect_only_the_buildings_asked_for(self):
        city = economy.starter_city(T0)
        quarry = next(b for b in city["buildings"] if b["type"] == "rune_quarry")
        materials = {}
        gained = economy.collect(city, materials, T0 + HOUR, building_ids=[quarry["id"]])
        self.assertEqual(gained, {"rune_stone": 60, "scrap": 0, "mana": 0, "chips": 0})


class PlacementTest(unittest.TestCase):
    def setUp(self):
        self.city = economy.starter_city(T0)
        self.core = next(b for b in self.city["buildings"] if b["type"] == "core")

    def test_buildings_stay_inside_the_city(self):
        self.assertEqual(economy.placement_error(self.city, "rune_tower", 0, 5), "outside_city")
        self.assertEqual(economy.placement_error(self.city, "rune_tower", 16, 5), "outside_city")
        self.assertIsNone(economy.placement_error(self.city, "rune_tower", 15, 1))

    def test_buildings_cannot_overlap(self):
        self.assertEqual(economy.placement_error(self.city, "rune_tower", 8, 8), "occupied")

    def test_a_building_does_not_block_itself(self):
        self.assertIsNone(economy.placement_error(self.city, "core", 7, 7, ignore_id=self.core["id"]))


class PlayerServiceTest(unittest.TestCase):
    def setUp(self):
        self.db = memory_db()()
        self.service = PlayerService(self.db)

    def tearDown(self):
        self.db.close()

    def test_first_visit_creates_the_starter_city(self):
        state = self.service.load("ada", T0)
        self.assertEqual(state.materials, economy.STARTING_MATERIALS)
        self.assertEqual(len(state.heroes), 4)
        self.assertEqual(self.service.load("ada", T0 + 5).city, state.city)

    def test_collecting_is_saved(self):
        self.service.load("ada", T0)
        _, gained = self.service.collect("ada", T0 + 2 * HOUR)
        self.assertEqual(gained["scrap"], 120)
        stored = self.service.load("ada", T0 + 2 * HOUR)
        self.assertEqual(stored.materials["scrap"], economy.STARTING_MATERIALS["scrap"] + 120)

    def test_a_stale_save_changes_nothing(self):
        first = self.service.load("ada", T0)
        second = self.service.load("ada", T0)
        first.materials["chips"] = 999
        self.service.save(first, T0)
        second.materials["chips"] = 5
        with self.assertRaises(StaleState):
            self.service.save(second, T0)
        self.assertEqual(self.service.load("ada", T0).materials["chips"], 999)

    def test_moving_a_building(self):
        state = self.service.load("ada", T0)
        tower = next(b for b in state.city["buildings"] if b["type"] == "rune_tower")
        self.service.move_building("ada", tower["id"], 1, 1, T0)
        moved = next(b for b in self.service.load("ada", T0).city["buildings"] if b["id"] == tower["id"])
        self.assertEqual((moved["x"], moved["y"]), (1, 1))

    def test_illegal_moves_are_refused(self):
        state = self.service.load("ada", T0)
        tower = next(b for b in state.city["buildings"] if b["type"] == "rune_tower")
        for x, y, code in ((8, 8, "occupied"), (0, 0, "outside_city")):
            with self.assertRaises(ActionError) as caught:
                self.service.move_building("ada", tower["id"], x, y, T0)
            self.assertEqual(caught.exception.code, code)
        with self.assertRaises(ActionError):
            self.service.move_building("ada", 9999, 1, 1, T0)


class PlayerApiTest(unittest.TestCase):
    def setUp(self):
        sessions = memory_db()
        self.clock = [T0]

        def db_override():
            db = sessions()
            try:
                yield db
            finally:
                db.close()

        app = FastAPI()
        app.state.limiter = limiter
        app.include_router(router)
        app.dependency_overrides[get_db] = db_override
        app.dependency_overrides[get_now] = lambda: self.clock[0]
        self.anonymous = TestClient(app)
        signed_in = FastAPI()
        signed_in.state.limiter = limiter
        signed_in.include_router(router)
        signed_in.dependency_overrides = {**app.dependency_overrides,
                                          get_current_user_id: lambda: "ada"}
        self.client = TestClient(signed_in)

    def test_my_city_needs_a_session(self):
        self.assertEqual(self.anonymous.get("/api/hexforge/me").status_code, 401)

    def test_my_city_shows_production(self):
        self.client.get("/api/hexforge/me")
        self.clock[0] = T0 + HOUR
        body = self.client.get("/api/hexforge/me").json()
        quarry = next(b for b in body["city"]["buildings"] if b["type"] == "rune_quarry")
        self.assertEqual(quarry["production"]["pending"], 60)
        self.assertEqual(quarry["size"], 2)

    def test_collect_then_move(self):
        self.client.get("/api/hexforge/me")
        self.clock[0] = T0 + HOUR
        body = self.client.post("/api/hexforge/me/collect", json={}).json()
        self.assertEqual(body["gained"]["rune_stone"], 60)
        tower = next(b for b in body["city"]["buildings"] if b["type"] == "rune_tower")
        moved = self.client.post(f"/api/hexforge/me/buildings/{tower['id']}/move", json={"x": 1, "y": 1})
        self.assertEqual(moved.status_code, 200)
        refused = self.client.post(f"/api/hexforge/me/buildings/{tower['id']}/move", json={"x": 8, "y": 8})
        self.assertEqual(refused.status_code, 400)
        self.assertEqual(refused.json()["detail"], "occupied")


if __name__ == "__main__":
    unittest.main()
