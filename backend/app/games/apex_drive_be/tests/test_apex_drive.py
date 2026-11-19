"""
Apex Drive backend: the rules (economy, career, plausibility, weekly
challenge), the API, and the leaderboard's check of a challenge score.

    cd backend && python -m unittest discover -s app/games/apex_drive_be/tests -t .

Reference times come from the game's own simulation (autopilot, nitro on
every straight): stock car on DUSK VALLEY 58.1 s best lap, 179.8 s race; the
car with every top part 36.8 s and 112.8 s.
"""

import contextlib
import unittest
from datetime import datetime, timezone
from unittest import mock

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import game_score_validators
from app.database import get_db
from app.games.apex_drive_be import challenge as weekly
from app.games.apex_drive_be import economy as eco
from app.games.apex_drive_be import rules, service
from app.games.apex_drive_be.career import Career, CareerError
from app.games.apex_drive_be.models import ApexDriveCareer, ApexDriveRace
from app.games.apex_drive_be.router import get_now, limiter, router
from app.user_auth import create_session_token

# Wednesday 18 November 2026, noon UTC
T0 = datetime(2026, 11, 18, 12, tzinfo=timezone.utc).timestamp()
WEEK = 7 * 24 * 3600
TOP_PARTS = {category: len(tiers) - 1 for category, tiers in eco.economy()["parts"].items()}


def memory_db():
    engine = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
    for table in (ApexDriveCareer.__table__, ApexDriveRace.__table__):
        table.create(engine)
    return sessionmaker(bind=engine)


def podiums(career, *track_ids):
    for track_id in track_ids:
        career.results[track_id] = {"best": 1, "bestLap": None}


class EconomyTest(unittest.TestCase):
    def test_stats_apply_parts_then_mods_as_the_game_does(self):
        base = eco.economy()["base"]
        self.assertEqual(eco.stats_of({}, [])["power"], base["power"])
        top = eco.stats_of({"engine": 3}, ["ghostEcu"])
        self.assertAlmostEqual(top["power"], base["power"] * 1.5 * 1.08)
        self.assertEqual(eco.stats_of({"chassis": 3}, [])["slots"], base["slots"] + 3)

    def test_nitro_charges_are_whole_and_capped(self):
        data = eco.economy()
        tank = {"effect": {"add": {"nitroCharges": 2.4}}}
        with mock.patch.object(eco, "economy", return_value={**data, "mods": {**data["mods"], "tank": tank}}):
            stats = eco.stats_of({"nitro": 3}, ["tank"])
        self.assertEqual(stats["nitroCharges"], data["physics"]["maxNitro"])

    def test_power_nitro_raises_the_speed_bound(self):
        plain = eco.stats_of({"nitro": 3}, [])
        power = eco.stats_of({"nitro": 3}, ["extraTank"])
        self.assertAlmostEqual(power["nitroPower"], plain["nitroPower"] * 1.2)
        self.assertEqual(power["nitroCharges"], plain["nitroCharges"])
        self.assertGreater(eco.speed_bound(power), eco.speed_bound(plain))

    def test_a_better_car_has_a_higher_speed_bound(self):
        self.assertGreater(eco.speed_bound(eco.stats_of(TOP_PARTS, [])), eco.speed_bound(eco.stats_of({}, [])))


