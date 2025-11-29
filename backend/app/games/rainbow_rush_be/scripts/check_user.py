import sqlite3
import json

# Cerca l'utente user_6ce3def93bc34ac9
conn = sqlite3.connect('data/games/rainbow_rush.db')
cursor = conn.cursor()

# Query per trovare l'utente
cursor.execute("""
    SELECT progress_id, user_id, current_level, max_level_unlocked, 
           total_coins, total_stars, high_score, level_completions,
           created_at, last_played
    FROM rainbow_rush_progress 
    WHERE user_id LIKE '%6ce3def93bc34ac9%'
""")

results = cursor.fetchall()

print('\n🎮 Rainbow Rush Progress - user_6ce3def93bc34ac9')
print('=' * 70)

if results:
    for row in results:
        print(f'User ID: {row[1]}')
        print(f'Max Level Unlocked: {row[3]}')
        print(f'Current Level: {row[2]}')
        print(f'Total Stars: {row[5]}')
        print(f'Total Coins: {row[4]}')
        print(f'High Score: {row[6]}')
        
        # Parse level completions
        level_completions = json.loads(row[7]) if row[7] else {}
        print(f'\n✅ Livelli Completati: {len(level_completions)}')
        for level_id, data in sorted(level_completions.items(), key=lambda x: int(x[0])):
            stars = data.get('stars', 0)
            best_time = data.get('best_time', 0)
            print(f'  Level {level_id}: {stars}⭐ - Best Time: {best_time:.1f}s')
        
        print(f'\nCreated: {row[8]}')
        print(f'Last Played: {row[9]}')
else:
    print('❌ Nessun dato trovato per user_6ce3def93bc34ac9')
    print('\n📊 Tutti gli utenti nel database:')
    cursor.execute("SELECT user_id, max_level_unlocked, total_stars FROM rainbow_rush_progress")
    all_users = cursor.fetchall()
    for user in all_users:
        print(f'  - {user[0]}: Level {user[1]}, Stars {user[2]}')

conn.close()
