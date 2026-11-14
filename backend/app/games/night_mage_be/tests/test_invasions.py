"""
Night Mage invasions: sending, handing out, reporting, the inbox and the API.

    cd backend && python -m unittest discover -s app/games/night_mage_be/tests -t .
"""

import random
import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import get_db
from app.games.night_mage_be import service
from app.games.night_mage_be.models import NightMageInvader
from app.games.night_mage_be.router import get_now, get_rng, limiter, router
from app.models import User
from app.user_auth import create_session_token

T0 = 1_800_000_000.0
DAY = 24 * 3600


def memory_db():
    engine = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
    for table in (NightMageInvader.__table__, User.__table__):
        table.create(engine)
    return sessionmaker(bind=engine)


def add_user(db, user_id, username=None):
    db.add(User(user_id=user_id, username=username, created_at="2026-01-01T00:00:00"))
    db.commit()


class LevelTest(unittest.TestCase):
    def test_short_runs_cannot_send(self):
        self.assertEqual(service.level_for_wave(0), 0)
        self.assertEqual(service.level_for_wave(2), 0)

    def test_level_grows_every_four_waves_up_to_five(self):
        self.assertEqual(service.level_for_wave(3), 1)
        self.assertEqual(service.level_for_wave(6), 1)
        self.assertEqual(service.level_for_wave(7), 2)
        self.assertEqual(service.level_for_wave(19), 5)
        self.assertEqual(service.level_for_wave(500), 5)


class SendTest(unittest.TestCase):
    def setUp(self):
        self.db = memory_db()()

    def tearDown(self):
        self.db.close()

    def test_send_creates_an_invader_for_two_days(self):
        invader = service.send(self.db, "u1", "warrior", 9, T0)
        self.assertEqual(invader.level, 2)
        self.assertEqual(invader.expires_at, T0 + service.LIFETIME)

    def test_rules_are_enforced(self):
        with self.assertRaises(service.InvasionError) as low:
            service.send(self.db, "u1", "warrior", 2, T0)
        self.assertEqual(low.exception.code, "wave_too_low")
        with self.assertRaises(service.InvasionError) as kind:
            service.send(self.db, "u1", "dragon", 9, T0)
        self.assertEqual(kind.exception.code, "unknown_kind")

    def test_the_oldest_retires_beyond_the_limit(self):
        first = service.send(self.db, "u1", "bat", 5, T0)
        for i in range(service.MAX_ACTIVE):
            service.send(self.db, "u1", "archer", 5, T0 + 10 + i)
        active = self.db.query(NightMageInvader).filter(NightMageInvader.expires_at > T0 + 100).all()
        self.assertEqual(len(active), service.MAX_ACTIVE)
        self.assertNotIn(first.id, [inv.id for inv in active])


class HandOutTest(unittest.TestCase):
    def setUp(self):
        self.db = memory_db()()
        add_user(self.db, "owner-a", "Luca")
        add_user(self.db, "owner-b")

    def tearDown(self):
        self.db.close()

    def test_never_your_own_and_one_per_owner(self):
        service.send(self.db, "owner-a", "warrior", 5, T0)
        service.send(self.db, "owner-a", "bat", 5, T0 + 1)
        service.send(self.db, "owner-b", "archer", 5, T0 + 2)
        service.send(self.db, "viewer", "brawler", 5, T0 + 3)
        got = service.hand_out(self.db, "viewer", 6, T0 + 10, random.Random(1))
        owners = [g["name"] for g in got]
        self.assertEqual(len(got), 2)
        self.assertEqual(len(set(owners)), 2)
        self.assertIn("Luca", owners)
        self.assertIn("Mage " + "owner-b"[-4:].upper(), owners)

    def test_expired_invaders_stay_home(self):
        service.send(self.db, "owner-a", "warrior", 5, T0)
        self.assertEqual(service.hand_out(self.db, None, 6, T0 + 3 * DAY, random.Random(1)), [])

    def test_the_least_seen_come_first_and_are_counted(self):
        seen = service.send(self.db, "owner-a", "warrior", 5, T0)
        fresh = service.send(self.db, "owner-b", "bat", 5, T0)
        seen.appearances = 10
        self.db.commit()
        got = service.hand_out(self.db, None, 1, T0 + 5, random.Random(3))
        self.assertEqual(got[0]["id"], fresh.id)
        self.db.refresh(fresh)
        self.assertEqual(fresh.appearances, 1)