class CareerTest(unittest.TestCase):
    def test_a_new_career_starts_with_the_starting_credits_and_stock_parts(self):
        career = Career.new()
        self.assertEqual(career.credits, eco.economy()["startCredits"])
        self.assertTrue(all(tier == 0 for tier in career.parts.values()))

    def test_parts_are_bought_tier_by_tier_while_the_credits_last(self):
        career = Career.new()
        self.assertEqual(career.buy_part("tires"), "ok")
        self.assertEqual(career.parts["tires"], 1)
        self.assertEqual(career.credits, 1500 - 800)
        self.assertEqual(career.buy_part("tires"), "credits")
        career.credits = 10**6
        career.buy_part("tires")
        career.buy_part("tires")
        self.assertEqual(career.buy_part("tires"), "max")
        with self.assertRaises(CareerError):
            career.buy_part("rocket")

    def test_mods_are_bought_once_and_fit_within_the_slots_and_energy(self):
        career = Career.new()
        career.credits = 10**6
        for mod in ("magnet", "scrapHunter", "lapShield", "rallyKit"):
            self.assertEqual(career.buy_mod(mod), "ok")
        self.assertEqual(career.buy_mod("magnet"), "owned")
        self.assertEqual(career.set_fitted(["magnet", "scrapHunter"]), "ok")
        self.assertEqual(career.set_fitted(["magnet", "scrapHunter", "rallyKit"]), "slots")
        self.assertEqual(career.set_fitted(["lapShield", "magnet"]), "energy")
        self.assertEqual(career.set_fitted(["injector"]), "missing")
        self.assertEqual(career.set_fitted(["magnet", "magnet"]), "missing")
        self.assertEqual(career.fitted, ["magnet", "scrapHunter"])

    def test_a_tampered_save_is_cleaned_up(self):
        career = Career.from_dict({"credits": -5, "parts": {"engine": 99, "tires": "x"}, "owned": ["magnet", "nope"],
                                   "fitted": ["magnet", "injector"]})
        self.assertEqual(career.credits, 1500)
        self.assertEqual(career.parts["engine"], 3)
        self.assertEqual(career.parts["tires"], 0)
        self.assertEqual(career.owned, ["magnet"])
        self.assertEqual(career.fitted, ["magnet"])

    def test_tracks_open_with_a_podium_on_the_one_before_and_worlds_with_all_of_them(self):
        career = Career.new()
        first, second, third = eco.worlds()[0]["tracks"]
        city = eco.worlds()[1]["tracks"][0]
        self.assertTrue(career.is_track_open(first))
        self.assertFalse(career.is_track_open(second))
        podiums(career, first)
        self.assertTrue(career.is_track_open(second))
        self.assertFalse(career.is_track_open(city))
        podiums(career, second, third)
        self.assertTrue(career.is_track_open(city))
        self.assertFalse(career.is_track_open("nowhere"))

    def test_a_race_pays_the_prize_of_its_place_times_the_world_and_the_cash(self):
        career = Career.new()
        payout = career.finish_race("duskValley", 2, 58.1, 300)
        self.assertEqual(payout["total"], 1000 + 300)
        self.assertEqual(career.credits, 1500 + 1300)
        self.assertEqual(career.results["duskValley"], {"best": 2, "bestLap": 58.1})
        self.assertEqual(career.races, 1)
        worse = career.finish_race("duskValley", 4, 60.0, 0)
        self.assertFalse(worse["newBest"] or worse["newLap"])
        self.assertEqual(career.results["duskValley"], {"best": 2, "bestLap": 58.1})
        podiums(career, "duskValley", "pierCircuit", "cliffRoad")
        self.assertEqual(career.finish_race("neonAvenue", 1, None, 0)["prize"], round(1500 * 1.4))


class RulesTest(unittest.TestCase):
    track = eco.track("duskValley")
    stock = eco.stats_of({}, [])

    def result(self, **changes):
        return {"position": 3, "bestLap": 58.1, "cash": 780, **changes}

    def test_real_races_pass(self):
        rules.check_career_race(self.track, self.stock, self.result(), 185)
        top = eco.stats_of(TOP_PARTS, ["ghostEcu", "slipstream", "injector"])
        rules.check_career_race(self.track, top, self.result(bestLap=36.8, position=1), 115)
        rules.check_challenge_run(self.track, top, 112.8, 36.8, 120)
        # not finished: the rivals end it, the lap may be missing
        rules.check_career_race(self.track, self.stock, self.result(position=6, bestLap=None), 175)

    def test_impossible_races_are_refused(self):
        cases = [
            (self.result(bestLap=10), 185, "impossible_lap"),
            (self.result(cash=10**5), 185, "impossible_cash"),
            (self.result(position=7), 185, "bad_position"),
            (self.result(), 30, "too_soon"),
        ]
        for result, elapsed, code in cases:
            with self.assertRaises(CareerError) as caught:
                rules.check_career_race(self.track, self.stock, result, elapsed)
            self.assertEqual(caught.exception.code, code)

    def test_impossible_runs_are_refused(self):
        for time, lap, elapsed, code in [(40, None, 60, "impossible_time"), (179.8, 200, 190, "impossible_lap"),
                                         (179.8, 58.1, 100, "too_soon"), (float("nan"), None, 200, "impossible_time")]:
            with self.assertRaises(CareerError) as caught:
                rules.check_challenge_run(self.track, self.stock, time, lap, elapsed)
            self.assertEqual(caught.exception.code, code)


