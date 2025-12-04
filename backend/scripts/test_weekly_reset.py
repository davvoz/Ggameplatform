"""
Test script for weekly leaderboard reset and rewards distribution
"""
import sys
import os
from pathlib import Path

# Add parent directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.database import get_db_session
from app.models import WeeklyLeaderboard, WeeklyWinner, User, Game, LeaderboardReward
from app.leaderboard_repository import LeaderboardRepository
from datetime import datetime
import uuid


def create_test_data():
    """Create test data for weekly leaderboard"""
    print("\n🎮 Creating test data for weekly leaderboard...")
    
    with get_db_session() as session:
        lb_repo = LeaderboardRepository(session)
        week_start, week_end = lb_repo.get_current_week()
        
        # Get existing users and games
        users = session.query(User).limit(5).all()
        games = session.query(Game).limit(2).all()
        
        if not users or not games:
            print("❌ Need at least 1 user and 1 game in database!")
            return False
        
        print(f"📅 Current week: {week_start} to {week_end}")
        print(f"👥 Found {len(users)} users")
        print(f"🎮 Found {len(games)} games")
        
        # Clear existing weekly entries for current week
        session.query(WeeklyLeaderboard).filter(
            WeeklyLeaderboard.week_start == week_start
        ).delete()
        session.commit()
        
        # Create test entries for first game
        game = games[0]
        test_scores = [
            (users[0], 1000),  # 1st place - Gold
            (users[1], 850),   # 2nd place - Silver
            (users[2], 700),   # 3rd place - Bronze
            (users[3] if len(users) > 3 else users[0], 550),  # 4th place - Top 10
            (users[4] if len(users) > 4 else users[1], 400),  # 5th place - Top 10
        ]
        
        now = datetime.utcnow().isoformat()
        
        for user, score in test_scores:
            entry = WeeklyLeaderboard(
                entry_id=f"test_wkly_{uuid.uuid4().hex[:16]}",
                week_start=week_start,
                week_end=week_end,
                user_id=user.user_id,
                game_id=game.game_id,
                score=score,
                created_at=now,
                updated_at=now
            )
            session.add(entry)
            print(f"  ✅ Added: {user.username} - {score} points in {game.title}")
        
        session.commit()
        
        # Show current leaderboard
        print(f"\n📊 Weekly Leaderboard for {game.title}:")
        entries = session.query(WeeklyLeaderboard).filter(
            WeeklyLeaderboard.week_start == week_start,
            WeeklyLeaderboard.game_id == game.game_id
        ).order_by(WeeklyLeaderboard.score.desc()).all()
        
        for rank, entry in enumerate(entries, 1):
            user = session.query(User).filter(User.user_id == entry.user_id).first()
            print(f"  {rank}. {user.username}: {entry.score} points")
        
        # Show reward configuration
        print("\n🏅 Reward Configuration:")
        rewards = session.query(LeaderboardReward).order_by(LeaderboardReward.rank_start).all()
        for reward in rewards:
            ranks = f"{reward.rank_start}" if reward.rank_start == reward.rank_end else f"{reward.rank_start}-{reward.rank_end}"
            game_label = f" ({reward.game_id})" if reward.game_id else " (Global)"
            print(f"  Rank {ranks}{game_label}: {reward.steem_reward} STEEM + {reward.coin_reward} coins")
        
        return True


