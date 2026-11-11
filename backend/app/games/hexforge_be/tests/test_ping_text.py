"""A Hexforge ping speaks of a raid (whom, how much fell), not of points."""

import json
import unittest
from types import SimpleNamespace

from app.routers.pings import build_ping_text


def session(**data):
    return SimpleNamespace(score=data.get("destruction", 0), xp_earned=20, duration_seconds=0,
                           extra_data=json.dumps(data))


class PingTextTest(unittest.TestCase):
    hexforge = SimpleNamespace(game_id="hexforge", title="Hexforge")

    def test_a_fallen_core_names_the_opponent(self):
        text = build_ping_text(self.hexforge, session(destruction=87, core_destroyed=1, opponent="Raider X"))
        self.assertTrue(text.startswith("I brought down the core of Raider X in Hexforge!"))
        self.assertIn("87% destroyed", text)
        self.assertNotIn("points", text)

    def test_a_raid_without_the_core_and_a_name_cleaned_of_mentions(self):
        text = build_ping_text(self.hexforge, session(destruction=40, core_destroyed=0, opponent="@bob #spam"))
        self.assertTrue(text.startswith("I raided bob spam in Hexforge: 40% destroyed"))

    def test_other_games_keep_their_points(self):
        other = SimpleNamespace(game_id="stormrun", title="Stormrun")
        self.assertTrue(build_ping_text(other, session(destruction=5)).startswith("I scored 5 points in Stormrun"))
