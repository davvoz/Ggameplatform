"""Service layer for community boards.

Pure DB access + business rules. No FastAPI / HTTP dependencies here so it
stays unit-testable.
"""

from datetime import datetime, timezone
from typing import List, Optional, Tuple
import json

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.models import CommunityBoard, CommunityBoardLike, User
from app.games.devil_crash_pinball_be.validator import (
    BoardValidationError,
    validate_payload,
    enforce_size_limits,
)

GAME_ID = "devil_crash_pinball"
MAX_BOARDS_PER_USER = 10
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 50


class BoardNotFoundError(LookupError):
    pass


class BoardQuotaExceededError(RuntimeError):
    pass


class BoardForbiddenError(PermissionError):
    pass


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _serialize_payload(payload_dict: dict) -> str:
    """Validate + serialize, raising BoardValidationError on bad input."""
    validate_payload(payload_dict)
    blob = json.dumps(payload_dict, separators=(',', ':'), ensure_ascii=False)
    per_section = [
        (k, json.dumps(v, separators=(',', ':'), ensure_ascii=False))
        for k, v in payload_dict.get("sections", {}).items()
    ]
    enforce_size_limits(blob, per_section)
    return blob


def _short_owner_label(user_id: str) -> str:
    """Best-effort display label when an owner has no username on file.

    Returns a truncated id like `user_421c14bf…` so the UI never has to
    pretend an authored board was made by "anon".
    """
    if not user_id:
        return ''
    if len(user_id) <= 14:
        return user_id
    return f"{user_id[:14]}…"


def _attach_username(db: Session, board: CommunityBoard) -> str:
    user = db.query(User).filter(User.user_id == board.owner_user_id).first()
    if user and user.username:
        return user.username
    return _short_owner_label(board.owner_user_id)


def _fetch_liked_set(db: Session, board_ids: List[int], user_id: Optional[str]) -> set:
    if not user_id or not board_ids:
        return set()
    rows = db.query(CommunityBoardLike.board_id).filter(
        CommunityBoardLike.user_id == user_id,
        CommunityBoardLike.board_id.in_(board_ids),
    ).all()
    return {r[0] for r in rows}


# ─── Queries ──────────────────────────────────────────────────────────────────

def list_community(
    db: Session,
    sort: str = "likes",
    page: int = 1,
    page_size: int = DEFAULT_PAGE_SIZE,
    viewer_user_id: Optional[str] = None,
) -> Tuple[List[dict], int]:
    page = max(1, page)
    page_size = max(1, min(page_size, MAX_PAGE_SIZE))

    q = db.query(CommunityBoard).filter(CommunityBoard.game_id == GAME_ID)
    if sort == "recent":
        q = q.order_by(desc(CommunityBoard.created_at))
    else:
        q = q.order_by(desc(CommunityBoard.like_count), desc(CommunityBoard.created_at))

    total = q.count()
    rows = q.offset((page - 1) * page_size).limit(page_size).all()

    board_ids = [b.board_id for b in rows]
    liked = _fetch_liked_set(db, board_ids, viewer_user_id)

    # Bulk-load usernames in one query
    owner_ids = list({b.owner_user_id for b in rows})
    users = {u.user_id: (u.username or '') for u in db.query(User).filter(User.user_id.in_(owner_ids)).all()} if owner_ids else {}

    items = []
    for b in rows:
        username = users.get(b.owner_user_id) or _short_owner_label(b.owner_user_id)
        d = b.to_summary(username)
        d["liked_by_me"] = b.board_id in liked
        items.append(d)
    return items, total


def list_mine(db: Session, user_id: str) -> List[dict]:
    rows = db.query(CommunityBoard).filter(
        CommunityBoard.game_id == GAME_ID,
        CommunityBoard.owner_user_id == user_id,
    ).order_by(desc(CommunityBoard.updated_at)).all()
    username = ''
    if rows:
        username = _attach_username(db, rows[0])
    return [b.to_summary(username) for b in rows]


