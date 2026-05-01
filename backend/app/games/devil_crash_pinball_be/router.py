"""HTTP router for Devil Crash Pinball community boards.

Mounted under `/games/devil_crash_pinball/boards`.

Auth model:
  * Read endpoints (list, detail, play-count) → public; viewer `user_id`
    is optional and only used to compute `liked_by_viewer`.
  * Write endpoints (create, update, delete, like) → require `user_id`
    query param. The frontend forwards the identity that the platform
    pushes into the game iframe via the `config` postMessage (no client
    storage involved).

This mirrors the pattern used elsewhere in the platform: the FastAPI
backend has no SessionMiddleware; the platform host is the source of
truth for the authenticated user identity.
"""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.games.devil_crash_pinball_be import service as svc
from app.games.devil_crash_pinball_be.schemas import (
    BoardDetail,
    BoardListResponse,
    BoardSummary,
    CreateBoardRequest,
    LikeToggleResponse,
    UpdateBoardRequest,
)
from app.games.devil_crash_pinball_be.validator import BoardValidationError

DbSession = Annotated[Session, Depends(get_db)]

router = APIRouter(
    prefix="/games/devil_crash_pinball/boards",
    tags=["Devil Crash — Community Boards"],
)


def _require_user_id(user_id: Optional[str]) -> str:
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required (missing user_id)",
        )
    return user_id


# ─── Read endpoints ───────────────────────────────────────────────────────────

@router.get("/community", response_model=BoardListResponse)
def list_community(
    db: DbSession,
    sort: Annotated[str, Query(pattern="^(likes|recent)$")] = "likes",
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=svc.MAX_PAGE_SIZE)] = svc.DEFAULT_PAGE_SIZE,
    user_id: Annotated[Optional[str], Query()] = None,
):
    items, total = svc.list_community(
        db, sort=sort, page=page, page_size=page_size,
        viewer_user_id=user_id,
    )
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get(
    "/mine",
    response_model=list[BoardSummary],
    responses={401: {"description": "Authentication required"}},
)
def list_mine(
    db: DbSession,
    user_id: Annotated[Optional[str], Query()] = None,
):
    return svc.list_mine(db, _require_user_id(user_id))


@router.get(
    "/{board_id}",
    response_model=BoardDetail,
    responses={404: {"description": "Board not found"}},
)
def get_board(
    board_id: int,
    db: DbSession,
    user_id: Annotated[Optional[str], Query()] = None,
):
    try:
        return svc.get_board(db, board_id, viewer_user_id=user_id)
    except svc.BoardNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


# ─── Write endpoints ──────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=BoardDetail,
    status_code=201,
    responses={
        401: {"description": "Authentication required"},
        409: {"description": "Per-user board quota exceeded"},
        422: {"description": "Invalid board payload"},
    },
)
def create_board(
    payload: CreateBoardRequest,
    db: DbSession,
    user_id: Annotated[Optional[str], Query()] = None,
):
    uid = _require_user_id(user_id)
    try:
        return svc.create_board(db, uid, payload.name, payload.payload.model_dump())
    except svc.BoardForbiddenError as e:
        # The provided user_id is not registered on the platform (likely a
        # stale identity from the host). Surface as 401 so the client can
        # re-authenticate.
        raise HTTPException(status_code=401, detail=str(e)) from e
    except svc.BoardQuotaExceededError as e:
        raise HTTPException(status_code=409, detail=str(e)) from e
    except BoardValidationError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e


@router.put(
    "/{board_id}",
    response_model=BoardDetail,
    responses={
        401: {"description": "Authentication required"},
        403: {"description": "Not the board owner"},
        404: {"description": "Board not found"},
        422: {"description": "Invalid board payload"},
    },
)
def update_board(
    board_id: int,
    payload: UpdateBoardRequest,
    db: DbSession,
    user_id: Annotated[Optional[str], Query()] = None,
):
    uid = _require_user_id(user_id)
    try:
        return svc.update_board(
            db, board_id, uid,
            name=payload.name,
            payload=payload.payload.model_dump() if payload.payload else None,
        )
    except svc.BoardNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except svc.BoardForbiddenError as e:
        raise HTTPException(status_code=403, detail=str(e)) from e
    except BoardValidationError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e


@router.delete(
    "/{board_id}",
    status_code=204,
    responses={
        401: {"description": "Authentication required"},
        403: {"description": "Not the board owner"},
        404: {"description": "Board not found"},
    },
)
def delete_board(
    board_id: int,
    db: DbSession,
    user_id: Annotated[Optional[str], Query()] = None,
):
    uid = _require_user_id(user_id)
    try:
        svc.delete_board(db, board_id, uid)
    except svc.BoardNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except svc.BoardForbiddenError as e:
        raise HTTPException(status_code=403, detail=str(e)) from e


@router.post(
    "/{board_id}/like",
    response_model=LikeToggleResponse,
    responses={
        401: {"description": "Authentication required"},
        404: {"description": "Board not found"},
    },
)
def toggle_like(
    board_id: int,
    db: DbSession,
    user_id: Annotated[Optional[str], Query()] = None,
):
    uid = _require_user_id(user_id)
    try:
        liked, count = svc.toggle_like(db, board_id, uid)
    except svc.BoardNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    return {"board_id": board_id, "liked": liked, "like_count": count}


@router.post("/{board_id}/play", status_code=204)
def register_play(board_id: int, db: DbSession):
    """Public: client-side ping when a community board starts a session."""
    svc.increment_play_count(db, board_id)
