"""
Hexforge phase 2, step 3: forge, storage, placing and dismantling.

    cd backend && python -m unittest discover -s app/games/hexforge_be/tests -t .
"""

import json
import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.database import get_db
from app.games.hexforge_be import economy, forge
from app.games.hexforge_be.errors import ActionError
from app.games.hexforge_be.models import HexforgePlayer
from app.games.hexforge_be.player_service import PlayerService
from app.games.hexforge_be.router import get_now, limiter, router
from app.games.hexforge_be.tests.test_player import T0, memory_db
from app.user_auth import get_current_user_id

RICH = {"rune_stone": 5000, "scrap": 5000, "mana": 5000, "chips": 5000}


def fresh():
    city = economy.starter_city(T0)
    forge.ensure_forge(city)
    return city, economy.starter_heroes(), dict(RICH)


class ForgeRulesTest(unittest.TestCase):
    def assertRefused(self, code, action, *args):
        with self.assertRaises(ActionError) as caught:
            action(*args)
        self.assertEqual(caught.exception.code, code)

    def test_forging_takes_the_exact_cost_and_time(self):
        city, heroes, materials = fresh()
        job = forge.start(city, heroes, materials, "rune_tower", T0)
        self.assertEqual(job["ready_at"], T0 + 600)
        self.assertEqual(materials["rune_stone"], 5000 - 120)
        self.assertEqual(materials["scrap"], 5000 - 60)

    def test_a_job_is_claimed_only_when_ready(self):
        city, heroes, materials = fresh()
        job = forge.start(city, heroes, materials, "rune_tower", T0)
        self.assertRefused("not_ready", forge.claim, city, heroes, job["id"], T0 + 599)
        forge.claim(city, heroes, job["id"], T0 + 600)
        self.assertEqual(city["storage"], {"rune_tower": 1})
        self.assertEqual(city["forge"]["jobs"], [])

    def test_forged_heroes_join_the_roster(self):
        city, heroes, materials = fresh()
        job = forge.start(city, heroes, materials, "technomancer", T0)
        forge.claim(city, heroes, job["id"], T0 + 5400)
        self.assertEqual(heroes[-1], {"id": 5, "cls": "technomancer"})

    def test_walls_come_in_fives(self):
        city, heroes, materials = fresh()
        job = forge.start(city, heroes, materials, "wall", T0)
        forge.claim(city, heroes, job["id"], T0 + 120)
        self.assertEqual(city["storage"], {"wall": 5})

    def test_the_forge_has_two_slots(self):
        city, heroes, materials = fresh()
        forge.start(city, heroes, materials, "wall", T0)
        forge.start(city, heroes, materials, "wall", T0)
        self.assertRefused("forge_busy", forge.start, city, heroes, materials, "wall", T0)

    def test_no_materials_no_forging(self):
        city, heroes, _ = fresh()
        poor = {"rune_stone": 119, "scrap": 60}
        self.assertRefused("not_enough_materials", forge.start, city, heroes, poor, "rune_tower", T0)
        self.assertEqual(poor, {"rune_stone": 119, "scrap": 60})

    def test_limits_count_placed_stored_and_forging(self):
        city, heroes, materials = fresh()           # starter: 2 towers placed
        city["storage"]["frost_tower"] = 5          # 7 with the stored ones
        forge.start(city, heroes, materials, "lightning_tower", T0)    # 8 with the one forging
        self.assertEqual(len(city["forge"]["jobs"]), 1)                # a slot is still free
        self.assertRefused("limit_reached", forge.start, city, heroes, materials, "rune_tower", T0)

    def test_unknown_recipe(self):
        city, heroes, materials = fresh()
        self.assertRefused("unknown_recipe", forge.start, city, heroes, materials, "dragon", T0)


