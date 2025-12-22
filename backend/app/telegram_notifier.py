"""
Telegram Notification Service
Sends alerts and events to Telegram bot/channel
"""

import logging
import os
from typing import Optional
import requests
from datetime import datetime

logger = logging.getLogger(__name__)


class TelegramNotifier:
    """Service for sending Telegram notifications."""
    
    def __init__(self):
        """Initialize Telegram notifier."""
        self.bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
        self.chat_id = os.getenv('TELEGRAM_CHAT_ID')
        self.enabled = bool(self.bot_token and self.chat_id)
        
        if not self.enabled:
            logger.warning("⚠️ Telegram notifications disabled (missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID)")
        else:
            logger.info(f"✅ Telegram notifications enabled (chat_id: {self.chat_id})")
    
    def send_message(self, message: str, parse_mode: str = 'HTML') -> bool:
        """
        Send a message to Telegram.
        
        Args:
            message: Message text (supports HTML or Markdown)
            parse_mode: 'HTML' or 'Markdown'
        
        Returns:
            True if sent successfully, False otherwise
        """
        if not self.enabled:
            logger.debug(f"Telegram disabled, would send: {message}")
            return False
        
        try:
            url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
            payload = {
                'chat_id': self.chat_id,
                'text': message,
                'parse_mode': parse_mode,
                'disable_web_page_preview': True
            }
            
            response = requests.post(url, json=payload, timeout=10)
            
            if response.status_code == 200:
                logger.debug("✅ Telegram message sent successfully")
                return True
            else:
                logger.error(f"❌ Telegram API error: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Failed to send Telegram message: {e}")
            return False
    
    def send_error(self, title: str, error: Exception, context: dict = None) -> bool:
        """
        Send error notification with formatted details.
        
        Args:
            title: Error title/source
            error: Exception object
            context: Additional context dict
        
        Returns:
            True if sent successfully
        """
        timestamp = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')
        
        message = f"🚨 <b>ERROR: {title}</b>\n\n"
        message += f"⏰ <b>Time:</b> {timestamp}\n"
        message += f"❌ <b>Error:</b> {type(error).__name__}\n"
        message += f"📝 <b>Message:</b> {str(error)}\n"
        
        if context:
            message += f"\n<b>Context:</b>\n"
            for key, value in context.items():
                message += f"  • {key}: {value}\n"
        
        return self.send_message(message)
    
    def send_warning(self, title: str, message: str, context: dict = None) -> bool:
        """
        Send warning notification.
        
        Args:
            title: Warning title
            message: Warning message
            context: Additional context
        
        Returns:
            True if sent successfully
        """
        timestamp = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')
        
        msg = f"⚠️ <b>WARNING: {title}</b>\n\n"
        msg += f"⏰ <b>Time:</b> {timestamp}\n"
        msg += f"📝 <b>Message:</b> {message}\n"
        
        if context:
            msg += f"\n<b>Context:</b>\n"
            for key, value in context.items():
                msg += f"  • {key}: {value}\n"
        
        return self.send_message(msg)
    
    def send_success(self, title: str, message: str, stats: dict = None) -> bool:
        """
        Send success notification with stats.
        
        Args:
            title: Success title
            message: Success message
            stats: Statistics dict
        
        Returns:
            True if sent successfully
        """
        timestamp = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')
        
        msg = f"✅ <b>SUCCESS: {title}</b>\n\n"
        msg += f"⏰ <b>Time:</b> {timestamp}\n"
        msg += f"📝 {message}\n"
        
        if stats:
            msg += f"\n<b>Statistics:</b>\n"
            for key, value in stats.items():
                msg += f"  • {key}: {value}\n"
        
        return self.send_message(msg)
    
    def send_info(self, title: str, message: str) -> bool:
        """
        Send info notification.
        
        Args:
            title: Info title
            message: Info message
        
        Returns:
            True if sent successfully
        """
        timestamp = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')
        
        msg = f"ℹ️ <b>INFO: {title}</b>\n\n"
        msg += f"⏰ <b>Time:</b> {timestamp}\n"
        msg += f"📝 {message}\n"
        
        return self.send_message(msg)


# Global notifier instance
_telegram_notifier: Optional[TelegramNotifier] = None


def get_telegram_notifier() -> TelegramNotifier:
    """Get or create global Telegram notifier instance."""
    global _telegram_notifier
    
    if _telegram_notifier is None:
        _telegram_notifier = TelegramNotifier()
    
    return _telegram_notifier


def send_telegram_error(title: str, error: Exception, context: dict = None) -> bool:
    """Convenience function to send error."""
    return get_telegram_notifier().send_error(title, error, context)


def send_telegram_warning(title: str, message: str, context: dict = None) -> bool:
    """Convenience function to send warning."""
    return get_telegram_notifier().send_warning(title, message, context)


def send_telegram_success(title: str, message: str, stats: dict = None) -> bool:
    """Convenience function to send success."""
    return get_telegram_notifier().send_success(title, message, stats)


def send_telegram_info(title: str, message: str) -> bool:
    """Convenience function to send info."""
    return get_telegram_notifier().send_info(title, message)
