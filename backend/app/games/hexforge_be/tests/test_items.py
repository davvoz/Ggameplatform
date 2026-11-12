"""
Hexforge phase 5, step 4: hero items (weapons and spells), forged, equipped, upgraded.

    cd backend && python -m unittest discover -s app/games/hexforge_be/tests -t .
"""

import json
import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.database import get_db
from app.games.hexforge_be import economy, forge, items, outposts
from app.games.hexforge_be.catalog import HEROES
from app.games.hexforge_be.errors import ActionError
from app.games.hexforge_be.models import HexforgePlayer
from app.games.hexforge_be.router import get_now, limiter, router
from app.games.hexforge_be.simulation import simulate
from app.games.hexforge_be.tests.test_player import T0, memory_db
from app.user_auth import get_current_user_id

RICH = {"rune_stone": 9000, "scrap": 9000, "mana": 9000, "chips": 9000}
BASE_SQUAD = ["guardian", "neon_blade", "neon_blade", "technomancer"]


def city_and_heroes():
    city = economy.starter_city(T0)
    forge.ensure_forge(city)
    outposts.ensure_campaign(city, T0)
    items.ensure_items(city)
    return city, economy.starter_heroes()


class EffectTest(unittest.TestCase):
    def test_effects_grow_with_the_level(self):
        self.assertEqual(items.effect("rune_maul", 1), ("damage_pct", 6))
        self.assertEqual(items.effect("rune_maul", 5), ("damage_pct", 30))
        self.assertEqual(items.effect("focus_lens", 5), ("range", 1.5))

    def test_apply_changes_the_right_stat(self):
        g = HEROES["guardian"]
        self.assertEqual(items.apply(g, [{"type": "aegis_plate", "level": 5}]).hp, round(g.hp * 1.3))
        self.assertEqual(items.apply(g, [{"type": "ward_sigil", "level": 2}]).barrier, round(g.hp * 0.16))
        self.assertGreater(items.apply(g, [{"type": "mending_rune", "level": 1}]).regen, 0)
        b = HEROES["neon_blade"]
        self.assertLess(items.apply(b, [{"type": "flux_daggers", "level": 3}]).cooldown, b.cooldown)
        m = HEROES["technomancer"]
        staff = items.apply(m, [{"type": "storm_staff", "level": 5}])
        self.assertGreater(staff.nova_damage, m.nova_damage)
        self.assertIs(items.apply(g, []), g)


class ArmouryTest(unittest.TestCase):
    def setUp(self):
        self.city, self.heroes = city_and_heroes()
        self.materials = dict(RICH)

    def forge_item(self, item_type):
        job = forge.start(self.city, self.heroes, self.materials, item_type, T0)
        return forge.claim(self.city, self.heroes, job["id"], job["ready_at"])

    def test_a_forged_item_lands_in_the_armoury(self):
        got = self.forge_item("rune_maul")
        self.assertEqual(got["kind"], "item")
        self.assertEqual(self.city["items"], [{"id": 1, "type": "rune_maul", "level": 1, "hero": None}])

    def test_a_weapon_only_fits_its_class_and_one_per_slot(self):
        maul = items.add(self.city, "rune_maul")
        plate = items.add(self.city, "aegis_plate")
        ward = items.add(self.city, "ward_sigil")
        guardian, blade = self.heroes[0]["id"], self.heroes[1]["id"]
        with self.assertRaises(ActionError) as error:
            items.equip(self.city, self.heroes, blade, maul["id"])
        self.assertEqual(error.exception.code, "wrong_class")
        items.equip(self.city, self.heroes, guardian, maul["id"])
        items.equip(self.city, self.heroes, guardian, ward["id"])
        items.equip(self.city, self.heroes, guardian, plate["id"])           # replaces the maul
        self.assertIsNone(maul["hero"])
        self.assertEqual(sorted(i["type"] for i in items.carried_by(self.city, guardian)), ["aegis_plate", "ward_sigil"])
        with self.assertRaises(ActionError) as error:                         # the guardian carries it
            items.equip(self.city, self.heroes, blade, ward["id"])
        self.assertEqual(error.exception.code, "item_in_use")
        self.assertEqual(ward["hero"], guardian)
        items.unequip(self.city, ward["id"])                                  # taken off: free again
        self.assertIsNone(ward["hero"])
        items.equip(self.city, self.heroes, blade, ward["id"])
        self.assertEqual(ward["hero"], blade)

    def test_an_item_whose_hero_is_gone_is_free(self):
        ward = items.add(self.city, "ward_sigil")
        ward["hero"] = 999                                                    # a hero no longer there
        items.equip(self.city, self.heroes, self.heroes[0]["id"], ward["id"])
        self.assertEqual(ward["hero"], self.heroes[0]["id"])

    def test_upgrading_costs_more_each_level_and_stops_at_five(self):
        maul = items.add(self.city, "rune_maul")
        job = items.start_upgrade(self.city, self.materials, maul["id"], T0)
        self.assertEqual(job["level"], 2)
        self.assertEqual(self.materials["scrap"], RICH["scrap"] - 400)
        with self.assertRaises(ActionError) as error:
            items.start_upgrade(self.city, self.materials, maul["id"], T0)
        self.assertEqual(error.exception.code, "already_upgrading")
        claimed = forge.claim(self.city, self.heroes, job["id"], job["ready_at"])
        self.assertEqual((claimed["kind"], claimed["level"]), ("upgrade", 2))
        self.assertEqual(maul["level"], 2)
        maul["level"] = items.MAX_LEVEL
        with self.assertRaises(ActionError) as error:
            items.start_upgrade(self.city, self.materials, maul["id"], T0)
        self.assertEqual(error.exception.code, "max_level")

    def test_the_armoury_has_a_limit(self):
        for _ in range(items.ITEM_LIMIT):
            items.add(self.city, "haste_rune")
        with self.assertRaises(ActionError) as error:
            forge.start(self.city, self.heroes, self.materials, "rune_maul", T0)
        self.assertEqual(error.exception.code, "limit_reached")

    def test_the_squad_carries_its_items_into_battle(self):
        maul = items.add(self.city, "rune_maul")
        items.equip(self.city, self.heroes, self.heroes[0]["id"], maul["id"])
        units = outposts.squad_classes(self.heroes, [h["id"] for h in self.heroes], T0, self.city)
        self.assertEqual(units[0], {"cls": "guardian", "items": [{"type": "rune_maul", "level": 1}]})
        self.assertEqual(units[1], "neon_blade")


