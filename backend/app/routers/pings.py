"""
Pings Router - share a finished game as a ping on cur8.fun

A ping is a top-level comment under the latest "wall", a root post the wall
account (micro.cur8) publishes every day. Any game can be shared: the ping
text is built here from the ended game session (score and XP as the server
recorded them), so a client cannot post a result it did not get.

A ping costs PING_COST_COINS and a player can post at most
PINGS_PER_DAY a day (UTC). Coins are spent only after the ping is on the
chain, as for Steem posts:
- Keychain: /prepare returns the operations, the browser broadcasts them,
  /confirm spends the coins;
- posting key: /publish-with-key publishes with beem and spends the coins.
"""

import asyncio
import json
import os
import re
import secrets
from datetime import datetime, timezone
from typing import Annotated, Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CoinTransaction, Game, GameSession, User
from app.routers.steem_posts import (
    STEEM_NODES,
    SteemPostData,
    SteemPublisher,
    get_coin_service,
    logger,
)
from app.services import CoinService
from app.user_auth import CurrentUserId


router = APIRouter(prefix="/api/pings", tags=["Pings"])

PING_COST_COINS = 50
PINGS_PER_DAY = 3
PING_TRANSACTION_TYPE = "pings_publish"
WALL_ACCOUNT = os.getenv("PINGS_WALL_ACCOUNT", "micro.cur8")
PLATFORM_URL = os.getenv("PLATFORM_PUBLIC_URL", "https://games.cur8.fun").rstrip("/")
APP = "cur8games/1.0"
# cur8.fun's limit for a ping's text (the picture's address does not count)
MAX_PING_LENGTH = 280
# Today's wall and yesterday's: a ping written as the day changes still lands
WALLS_KEPT = 2
WALLS_TTL_SECONDS = 60
# The parent's permlink in a reply's own, as cur8.fun shortens it
PARENT_IN_PERMLINK = 20
# The pictures the image host gives back (imridd uploads to steemitimages)
IMAGE_URL = re.compile(r"^https://(cdn\.)?steemitimages\.com/[A-Za-z0-9/._-]+$")

_walls_cache: Dict[str, Any] = {"walls": [], "at": 0.0}

DbSession = Annotated[Session, Depends(get_db)]
CoinServiceDep = Annotated[CoinService, Depends(get_coin_service)]


class PrepareRequest(BaseModel):
    session_id: str
    image_url: Optional[str] = None


class ConfirmRequest(BaseModel):
    session_id: str
    permlink: str


class PublishWithKeyRequest(BaseModel):
    session_id: str
    posting_key: str
    image_url: Optional[str] = None


# ---------------------------------------------------------------------------
# The wall
# ---------------------------------------------------------------------------

async def _latest_walls() -> List[Dict[str, str]]:
    """The latest walls, newest first, read again once they are a minute old."""
    now = datetime.now(timezone.utc).timestamp()
    if _walls_cache["walls"] and now - _walls_cache["at"] < WALLS_TTL_SECONDS:
        return _walls_cache["walls"]

    payload = {
        "jsonrpc": "2.0",
        "method": "bridge.get_account_posts",
        "params": {"account": WALL_ACCOUNT, "sort": "posts", "limit": WALLS_KEPT},
        "id": 1,
    }
    async with httpx.AsyncClient(timeout=8.0) as client:
        for node in STEEM_NODES:
            try:
                response = await client.post(node, json=payload)
                response.raise_for_status()
                posts = response.json().get("result")
            except Exception as e:
                logger.warning("[PINGS] Wall lookup failed on %s: %s", node, e)
                continue
            if not isinstance(posts, list):
                continue
            walls = [
                {"author": post["author"], "permlink": post["permlink"]}
                for post in posts
                if isinstance(post, dict)
                and post.get("author") == WALL_ACCOUNT
                and isinstance(post.get("permlink"), str)
                and (post.get("depth") or 0) == 0
            ]
            _walls_cache.update(walls=walls, at=now)
            return walls

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="The blockchain cannot be reached right now, try again",
    )


async def _latest_wall() -> Dict[str, str]:
    walls = await _latest_walls()
    if not walls:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="There is no Pings wall to post on yet",
        )
    return walls[0]


# ---------------------------------------------------------------------------
# Limits and checks
# ---------------------------------------------------------------------------

def _start_of_today_utc() -> str:
    now = datetime.now(timezone.utc)
    return now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()


def _pings_today(db: Session, user_id: str) -> int:
    return db.query(func.count(CoinTransaction.transaction_id)).filter(
        CoinTransaction.user_id == user_id,
        CoinTransaction.transaction_type == PING_TRANSACTION_TYPE,
        CoinTransaction.created_at >= _start_of_today_utc(),
    ).scalar() or 0


