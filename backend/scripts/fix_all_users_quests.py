"""
Fix and update all user quests for all users in the database.
This script recalculates quest progress for every user based on their actual game data.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import get_db_session
from app.models import User, Quest, UserQuest, GameSession, WeeklyLeaderboard
from app.level_system import LevelSystem
from sqlalchemy import func
from datetime import datetime, timedelta
import json


def get_today_date() -> str:
    """Get today's date as YYYY-MM-DD string."""
    return datetime.utcnow().strftime('%Y-%m-%d')


def get_week_start_date() -> str:
    """Get the start of current week (Monday) as YYYY-MM-DD string."""
    today = datetime.utcnow()
    week_start = today - timedelta(days=today.weekday())
    return week_start.strftime('%Y-%m-%d')


def calculate_progress(db, user_id: str, quest: Quest) -> int:
    """Calculate the current progress for a quest based on user's actual data."""
    
    quest_type = quest.quest_type
    
    # Parse quest config
    config = {}
    try:
        if quest.config:
            config = json.loads(quest.config)
    except:
        pass
    
    # 1. Play games (cumulative)
    if quest_type == "play_games":
        return db.query(GameSession).filter(
            GameSession.user_id == user_id,
            GameSession.ended_at.isnot(None)
        ).count()
    
    # 2. Play games weekly
    elif quest_type == "play_games_weekly":
        week_start = datetime.strptime(get_week_start_date(), '%Y-%m-%d')
        return db.query(GameSession).filter(
            GameSession.user_id == user_id,
            GameSession.ended_at.isnot(None),
            GameSession.ended_at >= week_start.isoformat()
        ).count()
    
    # 3. Play time (cumulative seconds)
    elif quest_type == "play_time":
        total = db.query(func.sum(GameSession.duration_seconds)).filter(
            GameSession.user_id == user_id,
            GameSession.ended_at.isnot(None)
        ).scalar() or 0
        return int(total)
    
    # 4. Play time daily (seconds today)
    elif quest_type == "play_time_daily":
        today_start = datetime.strptime(get_today_date(), '%Y-%m-%d')
        total = db.query(func.sum(GameSession.duration_seconds)).filter(
            GameSession.user_id == user_id,
            GameSession.ended_at.isnot(None),
            GameSession.ended_at >= today_start.isoformat()
        ).scalar() or 0
        return int(total)
    
    # 5. Play time cumulative (same as play_time but different quest)
    elif quest_type == "play_time_cumulative":
        total = db.query(func.sum(GameSession.duration_seconds)).filter(
            GameSession.user_id == user_id,
            GameSession.ended_at.isnot(None)
        ).scalar() or 0
        return int(total)
    
    # 6. Play same game (max sessions for any single game)
    elif quest_type == "play_same_game":
        game_counts = db.query(
            GameSession.game_id,
            func.count(GameSession.session_id).label('count')
        ).filter(
            GameSession.user_id == user_id,
            GameSession.ended_at.isnot(None)
        ).group_by(GameSession.game_id).all()
        
        return max([gc.count for gc in game_counts]) if game_counts else 0
    
    # 7. Score threshold per game
    elif quest_type == "score_threshold_per_game":
        min_score = config.get('min_score', 100)
        game_id = config.get('game_id')
        
        query = db.query(GameSession).filter(
            GameSession.user_id == user_id,
            GameSession.ended_at.isnot(None),
            GameSession.score >= min_score
        )
        
        if game_id:
            query = query.filter(GameSession.game_id == game_id)
        
        return query.count()
    
    # 8. Reach level
    elif quest_type == "reach_level":
        user = db.query(User).filter(User.user_id == user_id).first()
        if user:
            current_level = LevelSystem.calculate_level_from_xp(user.total_xp_earned)
            return current_level
        return 0
    
    # 9. XP daily
    elif quest_type == "xp_daily":
        today_start = datetime.strptime(get_today_date(), '%Y-%m-%d')
        total_xp = db.query(func.sum(GameSession.xp_earned)).filter(
            GameSession.user_id == user_id,
            GameSession.ended_at.isnot(None),
            GameSession.ended_at >= today_start.isoformat()
        ).scalar() or 0
        return int(total_xp)
    
    # 10. XP weekly
    elif quest_type == "xp_weekly":
        week_start = datetime.strptime(get_week_start_date(), '%Y-%m-%d')
        total_xp = db.query(func.sum(GameSession.xp_earned)).filter(
            GameSession.user_id == user_id,
            GameSession.ended_at.isnot(None),
            GameSession.ended_at >= week_start.isoformat()
        ).scalar() or 0
        return int(total_xp)
    
    # 11. Complete quests
    elif quest_type == "complete_quests":
        return db.query(UserQuest).filter(
            UserQuest.user_id == user_id,
            UserQuest.is_completed == 1
        ).count()
    
    # 12. Score ends with (any score ending with target digit)
    elif quest_type == "score_ends_with":
        target_digit = quest.target_value
        sessions = db.query(GameSession).filter(
            GameSession.user_id == user_id,
            GameSession.ended_at.isnot(None),
            GameSession.score > 0
        ).all()
        
        for session in sessions:
            if session.score % 10 == target_digit:
                return 1
        return 0
    
    # 13. Login after 24h
    elif quest_type == "login_after_24h":
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user or not user.last_login:
            return 0
        
        try:
            last_login = datetime.fromisoformat(user.last_login)
            created = datetime.fromisoformat(user.created_at)
            diff = (last_login - created).total_seconds()
            
            if diff >= 86400:  # 24 hours
                return 1
        except:
            pass
        return 0
    
    # 14. Login streak
    elif quest_type == "login_streak":
        user = db.query(User).filter(User.user_id == user_id).first()
        return user.login_streak if user else 0
    
    # 15. Leaderboard top (weekly)
    elif quest_type == "leaderboard_top":
        target_position = quest.target_value
        
        entries = db.query(WeeklyLeaderboard).filter(
            WeeklyLeaderboard.user_id == user_id
        ).all()
        
        for entry in entries:
            if entry.rank is not None and entry.rank <= target_position:
                return target_position
        return 0
    
    return 0


