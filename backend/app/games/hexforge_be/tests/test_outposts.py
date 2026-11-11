"""
Hexforge phase 2, step 4: computer outposts, energy, injuries and loot.

    cd backend && python -m unittest discover -s app/games/hexforge_be/tests -t .
"""

import itertools
import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.database import get_db
from app.games.hexforge_be import economy, forge, outposts
from app.games.hexforge_be.errors import ActionError
from app.games.hexforge_be.router import get_now, limiter, router
from app.games.hexforge_be.simulation import simulate
from app.games.hexforge_be.tests.test_player import T0, memory_db
from app.user_auth import get_current_user_id

STARTER = ["guardian", "neon_blade", "neon_blade", "technomancer"]
COMBOS = list(itertools.product(("north", "east", "south", "west"),
                                ("towers", "core", "production"), ("compact", "spread", "split")))
HOUR = 3600


def player():
    city = economy.starter_city(T0)
    forge.ensure_forge(city)
    outposts.ensure_campaign(city, T0)
    return city, economy.starter_heroes(), dict(economy.STARTING_MATERIALS)


def losing_combo(outpost_id):
    for combo in COMBOS:
        if not simulate(outposts.outpost_city(outpost_id), STARTER, *combo)["summary"]["victory"]:
            return combo
    raise AssertionError("no losing combo")


