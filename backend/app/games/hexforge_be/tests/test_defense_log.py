"""
Hexforge phase 3, step 4: the defence log, raid replays and revenge.

    cd backend && python -m unittest discover -s app/games/hexforge_be/tests -t .
"""

import json
import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.database import get_db
from app.games.hexforge_be import pvp
from app.games.hexforge_be.models import HexforgeAttack
from app.games.hexforge_be.player_service import ActionError, PlayerService
from app.games.hexforge_be.router import get_now, limiter, router
from app.games.hexforge_be.tests.test_player import T0, memory_db
from app.user_auth import get_current_user_id

RICH = {"rune_stone": 2400, "scrap": 1400, "mana": 900, "chips": 300}


def arena_players(service, *user_ids, trophies=100):
    for uid in user_ids:
        state = service.load(uid, T0)
        state.city["campaign"]["cleared"].append(pvp.ARENA_OUTPOST)
        state.trophies = trophies
        state.materials = dict(RICH)
        service.save(state, T0)


def raid(service, attacker, rival, now=T0):
    state = service.load(attacker, now)
    state.city["pvp"]["scout"] = rival
    service.save(state, now)
    return service.attack_rival(attacker, [h["id"] for h in state.heroes], "south", "core", "compact", now)


class DefenseLogTest(unittest.TestCase):
    def setUp(self):
        self.db = memory_db()()
        self.service = PlayerService(self.db)
        arena_players(self.service, "ada", "bob", "cid")
        _, self.result = raid(self.service, "ada", "bob")
        self.raid_id = self.db.query(HexforgeAttack).one().id

    def tearDown(self):
        self.db.close()

    def code(self, action):
        with self.assertRaises(ActionError) as caught:
            action()
        return caught.exception.code

    def test_the_defender_sees_who_raided_them_and_what_they_lost(self):
        log = self.service.defense_log("bob", T0 + 60)
        self.assertEqual(log["unseen"], 1)
        entry = log["raids"][0]
        self.assertEqual(entry["raider"], "Raider ADA")
        self.assertTrue(entry["breached"])
        self.assertEqual(entry["loot"], self.result["rewards"]["loot"])
        self.assertEqual(entry["trophies"], -30)
        self.assertFalse(entry["seen"])

    def test_the_raider_does_not_see_it_in_their_own_log(self):
        self.assertEqual(self.service.defense_log("ada", T0)["raids"], [])

    def test_reading_the_log_marks_it_seen(self):
        self.service.mark_defenses_seen("bob")
        log = self.service.defense_log("bob", T0)
        self.assertEqual(log["unseen"], 0)
        self.assertTrue(log["raids"][0]["seen"])

    def test_the_replay_is_rebuilt_exactly(self):
        replay = self.service.defense_replay("bob", self.raid_id)
        self.assertEqual(replay["summary"], self.result["summary"])
        self.assertEqual(replay["events"], self.result["events"])
        self.assertEqual(replay["raider"], "Raider ADA")

    def test_only_the_defender_can_watch_it(self):
        self.assertEqual(self.code(lambda: self.service.defense_replay("cid", self.raid_id)), "unknown_raid")

    def test_revenge_scouts_the_raider(self):
        entry = self.service.defense_log("bob", T0 + 60)["raids"][0]
        self.assertTrue(entry["can_revenge"])
        state = self.service.revenge("bob", self.raid_id, T0 + 60)
        self.assertEqual(state.city["pvp"]["scout"], "ada")

    def test_revenge_expires_after_a_day(self):
        later = T0 + pvp.REVENGE_SECONDS + 1
        self.assertFalse(self.service.defense_log("bob", later)["raids"][0]["can_revenge"])
        self.assertEqual(self.code(lambda: self.service.revenge("bob", self.raid_id, later)), "revenge_unavailable")

    def test_no_revenge_on_a_shielded_raider(self):
        raid(self.service, "cid", "ada", T0 + 30)       # someone else raided ada first
        self.assertEqual(self.code(lambda: self.service.revenge("bob", self.raid_id, T0 + 60)), "revenge_unavailable")


class DefenseLogApiTest(unittest.TestCase):
    def setUp(self):
        sessions = memory_db()

        def db_override():
            db = sessions()
            try:
                yield db
            finally:
                db.close()

        self.user = "bob"
        app = FastAPI()
        app.state.limiter = limiter
        app.include_router(router)
        app.dependency_overrides = {get_db: db_override, get_now: lambda: T0 + 60,
                                    get_current_user_id: lambda: self.user}
        self.client = TestClient(app)
        db = sessions()
        service = PlayerService(db)
        arena_players(service, "ada", "bob")
        raid(service, "ada", "bob")
        db.close()

    def test_log_replay_seen_and_revenge(self):
        log = self.client.get("/api/hexforge/me/defenses").json()
        self.assertEqual(log["unseen"], 1)
        raid_id = log["raids"][0]["id"]

        replay = self.client.get(f"/api/hexforge/me/defenses/{raid_id}/replay").json()
        self.assertIn("frames", replay)
        self.assertEqual(json.dumps(replay["squad"][0]["cls"]), '"guardian"')

        self.client.post("/api/hexforge/me/defenses/seen")
        self.assertEqual(self.client.get("/api/hexforge/me/defenses").json()["unseen"], 0)

        screen = self.client.post(f"/api/hexforge/me/defenses/{raid_id}/revenge").json()
        self.assertEqual(screen["rival"]["name"], "Raider ADA")

    def test_someone_elses_raid_is_not_found(self):
        self.user = "ada"
        raid_id = 1
        response = self.client.get(f"/api/hexforge/me/defenses/{raid_id}/replay")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "unknown_raid")


if __name__ == "__main__":
    unittest.main()
