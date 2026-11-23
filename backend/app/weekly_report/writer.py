"""
The weekly post: a fixed skeleton (rankings, rewards, games) and the words
around it picked from data/phrases.json, so no two weeks read the same.

The pick is seeded by the week and skips the phrases of the last posts: the
same week always gets the same post (preview, retries), the next one a new one.
"""

import hashlib
import json
import random
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Dict, Iterable, List, Optional

from app.weekly_report.config import APP, DATA_DIR, SITE_URL, TAGS
from app.weekly_report.highlights import find_highlights
from app.weekly_report.report import GameResult, WeeklyReport
from app.weekly_report.text import amount, count_word, date_range, join_words, number

MEDALS = {1: "🥇", 2: "🥈", 3: "🥉"}
OTHER_MEDAL = "🏅"


@lru_cache(maxsize=1)
def phrase_book() -> Dict[str, List[str]]:
    """data/phrases.json as {section: phrases}; the highlights become 'highlights.<kind>'."""
    with open(DATA_DIR / "phrases.json", encoding="utf-8") as f:
        raw = json.load(f)
    book = {key: value for key, value in raw.items() if isinstance(value, list)}
    book.update({f"highlights.{kind}": phrases for kind, phrases in raw["highlights"].items()})
    return book


def phrase_id(section: str, phrase: str) -> str:
    return f"{section}:{hashlib.sha1(phrase.encode('utf-8')).hexdigest()[:8]}"


@dataclass
class Post:
    title: str
    body: str
    permlink: str
    tags: List[str]
    json_metadata: Dict
    phrase_ids: List[str] = field(default_factory=list)


class PostWriter:
    def __init__(self, report: WeeklyReport, avoid: Iterable[str] = ()):
        self.report = report
        self.rng = random.Random(f"cur8-weekly-post-{report.week_start.isoformat()}")
        self.avoid = set(avoid)
        self.used: List[str] = []
        self.values = {
            "week": report.closed_number,
            "next_week": report.number,
            "steem": amount(report.steem_distributed),
            "prize": amount(report.next_prize_pool),
            "count": count_word(len(report.results)),
            "Count": count_word(len(report.results)).capitalize(),
            "next_count": count_word(len(report.next_games)),
        }

    def phrase(self, section: str, **values) -> str:
        """A phrase of the section not used lately (nor already in this post), filled in."""
        phrases = phrase_book()[section]
        fresh = [p for p in phrases if phrase_id(section, p) not in self.avoid | set(self.used)]
        chosen = self.rng.choice(fresh or phrases)
        self.used.append(phrase_id(section, chosen))
        return chosen.format_map({**self.values, **values})

    def write(self, banner_url: Optional[str]) -> Post:
        report = self.report
        parts = [
            f"## Week: {date_range(report.closed_start, report.closed_end)}",
            self.phrase("intro"),
            self.phrase("story"),
            self._recap(),
            self.phrase("results_lead"),
            "---",
            *[self._game_section(result) for result in report.results],
            self._highlights(),
        ]
        if report.new_games:
            parts += ["---", self._new_games()]
        parts += ["---", self._next_week(banner_url)]

        title = f"Cur8 Games — Week {report.closed_number} Results 🏁"
        return Post(
            title=title,
            body="\n\n".join(part for part in parts if part),
            permlink=f"cur8-games-week-{report.closed_number}-results",
            tags=list(TAGS),
            json_metadata={
                "tags": list(TAGS),
                "app": APP,
                "format": "markdown",
                "image": [banner_url] if banner_url else [],
                "week": report.closed_number,
            },
            phrase_ids=list(self.used),
        )

    def _recap(self) -> str:
        clauses = [
            self.phrase("winner_clause", game=r.game.title, player=r.winner.player, score=number(r.winner.score))
            for r in self.report.results
        ]
        return self.phrase("recap", clauses=join_words(clauses))

    @staticmethod
    def _game_section(result: GameResult) -> str:
        lines = [f"# {result.game.title} {result.game.emoji}"]
        for p in result.placements:
            lines += [
                "",
                f"{MEDALS.get(p.rank, OTHER_MEDAL)} #{p.rank} {p.player} — {number(p.score)}  ",
                f"🪙 {number(p.coins)} Coins  ",
                f"💎 {amount(p.steem)} STEEM  ",
            ]
        return "\n".join(lines) + "\n\n---"

    def _highlights(self) -> str:
        bullets = [self.phrase(f"highlights.{fact.kind}", **fact.values) for fact in find_highlights(self.report)]
        return "\n\n".join([
            f"# {self.phrase('gg_title')}",
            self.phrase("highlights_lead"),
            "\n".join(f"- {bullet}" for bullet in bullets),
            self.phrase("gg_close"),
        ])

    def _new_games(self) -> str:
        games = self.report.new_games
        values = {
            "games": join_words([g.title for g in games]),
            "new_count": count_word(len(games)),
            "New_count": count_word(len(games)).capitalize(),
            "noun": "game" if len(games) == 1 else "games",
            "Noun": "Game" if len(games) == 1 else "Games",
            "them": "it" if len(games) == 1 else "them",
        }
        return "\n\n".join([
            f"# {self.phrase('new_games_title', **values)}",
            self.phrase("new_games_intro", **values),
            "\n".join(f"{g.emoji} {g.title}" for g in games),
            self.phrase("new_games_outro", **values),
        ])

    def _next_week(self, banner_url: Optional[str]) -> str:
        games = self.report.next_games
        parts = [
            f"# {self.phrase('live_title')}",
            self.phrase("live_intro"),
            self.phrase("rewarded_lead"),
            "\n".join(f"- {g.emoji} {g.title}" for g in games),
            self.phrase("reset_line"),
            self.phrase("call_to_action", verbs=join_words(list(dict.fromkeys(g.verb for g in games)))),
            f"👉 {SITE_URL}",
            self.phrase("slogan"),
        ]
        if banner_url:
            parts.append(f"![Cur8 Games week {self.report.number}]({banner_url})")
        return "\n\n".join(parts)
