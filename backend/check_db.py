import sqlite3
import json

conn = sqlite3.connect('data/games/rainbow_rush.db')
cursor = conn.cursor()

print('\n🎮 Rainbow Rush Database - Tutti gli Utenti')
print('=' * 70)

cursor.execute("""
    SELECT user_id, current_level, max_level_unlocked, 
           total_coins, total_stars, high_score, level_completions,
           created_at, last_played
    FROM rainbow_rush_progress 
    ORDER BY last_played DESC
""")

results = cursor.fetchall()

if results:
    for row in results:
        print(f'\n👤 User: {row[0]}')
        print(f'   Max Level Unlocked: {row[2]}')
        print(f'   Current Level: {row[1]}')
        print(f'   Total Stars: {row[4]}')
        print(f'   Total Coins: {row[3]}')
        print(f'   High Score: {row[5]}')
        
        level_completions = json.loads(row[6]) if row[6] else {}
        print(f'   Livelli Completati: {len(level_completions)}')
        
        if level_completions:
            print(f'   Dettagli:')
            for level_id, data in sorted(level_completions.items(), key=lambda x: int(x[0])):
                stars = data.get('stars', 0)
                best_time = data.get('best_time', 0)
                print(f'      Level {level_id}: {stars}⭐ - Time: {best_time:.1f}s')
        
        print(f'   Last Played: {row[8]}')
        print('-' * 70)
else:
    print('\n❌ Nessun utente trovato nel database')

conn.close()