class ReportAndInboxTest(unittest.TestCase):
    def setUp(self):
        self.db = memory_db()()

    def tearDown(self):
        self.db.close()

    def test_outcomes_add_up_clamped(self):
        invader = service.send(self.db, "u1", "brawler", 12, T0)
        counted = service.record(self.db, [
            service.Outcome(invader.id, 3, False, True),
            service.Outcome("nobody", 2, True, False),
        ])
        service.record(self.db, [service.Outcome(invader.id, 99, True, False)])
        self.assertEqual(counted, 1)
        self.db.refresh(invader)
        self.assertEqual((invader.hits, invader.kills, invader.slain), (3 + service.MAX_DAMAGE_PER_RUN, 1, 1))

    def test_inbox_totals_the_last_week(self):
        old = service.send(self.db, "u1", "bat", 5, T0 - 10 * DAY)
        recent = service.send(self.db, "u1", "warrior", 5, T0)
        service.record(self.db, [service.Outcome(old.id, 4, True, True), service.Outcome(recent.id, 2, True, False)])
        box = service.inbox(self.db, "u1", T0 + 60)
        self.assertEqual(box["totals"], {"hits": 2, "kills": 0, "slain": 1, "seen": 0, "active": 1})
        self.assertEqual(box["active"][0]["id"], recent.id)


class ApiTest(unittest.TestCase):
    def setUp(self):
        self.Session = memory_db()
        app = FastAPI()
        app.state.limiter = limiter
        limiter.enabled = False
        app.include_router(router)

        def db():
            session = self.Session()
            try:
                yield session
            finally:
                session.close()

        app.dependency_overrides[get_db] = db
        app.dependency_overrides[get_now] = lambda: T0
        app.dependency_overrides[get_rng] = lambda: random.Random(7)
        self.client = TestClient(app)

    def tearDown(self):
        limiter.enabled = True

    def signed_in(self, user_id):
        self.client.cookies.set("session_token", create_session_token(user_id))

    def test_send_needs_a_session(self):
        response = self.client.post("/api/night_mage/invaders", json={"kind": "bat", "wave": 5})
        self.assertEqual(response.status_code, 401)

    def test_a_full_round_trip(self):
        self.signed_in("sender")
        sent = self.client.post("/api/night_mage/invaders", json={"kind": "archer", "wave": 8})
        self.assertEqual(sent.status_code, 200)
        invader_id = sent.json()["invader"]["id"]
        self.assertEqual(sent.json()["invader"]["level"], 2)

        self.assertEqual(self.client.get("/api/night_mage/invaders").json(), {"invaders": []}, "never your own")

        self.client.cookies.clear()
        handed = self.client.get("/api/night_mage/invaders?count=3").json()["invaders"]
        self.assertEqual([h["id"] for h in handed], [invader_id])
        report = self.client.post("/api/night_mage/invaders/report",
                                  json={"outcomes": [{"id": invader_id, "damage": 2, "slain": True, "killedMage": False}]})
        self.assertEqual(report.json(), {"counted": 1})

        self.signed_in("sender")
        box = self.client.get("/api/night_mage/me/invaders").json()
        self.assertEqual(box["totals"]["hits"], 2)
        self.assertEqual(box["totals"]["slain"], 1)
        self.assertEqual(box["totals"]["seen"], 1)

    def test_bad_requests_are_refused(self):
        self.signed_in("sender")
        self.assertEqual(self.client.post("/api/night_mage/invaders", json={"kind": "dragon", "wave": 5}).status_code, 422)
        low = self.client.post("/api/night_mage/invaders", json={"kind": "bat", "wave": 1})
        self.assertEqual((low.status_code, low.json()["detail"]), (400, "wave_too_low"))


if __name__ == "__main__":
    unittest.main()
