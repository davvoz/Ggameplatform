"""
Steem Reward Service
Handles STEEM transactions for leaderboard rewards
"""

import os
import logging
from typing import Optional, Dict, Any
from datetime import datetime

try:
    from beem import Steem
    from beem.account import Account
    from beem.exceptions import AccountDoesNotExistsException
    from beem.transactionbuilder import TransactionBuilder
    from beembase import operations
    BEEM_AVAILABLE = True
except ImportError:
    BEEM_AVAILABLE = False
    logging.warning("beem library not installed. STEEM rewards will not work.")


logger = logging.getLogger(__name__)


class SteemRewardService:
    """Service for sending STEEM rewards to winners."""
    
    def __init__(self):
        """Initialize Steem connection."""
        if not BEEM_AVAILABLE:
            logger.error("Cannot initialize SteemRewardService: beem library not installed")
            self.steem = None
            self.account_name = None
            return
        
        # Get credentials from environment
        self.account_name = os.getenv('STEEM_ACCOUNT', 'cur8.fund')
        self.posting_key = os.getenv('STEEM_POSTING_KEY')
        self.active_key = os.getenv('STEEM_ACTIVE_KEY')
        
        if not self.active_key:
            logger.warning("STEEM_ACTIVE_KEY not set. Rewards will not be sent.")
            self.steem = None
            return
        
        try:
            # Initialize Steem connection with nodes
            nodes = [
                'https://api.moecki.online',
                'https://api.pennsif.net',
                'https://steemapi.boylikegirl.club',
                'https://cn.steems.top',
                'https://api.worldofxpilar.com',
                'https://api.upvu.org'
            ]
            self.steem = Steem(nobroadcast=False, keys=[self.active_key], node=nodes)
            logger.info(f"✅ SteemRewardService initialized with account: {self.account_name}")
        except Exception as e:
            logger.error(f"Failed to initialize Steem connection: {e}")
            self.steem = None
    
    def send_reward(
        self, 
        to_username: str, 
        amount: float, 
        memo: str,
        week_start: str,
        week_end: str,
        rank: int,
        game_title: str
    ) -> Optional[Dict[str, Any]]:
        """
        Send STEEM reward to a user.
        
        Args:
            to_username: Steem username to send to
            amount: Amount of STEEM to send
            memo: Transaction memo
            week_start: Week start date
            week_end: Week end date
            rank: User's rank
            game_title: Game title
            
        Returns:
            Dict with transaction details or None if failed
        """
        if not BEEM_AVAILABLE or not self.steem:
            logger.error("Cannot send reward: Steem not initialized")
            return None
        
        if amount <= 0:
            logger.warning(f"Invalid amount {amount} for {to_username}")
            return None
        
        if not to_username:
            logger.error("No Steem username provided")
            return None
        
        try:
            # Verify recipient account exists
            try:
                Account(to_username, blockchain_instance=self.steem)
            except AccountDoesNotExistsException:
                logger.error(f"Steem account does not exist: {to_username}")
                return {
                    'success': False,
                    'error': 'account_not_found',
                    'message': f"Steem account @{to_username} does not exist"
                }
            
            # Format memo
            full_memo = f"🏆 Weekly Leaderboard Reward - Rank #{rank} - {game_title} ({week_start} to {week_end})\n{memo}"
            
            # Send transfer using the same method as steembot
            tb = TransactionBuilder(steem_instance=self.steem)
            
            transfer_op = operations.Transfer(
                **{
                    'from': self.account_name,
                    'to': to_username,
                    'amount': f'{amount:.3f} STEEM',
                    'memo': full_memo
                }
            )
            
            tb.appendOps(transfer_op)
            tb.appendSigner(self.account_name, 'active')
            tb.sign()
            result = tb.broadcast()
            
            tx_id = result.get('id') if result else None
            
            logger.info(f"✅ Sent {amount} STEEM to @{to_username} - TX: {tx_id}")
            
            return {
                'success': True,
                'tx_id': tx_id,
                'amount': amount,
                'to': to_username,
                'memo': full_memo,
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to send reward to @{to_username}: {e}")
            return {
                'success': False,
                'error': str(e),
                'to': to_username,
                'amount': amount
            }
    
    def send_batch_rewards(self, winners: list) -> Dict[str, Any]:
        """
        Send rewards to multiple winners.
        
        Args:
            winners: List of winner dicts with keys:
                - steem_username
                - steem_reward
                - winner_id
                - rank
                - game_title
                - week_start
                - week_end
                
        Returns:
            Dict with results summary
        """
        if not BEEM_AVAILABLE or not self.steem:
            logger.error("Cannot send batch rewards: Steem not initialized")
            return {
                'success': False,
                'sent': 0,
                'failed': 0,
                'total': len(winners),
                'error': 'steem_not_initialized'
            }
        
        results = {
            'success': True,
            'sent': 0,
            'failed': 0,
            'total': len(winners),
            'transactions': []
        }
        
        for winner in winners:
            if not winner.get('steem_username'):
                logger.warning(f"Winner {winner.get('user_id')} has no Steem username - skipping")
                results['failed'] += 1
                continue
            
            if winner.get('steem_reward', 0) <= 0:
                logger.debug(f"Winner {winner.get('user_id')} has no STEEM reward - skipping")
                continue
            
            memo = f"Congratulations! You ranked #{winner['rank']} in the weekly leaderboard!"
            
            tx_result = self.send_reward(
                to_username=winner['steem_username'],
                amount=winner['steem_reward'],
                memo=memo,
                week_start=winner['week_start'],
                week_end=winner['week_end'],
                rank=winner['rank'],
                game_title=winner.get('game_title', 'Game')
            )
            
            if tx_result and tx_result.get('success'):
                results['sent'] += 1
                results['transactions'].append({
                    'winner_id': winner.get('winner_id'),
                    'user_id': winner.get('user_id'),
                    'tx_id': tx_result.get('tx_id'),
                    'amount': tx_result.get('amount')
                })
            else:
                results['failed'] += 1
                results['transactions'].append({
                    'winner_id': winner.get('winner_id'),
                    'user_id': winner.get('user_id'),
                    'error': tx_result.get('error') if tx_result else 'unknown'
                })
        
        logger.info(f"Batch rewards complete: {results['sent']} sent, {results['failed']} failed")
        return results
    
    def get_account_balance(self) -> Optional[float]:
        """Get current STEEM balance of reward account."""
        if not BEEM_AVAILABLE or not self.steem:
            return None
        
        try:
            account = Account(self.account_name, blockchain_instance=self.steem)
            balance = account.get_balance('available', 'STEEM')
            return float(balance)
        except Exception as e:
            logger.error(f"Failed to get account balance: {e}")
            return None
    
    def verify_transaction(self, tx_id: str) -> Optional[Dict[str, Any]]:
        """Verify a transaction exists on the blockchain."""
        if not BEEM_AVAILABLE or not self.steem:
            return None
        
        try:
            from beem.blockchain import Blockchain
            blockchain = Blockchain(blockchain_instance=self.steem)
            
            # This is a placeholder - actual implementation would query transaction
            # beem doesn't have direct tx lookup by ID, would need block number
            logger.warning("Transaction verification not fully implemented")
            return {'exists': False, 'message': 'verification_not_implemented'}
            
        except Exception as e:
            logger.error(f"Failed to verify transaction {tx_id}: {e}")
            return None
