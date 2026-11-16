"""An Apex Drive ping tells the place, the challenge time or a DNF, never "0 points"; only checked data gets in."""

import json
import unittest
from types import SimpleNamespace

from app.games.apex_drive_be.ping import ping_result, race_time
from app.routers.pings import build_ping_text

APEX = SimpleNamespace(game_id="apex_drive", title="Apex Drive")


def session(score=0, **data):
    return SimpleNamespace(score=score, xp_earned=12, duration_seconds=130, extra_data=json.dumps(data))


class ApexDrivePingTest(unittest.TestCase):
    def test_a_win_a_podium_and_a_place_off_it(self):
        win = ping_result({"mode": "career", "track": "neonAvenue", "position": 1, "best_lap": 58.123}, 0)
        self.assertEqual(win["headline"], "I won on NEON AVENUE in Apex Drive! 🏆 (best lap 0:58.12)")
        self.assertEqual((win["label"], win["value"]), ("PLACE", "1ST"))
        third = ping_result({"mode": "career", "track": "whiteout", "position": 3}, 0)
        self.assertEqual(third["headline"], "I finished 3rd on WHITEOUT in Apex Drive! 🏁")
        fifth = ping_result({"mode": "career", "track": "duskValley", "position": 5}, 0)
        self.assertEqual(fifth["headline"], "I raced DUSK VALLEY in Apex Drive: 5th at the flag 🏁")
        self.assertEqual(fifth["value"], "5TH")

    def test_a_challenge_run_tells_its_time_and_points_and_an_unfinished_one_a_dnf(self):
        run = ping_result({"mode": "challenge", "track": "iceFields", "time": 123.9}, 10569)
        self.assertEqual(run["headline"], "I drove the Apex Drive weekly challenge on ICE FIELDS in 2:03.90! ⏱️ 10,569 points")
        self.assertEqual((run["label"], run["value"]), ("TIME", "2:03.90"))
        dnf = ping_result({"mode": "challenge_unscored", "track": "iceFields"}, 0)
        self.assertEqual((dnf["label"], dnf["value"]), ("CHALLENGE", "DNF"))

    def test_a_career_race_left_before_the_flag_is_a_dnf(self):
        retired = ping_result({"mode": "career_dnf", "track": "underpass"}, 0)
        self.assertEqual(retired["headline"], "I raced UNDERPASS in Apex Drive 🏁")
        self.assertEqual((retired["label"], retired["value"]), ("PLACE", "DNF"))

    def test_what_the_browser_sends_is_checked_else_the_ping_falls_back_to_points(self):
        for data in [
            {},
            {"mode": "career", "track": "nowhere", "position": 1},
            {"mode": "career", "track": "<b>@all #spam</b>", "position": 1},
            {"mode": "career", "track": "duskValley", "position": 0},
            {"mode": "career", "track": "duskValley", "position": 99},
            {"mode": "career", "track": "duskValley", "position": True},
            {"mode": "career", "track": "duskValley", "position": "1"},
            {"mode": "challenge", "track": "duskValley", "time": -5},
            {"mode": "challenge", "track": "duskValley", "time": "fast"},
            {"mode": "other", "track": "duskValley"},
            {"mode": "career", "track": ["duskValley"], "position": 1},
        ]:
            self.assertIsNone(ping_result(data, 0), data)
        # an absurd best lap is left out, the place still told
        odd = ping_result({"mode": "career", "track": "duskValley", "position": 2, "best_lap": 1e9}, 0)
        self.assertEqual(odd["headline"], "I finished 2nd on DUSK VALLEY in Apex Drive! 🏁")

    def test_race_times_read_as_in_the_game(self):
        self.assertEqual(race_time(83.456), "1:23.46")
        self.assertEqual(race_time(59.999), "1:00.00")
        self.assertEqual(race_time(5.2), "0:05.20")

    def test_the_whole_ping_text_says_the_place_not_zero_points(self):
        text = build_ping_text(APEX, session(mode="career", track="glacierPass", position=1))
        self.assertTrue(text.startswith("I won on GLACIER PASS in Apex Drive! 🏆"), text)
        self.assertNotIn("0 points", text)
        self.assertIn("#apexdrive", text.replace("_", "").lower())
        fallback = build_ping_text(APEX, session(score=7, mode="career", track="nowhere", position=1))
        self.assertTrue(fallback.startswith("I scored 7 points in Apex Drive"), fallback)


if __name__ == "__main__":
    unittest.main()
