"""
User session authentication.

Issues and verifies a JWT stored in an httpOnly cookie for regular
(non-admin) users, regardless of how they authenticated (password,
Steem Keychain, Steem posting key, or anonymous guest). This lets every
endpoint that acts on a specific user_id verify the caller actually is
that user, instead of trusting a user_id passed in the path/body.
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional

import jwt
from fastapi import Cookie, Depends, HTTPException, Request, Response, status

SECRET_KEY = os.getenv("USER_JWT_SECRET_KEY") or os.getenv(
    "JWT_SECRET_KEY", "change-this-to-random-secret-in-production"
)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30
TOKEN_TYPE = "user_session"
COOKIE_NAME = "session_token"
INVALID_SESSION_DETAIL = "Invalid session"


def create_session_token(user_id: str) -> str:
    """Create a signed JWT identifying user_id as the session owner."""
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    payload = {"sub": user_id, "type": TOKEN_TYPE, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def set_session_cookie(response: Response, user_id: str, request: Request) -> None:
    """Attach the session cookie for user_id to an outgoing response.

    `secure` is derived from the actual request scheme rather than an env
    flag: plain http (local dev, LAN access) gets a non-Secure cookie so
    the browser will actually store it, https (production) gets Secure.
    """
    token = create_session_token(user_id)
    # Behind a reverse proxy (nginx) terminating TLS, the ASGI app sees plain
    # http even in production - honor X-Forwarded-Proto like _get_client_ip
    # does for the client IP, falling back to the request's own scheme.
    forwarded_proto = request.headers.get("x-forwarded-proto")
    scheme = forwarded_proto.split(",")[0].strip() if forwarded_proto else request.url.scheme
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=scheme == "https",
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(key=COOKIE_NAME, path="/")


def get_current_user_id(
    session_token: Annotated[Optional[str], Cookie()] = None,
) -> str:
    """FastAPI dependency: returns the authenticated user_id or raises 401."""
    if not session_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    try:
        payload = jwt.decode(session_token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=INVALID_SESSION_DETAIL)

    if payload.get("type") != TOKEN_TYPE:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=INVALID_SESSION_DETAIL)

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=INVALID_SESSION_DETAIL)

    return user_id


CurrentUserId = Annotated[str, Depends(get_current_user_id)]


def require_owner(path_user_id: str, current_user_id: str) -> None:
    """Raise 403 unless the authenticated user matches the resource owner."""
    if path_user_id != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot act on behalf of another user",
        )