def _already_pinged(db: Session, user_id: str, session_id: str) -> bool:
    return db.query(CoinTransaction.transaction_id).filter(
        CoinTransaction.user_id == user_id,
        CoinTransaction.transaction_type == PING_TRANSACTION_TYPE,
        CoinTransaction.source_id == session_id,
    ).first() is not None


def _quota(db: Session, coin_service: CoinService, user_id: str) -> Dict[str, Any]:
    used = _pings_today(db, user_id)
    balance = coin_service.get_user_balance(user_id)["balance"]
    return {
        "cost_coins": PING_COST_COINS,
        "daily_limit": PINGS_PER_DAY,
        "used_today": used,
        "remaining_today": max(0, PINGS_PER_DAY - used),
        "balance": balance,
    }


def _shareable_session(db: Session, user_id: str, session_id: str):
    """The player, their ended session and its game: what a ping is made of."""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not user.steem_username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Steem users can post on Pings",
        )

    session = db.query(GameSession).filter(GameSession.session_id == session_id).first()
    if not session or session.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game session not found")
    if not session.ended_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This game is not over yet")

    game = db.query(Game).filter(Game.game_id == session.game_id).first()
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")
    return user, session, game


def _check_can_ping(db: Session, coin_service: CoinService, user_id: str, session_id: str) -> None:
    if _already_pinged(db, user_id, session_id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This game has already been shared")
    quota = _quota(db, coin_service, user_id)
    if quota["remaining_today"] <= 0:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"You can post at most {PINGS_PER_DAY} pings a day. Come back tomorrow!",
        )
    if quota["balance"] < PING_COST_COINS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient balance: a ping costs {PING_COST_COINS} coins",
        )


def _check_image_url(image_url: Optional[str]) -> None:
    if image_url is not None and not IMAGE_URL.match(image_url):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid picture address")


# ---------------------------------------------------------------------------
# The ping
# ---------------------------------------------------------------------------

def _hashtag_of(game_id: str) -> str:
    return re.sub(r"[^a-z0-9]", "", game_id.lower())[:24] or "games"


def _format_xp(xp: float) -> str:
    return f"{round(xp or 0, 2):g}"


def _format_duration(seconds: int) -> str:
    minutes, secs = divmod(max(0, int(seconds or 0)), 60)
    return f"{minutes}m {secs:02d}s" if minutes else f"{secs}s"


def build_ping_text(game: Game, session: GameSession) -> str:
    """Who scored what in which game, how it went, where to play, the hashtags; within 280 characters."""
    score = session.score or 0
    headline = f"I scored {score:,} {'point' if score == 1 else 'points'} in {game.title} on Cur8 Games! 🎮"
    details = [f"⭐ +{_format_xp(session.xp_earned)} XP"]
    if session.duration_seconds:
        details.append(f"⏱️ {_format_duration(session.duration_seconds)}")
    hashtags = f"#cur8 #{_hashtag_of(game.game_id)}"
    text = f"{headline}\n{' · '.join(details)}\n\nPlay: {PLATFORM_URL}/#/game/{game.game_id}\n{hashtags}"
    if len(text) <= MAX_PING_LENGTH:
        return text
    return f"{headline}\n{' · '.join(details)}\n{hashtags}"[:MAX_PING_LENGTH]


def _ping_tags(text: str) -> List[str]:
    tags = ["pings"]
    for tag in re.findall(r"(?:^|\s)#([a-z0-9][a-z0-9-]{0,23})", text.lower()):
        if tag not in tags:
            tags.append(tag)
    return tags[:10]


def _build_comment(user: User, game: Game, session: GameSession, wall: Dict[str, str], image_url: Optional[str]) -> Dict[str, Any]:
    text = build_ping_text(game, session)
    metadata: Dict[str, Any] = {"app": APP, "format": "markdown", "type": "ping", "tags": _ping_tags(text)}
    if image_url:
        metadata["image"] = [image_url]
    parent = wall["permlink"][:PARENT_IN_PERMLINK].rstrip("-")
    return {
        "parent_author": wall["author"],
        "parent_permlink": wall["permlink"],
        "author": user.steem_username,
        "permlink": f"re-{parent}-cur8games-{secrets.token_hex(6)}",
        "title": "",
        "body": text if not image_url else f"{text}\n\n![]({image_url})",
        "json_metadata": metadata,
    }


def _post_url(author: str, permlink: str) -> str:
    return f"https://www.cur8.fun/@{author}/{permlink}"


