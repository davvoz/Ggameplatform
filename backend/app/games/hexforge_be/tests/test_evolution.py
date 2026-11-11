"""
Hexforge phase 5, step 3: hero XP, evolution into a form, ascension.

    cd backend && python -m unittest discover -s app/games/hexforge_be/tests -t .
"""

import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.database import get_db
from app.games.hexforge_be import economy, evolution, forge, outposts
from app.games.hexforge_be.catalog import HEROES
from app.games.hexforge_be.errors import ActionError
from app.games.hexforge_be.router import get_now, limiter, router
from app.games.hexforge_be.simulation import simulate
from app.games.hexforge_be.tests.test_player import T0, memory_db
from app.user_auth import get_current_user_id

RICH = {"rune_stone": 5000, "scrap": 5000, "mana": 5000, "chips": 5000}
BASE_SQUAD = ["guardian", "neon_blade", "neon_blade", "technomancer"]


def city_and_heroes():
    city = economy.starter_city(T0)
    forge.ensure_forge(city)
    outposts.ensure_campaign(city, T0)
    return city, economy.starter_heroes()


class StatsTest(unittest.TestCase):
    def test_a_base_hero_keeps_its_class_stats(self):
        self.assertIs(evolution.spec_of("guardian"), HEROES["guardian"])

    def test_every_form_is_stronger_at_each_tier_where_it_shines(self):
        g2 = evolution.spec_of("guardian", "bastion", 2)
        g3 = evolution.spec_of("guardian", "bastion", 3)
        self.assertGreater(g2.hp, HEROES["guardian"].hp)
        self.assertGreater(g3.hp, g2.hp)
        self.assertGreater(g3.taunt_radius, g2.taunt_radius)
        self.assertGreater(evolution.spec_of("guardian", "warlord", 3).splash_radius, 0)
        self.assertGreater(evolution.spec_of("neon_blade", "phantom", 2).speed, HEROES["neon_blade"].speed)
        self.assertLess(evolution.spec_of("neon_blade", "phantom", 3).cooldown, HEROES["neon_blade"].cooldown)
        self.assertGreater(evolution.spec_of("neon_blade", "reaper", 2).tower_bonus, 1)
        self.assertGreater(evolution.spec_of("technomancer", "archon", 3).nova_radius, HEROES["technomancer"].nova_radius)
        self.assertGreater(evolution.spec_of("technomancer", "arcanist", 2).attack_range,
                           HEROES["technomancer"].attack_range)

    def test_the_public_table_covers_every_class_form_and_tier(self):
        table = evolution.public_evolution()
        self.assertEqual(table["forms"]["guardian"], ["bastion", "warlord"])
        self.assertEqual(set(table["stats"]["technomancer"]), {"base", "archon", "arcanist"})
        self.assertEqual(table["costs"]["neon_blade"]["3"]["seconds"], evolution.EVOLVE_SECONDS[3])


class HeroXpTest(unittest.TestCase):
    def test_xp_rewards_damage_survival_and_victory(self):
        self.assertEqual(evolution.battle_xp(0, False, False), 10)
        self.assertEqual(evolution.battle_xp(1250, True, True), 10 + 12 + 5 + 10)
        self.assertEqual(evolution.battle_xp(99999, True, True), 10 + 30 + 5 + 10)

    def test_every_hero_who_fought_earns_xp(self):
        _, heroes = city_and_heroes()
        summary = {"victory": True, "heroes": [
            {"dealt": 500, "survived": True}, {"dealt": 0, "survived": False},
            {"dealt": 100, "survived": True}, {"dealt": 3000, "survived": True}]}
        ids = [h["id"] for h in heroes]
        gains = evolution.gain_hero_xp(heroes, ids, summary)
        self.assertEqual([g["xp"] for g in gains], [30, 20, 26, 55])
        self.assertEqual(heroes[3]["xp"], 55)


