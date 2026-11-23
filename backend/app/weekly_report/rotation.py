"""
Which games pay STEEM in a week: a pseudo-random pick among the ranked games.

The pick is seeded by the week, so it is the same every time it is made for
that week (preview, retries). A game that waited longer is more likely to come
back; a game rewarded last week can come back, just less likely.
"""

import json
import random
from datetime import date
from typing import Dict, List

from sqlalchemy.orm import Session

from app.leaderboard_repository import LeaderboardRepository
from app.models import Game, GameStatus, WeeklyRotation, WeeklyWinner
from app.weekly_report.config import GAMES_PER_WEEK, RANKED_STATUS_CODE

# Past this many weeks of waiting a game is not more likely to come back
MAX_WAIT_WEEKS = 6


def candidate_games(session: Session) -> Dict[str, float]:
    """The ranked games that can pay STEEM, with the STEEM each one pays a week."""
    lb_repo = LeaderboardRepository(session)
    ranked = session.query(Game.game_id).join(GameStatus).filter(
        GameStatus.status_code == RANKED_STATUS_CODE
    ).order_by(Game.game_id)
    pools = {game_id: lb_repo.steem_prize_pool(game_id) for (game_id,) in ranked}
    return {game_id: pool for game_id, pool in pools.items() if pool > 0}


def last_rewarded_weeks(session: Session, before: date) -> Dict[str, date]:
    """The last week before `before` each game paid STEEM, from the rotations
    and, for the weeks set by hand, from the rewards actually paid."""
    weeks: Dict[str, date] = {}

    def note(game_id: str, week: date):
        if week < before and week > weeks.get(game_id, date.min):
            weeks[game_id] = week

    for week_start, game_ids in session.query(WeeklyRotation.week_start, WeeklyRotation.game_ids):
        for game_id in json.loads(game_ids or "[]"):
            note(game_id, date.fromisoformat(week_start))

    paid = session.query(WeeklyWinner.game_id, WeeklyWinner.week_start).filter(
        WeeklyWinner.steem_reward > 0
    ).distinct()
    for game_id, week_start in paid:
        note(game_id, date.fromisoformat(week_start))

    return weeks


def pick_games(session: Session, week_start: date) -> List[str]:
    """The games that pay STEEM in the week, in the order the post lists them."""
    candidates = sorted(candidate_games(session))
    last_weeks = last_rewarded_weeks(session, week_start)

    def weight(game_id: str) -> int:
        last = last_weeks.get(game_id)
        waited = (week_start - last).days // 7 if last else MAX_WAIT_WEEKS
        return max(1, min(waited, MAX_WAIT_WEEKS))

    rng = random.Random(f"cur8-weekly-{week_start.isoformat()}")
    picked = []
    while candidates and len(picked) < GAMES_PER_WEEK:
        game_id = rng.choices(candidates, weights=[weight(g) for g in candidates])[0]
        candidates.remove(game_id)
        picked.append(game_id)
    return picked


def apply_rotation(session: Session, game_ids: List[str]) -> None:
    """Turn STEEM rewards on for the picked games and off for every other game."""
    for game in session.query(Game):
        game.steem_rewards_enabled = 1 if game.game_id in game_ids else 0
