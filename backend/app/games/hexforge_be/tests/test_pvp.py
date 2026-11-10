"""
Hexforge phase 3, step 2: attacking other players.

    cd backend && python -m unittest discover -s app/games/hexforge_be/tests -t .
"""

import json
import random
import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.database import get_db
from app.games.hexforge_be import economy, forge, outposts, pvp
from app.games.hexforge_be.models import HexforgeAttack
from app.games.hexforge_be.player_service import ActionError, PlayerService, StaleState
from app.games.hexforge_be.router import get_now, limiter, router
from app.games.hexforge_be.tests.test_player import T0, memory_db
from app.models import User
from app.user_auth import get_current_user_id

HOUR = 3600
RICH = {"rune_stone": 2400, "scrap": 1400, "mana": 900, "chips": 300}


def city(arena=True, towers=1, shield=0):
    c = economy.starter_city(T0)
    forge.ensure_forge(c)
    outposts.ensure_campaign(c, T0)
    pvp.ensure_pvp(c)
    if arena:
        c["campaign"]["cleared"].append(pvp.ARENA_OUTPOST)
    c["pvp"]["shield_until"] = shield
    kept = 0
    for b in list(c["buildings"]):
        if b["type"] in ("rune_tower", "frost_tower"):
            kept += 1
            if kept > towers:
                c["buildings"].remove(b)
    return c


class LootTest(unittest.TestCase):
    def test_the_vault_protects_a_fixed_amount_of_each_material(self):
        self.assertEqual(pvp.lootable({"rune_stone": 1000, "scrap": 300}),
                         {"rune_stone": 600, "scrap": 0, "mana": 0, "chips": 0})

    def test_loot_is_a_share_of_what_lies_above_the_protection(self):
        self.assertEqual(pvp.loot_for(RICH, 20), {"rune_stone": 400, "scrap": 200, "mana": 100, "chips": 0})
        self.assertEqual(pvp.loot_for(RICH, 30)["rune_stone"], 600)

    def test_a_new_player_has_nothing_to_steal(self):
        self.assertFalse(any(pvp.loot_for(economy.STARTING_MATERIALS, 30).values()))


class ArenaTest(unittest.TestCase):
    def test_only_arena_players_with_a_tower_and_no_shield_can_be_attacked(self):
        self.assertTrue(pvp.attackable(city(), T0))
        self.assertFalse(pvp.attackable(city(arena=False), T0))
        self.assertFalse(pvp.attackable(city(towers=0), T0))
        self.assertFalse(pvp.attackable(city(shield=T0 + 60), T0))
        self.assertTrue(pvp.attackable(city(shield=T0 + 60), T0 + 60))

    def test_the_scout_picks_a_rival_of_similar_strength(self):
        me = city(towers=2)
        evens = [f"even{i}" for i in range(pvp.CLOSEST_RIVALS)]
        candidates = [("weak", city(towers=1), 0), ("strong", self.fortress(), 0)] + [(uid, city(towers=2), 0) for uid in evens]
        picks = {pvp.choose_rival(me, 0, candidates, T0, random.Random(seed)) for seed in range(30)}
        self.assertLessEqual(picks, set(evens))
        self.assertGreater(len(picks), 1, "some variety among equals")

    def test_asking_again_gives_someone_else_when_possible(self):
        me = city()
        me["pvp"]["scout"] = "bob"
        self.assertEqual(pvp.choose_rival(me, 0, [("bob", city(), 0), ("eve", city(), 0)], T0, random.Random(0)), "eve")
        self.assertEqual(pvp.choose_rival(me, 0, [("bob", city(), 0)], T0, random.Random(0)), "bob")

    def test_nobody_to_attack(self):
        self.assertIsNone(pvp.choose_rival(city(), 0, [("bob", city(arena=False), 0)], T0))

    def test_the_attacker_sees_no_aims_and_no_traps(self):
        target = {"grid": 18, "buildings": [
            {"id": 1, "type": "rune_tower", "x": 2, "y": 2, "size": 2, "hp": 950, "aim": "weakest"},
            {"id": 2, "type": "rune_trap", "x": 5, "y": 5, "size": 1, "hp": 1},
        ]}
        rival = pvp.public_rival("Bob", target, RICH, True)
        self.assertEqual([b["id"] for b in rival["city"]["buildings"]], [1])
        self.assertNotIn("aim", rival["city"]["buildings"][0])
        self.assertEqual(rival["strength"], 2)

    def fortress(self):
        c = city()
        for i in range(6):
            c["buildings"].append({"id": 100 + i, "type": "rune_trap", "x": 1 + i, "y": 16})
        return c


