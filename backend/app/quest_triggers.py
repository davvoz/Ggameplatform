"""
Quest Triggers - Automatically update user quest progress based on user data changes
"""

from sqlalchemy import event, text
from app.database import engine
from app.models import User


def create_quest_update_triggers():
    """Create SQL triggers to automatically update quest progress when user data changes."""
    
    with engine.connect() as conn:
        # Drop existing triggers if they exist
        conn.execute(text("DROP TRIGGER IF EXISTS update_login_streak_quests"))
        conn.execute(text("DROP TRIGGER IF EXISTS update_reach_level_quests"))
        conn.commit()
        
        # Trigger for login_streak quests
        # Updates quest progress when user.login_streak changes
        login_streak_trigger = """
        CREATE TRIGGER IF NOT EXISTS update_login_streak_quests
        AFTER UPDATE OF login_streak ON users
        FOR EACH ROW
        WHEN NEW.login_streak != OLD.login_streak OR (NEW.login_streak IS NOT NULL AND OLD.login_streak IS NULL)
        BEGIN
            -- Update all active login_streak quests for this user
            UPDATE user_quests
            SET 
                current_progress = NEW.login_streak,
                is_completed = CASE 
                    WHEN NEW.login_streak >= (SELECT target_value FROM quests WHERE quest_id = user_quests.quest_id) 
                    THEN 1 
                    ELSE 0 
                END,
                completed_at = CASE
                    WHEN NEW.login_streak >= (SELECT target_value FROM quests WHERE quest_id = user_quests.quest_id)
                         AND is_completed = 0
                    THEN datetime('now')
                    ELSE completed_at
                END
            WHERE user_id = NEW.user_id
              AND quest_id IN (
                  SELECT quest_id 
                  FROM quests 
                  WHERE quest_type = 'login_streak' 
                    AND is_active = 1
              );
              
            -- Create user_quest entries if they don't exist
            INSERT OR IGNORE INTO user_quests (user_id, quest_id, current_progress, is_completed, extra_data)
            SELECT 
                NEW.user_id,
                quest_id,
                NEW.login_streak,
                CASE WHEN NEW.login_streak >= target_value THEN 1 ELSE 0 END,
                '{}'
            FROM quests
            WHERE quest_type = 'login_streak' 
              AND is_active = 1;
        END;
        """
        
        # Trigger for reach_level quests
        # Updates quest progress when user.total_xp_earned changes
        reach_level_trigger = """
        CREATE TRIGGER IF NOT EXISTS update_reach_level_quests
        AFTER UPDATE OF total_xp_earned ON users
        FOR EACH ROW
        WHEN NEW.total_xp_earned != OLD.total_xp_earned
        BEGIN
            -- Calculate current level from XP
            -- This is a simplified version - adjust based on your LevelSystem logic
            -- For now using: levels 1-10 need 100 XP each, 11-20 need 200 XP each, etc.
            
            UPDATE user_quests
            SET 
                current_progress = (
                    SELECT 
                        CASE
                            WHEN NEW.total_xp_earned < 1000 THEN CAST(NEW.total_xp_earned / 100 AS INTEGER) + 1
                            WHEN NEW.total_xp_earned < 3000 THEN 10 + CAST((NEW.total_xp_earned - 1000) / 200 AS INTEGER) + 1
                            WHEN NEW.total_xp_earned < 6000 THEN 20 + CAST((NEW.total_xp_earned - 3000) / 300 AS INTEGER) + 1
                            WHEN NEW.total_xp_earned < 10000 THEN 30 + CAST((NEW.total_xp_earned - 6000) / 400 AS INTEGER) + 1
                            ELSE 40 + CAST((NEW.total_xp_earned - 10000) / 500 AS INTEGER) + 1
                        END
                ),
                is_completed = CASE 
                    WHEN (
                        SELECT 
                            CASE
                                WHEN NEW.total_xp_earned < 1000 THEN CAST(NEW.total_xp_earned / 100 AS INTEGER) + 1
                                WHEN NEW.total_xp_earned < 3000 THEN 10 + CAST((NEW.total_xp_earned - 1000) / 200 AS INTEGER) + 1
                                WHEN NEW.total_xp_earned < 6000 THEN 20 + CAST((NEW.total_xp_earned - 3000) / 300 AS INTEGER) + 1
                                WHEN NEW.total_xp_earned < 10000 THEN 30 + CAST((NEW.total_xp_earned - 6000) / 400 AS INTEGER) + 1
                                ELSE 40 + CAST((NEW.total_xp_earned - 10000) / 500 AS INTEGER) + 1
                            END
                    ) >= (SELECT target_value FROM quests WHERE quest_id = user_quests.quest_id)
                    THEN 1 
                    ELSE 0 
                END,
                completed_at = CASE
                    WHEN (
                        SELECT 
                            CASE
                                WHEN NEW.total_xp_earned < 1000 THEN CAST(NEW.total_xp_earned / 100 AS INTEGER) + 1
                                WHEN NEW.total_xp_earned < 3000 THEN 10 + CAST((NEW.total_xp_earned - 1000) / 200 AS INTEGER) + 1
                                WHEN NEW.total_xp_earned < 6000 THEN 20 + CAST((NEW.total_xp_earned - 3000) / 300 AS INTEGER) + 1
                                WHEN NEW.total_xp_earned < 10000 THEN 30 + CAST((NEW.total_xp_earned - 6000) / 400 AS INTEGER) + 1
                                ELSE 40 + CAST((NEW.total_xp_earned - 10000) / 500 AS INTEGER) + 1
                            END
                    ) >= (SELECT target_value FROM quests WHERE quest_id = user_quests.quest_id)
                         AND is_completed = 0
                    THEN datetime('now')
                    ELSE completed_at
                END
            WHERE user_id = NEW.user_id
              AND quest_id IN (
                  SELECT quest_id 
                  FROM quests 
                  WHERE quest_type = 'reach_level' 
                    AND is_active = 1
              );
              
            -- Create user_quest entries if they don't exist
            INSERT OR IGNORE INTO user_quests (user_id, quest_id, current_progress, is_completed, extra_data)
            SELECT 
                NEW.user_id,
                quest_id,
                (
                    SELECT 
                        CASE
                            WHEN NEW.total_xp_earned < 1000 THEN CAST(NEW.total_xp_earned / 100 AS INTEGER) + 1
                            WHEN NEW.total_xp_earned < 3000 THEN 10 + CAST((NEW.total_xp_earned - 1000) / 200 AS INTEGER) + 1
                            WHEN NEW.total_xp_earned < 6000 THEN 20 + CAST((NEW.total_xp_earned - 3000) / 300 AS INTEGER) + 1
                            WHEN NEW.total_xp_earned < 10000 THEN 30 + CAST((NEW.total_xp_earned - 6000) / 400 AS INTEGER) + 1
                            ELSE 40 + CAST((NEW.total_xp_earned - 10000) / 500 AS INTEGER) + 1
                        END
                ),
                CASE WHEN (
                    SELECT 
                        CASE
                            WHEN NEW.total_xp_earned < 1000 THEN CAST(NEW.total_xp_earned / 100 AS INTEGER) + 1
                            WHEN NEW.total_xp_earned < 3000 THEN 10 + CAST((NEW.total_xp_earned - 1000) / 200 AS INTEGER) + 1
                            WHEN NEW.total_xp_earned < 6000 THEN 20 + CAST((NEW.total_xp_earned - 3000) / 300 AS INTEGER) + 1
                            WHEN NEW.total_xp_earned < 10000 THEN 30 + CAST((NEW.total_xp_earned - 6000) / 400 AS INTEGER) + 1
                            ELSE 40 + CAST((NEW.total_xp_earned - 10000) / 500 AS INTEGER) + 1
                        END
                ) >= target_value THEN 1 ELSE 0 END,
                '{}'
            FROM quests
            WHERE quest_type = 'reach_level' 
              AND is_active = 1;
        END;
        """
        
        conn.execute(text(login_streak_trigger))
        conn.execute(text(reach_level_trigger))
        conn.commit()
        
        print("✅ Quest update triggers created successfully!")
        print("   - update_login_streak_quests: Updates login_streak quests when user.login_streak changes")
        print("   - update_reach_level_quests: Updates reach_level quests when user.total_xp_earned changes")


def setup_quest_triggers():
    """Setup quest triggers. Call this during database initialization."""
    try:
        create_quest_update_triggers()
    except Exception as e:
        print(f"⚠️  Error setting up quest triggers: {e}")
        print("    Quest progress will be updated via Python code instead.")


if __name__ == "__main__":
    setup_quest_triggers()
