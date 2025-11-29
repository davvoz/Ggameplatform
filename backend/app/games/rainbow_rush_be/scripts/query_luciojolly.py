import sqlite3
import json

# Connetti al database
conn = sqlite3.connect('data/games/rainbow_rush.db')
cursor = conn.cursor()

# Query per luciojolly
cursor.execute("""
    SELECT progress_id, user_id, current_level, max_level_unlocked, 
           total_coins, total_stars, high_score, level_completions,
           unlocked_items, statistics, created_at, last_played
    FROM rainbow_rush_progress 
    WHERE user_id LIKE '%luciojolly%'
""")

results = cursor.fetchall()

print('\n🎮 Rainbow Rush Progress - luciojolly')
print('=' * 70)

if results:
    for row in results:
        print(f'\nUser ID: {row[1]}')
        print(f'Current Level: {row[2]}')
        print(f'Max Level Unlocked: {row[3]}')
        print(f'Total Coins: {row[4]}')
        print(f'Total Stars: {row[5]}')
        print(f'High Score: {row[6]}')
        
        # Parse level completions JSON
        level_completions = json.loads(row[7]) if row[7] else {}
        print(f'\nLivelli Completati: {len(level_completions)}')
        for level_id, data in sorted(level_completions.items(), key=lambda x: int(x[0])):
            stars = data.get('stars', 0)
            best_time = data.get('best_time', 0)
            print(f'  Level {level_id}: {stars}⭐ - Best Time: {best_time:.1f}s')
        
        print(f'\nCreated: {row[10]}')
        print(f'Last Played: {row[11]}')
        print('-' * 70)
else:
    print('\n❌ Nessun dato trovato per luciojolly')

# Mostra anche tutti gli utenti
print('\n📊 Tutti gli utenti nel database:')
print('=' * 70)
cursor.execute("SELECT user_id, max_level_unlocked, total_stars, high_score FROM rainbow_rush_progress")
all_users = cursor.fetchall()
for user in all_users:
    print(f'User: {user[0]} - Level: {user[1]} - Stars: {user[2]} - Score: {user[3]}')

conn.close()