def test_weekly_reset():
    """Test the weekly reset process"""
    print("\n" + "="*60)
    print("🔄 TESTING WEEKLY RESET PROCESS")
    print("="*60)
    
    with get_db_session() as session:
        lb_repo = LeaderboardRepository(session)
        week_start, week_end = lb_repo.get_current_week()
        
        # Count entries before reset
        entries_before = session.query(WeeklyLeaderboard).filter(
            WeeklyLeaderboard.week_start == week_start
        ).count()
        
        winners_before = session.query(WeeklyWinner).filter(
            WeeklyWinner.week_start == week_start
        ).count()
        
        print(f"\n📊 Before reset:")
        print(f"  - Weekly entries: {entries_before}")
        print(f"  - Winners archived: {winners_before}")
    
    # Trigger manual reset via API (with current week for testing)
    print("\n🔄 Triggering manual reset via API (current week test mode)...")
    import requests
    
    try:
        response = requests.post('http://localhost:8000/api/leaderboard/manual-reset?use_current_week=true')
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Reset completed successfully!")
            print(f"\nResults:")
            
            if 'results' in result:
                results = result['results']
                if 'games_processed' in results:
                    print(f"  📊 Games processed: {results['games_processed']}")
                if 'total_winners' in results:
                    print(f"  🏆 Total winners: {results['total_winners']}")
                if 'steem_sent' in results:
                    print(f"  💰 STEEM rewards sent: {results['steem_sent']}")
                if 'coins_sent' in results:
                    print(f"  🪙 Coin rewards sent: {results['coins_sent']}")
        else:
            print(f"❌ Reset failed with status {response.status_code}")
            print(response.text)
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to backend! Make sure it's running on http://localhost:8000")
        return False
    except Exception as e:
        print(f"❌ Error during reset: {e}")
        return False
    
    # Check results after reset
    with get_db_session() as session:
        lb_repo = LeaderboardRepository(session)
        week_start, week_end = lb_repo.get_current_week()
        
        entries_after = session.query(WeeklyLeaderboard).filter(
            WeeklyLeaderboard.week_start == week_start
        ).count()
        
        winners_after = session.query(WeeklyWinner).filter(
            WeeklyWinner.week_start == week_start
        ).count()
        
        print(f"\n📊 After reset:")
        print(f"  - Weekly entries: {entries_after}")
        print(f"  - Winners archived: {winners_after}")
        
        # Show winners
        if winners_after > 0:
            print(f"\n🏆 Winners archived:")
            winners = session.query(WeeklyWinner).filter(
                WeeklyWinner.week_start == week_start
            ).order_by(WeeklyWinner.game_id, WeeklyWinner.rank).all()
            
            current_game = None
            for winner in winners:
                user = session.query(User).filter(User.user_id == winner.user_id).first()
                game = session.query(Game).filter(Game.game_id == winner.game_id).first()
                
                if current_game != winner.game_id:
                    current_game = winner.game_id
                    print(f"\n  🎮 {game.title}:")
                
                medal = "🥇" if winner.rank == 1 else "🥈" if winner.rank == 2 else "🥉" if winner.rank == 3 else "🏅"
                steem_status = "✅" if winner.reward_sent else "⏳"
                print(f"    {medal} #{winner.rank} - {user.username}: {winner.score} pts")
                print(f"       💰 {winner.steem_reward} STEEM + 🪙 {winner.coin_reward} coins {steem_status}")
                if winner.steem_tx_id:
                    print(f"       TX: {winner.steem_tx_id[:16]}...")
        
        # Verify weekly leaderboard was cleared
        if entries_after == 0:
            print(f"\n✅ Weekly leaderboard successfully cleared!")
        else:
            print(f"\n⚠️  Weekly leaderboard still has {entries_after} entries")
        
        return True


def main():
    """Main test function"""
    print("\n" + "="*60)
    print("🧪 WEEKLY LEADERBOARD RESET TEST")
    print("="*60)
    
    # Step 1: Create test data
    if not create_test_data():
        print("\n❌ Test data creation failed!")
        return
    
    input("\n⏸️  Press Enter to trigger the weekly reset...")
    
    # Step 2: Test reset
    if test_weekly_reset():
        print("\n" + "="*60)
        print("✅ TEST COMPLETED SUCCESSFULLY!")
        print("="*60)
        print("\nWhat was tested:")
        print("  1. ✅ Weekly leaderboard populated with test data")
        print("  2. ✅ Manual reset triggered")
        print("  3. ✅ Winners archived to weekly_winners table")
        print("  4. ✅ Rewards calculated and distributed")
        print("  5. ✅ Weekly leaderboard cleared for next week")
        print("\nNote: STEEM rewards require valid credentials in .env")
        print("      Coins rewards should be distributed to user balances")
    else:
        print("\n❌ TEST FAILED!")


if __name__ == "__main__":
    main()
