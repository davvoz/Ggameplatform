"""
The highlights of a week: facts found in the results, each one a kind
(the phrase section that tells it) and the values its phrases use.
"""

from collections import defaultdict
from dataclasses import dataclass
from typing import Dict, List, Optional

from app.weekly_report.report import GameResult, WeeklyReport
from app.weekly_report.text import count_word, join_words, number

MAX_HIGHLIGHTS = 5
# A win by at most this share of the winning score is a close finish
CLOSE_FINISH_SHARE = 0.01
# A winner with at least this many times the runner-up's score dominated
DOMINANT_RATIO = 3
# A player in the top N of every game is worth a highlight up to this N
EVERYWHERE_MAX_RANK = 5

# Per game, the first fact found is told (game_winner is always found)
GAME_FACT_ORDER = ("record", "close_finish", "dominant", "defending", "first_win", "game_winner")
# For a game whose winner already has a multi-game highlight
SHARED_WINNER_FACT_ORDER = ("record", "close_finish", "dominant", "podium")


@dataclass
class Fact:
    kind: str
    values: Dict[str, str]


def _game_facts(result: GameResult, report: WeeklyReport) -> Dict[str, Fact]:
    game, places = result.game, result.placements
    winner = result.winner
    base = {"game": game.title, "emoji": game.emoji, "player": winner.player, "score": number(winner.score)}
    history = report.histories.get(game.game_id)
    facts = {"game_winner": Fact("game_winner", base)}

    if history and history.best_winning_score is not None and winner.score > history.best_winning_score:
        facts["record"] = Fact("record", {**base, "old_record": number(history.best_winning_score)})
    if history and history.last_champion == winner.player:
        facts["defending"] = Fact("defending", base)
    if report.past_champions and winner.player not in report.past_champions:
        facts["first_win"] = Fact("first_win", base)

    if len(places) > 1:
        runner_up = places[1]
        gap = winner.score - runner_up.score
        values = {**base, "runner_up": runner_up.player, "runner_up_score": number(runner_up.score)}
        if 0 < gap <= max(1, winner.score * CLOSE_FINISH_SHARE):
            facts["close_finish"] = Fact("close_finish", {
                **values, "gap": number(gap), "points": "point" if gap == 1 else "points"
            })
        if runner_up.score > 0 and winner.score >= DOMINANT_RATIO * runner_up.score:
            facts["dominant"] = Fact("dominant", {**values, "ratio": str(winner.score // runner_up.score)})
    if len(places) > 2:
        facts["podium"] = Fact("podium", {**base, "second": places[1].player, "third": places[2].player})
    return facts


def _multi_winner(report: WeeklyReport) -> Optional[Fact]:
    """The player who won the most games, when that is more than one."""
    wins = defaultdict(list)
    for result in report.results:
        wins[result.winner.player].append(result.game.title)
    player, games = max(wins.items(), key=lambda item: len(item[1]))
    if len(games) < 2:
        return None
    return Fact("multi_winner", {"player": player, "games": join_words(games), "count": count_word(len(games))})


def _everywhere(report: WeeklyReport, skip: Optional[str]) -> Optional[Fact]:
    """The player with the best worst rank across all the games, if it is a good one."""
    if len(report.results) < 2:
        return None
    ranks = [{p.player: p.rank for p in result.placements} for result in report.results]
    everywhere = set.intersection(*(set(game_ranks) for game_ranks in ranks)) - {skip}
    if not everywhere:
        return None
    worst_rank = {player: max(game_ranks[player] for game_ranks in ranks) for player in everywhere}
    player, rank = min(worst_rank.items(), key=lambda item: (item[1], item[0]))
    if rank > EVERYWHERE_MAX_RANK:
        return None
    return Fact("everywhere", {"player": player, "rank": str(rank), "count": count_word(len(report.results))})


def find_highlights(report: WeeklyReport) -> List[Fact]:
    multi = _multi_winner(report)
    shared_winner = multi.values["player"] if multi else None
    highlights = []

    for result in report.results:
        facts = _game_facts(result, report)
        order = SHARED_WINNER_FACT_ORDER if result.winner.player == shared_winner else GAME_FACT_ORDER
        found = next((facts[kind] for kind in order if kind in facts), None)
        if found:
            highlights.append(found)

    everywhere = _everywhere(report, skip=shared_winner)
    highlights.extend(fact for fact in (multi, everywhere) if fact)
    return highlights[:MAX_HIGHLIGHTS]