class LayoutTest(unittest.TestCase):
    def test_every_outpost_fits_the_city_without_overlaps(self):
        for oid in outposts.OUTPOSTS:
            city = outposts.outpost_city(oid)
            taken = {}
            for b in city["buildings"]:
                for x in range(b["x"], b["x"] + b["size"]):
                    for y in range(b["y"], b["y"] + b["size"]):
                        self.assertTrue(1 <= x <= 16 and 1 <= y <= 16, f"outpost {oid}: {b['type']} at {x},{y}")
                        self.assertNotIn((x, y), taken, f"outpost {oid}: {b['type']} on {taken.get((x, y))}")
                        taken[(x, y)] = b["type"]
            self.assertEqual(sum(b["type"] == "core" for b in city["buildings"]), 1)

    def test_difficulty_rises_from_one_outpost_to_the_next(self):
        wins = [sum(simulate(outposts.outpost_city(oid), STARTER, *c)["summary"]["victory"] for c in COMBOS)
                for oid in sorted(outposts.OUTPOSTS)]
        self.assertEqual(wins[0], len(COMBOS), "the first outpost is a tutorial")
        for easier, harder in zip(wins[1:], wins[2:]):
            self.assertGreater(easier, harder, wins)
        self.assertLess(wins[-1], len(COMBOS) // 2, wins)


class EnergyTest(unittest.TestCase):
    def test_charges_come_back_one_per_hour(self):
        energy = {"charges": 2, "updated_at": T0}
        outposts.settle_energy(energy, T0 + 2.5 * HOUR)
        self.assertEqual(energy["charges"], 4)
        self.assertEqual(energy["updated_at"], T0 + 2 * HOUR)       # the half hour is kept

    def test_charges_stop_at_the_maximum(self):
        energy = {"charges": 4, "updated_at": T0}
        outposts.settle_energy(energy, T0 + 10 * HOUR)
        self.assertEqual(energy["charges"], outposts.ENERGY_MAX)

    def test_public_energy_says_when_the_next_charge_arrives(self):
        self.assertEqual(outposts.public_energy({"charges": 3, "updated_at": T0}, T0 + 600),
                         {"charges": 3, "max": 5, "next_at": T0 + HOUR})
        self.assertIsNone(outposts.public_energy({"charges": 5, "updated_at": T0}, T0)["next_at"])


class AttackTest(unittest.TestCase):
    def setUp(self):
        self.city, self.heroes, self.materials = player()
        self.squad = [h["id"] for h in self.heroes]

    def attack(self, oid=1, combo=("south", "core", "compact"), now=T0, squad=None):
        return outposts.attack(self.city, self.heroes, self.materials, oid, squad or self.squad, *combo, now)

    def refused(self, code, **kwargs):
        with self.assertRaises(ActionError) as caught:
            self.attack(**kwargs)
        self.assertEqual(caught.exception.code, code)

    def test_a_first_victory_pays_in_full_and_opens_the_next_outpost(self):
        before = dict(self.materials)
        result = self.attack()
        rewards = result["rewards"]
        self.assertTrue(result["summary"]["victory"])
        self.assertTrue(rewards["first_clear"])
        self.assertEqual(rewards["unlocked"], 2)
        expected = outposts.loot_for(outposts.OUTPOSTS[1], result["summary"]["loot_percent"], False)
        self.assertEqual(rewards["loot"], expected)
        for m, amount in expected.items():
            self.assertEqual(self.materials[m], before[m] + amount)
        self.assertTrue(outposts.is_unlocked(self.city["campaign"], 2))

    def test_a_cleared_outpost_pays_half(self):
        first = self.attack()["rewards"]["loot"]
        again = self.attack(now=T0 + 1)["rewards"]
        self.assertFalse(again["first_clear"])
        self.assertEqual(again["loot"], {m: v // 2 for m, v in first.items()})

    def test_a_defeat_pays_nothing_and_injures_the_fallen(self):
        self.city["campaign"]["cleared"] = [1, 2, 3, 4]
        result = self.attack(oid=5, combo=losing_combo(5))
        self.assertFalse(result["summary"]["victory"])
        self.assertEqual(set(result["rewards"]["loot"].values()), {0})
        fallen = [self.squad[i] for i, h in enumerate(result["summary"]["heroes"]) if not h["survived"]]
        self.assertEqual(result["rewards"]["injured"], fallen)
        for hero in self.heroes:
            if hero["id"] in fallen:
                self.assertEqual(hero["injured_until"], T0 + outposts.INJURY_SECONDS)

    def test_injured_heroes_cannot_attack_until_healed(self):
        self.heroes[0]["injured_until"] = T0 + 100
        self.refused("hero_injured")
        self.attack(now=T0 + 100)

    def test_outposts_open_in_order(self):
        self.refused("outpost_locked", oid=2)
        self.refused("unknown_outpost", oid=99)

    def test_the_squad_is_four_different_heroes_you_own(self):
        self.refused("bad_squad", squad=self.squad[:3] + [self.squad[0]])
        self.refused("bad_squad", squad=self.squad[:3] + [999])

    def test_each_attack_costs_one_charge(self):
        for i in range(outposts.ENERGY_MAX):
            self.attack(now=T0 + i)
        self.refused("no_energy", now=T0 + 10)
        self.attack(now=T0 + HOUR)          # the first charge spent is back after an hour


class OutpostApiTest(unittest.TestCase):
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

    def test_list_then_attack(self):
        body = self.client.get("/api/hexforge/me/outposts").json()
        self.assertEqual([o["unlocked"] for o in body["outposts"]], [True, False, False, False, False])
        self.assertEqual(body["energy"]["charges"], outposts.ENERGY_MAX)
        squad = [h["id"] for h in body["heroes"]]

        response = self.client.post("/api/hexforge/me/outposts/1/attack", json={
            "hero_ids": squad, "side": "south", "priority": "core", "tactic": "compact"})
        self.assertEqual(response.status_code, 200)
        after = response.json()
        self.assertIn("frames", after["battle"])
        self.assertTrue(after["battle"]["rewards"]["first_clear"])
        self.assertTrue(after["outposts"][1]["unlocked"])
        self.assertEqual(after["energy"]["charges"], outposts.ENERGY_MAX - 1)

    def test_a_locked_outpost_is_refused(self):
        body = self.client.get("/api/hexforge/me/outposts").json()
        squad = [h["id"] for h in body["heroes"]]
        response = self.client.post("/api/hexforge/me/outposts/3/attack", json={
            "hero_ids": squad, "side": "south", "priority": "core", "tactic": "compact"})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "outpost_locked")


if __name__ == "__main__":
    unittest.main()
