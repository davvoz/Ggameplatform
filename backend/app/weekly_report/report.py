"""
The facts of a weekly post, read from the database: the results of the week
that just closed and the games of the week that starts.
"""

from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from app.leaderboard_repository import LeaderboardRepository
from app.models import Game, GameStatus, User, WeeklyWinner
from app.weekly_report.config import RANKED_STATUS_CODE, game_style, week_number


@dataclass
class Placement:
    rank: int
    player: str  # "@steemname"
    score: int
    coins: int
    steem: float


@dataclass
class GameInfo:
    game_id: str
    title: str
    emoji: str
    verb: str
    thumbnail: str = ""


@dataclass
class GameResult:
    game: GameInfo
    placements: List[Placement]

    @property
    def winner(self) -> Placement:
        return self.placements[0]


@dataclass
class GameHistory:
    """What happened in a game before the closed week."""
    last_champion: Optional[str] = None  # rank 1 the last week the game paid STEEM
    best_winning_score: Optional[int] = None


@dataclass
class WeeklyReport:
    week_start: date  # the week that starts
    results: List[GameResult]
    next_games: List[GameInfo]
    next_prize_pool: float
    new_games: List[GameInfo]
    histories: Dict[str, GameHistory] = field(default_factory=dict)
    past_champions: set = field(default_factory=set)  # players with a rank 1 before the closed week

    @property
    def closed_start(self) -> date:
        return self.week_start - timedelta(days=7)

    @property
    def closed_end(self) -> date:
        return self.week_start - timedelta(days=1)

    @property
    def number(self) -> int:
        return week_number(self.week_start)

    @property
    def closed_number(self) -> int:
        return self.number - 1

    @property
    def steem_distributed(self) -> float:
        return sum(p.steem for result in self.results for p in result.placements)


def closed_week_processed(session: Session, week_start: date) -> bool:
    """Whether the weekly reset saved the winners of the week before `week_start`."""
    closed = (week_start - timedelta(days=7)).isoformat()
    return session.query(WeeklyWinner.winner_id).filter(WeeklyWinner.week_start == closed).first() is not None


def _game_info(game: Game) -> GameInfo:
    style = game_style(game.game_id)
    return GameInfo(game.game_id, game.title, style["emoji"], style["verb"], game.thumbnail or "")


def _player(user: User) -> str:
    return f"@{user.steem_username}" if user.steem_username else user.username


def _results(session: Session, closed: str) -> List[GameResult]:
    """The rankings of the games that paid STEEM in the closed week."""
    rows = session.query(WeeklyWinner, User, Game).join(
        User, WeeklyWinner.user_id == User.user_id
    ).join(
        Game, WeeklyWinner.game_id == Game.game_id
    ).filter(
        WeeklyWinner.week_start == closed
    ).order_by(Game.title, WeeklyWinner.rank)

    by_game: Dict[str, GameResult] = {}
    for winner, user, game in rows:
        result = by_game.setdefault(game.game_id, GameResult(_game_info(game), []))
        result.placements.append(
            Placement(winner.rank, _player(user), winner.score, winner.coin_reward or 0, winner.steem_reward or 0)
        )
    return [r for r in by_game.values() if any(p.steem > 0 for p in r.placements)]


def _histories(session: Session, closed: str, game_ids: List[str]) -> Dict[str, GameHistory]:
    histories = {game_id: GameHistory() for game_id in game_ids}
    rewarded_firsts = session.query(WeeklyWinner).filter(
        WeeklyWinner.week_start < closed,
        WeeklyWinner.rank == 1,
        WeeklyWinner.steem_reward > 0,
        WeeklyWinner.game_id.in_(game_ids),
    ).order_by(WeeklyWinner.week_start)

    for first in rewarded_firsts:
        history = histories[first.game_id]
        user = session.get(User, first.user_id)
        history.last_champion = _player(user) if user else None
        history.best_winning_score = max(history.best_winning_score or 0, first.score)
    return histories


def _past_champions(session: Session, closed: str) -> set:
    users = session.query(User).join(WeeklyWinner, WeeklyWinner.user_id == User.user_id).filter(
        WeeklyWinner.week_start < closed,
        WeeklyWinner.rank == 1,
        WeeklyWinner.steem_reward > 0,
    ).distinct()
    return {_player(user) for user in users}


def _new_games(session: Session, closed_start: date, closed_end: date) -> List[GameInfo]:
    """Ranked games added to the platform during the closed week."""
    games = session.query(Game).join(GameStatus).filter(GameStatus.status_code == RANKED_STATUS_CODE)
    return [
        _game_info(game) for game in games
        if closed_start.isoformat() <= (game.created_at or "")[:10] <= closed_end.isoformat()
    ]


def build_report(session: Session, week_start: date, next_game_ids: List[str]) -> WeeklyReport:
    closed_start = week_start - timedelta(days=7)
    closed = closed_start.isoformat()
    results = _results(session, closed)
    if not results:
        raise ValueError(f"No game paid STEEM in the week of {closed}: nothing to report")

    games = {g.game_id: g for g in session.query(Game).filter(Game.game_id.in_(next_game_ids))}
    lb_repo = LeaderboardRepository(session)

    return WeeklyReport(
        week_start=week_start,
        results=results,
        next_games=[_game_info(games[game_id]) for game_id in next_game_ids if game_id in games],
        next_prize_pool=sum(lb_repo.steem_prize_pool(game_id) for game_id in next_game_ids),
        new_games=_new_games(session, closed_start, week_start - timedelta(days=1)),
        histories=_histories(session, closed, [r.game.game_id for r in results]),
        past_champions=_past_champions(session, closed),
    )