def update_user_quest(db, user_id: str, quest: Quest, user: User) -> dict:
    """Update or create a user quest with calculated progress."""
    
    # Get or create user quest
    user_quest = db.query(UserQuest).filter(
        UserQuest.user_id == user_id,
        UserQuest.quest_id == quest.quest_id
    ).first()
    
    if not user_quest:
        now = datetime.utcnow().isoformat()
        user_quest = UserQuest(
            user_id=user_id,
            quest_id=quest.quest_id,
            current_progress=0,
            is_completed=0,
            started_at=now,
            extra_data='{}'
        )
        db.add(user_quest)
        db.flush()
    
    # Calculate current progress
    new_progress = calculate_progress(db, user_id, quest)
    old_progress = user_quest.current_progress
    
    # Update progress
    user_quest.current_progress = new_progress
    
    # Update extra_data for daily/weekly quests
    extra_data = {}
    try:
        if user_quest.extra_data:
            extra_data = json.loads(user_quest.extra_data)
    except:
        pass
    
    if quest.quest_type in ['play_time_daily', 'xp_daily']:
        extra_data['last_reset_date'] = get_today_date()
    elif quest.quest_type in ['play_games_weekly', 'xp_weekly']:
        extra_data['last_reset_week'] = get_week_start_date()
    elif quest.quest_type == 'login_after_24h':
        extra_data['last_counted_date'] = get_today_date()
    
    user_quest.extra_data = json.dumps(extra_data)
    
    # Check if completed
    was_completed = user_quest.is_completed
    if new_progress >= quest.target_value and not was_completed:
        user_quest.is_completed = 1
        user_quest.completed_at = datetime.utcnow().isoformat()
        
        # Award XP
        user.total_xp_earned += quest.xp_reward
        
        return {
            'status': 'newly_completed',
            'old_progress': old_progress,
            'new_progress': new_progress,
            'xp_awarded': quest.xp_reward
        }
    
    return {
        'status': 'completed' if was_completed else 'updated',
        'old_progress': old_progress,
        'new_progress': new_progress,
        'xp_awarded': 0
    }


def main():
    print("=" * 80)
    print("🔧 FIXING ALL USER QUESTS FOR ALL USERS")
    print("=" * 80)
    print()
    
    with get_db_session() as db:
        # Get all users
        users = db.query(User).all()
        print(f"📊 Found {len(users)} users")
        
        # Get all active quests
        quests = db.query(Quest).filter(Quest.is_active == 1).order_by(Quest.quest_id).all()
        print(f"🎯 Found {len(quests)} active quests")
        print()
        
        total_updated = 0
        total_completed = 0
        total_xp_awarded = 0
        
        for user in users:
            print(f"\n{'=' * 80}")
            print(f"👤 User: {user.username} ({user.user_id[:20]}...)")
            print(f"{'=' * 80}")
            
            user_updates = 0
            user_completions = 0
            user_xp = 0
            
            for quest in quests:
                result = update_user_quest(db, user.user_id, quest, user)
                
                if result['status'] == 'newly_completed':
                    print(f"  ✅ COMPLETED: {quest.title}")
                    print(f"     Progress: {result['old_progress']} → {result['new_progress']}/{quest.target_value}")
                    print(f"     XP Awarded: +{result['xp_awarded']}")
                    user_completions += 1
                    user_xp += result['xp_awarded']
                elif result['old_progress'] != result['new_progress']:
                    print(f"  🔄 Updated: {quest.title}")
                    print(f"     Progress: {result['old_progress']} → {result['new_progress']}/{quest.target_value}")
                    user_updates += 1
            
            if user_updates > 0 or user_completions > 0:
                total_updated += user_updates
                total_completed += user_completions
                total_xp_awarded += user_xp
                
                print(f"\n  📊 User Summary:")
                print(f"     Updates: {user_updates}")
                print(f"     New Completions: {user_completions}")
                print(f"     Total XP Awarded: {user_xp}")
            else:
                print("  ✓ All quests already up to date")
        
        # Commit all changes
        db.commit()
        
        print(f"\n{'=' * 80}")
        print("✅ ALL USERS UPDATED SUCCESSFULLY")
        print(f"{'=' * 80}")
        print(f"\n📊 Global Summary:")
        print(f"   Total Users Processed: {len(users)}")
        print(f"   Total Quests Updated: {total_updated}")
        print(f"   Total New Completions: {total_completed}")
        print(f"   Total XP Awarded: {total_xp_awarded}")
        print()


if __name__ == '__main__':
    main()