class StorageTest(unittest.TestCase):
    def test_placing_takes_from_storage(self):
        city, _, _ = fresh()
        city["storage"] = {"rune_trap": 1}
        building = forge.place(city, "rune_trap", 1, 1, T0)
        self.assertEqual(building["type"], "rune_trap")
        self.assertEqual(city["storage"], {})
        with self.assertRaises(ActionError) as caught:
            forge.place(city, "rune_trap", 2, 1, T0)
        self.assertEqual(caught.exception.code, "not_in_storage")

    def test_placing_follows_the_placement_rules(self):
        city, _, _ = fresh()
        city["storage"] = {"rune_tower": 1}
        with self.assertRaises(ActionError) as caught:
            forge.place(city, "rune_tower", 7, 7, T0)
        self.assertEqual(caught.exception.code, "occupied")
        self.assertEqual(city["storage"], {"rune_tower": 1})

    def test_placed_production_starts_empty(self):
        city, _, _ = fresh()
        city["storage"] = {"data_node": 1}
        node = forge.place(city, "data_node", 14, 1, T0 + 50)
        self.assertEqual(economy.pending(node, T0 + 50), 0)

    def test_dismantling_refunds_half(self):
        city, _, materials = fresh()
        tower = next(b for b in city["buildings"] if b["type"] == "rune_tower")
        refund = forge.dismantle(city, materials, tower["id"], T0)
        self.assertEqual(refund, {"rune_stone": 60, "scrap": 30})
        self.assertNotIn(tower, city["buildings"])

    def test_a_wall_refunds_its_share_of_a_batch(self):
        self.assertEqual(forge.refund_of("wall"), {"rune_stone": 6})

    def test_dismantling_a_producer_collects_it_first(self):
        city, _, materials = fresh()
        quarry = next(b for b in city["buildings"] if b["type"] == "rune_quarry")
        forge.dismantle(city, materials, quarry["id"], T0 + 3600)
        self.assertEqual(materials["rune_stone"], 5000 + 60)

    def test_the_core_and_vault_stay(self):
        city, _, materials = fresh()
        for kind in forge.UNDISMANTLABLE:
            b = next(b for b in city["buildings"] if b["type"] == kind)
            with self.assertRaises(ActionError):
                forge.dismantle(city, materials, b["id"], T0)


class OlderSavesTest(unittest.TestCase):
    def test_a_city_saved_before_the_forge_existed_loads(self):
        sessions = memory_db()
        db = sessions()
        old_city = economy.starter_city(T0)          # no forge, no storage
        db.add(HexforgePlayer(user_id="old", city_json=json.dumps(old_city),
                              heroes_json=json.dumps(economy.starter_heroes()),
                              materials_json=json.dumps(RICH), version=1,
                              created_at=T0, updated_at=T0))
        db.commit()
        state = PlayerService(db).load("old", T0)
        self.assertEqual(state.city["storage"], {})
        self.assertEqual(state.city["forge"]["slots"], forge.FORGE_SLOTS)
        db.close()


class ForgeApiTest(unittest.TestCase):
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
        app.dependency_overrides = {get_db: db_override, get_now: lambda: self.clock[0],
                                    get_current_user_id: lambda: "ada"}
        self.client = TestClient(app)

    def post(self, path, body=None):
        return self.client.post(f"/api/hexforge{path}", json=body or {})

    def test_forge_claim_place_dismantle(self):
        state = self.client.get("/api/hexforge/me").json()
        self.assertEqual(state["forge"], {"slots": 2, "jobs": []})
        self.assertTrue(any(r["id"] == "rune_tower" for r in state["recipes"]))

        state = self.post("/me/forge", {"recipe": "rune_tower"}).json()
        job = state["forge"]["jobs"][0]
        self.assertFalse(job["ready"])
        self.assertEqual(self.post(f"/me/forge/{job['id']}/claim").json()["detail"], "not_ready")

        self.clock[0] = T0 + 600
        claimed = self.post(f"/me/forge/{job['id']}/claim").json()
        self.assertEqual(claimed["claimed"], {"item": "rune_tower", "kind": "building", "count": 1})
        self.assertEqual(claimed["storage"], {"rune_tower": 1})

        placed = self.post("/me/place", {"type": "rune_tower", "x": 14, "y": 1}).json()
        new_tower = next(b for b in placed["city"]["buildings"] if (b["x"], b["y"]) == (14, 1))
        self.assertEqual(placed["storage"], {})

        dismantled = self.post(f"/me/buildings/{new_tower['id']}/dismantle").json()
        self.assertEqual(dismantled["refund"], {"rune_stone": 60, "scrap": 30})

    def test_refusals_are_400_with_a_code(self):
        self.client.get("/api/hexforge/me")
        response = self.post("/me/forge", {"recipe": "technomancer"})   # starter mana 200 is enough
        self.assertEqual(response.status_code, 200)
        response = self.post("/me/forge", {"recipe": "technomancer"})   # 80 mana left
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "not_enough_materials")


if __name__ == "__main__":
    unittest.main()
