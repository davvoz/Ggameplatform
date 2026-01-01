"""
Steem Post Service
Handles creation and publication of Steem posts with user gaming statistics
"""

from typing import Dict, Any, Optional, List
from datetime import datetime
import os


class SteemPostService:
    """Service for creating and publishing Steem posts"""
    
    POST_COST_COINS = 500  # Cost in coins to publish a post
    
    def __init__(self):
        """Initialize Steem post service"""
        self.platform_account = os.getenv('STEEM_ACCOUNT', 'cur8')
        
    def generate_post_content(
        self,
        username: str,
        level: int,
        total_xp: float,
        games_played: int,
        total_play_time: str,
        leaderboard_positions: List[Dict[str, Any]],
        user_message: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Generate formatted Steem post content with user statistics
        
        Args:
            username: User's Steem username
            level: Current level
            total_xp: Total XP earned
            games_played: Number of games played
            total_play_time: Total time played
            leaderboard_positions: List of user's leaderboard positions
            user_message: Optional personal message from user
            
        Returns:
            Dictionary with title, body, and tags
        """
        
        # Generate engaging title
        title = f"🎮 My Gaming Journey on Cur8 Games - Level {level} Achievement!"
        
        # Format leaderboard positions
        leaderboard_section = self._format_leaderboard_section(leaderboard_positions)
        
        # Build post body
        body_parts = []
        
        # Header
        body_parts.append(f"<center>")
        body_parts.append(f"<h1>🏆 Gaming Milestone Reached!</h1>")
        body_parts.append(f"</center>\n")
        
        # Personal message if provided
        if user_message and user_message.strip():
            body_parts.append(f"## 💭 My Thoughts\n")
            body_parts.append(f"{user_message.strip()}\n")
            body_parts.append(f"---\n")
        
        # Statistics section
        body_parts.append(f"## 📊 My Gaming Statistics\n")
        body_parts.append(f"I'm excited to share my progress on [Cur8 Games](https://games.cur8.fun)!\n")
        body_parts.append(f"")
        body_parts.append(f"### 🎯 Current Status")
        body_parts.append(f"- **Level:** {level}")
        body_parts.append(f"- **Total XP:** {total_xp:,.0f}")
        body_parts.append(f"- **Games Played:** {games_played}")
        body_parts.append(f"- **Total Play Time:** {total_play_time}")
        body_parts.append(f"")
        
        # Leaderboard positions
        if leaderboard_positions:
            body_parts.append(leaderboard_section)
            body_parts.append(f"")
        
        # About the platform
        body_parts.append(f"---\n")
        body_parts.append(f"## 🎮 About Cur8 Games\n")
        body_parts.append(f"")
        body_parts.append(f"Cur8 Games is an innovative **blockchain-integrated gaming platform** where you can:")
        body_parts.append(f"")
        body_parts.append(f"✅ **Play exciting games** and earn XP and rewards  ")
        body_parts.append(f"✅ **Compete in leaderboards** with players worldwide  ")
        body_parts.append(f"✅ **Level up your account** and unlock achievements  ")
        body_parts.append(f"✅ **Earn Steem** through leaderboards and posts  ")
        body_parts.append(f"✅ **Connect your Steem account** for enhanced rewards  ")
        body_parts.append(f"")
        
        # CTA section
        body_parts.append(f"---\n")
        body_parts.append(f"## 🚀 Join the Gaming Revolution!\n")
        body_parts.append(f"")
        body_parts.append(f"Want to start your own gaming journey? [Join us now!](https://games.cur8.fun)\n")
        body_parts.append(f"")
        body_parts.append(f"### 💎 Support the CUR8 Ecosystem")
        body_parts.append(f"")
        body_parts.append(f"Help us grow the platform:")
        body_parts.append(f"")
        body_parts.append(f"1. 🗳️ **Vote for @cur8.witness** - Support our Steem witness, earn more XP!")
        body_parts.append(f"2. 🤝 **Delegate to @cur8** - Earn enhanced XP multipliers and rewards")
        body_parts.append(f"3. 🎮 **Play games and earn** - The more you play, the more you earn!")
        body_parts.append(f"")
        body_parts.append(f"<center>")
        body_parts.append(f"")
        body_parts.append(f"### 🔗 **[Start Playing Now!](https://games.cur8.fun)**")
        body_parts.append(f"")
        body_parts.append(f"### 🌐 **[Visit Our Website](https://cur8.fun)**")
        body_parts.append(f"")
        body_parts.append(f"---")
        body_parts.append(f"")
        body_parts.append(f"*Posted via Cur8 Games*  ")
        body_parts.append(f"*Powered by @{self.platform_account}*")
        body_parts.append(f"")
        body_parts.append(f"</center>")
        
        body = "\n".join(body_parts)
        
        # Tags
        tags = ["hive-120997", "cur8", "games", "steem", "gaming", "achievement"]
        
        return {
            "title": title,
            "body": body,
            "tags": tags
        }
    
    def _format_leaderboard_section(self, positions: List[Dict[str, Any]]) -> str:
        """Format leaderboard positions into readable text"""
        if not positions:
            return ""
        
        lines = []
        lines.append("### 🏆 Leaderboard Rankings")
        lines.append("")
        lines.append("Here are my current positions:")
        lines.append("")
        
        # Format table
        lines.append("| Game | Rank | Score |")
        lines.append("|------|------|-------|")
        
        for pos in positions[:5]:  # Show top 5 positions
            game_name = pos.get('game_name', 'Unknown Game')
            rank = pos.get('rank', '?')
            score = pos.get('score', 0)
            
            # Add medal emoji for top 3
            medal = ""
            if rank == 1:
                medal = "🥇 "
            elif rank == 2:
                medal = "🥈 "
            elif rank == 3:
                medal = "🥉 "
            
            lines.append(f"| {game_name} | {medal}#{rank} | {score:,} |")
        
        lines.append("")
        
        return "\n".join(lines)
    
    def validate_post_request(
        self,
        user_id: str,
        steem_username: str,
        user_balance: int
    ) -> Dict[str, Any]:
        """
        Validate that user can publish a post
        
        Args:
            user_id: User identifier
            steem_username: Steem username
            user_balance: User's current coin balance
            
        Returns:
            Validation result with success flag and message
        """
        if not steem_username:
            return {
                "success": False,
                "message": "Only Steem users can publish posts",
                "code": "NO_STEEM_ACCOUNT"
            }
        
        if user_balance < self.POST_COST_COINS:
            return {
                "success": False,
                "message": f"Insufficient balance. You need {self.POST_COST_COINS} coins to publish a post.",
                "code": "INSUFFICIENT_BALANCE",
                "required": self.POST_COST_COINS,
                "current": user_balance
            }
        
        return {
            "success": True,
            "message": "Ready to publish",
            "cost": self.POST_COST_COINS
        }
    
    def prepare_post_metadata(
        self,
        username: str,
        user_id: str,
        level: int,
        total_xp: float
    ) -> Dict[str, Any]:
        """Prepare metadata for post tracking"""
        return {
            "app": "cur8-game-platform/1.0",
            "format": "markdown",
            "user_id": user_id,
            "level": level,
            "total_xp": total_xp,
            "timestamp": datetime.utcnow().isoformat()
        }