class EvolveTest(unittest.TestCase):
    def setUp(self):
        self.city, self.heroes = city_and_heroes()
        self.materials = dict(RICH)
        self.guardian = self.heroes[0]

    def test_not_before_the_threshold(self):
        self.guardian["xp"] = evolution.TIER_XP[2] - 1
        with self.assertRaises(ActionError) as error:
            evolution.start(self.city, self.heroes, self.materials, self.guardian["id"], "bastion", T0)
        self.assertEqual(error.exception.code, "not_enough_xp")

    def test_evolving_takes_a_slot_materials_and_time_and_benches_the_hero(self):
        self.guardian["xp"] = evolution.TIER_XP[2]
        job = evolution.start(self.city, self.heroes, self.materials, self.guardian["id"], "bastion", T0)
        self.assertEqual(self.materials["scrap"], RICH["scrap"] - 300)
        self.assertEqual(job["ready_at"], T0 + evolution.EVOLVE_SECONDS[2])
        with self.assertRaises(ActionError) as error:
            outposts.squad_classes(self.heroes, [h["id"] for h in self.heroes], T0)
        self.assertEqual(error.exception.code, "hero_evolving")
        with self.assertRaises(ActionError):
            forge.claim(self.city, self.heroes, job["id"], T0 + 10)
        claimed = forge.claim(self.city, self.heroes, job["id"], job["ready_at"])
        self.assertEqual((claimed["form"], claimed["tier"]), ("bastion", 2))
        self.assertEqual((self.guardian["form"], self.guardian["tier"]), ("bastion", 2))
        self.assertNotIn("evolving", self.guardian)
        units = outposts.squad_classes(self.heroes, [h["id"] for h in self.heroes], T0 + 99999)
        self.assertEqual(units[0], {"cls": "guardian", "form": "bastion", "tier": 2})
        self.assertEqual(units[1], "neon_blade")

    def test_a_form_of_another_class_is_refused(self):
        self.guardian["xp"] = 999
        with self.assertRaises(ActionError) as error:
            evolution.start(self.city, self.heroes, self.materials, self.guardian["id"], "phantom", T0)
        self.assertEqual(error.exception.code, "unknown_form")

    def test_ascending_keeps_the_form_and_costs_more(self):
        self.guardian.update(xp=evolution.TIER_XP[3], form="warlord", tier=2)
        job = evolution.start(self.city, self.heroes, self.materials, self.guardian["id"], "bastion", T0)
        self.assertEqual((job["form"], job["tier"]), ("warlord", 3))
        self.assertEqual(self.materials["scrap"], RICH["scrap"] - 750)
        forge.claim(self.city, self.heroes, job["id"], job["ready_at"])
        self.assertEqual(self.guardian["tier"], 3)
        with self.assertRaises(ActionError) as error:
            evolution.start(self.city, self.heroes, self.materials, self.guardian["id"], None, T0 + 99999)
        self.assertEqual(error.exception.code, "fully_evolved")

    def test_needs_a_free_forge_slot_and_materials(self):
        self.guardian["xp"] = 999
        evolution.start(self.city, self.heroes, self.materials, self.guardian["id"], "bastion", T0)
        self.heroes[1]["xp"] = 999
        evolution.start(self.city, self.heroes, self.materials, self.heroes[1]["id"], "reaper", T0)
        self.heroes[3]["xp"] = 999
        with self.assertRaises(ActionError) as error:
            evolution.start(self.city, self.heroes, self.materials, self.heroes[3]["id"], "archon", T0)
        self.assertEqual(error.exception.code, "forge_busy")
        self.city["forge"]["jobs"].clear()
        with self.assertRaises(ActionError) as error:
            evolution.start(self.city, self.heroes, {}, self.heroes[3]["id"], "archon", T0)
        self.assertEqual(error.exception.code, "not_enough_materials")


class BattleTest(unittest.TestCase):
    def test_an_evolved_squad_does_better_on_every_outpost(self):
        ascended = [{"cls": "guardian", "form": "bastion", "tier": 3},
                    {"cls": "neon_blade", "form": "reaper", "tier": 3},
                    {"cls": "neon_blade", "form": "phantom", "tier": 3},
                    {"cls": "technomancer", "form": "archon", "tier": 3}]
        for outpost_id in outposts.OUTPOSTS:
            city = outposts.outpost_city(outpost_id)
            base = simulate(city, BASE_SQUAD, "south", "core", "compact")["summary"]
            strong = simulate(city, ascended, "south", "core", "compact")["summary"]
            self.assertGreaterEqual((strong["victory"], strong["destruction"]),
                                    (base["victory"], base["destruction"]), outpost_id)

    def test_evolved_battles_are_deterministic_and_report_forms(self):
        city = outposts.outpost_city(3)
        squad = [{"cls": "guardian", "form": "warlord", "tier": 2}, "neon_blade",
                 {"cls": "neon_blade", "form": "reaper", "tier": 2}, {"cls": "technomancer", "form": "arcanist", "tier": 2}]
        a = simulate(city, squad, "west", "towers", "spread")
        b = simulate(city, squad, "west", "towers", "spread")
        self.assertEqual(a["events"], b["events"])
        self.assertEqual(a["squad"][0]["form"], "warlord")
        self.assertEqual(a["squad"][1]["tier"], 1)

    def test_a_warlord_blow_splashes_nearby_buildings(self):
        city = outposts.outpost_city(5)
        battle = simulate(city, [{"cls": "guardian", "form": "warlord", "tier": 3}] * 4, "south", "core", "compact")
        self.assertTrue(any(e.get("splash") for e in battle["events"] if e["type"] == "strike"))


class EvolveApiTest(unittest.TestCase):
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

    def test_evolve_through_the_api(self):
        state = self.client.get("/api/hexforge/me").json()
        self.assertIn("evolution", state)
        hero = state["heroes"][0]
        refused = self.client.post(f"/api/hexforge/me/heroes/{hero['id']}/evolve", json={"form": "bastion"})
        self.assertEqual(refused.json()["detail"], "not_enough_xp")
        refused = self.client.post(f"/api/hexforge/me/heroes/{hero['id']}/evolve", json={"form": "nonsense"})
        self.assertEqual(refused.status_code, 422)


if __name__ == "__main__":
    unittest.main()