class BattleTest(unittest.TestCase):
    def test_a_ward_soaks_the_first_blows(self):
        city = outposts.outpost_city(4)
        warded = [{"cls": c, "items": [{"type": "ward_sigil", "level": 5}]} for c in BASE_SQUAD]
        battle = simulate(city, warded, "south", "core", "compact")
        self.assertTrue(any(e.get("soaked") for e in battle["events"] if e["type"] == "shot"))
        self.assertGreater(battle["squad"][0]["barrier"], 0)

    def test_mending_heals_between_hits(self):
        city = outposts.outpost_city(4)
        mended = [{"cls": c, "items": [{"type": "mending_rune", "level": 5}]} for c in BASE_SQUAD]
        frames = simulate(city, mended, "south", "core", "compact")["frames"]
        hp = [f[0][2] for f in frames]
        self.assertTrue(any(b > a for a, b in zip(hp, hp[1:])))

    def test_a_fully_equipped_squad_does_better(self):
        gear = {"guardian": "aegis_plate", "neon_blade": "plasma_edge", "technomancer": "storm_staff"}
        equipped = [{"cls": c, "items": [{"type": gear[c], "level": 5}, {"type": "ward_sigil", "level": 5}]}
                    for c in BASE_SQUAD]
        better = 0
        for outpost_id in outposts.OUTPOSTS:
            city = outposts.outpost_city(outpost_id)
            base = simulate(city, BASE_SQUAD, "south", "core", "compact")["summary"]
            strong = simulate(city, equipped, "south", "core", "compact")["summary"]
            self.assertGreaterEqual((strong["victory"], strong["destruction"]), (base["victory"], base["destruction"]))
            better += (strong["victory"], strong["destruction"]) > (base["victory"], base["destruction"])
        self.assertGreater(better, 0)


class ItemsApiTest(unittest.TestCase):
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
        self.sessions = sessions

    def post(self, path, body=None):
        return self.client.post(f"/api/hexforge{path}", json=body or {})

    def make_rich(self):
        db = self.sessions()
        db.get(HexforgePlayer, "ada").materials_json = json.dumps(RICH)
        db.commit()
        db.close()

    def test_forge_equip_and_upgrade_through_the_api(self):
        state = self.client.get("/api/hexforge/me").json()
        self.make_rich()
        self.assertEqual(state["items"], [])
        self.assertIn("ward_sigil", state["item_table"]["items"])
        self.assertTrue(any(r["kind"] == "item" for r in state["recipes"]))
        job = self.post("/me/forge", {"recipe": "ward_sigil"}).json()["forge"]["jobs"][0]
        self.clock[0] = job["ready_at"]
        claimed = self.post(f"/me/forge/{job['id']}/claim").json()
        item = claimed["items"][0]
        hero = claimed["heroes"][0]
        equipped = self.post(f"/me/heroes/{hero['id']}/equip", {"item_id": item["id"]}).json()
        self.assertEqual(equipped["items"][0]["hero"], hero["id"])
        self.assertGreater(equipped["hero_stats"][str(hero["id"])]["barrier"], 0)
        upgrading = self.post(f"/me/items/{item['id']}/upgrade").json()
        self.assertEqual(upgrading["forge"]["jobs"][0]["recipe"], "upgrade")
        refused = self.post(f"/me/items/{item['id']}/upgrade")
        self.assertEqual(refused.json()["detail"], "already_upgrading")
        self.assertEqual(self.post("/me/items/999/unequip").json()["detail"], "unknown_item")


if __name__ == "__main__":
    unittest.main()
