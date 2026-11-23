"""
The weekly job: once the weekly reset has paid last week, pick this week's
STEEM games, switch their rewards on and publish the @cur8 post.

Every step is saved in WeeklyRotation as soon as it is done, so a run that
fails (Steem nodes down, image host down) carries on from there an hour later.
"""

import json
import logging
import threading
import time
from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional

import schedule

from app.database import get_db_session
from app.models import WeeklyRotation
from app.telegram_notifier import send_telegram_error, send_telegram_success
from app.weekly_report.banner import render_banner
from app.weekly_report.config import FIRST_AUTOMATED_WEEK, MAX_ATTEMPTS, current_week_start
from app.weekly_report.publish import publish_post, upload_banner
from app.weekly_report.report import WeeklyReport, build_report, closed_week_processed
from app.weekly_report.rotation import apply_rotation, pick_games
from app.weekly_report.writer import Post, PostWriter

logger = logging.getLogger(__name__)

# The next posts avoid the phrases of this many previous posts
RECENT_POSTS = 4


@dataclass
class Preview:
    post: Post
    banner: bytes
    games_already_switched: bool


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _recent_phrase_ids(session, week_start: date) -> List[str]:
    rows = session.query(WeeklyRotation.phrase_ids).filter(
        WeeklyRotation.week_start < week_start.isoformat(),
        WeeklyRotation.phrase_ids.isnot(None),
    ).order_by(WeeklyRotation.week_start.desc()).limit(RECENT_POSTS)
    return [phrase for (ids,) in rows for phrase in json.loads(ids)]


def _banner(report: WeeklyReport) -> bytes:
    return render_banner(report.closed_number, report.number, report.steem_distributed, report.next_games)


class WeeklyReportJob:
    def __init__(self):
        self._lock = threading.Lock()
        self.scheduler = schedule.Scheduler()
        self.running = False
        self.thread: Optional[threading.Thread] = None

    def preview(self, week_start: date) -> Preview:
        """The post and banner the job would publish for the week, without saving or publishing anything."""
        with get_db_session() as session:
            row = session.get(WeeklyRotation, week_start.isoformat())
            switched = bool(row and row.game_ids)
            game_ids = json.loads(row.game_ids) if switched else pick_games(session, week_start)
            report = build_report(session, week_start, game_ids)
            post = PostWriter(report, avoid=_recent_phrase_ids(session, week_start)).write(
                row.banner_url if row and row.banner_url else None
            )
            return Preview(post, _banner(report), switched)

    def run(self, week_start: Optional[date] = None, ignore_attempts: bool = False) -> Dict[str, Any]:
        """Open the week (by default the current one) if it is not open yet."""
        week_start = week_start or current_week_start()
        with self._lock:
            if week_start < FIRST_AUTOMATED_WEEK:
                return {"status": "skipped", "reason": f"weeks before {FIRST_AUTOMATED_WEEK} are posted by hand"}
            with get_db_session() as session:
                return self._run(session, week_start, ignore_attempts)

    def _run(self, session, week_start: date, ignore_attempts: bool) -> Dict[str, Any]:
        key = week_start.isoformat()
        row = session.get(WeeklyRotation, key)
        if row and row.post_url:
            return {"status": "done", "post_url": row.post_url}
        if row and row.attempts >= MAX_ATTEMPTS and not ignore_attempts:
            return {"status": "gave_up", "error": row.last_error}
        if not closed_week_processed(session, week_start):
            return {"status": "waiting", "reason": "the weekly reset has not saved last week's winners yet"}

        if row is None:
            row = WeeklyRotation(week_start=key, attempts=0, created_at=_now())
            session.add(row)
        try:
            if not row.game_ids:
                game_ids = pick_games(session, week_start)
                if not game_ids:
                    raise RuntimeError("No ranked game has STEEM rewards configured")
                apply_rotation(session, game_ids)
                row.game_ids = json.dumps(game_ids)
                session.commit()
                logger.info(f"🎯 Week {key}: STEEM rewards switched to {game_ids}")

            report = build_report(session, week_start, json.loads(row.game_ids))
            if not row.banner_url:
                row.banner_url = upload_banner(_banner(report))
                session.commit()

            post = PostWriter(report, avoid=_recent_phrase_ids(session, week_start)).write(row.banner_url)
            row.post_url = publish_post(post)
            row.phrase_ids = json.dumps(post.phrase_ids)
            row.posted_at = _now()
            row.last_error = None
            session.commit()
        except Exception as e:
            session.rollback()
            row = session.get(WeeklyRotation, key) or row
            row.attempts = (row.attempts or 0) + 1
            row.last_error = str(e)[:1000]
            session.add(row)
            session.commit()
            logger.exception(f"❌ Weekly post for {key} failed (attempt {row.attempts})")
            send_telegram_error("Weekly Post - Failed", e, context={
                "week_start": key, "attempt": f"{row.attempts}/{MAX_ATTEMPTS}",
                "games": row.game_ids, "banner": row.banner_url,
            })
            return {"status": "failed", "error": row.last_error, "attempts": row.attempts}

        logger.info(f"✅ Weekly post for {key} published: {row.post_url}")
        send_telegram_success("Weekly Post - Published", post.title, stats={
            "post": row.post_url, "games": ", ".join(g.title for g in report.next_games),
        })
        return {"status": "published", "post_url": row.post_url, "games": json.loads(row.game_ids)}

    def _scheduled_run(self):
        try:
            result = self.run()
            if result["status"] not in ("done", "skipped"):
                logger.info(f"📰 Weekly post: {result}")
        except Exception:
            logger.exception("Weekly post job crashed")

    def start(self):
        if self.thread and self.thread.is_alive():
            return
        # Every hour: the reset runs on Monday at 00:00, and a failed or missed run catches up
        self.scheduler.clear()
        self.scheduler.every().hour.at(":15").do(self._scheduled_run)
        self.running = True
        self.thread = threading.Thread(target=self._loop, daemon=True)
        self.thread.start()
        logger.info("📅 Weekly post job scheduled every hour at :15")

    def _loop(self):
        while self.running:
            self.scheduler.run_pending()
            time.sleep(60)

    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)


_job: Optional[WeeklyReportJob] = None


def get_job() -> WeeklyReportJob:
    global _job
    if _job is None:
        _job = WeeklyReportJob()
    return _job


def start_weekly_report_job():
    get_job().start()


def stop_weekly_report_job():
    if _job:
        _job.stop()