class ChallengeTest(unittest.TestCase):
    def test_one_track_a_week_from_monday_taking_every_track_in_turn(self):
        order = weekly.track_order()
        monday = datetime(2026, 11, 16, tzinfo=timezone.utc).timestamp()
        self.assertEqual(weekly.challenge_of(monday)["trackId"], weekly.challenge_of(monday + WEEK - 1)["trackId"])
        seen = [weekly.challenge_of(monday + i * WEEK)["trackId"] for i in range(len(order))]
        self.assertEqual(sorted(seen), sorted(order))
        self.assertEqual(weekly.challenge_of(monday)["weekId"], "2026-W47")

    def test_each_week_the_track_after_last_weeks_and_new_tracks_join_the_end_of_the_queue(self):
        order = ["a", "b", "c"]
        self.assertEqual(weekly.track_of_week(45, order, (45, "b")), "b", "a week raced keeps its track")
        self.assertEqual(weekly.track_of_week(46, order, (45, "b")), "c")
        self.assertEqual(weekly.track_of_week(48, order, (45, "b")), "b", "weeks nobody raced still count")
        self.assertEqual(weekly.track_of_week(46, order + ["new1", "new2"], (45, "c")), "new1", "new tracks after the last")
        self.assertEqual(weekly.track_of_week(7, order), "b", "nothing raced yet: the weeks since EPOCH")
        self.assertEqual(weekly.track_of_week(46, order, (45, "gone")), "b", "a track no longer in the game: the same")

    def test_a_week_under_way_keeps_its_track_when_tracks_are_added(self):
        monday = datetime(2026, 11, 16, tzinfo=timezone.utc).timestamp()
        with memory_db()() as db:
            _, info = service.start_challenge(db, "u1", monday + 3600)
            longer = weekly.track_order() + ["futureTrack"]
            with mock.patch.object(weekly, "track_order", return_value=longer):
                self.assertEqual(service.this_week(db, monday + 2 * 86400)["trackId"], info["trackId"])
                after = longer[(longer.index(info["trackId"]) + 1) % len(longer)]
                self.assertEqual(service.this_week(db, monday + WEEK)["trackId"], after)

    def test_everybody_gets_the_same_seed_in_a_week_and_another_the_next(self):
        self.assertEqual(weekly.challenge_of(T0)["seed"], weekly.challenge_of(T0 + 3600)["seed"])
        self.assertNotEqual(weekly.challenge_of(T0)["seed"], weekly.challenge_of(T0 + WEEK)["seed"])

    def test_the_faster_the_more_points(self):
        track = eco.track("duskValley")
        self.assertGreater(weekly.score_of(track, 112.8), weekly.score_of(track, 179.8))
        self.assertEqual(weekly.score_of(track, weekly.par_of(track)), weekly.POINTS)


