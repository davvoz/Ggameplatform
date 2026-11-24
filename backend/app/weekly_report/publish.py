"""Putting the post online: the banner on the image host, the post on Steem as @cur8."""

import base64
import os
from typing import Any, Dict, List

import httpx
from fastapi import HTTPException

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


def _post_data(post: Post) -> SteemPostData:
    posting_key = os.getenv(POSTING_KEY_ENV)
    if not posting_key:
        raise RuntimeError(f"{POSTING_KEY_ENV} is not set: cannot sign the post")
    return SteemPostData(
        username=POST_AUTHOR,
        posting_key=posting_key,
        title=post.title,
        body=post.body,
        permlink=post.permlink,
        tags=post.tags,
        json_metadata=post.json_metadata,
        beneficiaries=[],
    )


# beem retries a dead node 100 times, 10 s apart: give up on it quickly and try the next one
NODE_RETRIES = 2


class _WeeklyPublisher(SteemPublisher):
    """The platform's publisher (node fallback), quick to leave a dead node.

    With broadcast=False it builds and signs the post exactly as it would
    publish it, never sends it, and has a node check the signature is enough
    to post as the author.
    """

    def __init__(self, broadcast: bool = True):
        super().__init__()
        self.broadcast = broadcast
        self.signed_tx: Dict[str, Any] = {}
        self.node_errors: List[Exception] = []

    def send(self, post: Post) -> str:
        """Publish (or only sign), with a readable reason when every node fails."""
        try:
            return self.publish(_post_data(post))
        except HTTPException as e:
            raise RuntimeError(self._reason(e)) from e

    def _reason(self, error: HTTPException) -> str:
        from beem.exceptions import MissingKeyError

        if any(isinstance(e, MissingKeyError) for e in self.node_errors):
            return (f"{POSTING_KEY_ENV} cannot sign for @{POST_AUTHOR}: it must be cur8.fund's posting key, "
                    f"and @{POST_AUTHOR} must list cur8.fund in its posting account_auths")
        last = next((e for e in reversed(self.node_errors) if str(e)), None)
        return f"{error.detail} Last node error: {type(last).__name__}: {last}" if last else str(error.detail)

    def _handle_node_error(self, node: str, username: str, error: Exception) -> bool:
        self.node_errors.append(error)
        return super()._handle_node_error(node, username, error)

    def _create_steem_instance(self, posting_key: str, node: str):
        from beem import Steem
        return Steem(keys=[posting_key], node=node, nobroadcast=not self.broadcast, num_retries=NODE_RETRIES)

    def _execute_post(self, steem_instance, post_data: SteemPostData) -> None:
        if self.broadcast:
            super()._execute_post(steem_instance, post_data)
            return

        from beem.exceptions import InsufficientAuthorityError
        from beem.transactionbuilder import TransactionBuilder

        post = steem_instance.post

        def keep_signed_tx(*args, **kwargs):
            self.signed_tx = post(*args, **kwargs)
            return self.signed_tx

        steem_instance.post = keep_signed_tx
        super()._execute_post(steem_instance, post_data)
        try:
            TransactionBuilder(self.signed_tx, blockchain_instance=steem_instance).verify_authority()
        except InsufficientAuthorityError:
            raise RuntimeError(
                f"The node does not accept this signature for @{post_data.username}: "
                "does it list cur8.fund in its posting account_auths?"
            )


def publish_post(post: Post) -> str:
    """Publish the post as @cur8, signed with cur8.fund's posting key. Returns the post URL.

    The permlink belongs to the week, so publishing again edits the same post.
    """
    return _WeeklyPublisher().send(post)


def test_post_signature(post: Post) -> Dict[str, Any]:
    """Sign the post without broadcasting it, and have a node check the signature
    is enough to post as @cur8. Nothing reaches the chain."""
    publisher = _WeeklyPublisher(broadcast=False)
    publisher.send(post)
    return {
        "author": POST_AUTHOR,
        "permlink": post.permlink,
        "title": post.title,
        "signatures": len(publisher.signed_tx.get("signatures", [])),
        "authority_verified_by_node": True,
        "broadcast": False,
    }
