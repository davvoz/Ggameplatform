import sqlite3

conn = sqlite3.connect('app/game_platform.db')
cursor = conn.cursor()

# Check the schema first
cursor.execute("PRAGMA table_info(game_sessions)")
print('game_sessions table schema:')
print('-' * 80)
for col in cursor.fetchall():
    print(f'Column: {col[1]} | Type: {col[2]} | NotNull: {col[3]} | Default: {col[4]}')

print('\n')

cursor.execute('''
    SELECT session_id, score, cur8_earned, duration_seconds, ended_at 
    FROM game_sessions 
    ORDER BY started_at DESC 
    LIMIT 10
''')

print('Last 10 sessions:')
print('-' * 80)
for row in cursor.fetchall():
    session_id, score, cur8, duration, ended_at = row
    print(f'Session: {session_id[:20]}... | Score: {score} | CUR8: {cur8} | Duration: {duration}s | Ended: {ended_at}')

# Count how many sessions have NULL score
cursor.execute('SELECT COUNT(*) FROM game_sessions WHERE score IS NULL')
null_count = cursor.fetchone()[0]

cursor.execute('SELECT COUNT(*) FROM game_sessions WHERE score IS NOT NULL AND score > 0')
with_score_count = cursor.fetchone()[0]

cursor.execute('SELECT COUNT(*) FROM game_sessions')
total_count = cursor.fetchone()[0]

print('\n' + '=' * 80)
print(f'Total sessions: {total_count}')
print(f'Sessions with NULL score: {null_count}')
print(f'Sessions with score > 0: {with_score_count}')
print(f'Sessions with score = 0: {total_count - null_count - with_score_count}')

conn.close()
