"""
Script to populate game_scores for existing users from their game sessions.
This extracts high scores from existing game_sessions table and updates user game_scores.
"""

from app.database import get_db_connection
import json

def populate_game_scores_from_sessions():
    """Populate game_scores for all users based on their existing game sessions."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get all users
    cursor.execute("SELECT user_id FROM users")
    users = cursor.fetchall()
    
    updated_count = 0
    
    for user_row in users:
        user_id = user_row['user_id']
        
        # Get all game sessions for this user with scores
        cursor.execute("""
            SELECT game_id, MAX(score) as high_score
            FROM game_sessions
            WHERE user_id = ? AND score > 0
            GROUP BY game_id
        """, (user_id,))
        
        game_scores_rows = cursor.fetchall()
        
        if game_scores_rows:
            # Build game_scores dictionary
            game_scores = {}
            for row in game_scores_rows:
                game_id = row['game_id']
                high_score = row['high_score']
                game_scores[game_id] = high_score
            
            # Update user's game_scores
            cursor.execute("""
                UPDATE users 
                SET game_scores = ?
                WHERE user_id = ?
            """, (json.dumps(game_scores), user_id))
            
            updated_count += 1
            print(f"✓ Updated user {user_id}: {len(game_scores)} games")
    
    conn.commit()
    conn.close()
    
    return updated_count

if __name__ == "__main__":
    print("Populating game_scores from existing sessions...")
    print("=" * 50)
    
    count = populate_game_scores_from_sessions()
    
    print("=" * 50)
    print(f"✓ Successfully updated {count} users with game scores!")
    print("Game scores have been populated from existing sessions.")
