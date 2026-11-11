"""
Hexforge phase 3, step 3: trophies, leagues and the leaderboard.

    cd backend && python -m unittest discover -s app/games/hexforge_be/tests -t .
"""

import random
import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.database import get_db
from app.games.hexforge_be import pvp
from app.games.hexforge_be.models import HexforgeAttack
from app.games.hexforge_be.player_service import PlayerService
from app.games.hexforge_be.router import get_now, limiter, router
from app.games.hexforge_be.tests.test_player import T0, memory_db
from app.games.hexforge_be.tests.test_pvp import city
from app.user_auth import get_current_user_id


class StakesTest(unittest.TestCase):
    def test_even_rivals(self):
        self.assertEqual(pvp.trophy_stakes(300, 300), {"win": 30, "loss": 20})

    def test_a_stronger_rival_pays_more_and_costs_less(self):
        self.assertEqual(pvp.trophy_stakes(0, 250), {"win": 40, "loss": 10})
        self.assertEqual(pvp.trophy_stakes(250, 0), {"win": 20, "loss": 30})

    def test_stakes_stay_within_bounds(self):
        self.assertEqual(pvp.trophy_stakes(0, 5000), {"win": 50, "loss": 5})
        self.assertEqual(pvp.trophy_stakes(5000, 0), {"win": 5, "loss": 40})

    def test_a_win_takes_trophies_from_the_rival(self):
        self.assertEqual(pvp.settle_trophies(100, 100, True), (130, 70, 30))

    def test_a_defeat_hands_trophies_to_the_rival(self):
        self.assertEqual(pvp.settle_trophies(100, 100, False), (80, 120, -20))

    def test_nobody_goes_below_zero(self):
        self.assertEqual(pvp.settle_trophies(0, 10, False), (0, 20 + 10, 0))
        self.assertEqual(pvp.settle_trophies(10, 0, True), (10 + 30, 0, 30))


class LeagueTest(unittest.TestCase):
    def test_leagues_follow_trophy_bands(self):
        self.assertEqual([pvp.league(t) for t in (0, 199, 200, 500, 1000, 2500)],
                         ["Bronze", "Bronze", "Silver", "Gold", "Neon", "Mythic"])

    def test_the_next_league_up(self):
        self.assertEqual(pvp.next_league(150), {"name": "Silver", "at": 200})
        self.assertIsNone(pvp.next_league(2000))


class TrophyMatchmakingTest(unittest.TestCase):
    def test_the_scout_prefers_players_with_similar_trophies(self):
        near = [(f"near{i}", city(), 300 + 10 * i) for i in range(pvp.CLOSEST_RIVALS)]
        far = [("rookie", city(), 0), ("champion", city(), 1500)]
        picks = {pvp.choose_rival(city(), 320, near + far, T0, random.Random(seed)) for seed in range(30)}
        self.assertLessEqual(picks, {uid for uid, _, _ in near})


class TrophyServiceTest(unittest.TestCase):
    def setUp(self):
        self.db = memory_db()()
        self.service = PlayerService(self.db)
        for uid, trophies in (("ada", 100), ("bob", 100), ("cid", 400), ("dan", 0)):
            state = self.service.load(uid, T0)
            state.city["campaign"]["cleared"].append(pvp.ARENA_OUTPOST)
            state.trophies = trophies
            self.service.save(state, T0)

    def tearDown(self):
        self.db.close()

    def raid(self, attacker, rival):
        state = self.service.load(attacker, T0)
        state.city["pvp"]["scout"] = rival
        self.service.save(state, T0)
        hero_ids = [h["id"] for h in state.heroes]
        return self.service.attack_rival(attacker, hero_ids, "south", "core", "compact", T0)

    def test_a_raid_moves_trophies_and_logs_them(self):
        state, result = self.raid("ada", "bob")
        self.assertTrue(result["summary"]["victory"])
        self.assertEqual(result["rewards"]["trophies"], 30)
        self.assertEqual(state.trophies, 130)
        self.assertEqual(self.service.load("bob", T0).trophies, 70)
        self.assertEqual(self.db.query(HexforgeAttack).one().trophies, 30)

    def test_the_rival_card_shows_the_stakes(self):
        state = self.service.load("ada", T0)
        state.city["pvp"]["scout"] = "cid"
        rival = self.service.rival_view(state, T0)
        self.assertEqual((rival["trophies"], rival["league"]), (400, "Silver"))
        self.assertEqual(rival["stakes"], pvp.trophy_stakes(100, 400))

    def test_the_leaderboard_ranks_players_with_trophies(self):
        board = self.service.leaderboard("bob", T0)
        self.assertEqual([(row["rank"], row["trophies"]) for row in board["top"]], [(1, 400), (2, 100), (3, 100)])
        self.assertEqual([row["me"] for row in board["top"]].count(True), 1)
        self.assertEqual(board["me"]["rank"], 2)
        self.assertEqual(board["me"]["next_league"], {"name": "Silver", "at": 200})

    def test_players_without_trophies_are_not_ranked(self):
        board = self.service.leaderboard("dan", T0)
        self.assertNotIn(0, [row["trophies"] for row in board["top"]])
        self.assertIsNone(board["me"]["rank"])


class LeaderboardApiTest(unittest.TestCase):
    def test_the_leaderboard_route(self):
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
        client = TestClient(app)
        body = client.get("/api/hexforge/me/leaderboard").json()
        self.assertEqual(body["top"], [])
        self.assertEqual(body["me"]["league"], "Bronze")
        self.assertEqual(client.get("/api/hexforge/me").json()["pvp"]["trophies"], 0)


if __name__ == "__main__":
    unittest.main()
