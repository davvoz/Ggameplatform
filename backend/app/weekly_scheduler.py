"""
Weekly Leaderboard Scheduler
Handles automatic weekly reset and reward distribution
"""

import logging
import schedule
import time
import threading
from datetime import datetime, timezone
from typing import Dict, Any, List
import uuid

from app.database import get_db_session
from app.leaderboard_repository import LeaderboardRepository
from app.steem_reward_service import SteemRewardService
from app.services import CoinService
from app.repositories import RepositoryFactory
from app.models import WeeklyWinner, User
from app.telegram_notifier import send_telegram_error, send_telegram_success, send_telegram_warning


logger = logging.getLogger(__name__)


class WeeklyLeaderboardScheduler:
    """Scheduler for weekly leaderboard maintenance."""
    
    def __init__(self):
        """Initialize scheduler."""
        self.running = False
        self.thread = None
        self.steem_service = SteemRewardService()
        # Use a dedicated scheduler instance to avoid conflicts with multiplier_scheduler
        self.scheduler = schedule.Scheduler()
        # The idempotency check is not atomic: one reset at a time, so a second
        # run of the same week (scheduler + admin, double click) sees it done
        self._reset_lock = threading.Lock()
        logger.info("✅ WeeklyLeaderboardScheduler initialized")

    def process_weekly_reset(self, week_start: str = None, week_end: str = None) -> Dict[str, Any]:
        """Process a weekly reset, one at a time (see _process_weekly_reset)."""
        with self._reset_lock:
            return self._process_weekly_reset(week_start, week_end)

    def _process_weekly_reset(self, week_start: str = None, week_end: str = None) -> Dict[str, Any]:
        """
        Process weekly leaderboard reset and rewards.
        
        Args:
            week_start: Start date of week to process (ISO format). If None, uses previous week.
            week_end: End date of week to process (ISO format). If None, uses previous week.
        
        Steps:
        1. Get previous week dates (or use provided dates)
        2. Check idempotency (prevent duplicate processing)
        3. Save winners to history
        4. Distribute STEEM rewards
        5. Distribute coin rewards
        6. Clear weekly leaderboard
        
        Returns:
            Dict with processing results
        """
        # Generate unique run ID for tracking
        run_id = f"weekly_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
        logger.info(f"🔄 Starting weekly leaderboard reset process (run_id: {run_id})...")
        
        results = {
            'success': False,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'run_id': run_id,
            'week_start': week_start,
            'week_end': week_end,
            'winners_saved': 0,
            'steem_sent': 0,
            'steem_failed': 0,
            'coins_distributed': 0,
            'leaderboard_cleared': 0,
            'games_processed': 0,
            'total_winners': 0,
            'errors': [],
            'skipped': False
        }
        
        try:
            with get_db_session() as session:
                lb_repo = LeaderboardRepository(session)
                
                # Step 1: Get week dates
                if week_start is None or week_end is None:
                    week_start, week_end = lb_repo.get_previous_week()
                
                results['week_start'] = week_start
                results['week_end'] = week_end
                
                logger.info(f"Processing week: {week_start} to {week_end}")
                
                # Step 2: 🔒 IDEMPOTENCY CHECK - Prevent duplicate processing
                existing_winners = session.query(WeeklyWinner).filter(
                    WeeklyWinner.week_start == week_start,
                    WeeklyWinner.week_end == week_end
                ).first()
                
                if existing_winners:
                    warning_msg = f"Week {week_start} to {week_end} already processed, skipping to prevent duplicates"
                    logger.warning(f"⚠️ {warning_msg}")
                    
                    # Send Telegram warning
                    send_telegram_warning(
                        "Weekly Reset - Already Processed",
                        warning_msg,
                        context={
                            'run_id': run_id,
                            'week_start': week_start,
                            'week_end': week_end,
                            'existing_winners_count': session.query(WeeklyWinner).filter(
                                WeeklyWinner.week_start == week_start,
                                WeeklyWinner.week_end == week_end
                            ).count()
                        }
                    )
                    
                    results['success'] = True
                    results['skipped'] = True
                    return results
                
                # Step 3: Save winners to history
                try:
                    winners = lb_repo.save_weekly_winners(week_start, week_end)
                    results['winners_saved'] = len(winners)
                    results['total_winners'] = len(winners)
                    
                    # Count unique games
                    unique_games = set(w.game_id for w in winners)
                    results['games_processed'] = len(unique_games)
                    
                    logger.info(f"✅ Saved {len(winners)} winners from {len(unique_games)} games to history")
                except Exception as e:
                    error_msg = f"Failed to save winners: {e}"
                    logger.error(error_msg)
                    results['errors'].append(error_msg)
                    return results
                
                # Step 3: Prepare winners data for rewards
                winners_data = []
                steem_enabled_winners = []
                
                for winner in winners:
                    # Get user data including steem_username
                    user = session.query(User).filter(User.user_id == winner.user_id).first()
                    if user:
                        from app.models import Game
                        game = session.query(Game).filter(Game.game_id == winner.game_id).first()
                        
                        winner_data = {
                            'winner_id': winner.winner_id,
                            'user_id': winner.user_id,
                            'steem_username': user.steem_username,
                            'steem_reward': winner.steem_reward,
                            'coin_reward': winner.coin_reward,
                            'rank': winner.rank,
                            'week_start': winner.week_start,
                            'week_end': winner.week_end,
                            'game_title': game.title if game else 'Unknown Game',
                            'game_id': winner.game_id,
                            'steem_enabled': game.steem_rewards_enabled if game else 0
                        }
                        
                        winners_data.append(winner_data)
                        
                        # Only add to STEEM list if game has STEEM rewards enabled
                        if game and game.steem_rewards_enabled:
                            steem_enabled_winners.append(winner_data)
                            logger.info(f"  💎 {game.title}: STEEM rewards ENABLED for rank #{winner.rank}")
                        else:
                            logger.info(f"  🪙 {game.title}: Only coins (STEEM disabled) for rank #{winner.rank}")
                
                if not winners_data:
                    logger.warning("⚠️  No winners found for the week")
                    results['success'] = True
                    return results
                
                logger.info(f"📊 Total winners: {len(winners_data)} | STEEM eligible: {len(steem_enabled_winners)}")
                
                # Step 4: Distribute STEEM rewards (only for enabled games)
                if steem_enabled_winners:
                    try:
                        logger.info(f"💰 Distributing STEEM to {len(steem_enabled_winners)} eligible winners...")
                        steem_results = self.steem_service.send_batch_rewards(steem_enabled_winners)
                        results['steem_sent'] = steem_results.get('sent', 0)
                        results['steem_failed'] = steem_results.get('failed', 0)
                        
                        # Update WeeklyWinner records with transaction info
                        for tx in steem_results.get('transactions', []):
                            if tx.get('tx_id'):
                                winner = session.query(WeeklyWinner).filter(
                                    WeeklyWinner.winner_id == tx['winner_id']
                                ).first()
                                
                                if winner:
                                    winner.steem_tx_id = tx['tx_id']
                                    winner.reward_sent = 1
                                    winner.reward_sent_at = datetime.now(timezone.utc).isoformat()
                        
                        session.commit()
                        logger.info(f"✅ STEEM rewards: {results['steem_sent']} sent, {results['steem_failed']} failed")
                        
                    except Exception as e:
                        error_msg = f"Failed to distribute STEEM rewards: {e}"
                        logger.error(error_msg)
                        results['errors'].append(error_msg)
                else:
                    logger.info("ℹ️  No games with STEEM rewards enabled - skipping STEEM distribution")
                
                # Step 5: Distribute coin rewards
                try:
                    coins_repo = RepositoryFactory.create_usercoins_repository(session)
                    transaction_repo = RepositoryFactory.create_cointransaction_repository(session)
                    coin_service = CoinService(coins_repo, transaction_repo)
                    
                    for winner_data in winners_data:
                        if winner_data['coin_reward'] > 0:
                            try:
                                coin_service.award_coins(
                                    user_id=winner_data['user_id'],
                                    amount=winner_data['coin_reward'],
                                    transaction_type='leaderboard_reward',
                                    source_id=str(winner_data['winner_id']),
                                    description=f"Weekly Leaderboard Reward - Rank #{winner_data['rank']} - {winner_data['game_title']}"
                                )
                                results['coins_distributed'] += winner_data['coin_reward']
                                logger.info(f"  🪙 Awarded {winner_data['coin_reward']} coins to user {winner_data['user_id']}")
                            except Exception as e:
                                error_msg = f"Failed to award coins to user {winner_data['user_id']}: {e}"
                                logger.error(error_msg)
                                results['errors'].append(error_msg)
                    
                    logger.info(f"✅ Distributed {results['coins_distributed']} coins to {len(winners_data)} winners")
                    
                except Exception as e:
                    error_msg = f"Failed to distribute coin rewards: {e}"
                    logger.error(error_msg)
                    results['errors'].append(error_msg)
                
                # Step 6: Clear weekly leaderboard
                try:
                    deleted = lb_repo.clear_weekly_leaderboard(week_start)
                    results['leaderboard_cleared'] = deleted
                    logger.info(f"✅ Cleared {deleted} entries from weekly leaderboard")
                except Exception as e:
                    error_msg = f"Failed to clear weekly leaderboard: {e}"
                    logger.error(error_msg)
                    results['errors'].append(error_msg)
                
                # Mark as successful if no critical errors
                results['success'] = len(results['errors']) == 0
                
                # 📲 Send Telegram notification
                if results['success']:
                    send_telegram_success(
                        "Weekly Leaderboard Reset - Completed",
                        f"Successfully processed week {week_start} to {week_end}",
                        stats={
                            'run_id': run_id,
                            'winners_saved': results['winners_saved'],
                            'games_processed': results['games_processed'],
                            'steem_sent': results['steem_sent'],
                            'steem_failed': results['steem_failed'],
                            'coins_distributed': results['coins_distributed'],
                            'leaderboard_cleared': results['leaderboard_cleared']
                        }
                    )
                else:
                    send_telegram_warning(
                        "Weekly Leaderboard Reset - Completed with Errors",
                        f"Processed week {week_start} to {week_end} but encountered {len(results['errors'])} errors",
                        context={
                            'run_id': run_id,
                            'errors': results['errors'],
                            'steem_sent': results['steem_sent'],
                            'steem_failed': results['steem_failed']
                        }
                    )
                
                logger.info(f"✅ Weekly reset complete: {results}")
                return results
                
        except Exception as e:
            error_msg = f"Critical error in weekly reset: {e}"
            logger.exception(error_msg)
            results['errors'].append(error_msg)
            
            # 📲 Send Telegram error notification
            send_telegram_error(
                "Weekly Leaderboard Reset - Critical Failure",
                e,
                context={
                    'run_id': run_id,
                    'week_start': week_start,
                    'week_end': week_end,
                    'partial_results': results
                }
            )
            
            return results
    
    def _ensure_steem(self) -> bool:
        """The connection is opened once, at startup: if the nodes were down then, open it again."""
        if not self.steem_service.steem:
            self.steem_service = SteemRewardService()
        return bool(self.steem_service.steem)

    def _week_steem_status(self, session, week_start: str) -> List[Dict[str, Any]]:
        """
        The STEEM rewards of a processed week, each with its status on the chain:
        'sent', 'to_send', or 'no_account' (the winner has no Steem account).
        The chain decides, not reward_sent: rewards were long sent without it.
        """
        from app.models import Game

        rows = session.query(WeeklyWinner, User, Game).join(
            User, WeeklyWinner.user_id == User.user_id
        ).join(
            Game, WeeklyWinner.game_id == Game.game_id
        ).filter(
            WeeklyWinner.week_start == week_start,
            WeeklyWinner.steem_reward > 0
        ).order_by(
            WeeklyWinner.game_id,
            WeeklyWinner.rank
        ).all()

        if not rows:
            return []

        week_end = rows[0][0].week_end
        sent = self.steem_service.get_sent_rewards(week_start, week_end)
        winners = []

        for winner, user, game in rows:
            title = SteemRewardService.reward_memo_title(winner.rank, game.title, week_start, week_end)
            tx_id = sent.get((user.steem_username, title))

            if not user.steem_username:
                status = 'no_account'
            elif (user.steem_username, title) in sent:
                status = 'sent'
            else:
                status = 'to_send'

            winners.append({
                'winner_id': winner.winner_id,
                'user_id': winner.user_id,
                'username': user.username,
                'steem_username': user.steem_username,
                'steem_reward': winner.steem_reward,
                'rank': winner.rank,
                'week_start': week_start,
                'week_end': week_end,
                'game_title': game.title,
                'status': status,
                'tx_id': tx_id
            })

        return winners

    def check_week_steem(self, week_start: str) -> Dict[str, Any]:
        """Which STEEM rewards of a processed week are on the chain and which are still owed."""
        if not self._ensure_steem():
            return {'success': False, 'error': 'Steem not initialized (check STEEM_ACTIVE_KEY and nodes)'}

        with get_db_session() as session:
            return {'success': True, 'winners': self._week_steem_status(session, week_start)}

    def resend_week_steem(self, week_start: str) -> Dict[str, Any]:
        """
        Send the STEEM rewards of a processed week that are not on the chain.
        Coins are not paid again. The chain is read again right before sending.
        """
        with self._reset_lock:
            if not self._ensure_steem():
                return {'success': False, 'error': 'Steem not initialized (check STEEM_ACTIVE_KEY and nodes)'}

            with get_db_session() as session:
                winners = self._week_steem_status(session, week_start)
                to_send = [w for w in winners if w['status'] == 'to_send']

                logger.info(f"📤 Resending STEEM for week {week_start}: {len(to_send)} of {len(winners)} rewards not on the chain")
                steem_results = self.steem_service.send_batch_rewards(to_send) if to_send else {}

                # Mark what is on the chain now, found there or just sent
                tx_ids = {w['winner_id']: w['tx_id'] for w in winners if w['status'] == 'sent'}
                tx_ids.update({
                    tx['winner_id']: tx.get('tx_id')
                    for tx in steem_results.get('transactions', [])
                    if 'error' not in tx
                })
                now = datetime.now(timezone.utc).isoformat()
                for winner in session.query(WeeklyWinner).filter(WeeklyWinner.winner_id.in_(tx_ids)):
                    winner.steem_tx_id = tx_ids[winner.winner_id]
                    winner.reward_sent = 1
                    winner.reward_sent_at = winner.reward_sent_at or now
                session.commit()

            errors = [
                f"{tx.get('user_id')}: {tx['error']}"
                for tx in steem_results.get('transactions', []) if 'error' in tx
            ]
            if steem_results.get('error'):
                errors.append(steem_results['error'])

            results = {
                'success': not errors,
                'already_sent': sum(1 for w in winners if w['status'] == 'sent'),
                'no_account': sum(1 for w in winners if w['status'] == 'no_account'),
                'steem_sent': steem_results.get('sent', 0),
                'steem_failed': steem_results.get('failed', 0),
                'errors': errors
            }
            logger.info(f"✅ STEEM resend for week {week_start}: {results}")
            return results

    def schedule_weekly_job(self):
        """Schedule weekly job to run every Monday at 00:00 UTC."""
        # Clear any existing jobs to prevent duplicates
        self.scheduler.clear()
        self.scheduler.every().monday.at("00:00").do(self.process_weekly_reset)
        logger.info("📅 Scheduled weekly reset for every Monday at 00:00 UTC")
    
    def run_scheduler(self):
        """Run the scheduler loop."""
        logger.info("▶️  Starting scheduler thread...")
        self.running = True
        
        while self.running:
            self.scheduler.run_pending()
            time.sleep(60)  # Check every minute
        
        logger.info("⏹️  Scheduler thread stopped")
    
    def start(self):
        """Start the scheduler in a background thread."""
        if self.thread and self.thread.is_alive():
            logger.warning("Scheduler already running")
            return
        
        self.schedule_weekly_job()
        self.thread = threading.Thread(target=self.run_scheduler, daemon=True)
        self.thread.start()
        logger.info("✅ Scheduler started")
    
    def stop(self):
        """Stop the scheduler."""
        logger.info("🛑 Stopping scheduler...")
        self.running = False
        
        if self.thread:
            self.thread.join(timeout=5)
        
        logger.info("✅ Scheduler stopped")
    
    def run_manual_reset(self, use_current_week: bool = False) -> Dict[str, Any]:
        """
        Manually trigger weekly reset (for testing or manual intervention).
        
        Args:
            use_current_week: If True, processes current week instead of previous (for testing)
        
        Returns:
            Processing results
        """
        logger.info("🔧 Manual reset triggered")
        
        if use_current_week:
            # For testing: process current week
            with get_db_session() as session:
                lb_repo = LeaderboardRepository(session)
                week_start, week_end = lb_repo.get_current_week()
                logger.info(f"📅 Processing CURRENT week (test mode): {week_start} to {week_end}")
                return self.process_weekly_reset(week_start, week_end)
        else:
            # Normal operation: process previous week
            return self.process_weekly_reset()


# Global scheduler instance
_scheduler_instance = None


def get_scheduler() -> WeeklyLeaderboardScheduler:
    """Get or create global scheduler instance."""
    global _scheduler_instance
    
    if _scheduler_instance is None:
        _scheduler_instance = WeeklyLeaderboardScheduler()
    
    return _scheduler_instance


def start_scheduler():
    """Start the global scheduler."""
    scheduler = get_scheduler()
    scheduler.start()


def stop_scheduler():
    """Stop the global scheduler."""
    global _scheduler_instance
    
    if _scheduler_instance:
        _scheduler_instance.stop()
        _scheduler_instance = None
