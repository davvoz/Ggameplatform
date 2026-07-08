"""
Multiplier Scheduler
Runs a RARE full multiplier sweep as a safety net for drift; per-user checks
are event-driven (post-game / login, see steem_checker.check_user_multiplier_task).
Uses the existing `schedule` package (already in requirements) and runs
in a background daemon thread so it doesn't block the FastAPI event loop.
"""
import logging
import os
import schedule
import time
import threading
from typing import Optional

from app.database import get_db_session
from app.models import User
from app.steem_checker import (
    get_accounts_data,
    resolve_witness_vote_from_memo,
    persist_multiplier_result,
    get_delegation_amount,
)
from app.telegram_notifier import send_telegram_error

# Sweep interval (hours); the sweep is a safety net, per-user checks are event-driven
MULTIPLIER_SWEEP_HOURS = int(os.getenv("MULTIPLIER_SWEEP_HOURS", "24"))

logger = logging.getLogger(__name__)


class MultiplierScheduler:
    def __init__(self):
        self.running = False
        self.thread: Optional[threading.Thread] = None
        # Use a dedicated scheduler instance to avoid conflicts with weekly_scheduler
        self.scheduler = schedule.Scheduler()

    def scheduled_multiplier_check(self):
        logger.info("🔁 Running full multiplier sweep (safety net)")
        errors_count = 0
        users_checked = 0

        try:
            with get_db_session() as session:
                users = session.query(User).filter(User.steem_username != None).all()
                users_checked = len(users)
                logger.info("Sweeping %d users with Steem accounts", users_checked)
                if not users:
                    return

                # Batch-fetch all accounts: 1 RPC per 100 users (was 2 RPC per user)
                memo = get_accounts_data([u.steem_username for u in users])

                # Resolve proxy chains: batch-fetch unseen proxies, max 4 rounds
                pending = {a.get("proxy") for a in memo.values() if a.get("proxy")} - set(memo)
                for _ in range(4):
                    if not pending:
                        break
                    fetched = get_accounts_data(sorted(pending))
                    if not fetched:
                        break
                    memo.update(fetched)
                    pending = {a.get("proxy") for a in fetched.values() if a.get("proxy")} - set(memo)

                for u in users:
                    try:
                        # The sweep bypasses the per-user cooldown BY DESIGN: it is
                        # the safety net for drift and must not depend on per-user
                        # timestamps. At 24h cadence the cost is negligible.
                        votes = resolve_witness_vote_from_memo(u.steem_username, memo)
                        delegation = get_delegation_amount(u.steem_username)  # per-user RPC, unavoidable
                        persist_multiplier_result(u, votes, delegation, session)
                    except Exception as e:
                        errors_count += 1
                        logger.exception("Error checking multiplier for user %s", u.user_id)

                        # Send Telegram alert for persistent errors (every 10th error)
                        if errors_count % 10 == 0:
                            send_telegram_error(
                                "Multiplier Scheduler - Repeated Errors",
                                e,
                                context={
                                    'errors_count': errors_count,
                                    'users_checked': users_checked,
                                    'current_user': u.user_id
                                }
                            )

        except Exception as e:
            logger.exception("Critical error during scheduled multiplier check")
            send_telegram_error(
                "Multiplier Scheduler - Critical Failure",
                e,
                context={
                    'users_checked': users_checked,
                    'errors_count': errors_count
                }
            )

    def schedule_job(self):
        # Clear any existing jobs to prevent duplicates
        self.scheduler.clear()
        # Rare full sweep; per-user checks are event-driven (post-game / login)
        self.scheduler.every(MULTIPLIER_SWEEP_HOURS).hours.do(self.scheduled_multiplier_check)
        logger.info("Scheduled full multiplier sweep every %d hours", MULTIPLIER_SWEEP_HOURS)

    def run_scheduler(self):
        logger.info("▶️ Starting multiplier scheduler thread")
        self.running = True
        while self.running:
            try:
                self.scheduler.run_pending()
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
