"""
Hexforge phase 5, step 2: speed-up bonuses, the 7-day calendar, daily tasks
and the weekly chest.

    cd backend && python -m unittest discover -s app/games/hexforge_be/tests -t .
"""

import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.database import get_db
from app.games.hexforge_be import economy, forge, outposts, progress, rewards
from app.games.hexforge_be.errors import ActionError
from app.games.hexforge_be.router import get_now, limiter, router
from app.games.hexforge_be.tests.test_player import memory_db
from app.user_auth import get_current_user_id

DAY = rewards.DAY
T0 = 1_800_000_000.0 - (1_800_000_000.0 % DAY) + 3600    # 01:00 UTC on some day


def fresh_city(now=T0, seed="ada"):
    city = economy.starter_city(now)
    forge.ensure_forge(city)
    outposts.ensure_campaign(city, now)
    progress.ensure_progress(city)
    rewards.ensure_rewards(city, seed, now)
    return city


class TasksTest(unittest.TestCase):
    def test_three_tasks_a_day_the_same_all_day(self):
        city = fresh_city()
        ids = [t["id"] for t in city["rewards"]["tasks"]]
        self.assertEqual(len(set(ids)), 3)
        rewards.ensure_rewards(city, "ada", T0 + 20 * 3600)
        self.assertEqual([t["id"] for t in city["rewards"]["tasks"]], ids)
        self.assertEqual([t["id"] for t in fresh_city()["rewards"]["tasks"]], ids)

    def test_a_new_day_brings_new_task_progress(self):
        city = fresh_city()
        task = city["rewards"]["tasks"][0]
        task["progress"] = 1
        rewards.ensure_rewards(city, "ada", T0 + DAY)
        self.assertTrue(all(t["progress"] == 0 for t in city["rewards"]["tasks"]))

    def force_task(self, city, task_id):
        city["rewards"]["tasks"][0] = {"id": task_id, "progress": 0, "claimed": False}

    def test_a_task_counts_its_event_and_pays_once_done(self):
        city = fresh_city()
        self.force_task(city, "forge")
        materials = {}
        with self.assertRaises(ActionError) as error:
            rewards.claim_task(city, materials, "forge")
        self.assertEqual(error.exception.code, "not_done")
        rewards.record(city, "forge")
        rewards.record(city, "collect")
        rewards.record(city, "forge")
        rewards.record(city, "forge")
        self.assertEqual(city["rewards"]["tasks"][0]["progress"], 2)
        got = rewards.claim_task(city, materials, "forge")
        self.assertEqual(got["bonuses"], {"hourglass": 1})
        self.assertEqual(city["bonuses"], {"hourglass": 1})
        self.assertEqual(city["progress"]["xp"], 25)
        self.assertEqual(city["rewards"]["week_done"], 1)
        with self.assertRaises(ActionError):
            rewards.claim_task(city, materials, "forge")

    def test_the_badge_counts_what_waits(self):
        city = fresh_city()
        self.assertEqual(rewards.ready_count(city, T0), 1)          # today's calendar reward
        self.force_task(city, "win")
        rewards.record(city, "win")
        self.assertEqual(rewards.ready_count(city, T0), 2)


class LoginTest(unittest.TestCase):
    def test_one_calendar_reward_a_day_in_order(self):
        city = fresh_city()
        materials = {}
        first = rewards.claim_login(city, materials, T0)
        self.assertEqual(first["materials"], {"rune_stone": 80, "scrap": 80})
        with self.assertRaises(ActionError):
            rewards.claim_login(city, materials, T0 + 3600)
        second = rewards.claim_login(city, materials, T0 + DAY)
        self.assertEqual(second["bonuses"], {"hourglass": 1})

    def test_a_missed_day_loses_nothing(self):
        city = fresh_city()
        rewards.claim_login(city, {}, T0)
        rewards.ensure_rewards(city, "ada", T0 + 5 * DAY)
        view = rewards.public_rewards(city, T0 + 5 * DAY)["login"]
        self.assertEqual(view["day"], 2)
        self.assertTrue(view["claimable"])

    def test_after_the_seventh_day_it_starts_again(self):
        city = fresh_city()
        for d in range(7):
            rewards.claim_login(city, {}, T0 + d * DAY)
        self.assertEqual(rewards.public_rewards(city, T0 + 7 * DAY)["login"]["day"], 1)
        self.assertEqual(city["bonuses"]["golden_hourglass"], 3)


class ChestTest(unittest.TestCase):
    def test_the_chest_opens_after_twelve_tasks_in_the_week(self):
        city = fresh_city()
        city["rewards"]["week_done"] = rewards.CHEST_GOAL - 1
        with self.assertRaises(ActionError):
            rewards.claim_chest(city, {})
        city["rewards"]["week_done"] += 1
        got = rewards.claim_chest(city, {})
        self.assertEqual(got["bonuses"]["salve"], 2)
        with self.assertRaises(ActionError):
            rewards.claim_chest(city, {})

    def test_a_new_week_starts_from_zero(self):
        city = fresh_city()
        city["rewards"]["week_done"] = 5
        city["rewards"]["chest_claimed"] = True
        rewards.ensure_rewards(city, "ada", T0 + 7 * DAY)
        self.assertEqual(city["rewards"]["week_done"], 0)
        self.assertFalse(city["rewards"]["chest_claimed"])

    def test_weeks_start_on_monday(self):
        monday = 4 * DAY                     # 5 Jan 1970
        self.assertEqual(rewards.week_of(monday), rewards.week_of(monday + 6 * DAY))
        self.assertEqual(rewards.week_of(monday) + 1, rewards.week_of(monday + 7 * DAY))
        self.assertEqual(rewards.week_of(monday - 1), rewards.week_of(monday) - 1)