class ApiTest(unittest.TestCase):
    def setUp(self):
        app = FastAPI()
        app.include_router(router)
        app.state.limiter = limiter
        limiter.enabled = False
        self.sessions = memory_db()
        self.now = T0

        def db():
            session = self.sessions()
            try:
                yield session
            finally:
                session.close()

        app.dependency_overrides[get_db] = db
        app.dependency_overrides[get_now] = lambda: self.now
        self.client = TestClient(app)
        self.login("u1")

    def tearDown(self):
        limiter.enabled = True

    def login(self, user_id):
        self.client.cookies.set("session_token", create_session_token(user_id))

    def test_a_player_without_a_session_gets_nothing(self):
        self.client.cookies.clear()
        self.assertEqual(self.client.get("/api/apex_drive/me").status_code, 401)

    def test_the_career_starts_fresh_and_purchases_are_kept(self):
        self.assertEqual(self.client.get("/api/apex_drive/me").json()["career"]["credits"], 1500)
        bought = self.client.post("/api/apex_drive/me/parts/tires").json()
        self.assertEqual(bought["answer"], "ok")
        self.assertEqual(self.client.get("/api/apex_drive/me").json()["career"]["parts"]["tires"], 1)
        self.assertEqual(self.client.post("/api/apex_drive/me/parts/engine").json()["answer"], "credits")
        self.assertEqual(self.client.post("/api/apex_drive/me/parts/rocket").status_code, 400)
        self.assertEqual(self.client.post("/api/apex_drive/me/mods/magnet").json()["answer"], "ok")
        fitted = self.client.put("/api/apex_drive/me/fitted", json={"mods": ["magnet"]}).json()
        self.assertEqual(fitted["career"]["fitted"], ["magnet"])
        # another player has a career of their own
        self.login("u2")
        self.assertEqual(self.client.get("/api/apex_drive/me").json()["career"]["credits"], 1500)

    def test_a_race_is_paid_once_and_only_when_it_could_have_happened(self):
        self.assertEqual(self.client.post("/api/apex_drive/me/races", json={"trackId": "pierCircuit"}).status_code, 400)
        start = self.client.post("/api/apex_drive/me/races", json={"trackId": "duskValley"}).json()
        self.assertEqual(start["seed"], 1)
        url = f"/api/apex_drive/me/races/{start['raceId']}/finish"
        result = {"position": 1, "bestLap": 58.1, "cash": 300}
        self.now = T0 + 20
        self.assertEqual(self.client.post(url, json=result).json()["detail"], "too_soon")
        self.now = T0 + 185
        paid = self.client.post(url, json=result).json()
        self.assertEqual(paid["payout"]["total"], 1800)
        self.assertEqual(paid["career"]["credits"], 1500 + 1800)
        self.assertEqual(self.client.post("/api/apex_drive/me/races", json={"trackId": "pierCircuit"}).status_code, 200)
        self.assertEqual(self.client.post(url, json=result).json()["detail"], "finished")
        self.login("u2")
        self.assertEqual(self.client.post(url, json=result).json()["detail"], "unknown_race")

    def test_a_challenge_run_is_scored_and_the_week_keeps_the_best(self):
        info = self.client.get("/api/apex_drive/challenge").json()
        self.assertEqual(info["best"], None)
        times = [190.0, 175.0, 200.0]
        for time in times:
            run = self.client.post("/api/apex_drive/challenge/races").json()
            self.assertEqual((run["trackId"], run["seed"]), (info["trackId"], info["seed"]))
            self.now += 400
            done = self.client.post(f"/api/apex_drive/challenge/races/{run['raceId']}/finish", json={"time": time}).json()
            self.assertEqual(done["score"], weekly.score_of(eco.track(info["trackId"]), time))
        best = self.client.get("/api/apex_drive/challenge").json()["best"]
        self.assertEqual(best["time"], min(times))

    def test_a_run_started_last_week_does_not_count(self):
        run = self.client.post("/api/apex_drive/challenge/races").json()
        self.now += WEEK
        answer = self.client.post(f"/api/apex_drive/challenge/races/{run['raceId']}/finish", json={"time": 190.0})
        self.assertEqual(answer.json()["detail"], "week_over")


class LeaderboardTest(unittest.TestCase):
    def setUp(self):
        self.sessions = memory_db()
        with self.sessions() as db:
            race, _ = service.start_challenge(db, "u1", T0)
            self.race_id = race.id
            self.score = service.finish_challenge(db, "u1", race.id, 190.0, None, T0 + 400)["score"]

    def validate(self, score, extra, user_id="u1"):
        @contextlib.contextmanager
        def session():
            db = self.sessions()
            try:
                yield db
            finally:
                db.close()

        with mock.patch("app.database.get_db_session", session), \
                mock.patch.object(game_score_validators.time, "time", lambda: T0 + 500):
            return game_score_validators.validate_game_score("apex_drive", score, 200, extra, user_id=user_id)

    def test_a_checked_run_counts_once_with_its_own_score(self):
        extra = {"mode": "challenge", "race_id": self.race_id}
        self.assertEqual(self.validate(self.score + 1, extra)[0], 0)
        self.assertEqual(self.validate(self.score, extra, user_id="u2")[0], 0)
        self.assertEqual(self.validate(self.score, extra), (self.score, None))
        self.assertEqual(self.validate(self.score, extra)[0], 0, "a second time")

    def test_a_score_without_a_run_or_from_a_career_race_is_void(self):
        self.assertEqual(self.validate(9000, {"mode": "challenge"})[0], 0)
        self.assertEqual(self.validate(9000, {"mode": "career"})[0], 0)
        self.assertEqual(self.validate(0, {"mode": "career"}), (0, None))


if __name__ == "__main__":
    unittest.main()
