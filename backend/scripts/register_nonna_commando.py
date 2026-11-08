"""
Idempotent registration script for Nonna Commando.

Registers (or fully updates) the game record, its XP rules, its quests and its
weekly leaderboard rewards. Safe to run multiple times: the play count and the
players' quest progress are kept.

    python scripts/register_nonna_commando.py

Ranked / STEEM:
  The game is ranked from day one. The score is the arcade score of a whole
  run (three missions) and the platform keeps each player's best of the week.
  Everybody plays the same seeded run for a week. The coin rewards are copied
  from REWARDS_FROM. STEEM stays OFF, also in the amounts shown on the
  leaderboard: to pay it, set STEEM_REWARDS = 1 here and run the script again.
"""

import sys
import json
import uuid
import traceback
from pathlib import Path
from datetime import datetime, timezone

# Windows console (cp1252) can't encode emoji — force UTF-8 output.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import get_db_session
from app.models import Game, LeaderboardReward, Quest, XPRule

GAME_ID = "nonna_commando"
RANKED_STATUS_ID = 5
STEEM_REWARDS = 0
REWARDS_FROM = "blocky-road"

NOW = datetime.now(timezone.utc).isoformat()

GAME_DATA = {
    "game_id": GAME_ID,
    "title": "Nonna Commando",
    "description": (
        "The Supremo bulldozed Nonna's trattoria to build the stage for his "
        "birthday party. Bad idea. Run and gun through three missions of party "
        "conscripts, dynamite clowns, a cake on chicken legs and the birthday "
        "boy himself. Kill fast and up close to heat up the multiplier, free "
        "the grandkids, find the gold teeth, and top the weekly leaderboard."
    ),
    "author": "Cur8 Games",
    "version": "1.0.0",
    "thumbnail": "thumbnail.png",
    "entry_point": "index.html",
    "category": "arcade",
    "tags": json.dumps(["arcade", "run-and-gun", "shooter", "pixel-art", "ranked", "bosses"]),
    "status_id": RANKED_STATUS_ID,
    "steem_rewards_enabled": STEEM_REWARDS,
    "extra_data": json.dumps({
        "orientation": "landscape",
        "controls": "Keyboard: arrows/WASD, Z fire, X jump, C meatball. Gamepad supported. Touch: stick and buttons, landscape.",
        "modes": ["Weekly campaign"],
        "features": [
            "Three missions, two mini bosses, three bosses",
            "Heat multiplier up to x8, style bonuses, end-of-mission tally",
            "Same seeded run for everybody, new every week",
            "Deterministic fixed-timestep simulation",
        ],
    }),
}

XP_RULES = [
    {
        "rule_id": f"{GAME_ID}_score",
        "game_id": GAME_ID,
        "rule_name": "Nonna Commando - Score XP",
        "rule_type": "score_multiplier",
        "parameters": json.dumps({
            "multiplier": 0.0002,  # 100k points → 20 XP, a full clear ~90 XP
            "max_xp": 80.0,
        }),
        "priority": 10,
        "is_active": 1,
    },
    {
        "rule_id": f"{GAME_ID}_time",
        "game_id": GAME_ID,
        "rule_name": "Nonna Commando - Time XP",
        "rule_type": "time_bonus",
        "parameters": json.dumps({
            "xp_per_minute": 0.5,
            "max_minutes": 20.0,
        }),
        "priority": 5,
        "is_active": 1,
    },
]

QUESTS = [
    {
        "title": "Nonna Commando: Party Pooper",
        "description": "Defeat 150 of the Supremo's soldiers in Nonna Commando today",
        "quest_type": "score",
        "target_value": 150,
        "xp_reward": 40,
        "reward_coins": 5,
        "is_active": 1,
        "config": json.dumps({
            "game_id": GAME_ID, "extra_data_field": "enemies_defeated", "category": "gameplay",
            "reset_period": "daily", "reset_on_complete": True,
        }),
    },
    {
        "title": "Nonna Commando: Family First",
        "description": "Rescue 6 grandkids in Nonna Commando today",
        "quest_type": "score",
        "target_value": 6,
        "xp_reward": 45,
        "reward_coins": 10,
        "is_active": 1,
        "config": json.dumps({
            "game_id": GAME_ID, "extra_data_field": "hostages_rescued", "category": "gameplay",
            "reset_period": "daily", "reset_on_complete": True,
        }),
    },
    {
        "title": "Nonna Commando: Cake Breaker",
        "description": "Complete 2 missions in Nonna Commando today",
        "quest_type": "score",
        "target_value": 2,
        "xp_reward": 50,
        "reward_coins": 10,
        "is_active": 1,
        "config": json.dumps({
            "game_id": GAME_ID, "extra_data_field": "levels_completed", "category": "skill",
            "reset_period": "daily", "reset_on_complete": True,
        }),
    },
    {
        "title": "Nonna Commando: Gold Digger",
        "description": "Find 3 of Nonna's gold teeth in Nonna Commando today",
        "quest_type": "score",
        "target_value": 3,
        "xp_reward": 50,
        "reward_coins": 10,
        "is_active": 1,
        "config": json.dumps({
            "game_id": GAME_ID, "extra_data_field": "gold_teeth", "category": "skill",
            "reset_period": "daily", "reset_on_complete": True,
        }),
    },
]