def get_board(
    db: Session,
    board_id: int,
    viewer_user_id: Optional[str] = None,
) -> dict:
    board = db.query(CommunityBoard).filter(
        CommunityBoard.board_id == board_id,
        CommunityBoard.game_id == GAME_ID,
    ).first()
    if not board:
        raise BoardNotFoundError(f"board {board_id} not found")

    summary = board.to_summary(_attach_username(db, board))
    summary["payload"] = json.loads(board.payload_json)
    summary["liked_by_me"] = bool(
        viewer_user_id and db.query(CommunityBoardLike).filter(
            CommunityBoardLike.board_id == board_id,
            CommunityBoardLike.user_id == viewer_user_id,
        ).first()
    )
    return summary


# ─── Mutations ────────────────────────────────────────────────────────────────

def create_board(db: Session, user_id: str, name: str, payload: dict) -> dict:
    # Hard-validate the owner exists in `users`. The SQLite FK is not enforced,
    # so without this check we would silently accept ghost user_ids and end up
    # with orphan boards whose username can never be resolved.
    owner = db.query(User).filter(User.user_id == user_id).first()
    if not owner:
        raise BoardForbiddenError(
            f"unknown user_id '{user_id}' (not registered on the platform)"
        )

    owned = db.query(func.count(CommunityBoard.board_id)).filter(
        CommunityBoard.game_id == GAME_ID,
        CommunityBoard.owner_user_id == user_id,
    ).scalar() or 0
    if owned >= MAX_BOARDS_PER_USER:
        raise BoardQuotaExceededError(
            f"max {MAX_BOARDS_PER_USER} boards per user"
        )

    blob = _serialize_payload(payload)
    now = _now_iso()
    board = CommunityBoard(
        game_id=GAME_ID,
        owner_user_id=user_id,
        name=name.strip(),
        payload_json=blob,
        like_count=0,
        play_count=0,
        created_at=now,
        updated_at=now,
    )
    db.add(board)
    db.commit()
    db.refresh(board)

    summary = board.to_summary(_attach_username(db, board))
    summary["payload"] = payload
    summary["liked_by_me"] = False
    return summary


def update_board(
    db: Session,
    board_id: int,
    user_id: str,
    name: Optional[str],
    payload: Optional[dict],
) -> dict:
    board = db.query(CommunityBoard).filter(
        CommunityBoard.board_id == board_id,
        CommunityBoard.game_id == GAME_ID,
    ).first()
    if not board:
        raise BoardNotFoundError(f"board {board_id} not found")
    if board.owner_user_id != user_id:
        raise BoardForbiddenError("not the owner")

    if name is not None:
        board.name = name.strip()
    if payload is not None:
        board.payload_json = _serialize_payload(payload)
    board.updated_at = _now_iso()
    db.commit()
    db.refresh(board)

    return get_board(db, board_id, viewer_user_id=user_id)


def delete_board(db: Session, board_id: int, user_id: str) -> None:
    board = db.query(CommunityBoard).filter(
        CommunityBoard.board_id == board_id,
        CommunityBoard.game_id == GAME_ID,
    ).first()
    if not board:
        raise BoardNotFoundError(f"board {board_id} not found")
    if board.owner_user_id != user_id:
        raise BoardForbiddenError("not the owner")
    db.delete(board)
    db.commit()


def toggle_like(db: Session, board_id: int, user_id: str) -> Tuple[bool, int]:
    board = db.query(CommunityBoard).filter(
        CommunityBoard.board_id == board_id,
        CommunityBoard.game_id == GAME_ID,
    ).first()
    if not board:
        raise BoardNotFoundError(f"board {board_id} not found")

    existing = db.query(CommunityBoardLike).filter(
        CommunityBoardLike.board_id == board_id,
        CommunityBoardLike.user_id == user_id,
    ).first()

    if existing:
        db.delete(existing)
        board.like_count = max(0, int(board.like_count or 0) - 1)
        liked = False
    else:
        db.add(CommunityBoardLike(
            board_id=board_id,
            user_id=user_id,
            created_at=_now_iso(),
        ))
        board.like_count = int(board.like_count or 0) + 1
        liked = True

    db.commit()
    db.refresh(board)
    return liked, int(board.like_count)


def increment_play_count(db: Session, board_id: int) -> None:
    """Best-effort play counter; silently ignores missing boards."""
    board = db.query(CommunityBoard).filter(
        CommunityBoard.board_id == board_id,
        CommunityBoard.game_id == GAME_ID,
    ).first()
    if board:
        board.play_count = int(board.play_count or 0) + 1
        db.commit()