class BonusTest(unittest.TestCase):
    def setUp(self):
        self.city = fresh_city()
        self.city["bonuses"] = {"hourglass": 2, "golden_hourglass": 1, "salve": 1, "flask": 1}
        self.heroes = economy.starter_heroes()

    def test_an_hourglass_takes_a_quarter_hour_off_a_forge_job(self):
        materials = dict(economy.STARTING_MATERIALS)
        job = forge.start(self.city, self.heroes, materials, "rune_tower", T0)
        rewards.use_bonus(self.city, self.heroes, "hourglass", T0, job_id=job["id"])
        self.assertEqual(job["ready_at"], T0)                         # a 10 min job: done at once
        self.assertEqual(self.city["bonuses"]["hourglass"], 1)
        with self.assertRaises(ActionError) as error:
            rewards.use_bonus(self.city, self.heroes, "hourglass", T0, job_id=job["id"])
        self.assertEqual(error.exception.code, "nothing_to_speed_up")
        self.assertEqual(self.city["bonuses"]["hourglass"], 1)       # a refusal costs nothing

    def test_salve_heals_and_an_hourglass_shortens_an_injury(self):
        self.heroes[0]["injured_until"] = T0 + 900
        self.heroes[1]["injured_until"] = T0 + 900
        rewards.use_bonus(self.city, self.heroes, "salve", T0, hero_id=self.heroes[0]["id"])
        self.assertNotIn("injured_until", self.heroes[0])
        rewards.use_bonus(self.city, self.heroes, "hourglass", T0 + 100, hero_id=self.heroes[1]["id"])
        self.assertNotIn("injured_until", self.heroes[1])
        self.assertNotIn("salve", self.city["bonuses"])

    def test_a_flask_adds_a_charge_but_never_past_the_maximum(self):
        with self.assertRaises(ActionError) as error:
            rewards.use_bonus(self.city, self.heroes, "flask", T0, energy=True)
        self.assertEqual(error.exception.code, "energy_full")
        self.city["energy"] = {"charges": 2, "updated_at": T0 - 600}
        rewards.use_bonus(self.city, self.heroes, "flask", T0, energy=True)
        self.assertEqual(self.city["energy"]["charges"], 3)

    def test_a_golden_hourglass_brings_the_next_charge_now(self):
        self.city["energy"] = {"charges": 2, "updated_at": T0 - 600}
        rewards.use_bonus(self.city, self.heroes, "golden_hourglass", T0, energy=True)
        self.assertEqual(self.city["energy"]["charges"], 3)
        self.assertEqual(outposts.public_energy(self.city["energy"], T0)["next_at"], T0 - 600 + 3600)

    def test_wrong_bonus_or_target_or_none_left(self):
        self.heroes[0]["injured_until"] = T0 + 900
        cases = [
            ("flask", {"hero_id": self.heroes[0]["id"]}, "wrong_bonus"),
            ("salve", {"energy": True}, "wrong_bonus"),
            ("hourglass", {}, "bad_target"),
            ("hourglass", {"hero_id": 1, "energy": True}, "bad_target"),
            ("salve", {"hero_id": 999}, "unknown_hero"),
        ]
        for bonus, target, code in cases:
            with self.assertRaises(ActionError) as error:
                rewards.use_bonus(self.city, self.heroes, bonus, T0, **target)
            self.assertEqual(error.exception.code, code, (bonus, target))
        self.city["bonuses"] = {}
        with self.assertRaises(ActionError) as error:
            rewards.use_bonus(self.city, self.heroes, "salve", T0, hero_id=self.heroes[0]["id"])
        self.assertEqual(error.exception.code, "no_bonus")


class RewardsApiTest(unittest.TestCase):
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

    def post(self, path, body=None):
        return self.client.post(f"/api/hexforge{path}", json=body or {})

    def test_calendar_tasks_and_bonuses_through_the_api(self):
        state = self.client.get("/api/hexforge/me").json()
        self.assertEqual(state["rewards"]["ready"], 1)
        self.assertEqual(len(state["rewards"]["tasks"]), 3)
        self.assertEqual(state["bonuses"], {})

        for _ in range(2):
            claimed = self.post("/me/rewards/login").json()
            self.clock[0] += DAY
        self.assertEqual(claimed["got"]["bonuses"], {"hourglass": 1})
        self.assertEqual(claimed["bonuses"], {"hourglass": 1})

        state = self.post("/me/forge", {"recipe": "rune_tower"}).json()
        job = state["forge"]["jobs"][0]
        used = self.post("/me/bonuses/use", {"bonus": "hourglass", "job_id": job["id"]}).json()
        self.assertTrue(used["forge"]["jobs"][0]["ready"])
        self.assertEqual(used["bonuses"], {})
        refused = self.post("/me/bonuses/use", {"bonus": "hourglass", "job_id": job["id"]})
        self.assertEqual(refused.status_code, 400)
        self.assertEqual(refused.json()["detail"], "no_bonus")

    def test_forging_counts_for_the_forge_task(self):
        state = self.client.get("/api/hexforge/me").json()
        before = {t["id"]: t["progress"] for t in state["rewards"]["tasks"]}
        state = self.post("/me/forge", {"recipe": "wall"}).json()
        after = {t["id"]: t["progress"] for t in state["rewards"]["tasks"]}
        if "forge" in before:
            self.assertEqual(after["forge"], before["forge"] + 1)
        self.assertEqual({k: v for k, v in after.items() if k != "forge"},
                         {k: v for k, v in before.items() if k != "forge"})


if __name__ == "__main__":
    unittest.main()