class RivalServiceTest(unittest.TestCase):
    def setUp(self):
        self.db = memory_db()()
        self.service = PlayerService(self.db)
        self.ada = self.player("ada")
        self.bob = self.player("bob", materials=RICH)

    def tearDown(self):
        self.db.close()

    def player(self, user_id, arena=True, materials=None):
        state = self.service.load(user_id, T0)
        if arena:
            state.city["campaign"]["cleared"].append(pvp.ARENA_OUTPOST)
        if materials:
            state.materials = dict(materials)
        self.service.save(state, T0)
        return state

    def squad(self):
        return [h["id"] for h in self.ada.heroes]

    def attack(self, now=T0):
        return self.service.attack_rival("ada", self.squad(), "south", "core", "compact", now)

    def code(self, action):
        with self.assertRaises(ActionError) as caught:
            action()
        return caught.exception.code

    def test_the_arena_opens_with_the_first_outpost(self):
        self.player("cid", arena=False)
        self.assertEqual(self.code(lambda: self.service.find_rival("cid", T0)), "arena_locked")

    def test_scout_then_raid_moves_the_loot_and_shields_the_rival(self):
        state = self.service.find_rival("ada", T0)
        self.assertEqual(state.city["pvp"]["scout"], "bob")
        rival = self.service.rival_view(state, T0)
        self.assertEqual(rival["name"], "Raider BOB")
        self.assertTrue(rival["available"])

        state, result = self.attack()
        self.assertTrue(result["summary"]["victory"], "the starter squad beats a starter city")
        loot = result["rewards"]["loot"]
        self.assertTrue(any(loot.values()))
        bob = self.service.load("bob", T0)
        for m, amount in loot.items():
            self.assertEqual(state.materials[m], economy.STARTING_MATERIALS[m] + amount)
            self.assertEqual(bob.materials[m], RICH[m] - amount)
        self.assertEqual(bob.city["pvp"]["shield_until"], T0 + pvp.SHIELD_SECONDS)
        self.assertIsNone(state.city["pvp"]["scout"])
        self.assertEqual(state.city["energy"]["charges"], outposts.ENERGY_MAX - 1)

        log = self.db.query(HexforgeAttack).one()
        self.assertEqual((log.attacker_id, log.defender_id), ("ada", "bob"))
        self.assertEqual(json.loads(log.loot_json), loot)

    def test_a_shielded_player_is_not_offered_again(self):
        self.service.find_rival("ada", T0)
        self.attack()
        self.assertIsNone(self.service.find_rival("ada", T0 + 60).city["pvp"]["scout"])
        later = T0 + pvp.SHIELD_SECONDS
        self.assertEqual(self.service.find_rival("ada", later).city["pvp"]["scout"], "bob")

    def test_attacking_needs_a_scouted_rival_who_is_still_open(self):
        self.assertEqual(self.code(self.attack), "no_rival")
        self.service.find_rival("ada", T0)
        bob = self.service.load("bob", T0)
        bob.city["pvp"]["shield_until"] = T0 + HOUR      # someone else got there first
        self.service.save(bob, T0)
        self.assertEqual(self.code(self.attack), "rival_unavailable")

    def test_attacking_a_player_ends_your_own_shield(self):
        ada = self.service.load("ada", T0)
        ada.city["pvp"]["shield_until"] = T0 + HOUR
        self.service.save(ada, T0)
        self.service.find_rival("ada", T0)
        state, _ = self.attack()
        self.assertEqual(state.city["pvp"]["shield_until"], 0)

    def test_two_players_are_saved_together_or_not_at_all(self):
        ada = self.service.load("ada", T0)
        bob = self.service.load("bob", T0)
        bob.version -= 1                                  # bob changed meanwhile
        ada.materials["mana"] = 9999
        with self.assertRaises(StaleState):
            self.service.save_together([ada, bob], T0)
        self.assertNotEqual(self.service.load("ada", T0).materials["mana"], 9999)

    def test_registered_players_show_their_username(self):
        self.db.add(User(user_id="bob", username="Bobby", created_at="2026-11-10"))
        self.db.commit()
        self.assertEqual(self.service.names(["bob", "zed0042"]), {"bob": "Bobby", "zed0042": "Raider 0042"})


class RivalApiTest(unittest.TestCase):
    def setUp(self):
        sessions = memory_db()

        def db_override():
            db = sessions()
            try:
                yield db
            finally:
                db.close()

        self.user = "ada"
        app = FastAPI()
        app.state.limiter = limiter
        app.include_router(router)
        app.dependency_overrides = {get_db: db_override, get_now: lambda: T0,
                                    get_current_user_id: lambda: self.user}
        self.client = TestClient(app)
        db = sessions()
        service = PlayerService(db)
        for uid in ("ada", "bob"):
            state = service.load(uid, T0)
            state.city["campaign"]["cleared"].append(pvp.ARENA_OUTPOST)
            service.save(state, T0)
        db.close()

    def test_find_then_attack(self):
        body = self.client.get("/api/hexforge/me/outposts").json()
        self.assertIsNone(body["rival"])
        self.assertTrue(body["pvp"]["arena"])

        body = self.client.post("/api/hexforge/me/rivals/find").json()
        self.assertEqual(body["rival"]["name"], "Raider BOB")
        self.assertFalse(any(b["type"] == "rune_trap" or "aim" in b for b in body["rival"]["city"]["buildings"]))

        response = self.client.post("/api/hexforge/me/rivals/attack", json={
            "hero_ids": [h["id"] for h in body["heroes"]], "side": "south", "priority": "core", "tactic": "compact"})
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("frames", body["battle"])
        self.assertEqual(body["battle"]["rival"], "Raider BOB")
        self.assertIsNone(body["rival"])

        self.user = "bob"
        self.assertIsNotNone(self.client.get("/api/hexforge/me").json()["pvp"]["shield_until"])

    def test_attacking_without_a_rival_is_refused(self):
        response = self.client.post("/api/hexforge/me/rivals/attack", json={
            "hero_ids": [1, 2, 3, 4], "side": "south", "priority": "core", "tactic": "compact"})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "no_rival")


if __name__ == "__main__":
    unittest.main()
