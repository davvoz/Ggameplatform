"""
Daily Quest Reset Scheduler
Automatically resets daily quests at midnight (or first check after midnight).
Runs as a background daemon thread alongside the multiplier scheduler.
"""
import logging
import schedule
import time
import threading
import json
from datetime import datetime
from typing import Optional

from app.database import get_db_session
from app.models import Quest, UserQuest
from app.telegram_notifier import send_telegram_error

logger = logging.getLogger(__name__)


class DailyQuestScheduler:
    def __init__(self):
        self.running = False
        self.thread: Optional[threading.Thread] = None
        self.scheduler = schedule.Scheduler()
        self.last_reset_date: Optional[str] = None

    def _get_today_date(self) -> str:
        """Get today's date in YYYY-MM-DD format."""
        return datetime.utcnow().strftime('%Y-%m-%d')

    def reset_daily_quests(self):
        """Reset all daily quests that were completed on a previous day."""
        today = self._get_today_date()
        
        # Skip if we already reset today
        if self.last_reset_date == today:
            logger.debug("Daily quest reset already done today, skipping")
            return
        
        logger.info(f"🔄 Running daily quest reset check for {today}")
        reset_count = 0
        errors_count = 0
        
        try:
            with get_db_session() as session:
                # Find all completed daily quests
                daily_quests = session.query(Quest).filter(
                    Quest.is_active == 1,
                    Quest.config.like('%"reset_period": "daily"%')
                ).all()
                
                logger.info(f"Found {len(daily_quests)} daily quest definitions")
                
                for quest in daily_quests:
                    try:
                        config = json.loads(quest.config) if quest.config else {}
                        
                        # Only reset quests with reset_on_complete = true
                        if not config.get('reset_on_complete', False):
                            continue
                        
                        # Find completed user_quests for this quest
                        user_quests = session.query(UserQuest).filter(
                            UserQuest.quest_id == quest.quest_id,
                            UserQuest.is_completed == 1
                        ).all()
                        
                        for user_quest in user_quests:
                            try:
                                extra_data = json.loads(user_quest.extra_data) if user_quest.extra_data else {}
                                last_completion = extra_data.get('last_completion_date')
                                
                                # Reset if completed on a previous day
                                if last_completion and last_completion != today:
                                    logger.info(f"🔄 Resetting quest '{quest.title}' for user {user_quest.user_id}")
                                    logger.info(f"   last_completion: {last_completion} -> today: {today}")
                                    
                                    # Reset cumulative data
                                    if 'cumulative' in extra_data:
                                        extra_data['cumulative'] = {}
                                    extra_data['last_reset_date'] = today
                                    
                                    # Reset progress
                                    user_quest.current_progress = 0
                                    user_quest.is_completed = 0
                                    user_quest.is_claimed = 0
                                    user_quest.completed_at = None
                                    user_quest.claimed_at = None
                                    user_quest.extra_data = json.dumps(extra_data)
                                    
                                    reset_count += 1
                                    
                            except Exception as e:
                                errors_count += 1
                                logger.exception(f"Error resetting quest {quest.quest_id} for user {user_quest.user_id}")
                                
                    except Exception as e:
                        errors_count += 1
                        logger.exception(f"Error processing quest {quest.quest_id}")
                
                # Commit all changes
                session.commit()
                
            self.last_reset_date = today
            logger.info(f"✅ Daily quest reset complete: {reset_count} quests reset, {errors_count} errors")
            
        except Exception as e:
            logger.exception("Critical error during daily quest reset")
            send_telegram_error(
                "Daily Quest Scheduler - Critical Failure",
                e,
                context={
                    'reset_count': reset_count,
                    'errors_count': errors_count
                }
            )

    def schedule_job(self):
        # Clear any existing jobs
        self.scheduler.clear()
        
        # Run at midnight UTC only
        self.scheduler.every().day.at("00:01").do(self.reset_daily_quests)
        
        logger.info("Scheduled daily quest reset at 00:01 UTC")

    def run_scheduler(self):
        logger.info("▶️ Starting daily quest scheduler thread")
        self.running = True
        
        # Run immediately on startup to catch any missed resets
        self.reset_daily_quests()
        
        while self.running:
            try:
                self.scheduler.run_pending()
            except Exception:
                logger.exception("Daily quest scheduler loop error")
            time.sleep(60)  # Check every minute
        logger.info("⏹️ Daily quest scheduler stopped")

    def start(self):
        if self.thread and self.thread.is_alive():
            logger.warning("Daily quest scheduler already running")
            return
        self.schedule_job()
        self.thread = threading.Thread(target=self.run_scheduler, daemon=True)
        self.thread.start()
        logger.info("✅ Daily quest scheduler started")

    def stop(self):
        logger.info("🛑 Stopping daily quest scheduler...")
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        logger.info("✅ Daily quest scheduler stopped")


_daily_quest_scheduler: Optional[DailyQuestScheduler] = None


def get_daily_quest_scheduler() -> DailyQuestScheduler:
    global _daily_quest_scheduler
    if _daily_quest_scheduler is None:
        _daily_quest_scheduler = DailyQuestScheduler()
    return _daily_quest_scheduler


def start_daily_quest_scheduler():
    get_daily_quest_scheduler().start()


def stop_daily_quest_scheduler():
    global _daily_quest_scheduler
    if _daily_quest_scheduler:
        _daily_quest_scheduler.stop()
        _daily_quest_scheduler = None
