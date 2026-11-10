"""
Hexforge battle prototype tests.

    cd backend && python -m unittest discover -s app/games/hexforge_be/tests -t .
"""

import itertools
import math
import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.games.hexforge_be.catalog import BUILDINGS, PRIORITIES, SIDES, TACTICS
from app.games.hexforge_be.demo_city import demo_city
from app.games.hexforge_be.router import limiter, router
from app.games.hexforge_be.simulation import FRAME_STRIDE, MAX_TICKS, simulate

MIXED = ["guardian", "neon_blade", "neon_blade", "technomancer"]


def run(squad=None, side="south", priority="core", tactic="compact"):
    return simulate(demo_city(), squad or MIXED, side, priority, tactic)


class DemoCityTest(unittest.TestCase):
    def test_buildings_fit_the_grid_without_overlapping(self):
        city = demo_city()
        taken = {}
        for b in city["buildings"]:
            for x in range(b["x"], b["x"] + b["size"]):
                for y in range(b["y"], b["y"] + b["size"]):
                    self.assertTrue(1 <= x < city["grid"] - 1 and 1 <= y < city["grid"] - 1,
                                    f"{b['type']} at {x},{y} is outside the city")
                    self.assertNotIn((x, y), taken, f"{b['type']} overlaps {taken.get((x, y))}")
                    taken[(x, y)] = b["type"]

    def test_there_is_exactly_one_core(self):
        self.assertEqual(sum(b["type"] == "core" for b in demo_city()["buildings"]), 1)


class DeterminismTest(unittest.TestCase):
    def test_same_attack_gives_the_same_replay(self):
        first, second = run(), run()
        self.assertEqual(first, second)

    def test_a_different_tactic_gives_a_different_replay(self):
        self.assertNotEqual(run(tactic="compact")["frames"], run(tactic="spread")["frames"])


class BattleRulesTest(unittest.TestCase):
    def test_every_battle_ends_within_the_time_limit(self):
        for side, priority, tactic in itertools.product(SIDES, PRIORITIES, TACTICS):
            battle = run(side=side, priority=priority, tactic=tactic)
            self.assertLessEqual(battle["ticks"], MAX_TICKS)
            self.assertEqual(len(battle["frames"]), math.ceil(battle["ticks"] / FRAME_STRIDE) + 1)

    def test_attack_choices_change_the_outcome(self):
        """Phase-1 gate: what the attacker picks must matter."""
        results = [run(side=s, priority=p, tactic=t)["summary"]
                   for s, p, t in itertools.product(SIDES, PRIORITIES, TACTICS)]
        destruction = [r["destruction"] for r in results]
        self.assertGreaterEqual(max(destruction) - min(destruction), 40)
        self.assertTrue(any(r["victory"] for r in results))
        self.assertFalse(all(r["victory"] for r in results))

    def test_loot_follows_the_result(self):
        for side, priority in itertools.product(SIDES, PRIORITIES):
            s = run(side=side, priority=priority)["summary"]
            if s["core_destroyed"]:
                expected = 30
            elif s["destruction"] >= 50:
                expected = 20
            else:
                expected = 0
            self.assertEqual(s["loot_percent"], expected)
            self.assertEqual(s["victory"], expected > 0)

    def test_the_event_log_rebuilds_the_final_city(self):
        """The client draws building HP from the log alone, so the log must add up."""
        city = demo_city()["buildings"]
        hp = {b["id"]: b["hp"] for b in city}
        destroyed = set()
        for e in run(side="north", priority="towers", tactic="spread")["events"]:
            hits = {"strike": [e], "nova": e.get("hits", [])}.get(e["type"], [])
            for hit in hits:
                hp[hit["building"]] -= hit["dmg"]
                self.assertEqual(hp[hit["building"]], hit["hp"])
                self.assertGreaterEqual(hit["hp"], 0)
            if e["type"] == "destroyed":
                destroyed.add(e["building"])
        ruined = {b["id"] for b in city
                  if hp[b["id"]] <= 0 and BUILDINGS[b["type"]].category != "trap"}
        self.assertTrue(destroyed)
        self.assertEqual(destroyed, ruined)

    def test_neon_blades_jump_walls_instead_of_breaking_them(self):
        walls = {b["id"] for b in demo_city()["buildings"] if b["type"] == "wall"}
        battle = run(squad=["neon_blade"] * 4, side="west", priority="core")
        self.assertFalse(any(e["type"] == "strike" and e["building"] in walls for e in battle["events"]))

    def test_a_leap_clears_the_walls_and_lands_on_free_ground(self):
        city = demo_city()
        walls = {(x, y) for b in city["buildings"] if b["type"] == "wall"
                 for x in range(b["x"], b["x"] + b["size"]) for y in range(b["y"], b["y"] + b["size"])}
        battle = run(squad=["neon_blade"] * 4, side="west", priority="core")
        leaps = [e for e in battle["events"] if e["type"] == "leap"]
        self.assertTrue(leaps, "the blades should leap over the wall ring")
        for leap in leaps:
            self.assertGreater(leap["until"], leap["t"])
            self.assertNotIn((math.floor(leap["x1"]), math.floor(leap["y1"])), walls)
            self.assertNotIn((math.floor(leap["x0"]), math.floor(leap["y0"])), walls)

    def test_heroes_never_stop_on_a_standing_wall(self):
        city = demo_city()
        walls = {(x, y) for b in city["buildings"] if b["type"] == "wall"
                 for x in range(b["x"], b["x"] + b["size"]) for y in range(b["y"], b["y"] + b["size"])}
        for side in SIDES:
            battle = run(side=side)
            strikes = {(e["t"], e["hero"]) for e in battle["events"] if e["type"] in ("strike", "nova")}
            for t, hero in strikes:
                if t % FRAME_STRIDE:
                    continue
                x, y, _ = battle["frames"][t // FRAME_STRIDE][hero]
                broken = {(e["building"]) for e in battle["events"] if e["type"] == "destroyed" and e["t"] <= t}
                standing = {cell for cell in walls if not any(
                    b["id"] in broken and b["x"] == cell[0] and b["y"] == cell[1] for b in city["buildings"])}
                self.assertNotIn((math.floor(x), math.floor(y)), standing, f"hero {hero} attacks from a wall at t={t}")

    def test_guardians_have_to_break_walls_to_reach_the_core(self):
        walls = {b["id"] for b in demo_city()["buildings"] if b["type"] == "wall"}
        battle = run(squad=["guardian"] * 4, side="west", priority="core")
        self.assertTrue(any(e["type"] == "strike" and e["building"] in walls for e in battle["events"]))


class ApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app = FastAPI()
        app.state.limiter = limiter
        app.include_router(router)
        cls.client = TestClient(app)

    def test_demo_city_endpoint(self):
        body = self.client.get("/api/hexforge/city/demo").json()
        self.assertEqual(body["city"]["grid"], 18)
        self.assertIn("guardian", body["catalog"]["heroes"])

    def test_battle_endpoint_returns_a_replay(self):
        response = self.client.post("/api/hexforge/battle", json={
            "squad": MIXED, "side": "east", "priority": "towers", "tactic": "split"})
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["setup"]["side"], "east")
        self.assertEqual(len(body["frames"][0]), 4)
        self.assertIn("summary", body)

    def test_battle_endpoint_rejects_a_bad_squad(self):
        for squad in (["guardian"] * 3, ["guardian", "guardian", "guardian", "dragon"]):
            response = self.client.post("/api/hexforge/battle", json={
                "squad": squad, "side": "east", "priority": "towers", "tactic": "split"})
            self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