def _spend_for_ping(coin_service: CoinService, user_id: str, session: GameSession, game: Game, post_url: str) -> Dict[str, Any]:
    transaction = coin_service.spend_coins(
        user_id=user_id,
        amount=PING_COST_COINS,
        transaction_type=PING_TRANSACTION_TYPE,
        source_id=session.session_id,
        description=f"Ping: {game.title} ({session.score or 0:,} points)",
        extra_data={"game_id": game.game_id, "post_url": post_url},
    )
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient balance to complete the ping",
        )
    return transaction


class _PingPublisher(SteemPublisher):
    """Publishes a ping (a reply to the wall) with the posting key, with the same node fallback as posts."""

    def __init__(self, reply_identifier: str):
        super().__init__()
        self.reply_identifier = reply_identifier

    def _execute_post(self, steem_instance, post_data: SteemPostData) -> None:
        steem_instance.post(
            title="",
            body=post_data.body,
            author=post_data.username,
            permlink=post_data.permlink,
            reply_identifier=self.reply_identifier,
            json_metadata=post_data.json_metadata,
            app=APP,
            self_vote=False,
        )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/status")
async def pings_status(db: DbSession, coin_service: CoinServiceDep, current_user_id: CurrentUserId):
    """Cost, daily limit, pings left today and balance of the signed-in player."""
    return _quota(db, coin_service, current_user_id)


@router.get("/preview/{session_id}")
async def preview_ping(session_id: str, db: DbSession, coin_service: CoinServiceDep, current_user_id: CurrentUserId):
    """The ping for an ended game: its text, and what its picture shows."""
    user, session, game = _shareable_session(db, current_user_id, session_id)
    return {
        "text": build_ping_text(game, session),
        "already_shared": _already_pinged(db, current_user_id, session_id),
        "card": {
            "game_id": game.game_id,
            "game_title": game.title,
            "thumbnail": game.thumbnail or "",
            "score": session.score or 0,
            "xp_earned": round(session.xp_earned or 0, 2),
            "duration_seconds": session.duration_seconds or 0,
            "username": user.steem_username,
            "platform_url": PLATFORM_URL,
        },
        **_quota(db, coin_service, current_user_id),
    }


@router.post("/prepare")
async def prepare_ping(request: PrepareRequest, db: DbSession, coin_service: CoinServiceDep, current_user_id: CurrentUserId):
    """The Keychain operations of the ping under today's wall (coins are spent by /confirm)."""
    user, session, game = _shareable_session(db, current_user_id, request.session_id)
    _check_can_ping(db, coin_service, current_user_id, request.session_id)
    _check_image_url(request.image_url)

    comment = _build_comment(user, game, session, await _latest_wall(), request.image_url)
    operation = ["comment", {**comment, "json_metadata": json.dumps(comment["json_metadata"])}]
    return {
        "permlink": comment["permlink"],
        "author": comment["author"],
        "post_url": _post_url(comment["author"], comment["permlink"]),
        "keychain_operations": [operation],
    }


@router.post("/confirm")
async def confirm_ping(request: ConfirmRequest, db: DbSession, coin_service: CoinServiceDep, current_user_id: CurrentUserId):
    """Spends the coins of a ping Keychain has broadcast."""
    user, session, game = _shareable_session(db, current_user_id, request.session_id)
    if _already_pinged(db, current_user_id, request.session_id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This game has already been shared")

    post_url = _post_url(user.steem_username, request.permlink)
    _spend_for_ping(coin_service, current_user_id, session, game, post_url)
    return {"success": True, "post_url": post_url, **_quota(db, coin_service, current_user_id)}


@router.post("/publish-with-key")
async def publish_ping_with_key(request: PublishWithKeyRequest, db: DbSession, coin_service: CoinServiceDep, current_user_id: CurrentUserId):
    """Publishes the ping with the player's posting key (never stored), then spends the coins."""
    user, session, game = _shareable_session(db, current_user_id, request.session_id)
    _check_can_ping(db, coin_service, current_user_id, request.session_id)
    _check_image_url(request.image_url)

    wall = await _latest_wall()
    comment = _build_comment(user, game, session, wall, request.image_url)
    post_data = SteemPostData(
        username=comment["author"],
        posting_key=request.posting_key,
        title="",
        body=comment["body"],
        permlink=comment["permlink"],
        tags=comment["json_metadata"]["tags"],
        json_metadata=comment["json_metadata"],
        beneficiaries=[],
    )
    publisher = _PingPublisher(f"@{wall['author']}/{wall['permlink']}")
    await asyncio.to_thread(publisher.publish, post_data)

    post_url = _post_url(comment["author"], comment["permlink"])
    _spend_for_ping(coin_service, current_user_id, session, game, post_url)
    return {"success": True, "post_url": post_url, **_quota(db, coin_service, current_user_id)}
