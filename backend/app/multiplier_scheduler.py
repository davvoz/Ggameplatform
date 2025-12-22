"""
Multiplier Scheduler
Runs frequent checks against Steem to update user multipliers.
Uses the existing `schedule` package (already in requirements) and runs
in a background daemon thread so it doesn't block the FastAPI event loop.
"""
import logging
import schedule
import time
import threading
from typing import Optional

from app.database import get_db_session
from app.models import User
from app.steem_checker import update_user_multiplier

logger = logging.getLogger(__name__)


class MultiplierScheduler:
    def __init__(self):
        self.running = False
        self.thread: Optional[threading.Thread] = None

    def scheduled_multiplier_check(self):
        logger.info("🔁 Running scheduled multiplier check")
        try:
            with get_db_session() as session:
                users = session.query(User).filter(User.steem_username != None).all()
                logger.info("Found %d users with Steem accounts to check", len(users))
                for u in users:
                    try:
                        # Do not force: leave cache logic to update_user_multiplier
                        update_user_multiplier(u.user_id, u.steem_username, session, force=False)
                    except Exception:
                        logger.exception("Error checking multiplier for user %s", u.user_id)
        except Exception:
            logger.exception("Critical error during scheduled multiplier check")

    def schedule_job(self):
        # Clear any existing jobs to prevent duplicates
        schedule.clear()
        # Run every 10 minutes
        schedule.every(10).minutes.do(self.scheduled_multiplier_check)
        logger.info("Scheduled multiplier check every 10 minutes")

    def run_scheduler(self):
        logger.info("▶️ Starting multiplier scheduler thread")
        self.running = True
        while self.running:
            try:
                schedule.run_pending()
            except Exception:
                logger.exception("Multiplier scheduler loop error")
            time.sleep(30)
        logger.info("⏹️ Multiplier scheduler stopped")

    def start(self):
        if self.thread and self.thread.is_alive():
            logger.warning("Multiplier scheduler already running")
            return
        self.schedule_job()
        self.thread = threading.Thread(target=self.run_scheduler, daemon=True)
        self.thread.start()
        logger.info("✅ Multiplier scheduler started")

    def stop(self):
        logger.info("🛑 Stopping multiplier scheduler...")
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        logger.info("✅ Multiplier scheduler stopped")


_mult_scheduler: Optional[MultiplierScheduler] = None


def get_multiplier_scheduler() -> MultiplierScheduler:
    global _mult_scheduler
    if _mult_scheduler is None:
        _mult_scheduler = MultiplierScheduler()
    return _mult_scheduler


def start_scheduler():
    get_multiplier_scheduler().start()


def stop_scheduler():
    global _mult_scheduler
    if _mult_scheduler:
        _mult_scheduler.stop()
        _mult_scheduler = None
