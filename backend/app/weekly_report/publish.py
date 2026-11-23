"""Putting the post online: the banner on the image host, the post on Steem as @cur8."""

import base64
import os

import httpx

from app.routers.steem_posts import IMRIDD_UPLOAD_URL, SteemPostData, SteemPublisher
from app.weekly_report.config import POST_AUTHOR, POSTING_KEY_ENV
from app.weekly_report.writer import Post

UPLOAD_TIMEOUT_SECONDS = 60


def upload_banner(jpeg: bytes) -> str:
    """Upload the banner (the same host the platform's posts use) and return its URL."""
    response = httpx.post(
        IMRIDD_UPLOAD_URL,
        json={"image_base64": base64.b64encode(jpeg).decode("ascii")},
        timeout=UPLOAD_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    url = response.json().get("image_url")
    if not url:
        raise RuntimeError(f"The image host answered without a URL: {response.text[:200]}")
    return url


def publish_post(post: Post) -> str:
    """Publish the post as @cur8, signed with cur8.fund's posting key. Returns the post URL.

    The permlink belongs to the week, so publishing again edits the same post.
    """
    posting_key = os.getenv(POSTING_KEY_ENV)
    if not posting_key:
        raise RuntimeError(f"{POSTING_KEY_ENV} is not set: cannot sign the post")

    return SteemPublisher().publish(SteemPostData(
        username=POST_AUTHOR,
        posting_key=posting_key,
        title=post.title,
        body=post.body,
        permlink=post.permlink,
        tags=post.tags,
        json_metadata=post.json_metadata,
        beneficiaries=[],
    ))