_QUEST_TITLES = {q["title"] for q in QUESTS}


def _upsert_game(db, ts: str) -> str:
    existing = db.query(Game).filter(Game.game_id == GAME_ID).first()
    if existing:
        plays = json.loads(existing.extra_data or "{}").get("playCount")
        for key, value in GAME_DATA.items():
            if key != "game_id":
                setattr(existing, key, value)
        if plays is not None:
            existing.extra_data = json.dumps({**json.loads(GAME_DATA["extra_data"]), "playCount": plays})
        existing.updated_at = ts
        return "updated"
    db.add(Game(created_at=ts, updated_at=ts, **GAME_DATA))
    return "created"


def _replace_xp_rules(db) -> None:
    for rule in db.query(XPRule).filter(XPRule.game_id == GAME_ID).all():
        db.delete(rule)
    db.flush()
    for rule_data in XP_RULES:
        db.add(XPRule(created_at=NOW, updated_at=NOW, **rule_data))


def _upsert_quests(db) -> None:
    # Updated in place: a new row would lose what players did today.
    existing = {q.title: q for q in db.query(Quest).filter(Quest.title.in_(_QUEST_TITLES)).all()}
    for quest_data in QUESTS:
        quest = existing.get(quest_data["title"])
        if quest is None:
            db.add(Quest(created_at=NOW, **quest_data))
            continue
        for key, value in quest_data.items():
            setattr(quest, key, value)


def _copy_rewards(db, ts: str) -> int:
    for reward in db.query(LeaderboardReward).filter(LeaderboardReward.game_id == GAME_ID).all():
        db.delete(reward)
    db.flush()

    source = db.query(LeaderboardReward).filter(
        LeaderboardReward.game_id == REWARDS_FROM,
        LeaderboardReward.is_active == 1,
    ).all()
    for reward in source:
        db.add(LeaderboardReward(
            reward_id=str(uuid.uuid4()),
            game_id=GAME_ID,
            rank_start=reward.rank_start,
            rank_end=reward.rank_end,
            steem_reward=reward.steem_reward if STEEM_REWARDS else 0.0,
            coin_reward=reward.coin_reward,
            description=reward.description,
            is_active=1,
            created_at=ts,
            updated_at=ts,
        ))
    return len(source)


def register_nonna_commando() -> bool:
    print("=" * 60)
    print("👵  REGISTERING GAME: NONNA COMMANDO")
    print("=" * 60)
    with get_db_session() as db:
        try:
            ts = datetime.now(timezone.utc).isoformat()

            action = _upsert_game(db, ts)
            db.flush()
            _replace_xp_rules(db)
            _upsert_quests(db)
            rewards = _copy_rewards(db, ts)
            db.commit()

            print(f"\n✅  Game {action}: {GAME_DATA['title']} [{GAME_ID}]")
            print(f"  Status ID: {RANKED_STATUS_ID} (ranked)")
            print(f"  STEEM:     {STEEM_REWARDS}")
            print(f"  XP rules:  {len(XP_RULES)}")
            print(f"  Quests:    {len(QUESTS)}")
            print(f"  Rewards:   {rewards} rank bands copied from {REWARDS_FROM}")
            print(f"  Entry:     /games/{GAME_ID}/{GAME_DATA['entry_point']}")
            return True
        except Exception as exc:
            db.rollback()
            print(f"\n❌  Registration failed: {exc}")
            traceback.print_exc()
            return False


if __name__ == "__main__":
    sys.exit(0 if register_nonna_commando() else 1)
