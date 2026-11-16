"""The challenge's standings in the game: every ranked player's best run of the week, Steem names, my own place."""

import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.database import get_db
from app.games.apex_drive_be import service, standings
from app.games.apex_drive_be.router import get_now, limiter, router
from app.games.apex_drive_be.tests.test_apex_drive import T0, WEEK, memory_db
from app.models import User
from app.user_auth import create_session_token


def players_db():
    """The game's tables and the platform's users, in memory."""
    sessions = memory_db()
    User.__table__.create(sessions.kw["bind"])
    return sessions


def add_user(db, user_id, steem=None, anonymous=0, banned=0):
    db.add(User(user_id=user_id, username=steem or f"guest_{user_id}", steem_username=steem,
                is_anonymous=anonymous, banned=banned, created_at="2026-11-01T00:00:00"))
    db.commit()


def drive(db, user_id, time, at=T0):
    race, _ = service.start_challenge(db, user_id, at)
    return service.finish_challenge(db, user_id, race.id, time, None, at + 400)


class StandingsTest(unittest.TestCase):
    def setUp(self):
        self.sessions = players_db()
        with self.sessions() as db:
            add_user(db, "u1", "luciojolly")
            add_user(db, "u2", "speedy.one")
            add_user(db, "u3", "slow-mo")
            add_user(db, "g1", anonymous=1)
            add_user(db, "b1", "cheater", banned=1)

    def test_a_steem_player_is_named_and_ranked_a_guest_is_not(self):
        with self.sessions() as db:
            self.assertEqual(standings.profile(db, "u1"), {"name": "luciojolly", "steem": "luciojolly", "ranked": True})
            self.assertEqual(standings.profile(db, "g1"), {"name": "GUEST", "steem": None, "ranked": False})
            self.assertEqual(standings.profile(db, "b1")["ranked"], False)
            self.assertEqual(standings.profile(db, "nobody")["name"], "GUEST")

    def test_each_player_once_with_their_best_run_fastest_first_guests_and_banned_left_out(self):
        with self.sessions() as db:
            drive(db, "u1", 190.0)
            drive(db, "u1", 170.0)
            drive(db, "u2", 180.0)
            drive(db, "u3", 210.0)
            drive(db, "g1", 150.0)
            drive(db, "b1", 140.0)
            board = standings.leaderboard(db, "u2", T0 + 1000)
        self.assertEqual([(e["rank"], e["name"]) for e in board["entries"]],
                         [(1, "luciojolly"), (2, "speedy.one"), (3, "slow-mo")])
        self.assertEqual(board["entries"][0]["time"], 170.0)
        self.assertEqual(board["entries"][0]["steem"], "luciojolly")
        self.assertEqual([e["me"] for e in board["entries"]], [False, True, False])
        self.assertEqual(board["me"]["rank"], 2)
        self.assertEqual(board["players"], 3)

    def test_my_place_shows_beyond_the_first_ones_and_is_none_before_my_first_run(self):
        with self.sessions() as db:
            for time in (170.0, 180.0, 190.0):
                drive(db, {170.0: "u1", 180.0: "u2", 190.0: "u3"}[time], time)
            beyond = standings.leaderboard(db, "u3", T0 + 1000, limit=2)
            self.assertEqual(len(beyond["entries"]), 2)
            self.assertEqual((beyond["me"]["rank"], beyond["me"]["name"]), (3, "slow-mo"))
            self.assertIsNone(standings.leaderboard(db, "g1", T0 + 1000)["me"])

    def test_a_new_week_starts_empty(self):
        with self.sessions() as db:
            drive(db, "u1", 170.0)
            self.assertEqual(standings.leaderboard(db, "u1", T0 + WEEK)["entries"], [])


class StandingsApiTest(unittest.TestCase):
    def setUp(self):
        app = FastAPI()
        app.include_router(router)
        app.state.limiter = limiter
        limiter.enabled = False
        self.sessions = players_db()
        with self.sessions() as db:
            add_user(db, "u1", "luciojolly")
            drive(db, "u1", 175.0)

        def db():
            session = self.sessions()
            try:
                yield session
            finally:
                session.close()

        app.dependency_overrides[get_db] = db
        app.dependency_overrides[get_now] = lambda: T0 + 1000
        self.client = TestClient(app)
        self.client.cookies.set("session_token", create_session_token("u1"))

    def tearDown(self):
        limiter.enabled = True

    def test_profile_and_leaderboard_answer_the_signed_in_player(self):
        self.assertEqual(self.client.get("/api/apex_drive/me/profile").json()["steem"], "luciojolly")
        board = self.client.get("/api/apex_drive/challenge/leaderboard").json()
        self.assertEqual(board["entries"][0]["name"], "luciojolly")
        self.assertTrue(board["me"]["me"])
        self.client.cookies.clear()
        self.assertEqual(self.client.get("/api/apex_drive/challenge/leaderboard").status_code, 401)


if __name__ == "__main__":
    unittest.main()
