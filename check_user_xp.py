import sqlite3

conn = sqlite3.connect('backend/app/game_platform.db')
cursor = conn.cursor()

# Check user's total XP
cursor.execute('SELECT user_id, username, total_xp_earned FROM users WHERE username = "luciojolly"')
row = cursor.fetchone()
if row:
    print(f'User: {row[1]}')
    print(f'Total XP in users table: {row[2]}')
else:
    print('User not found')

# Check sum of XP from all sessions for this user
cursor.execute('''
    SELECT user_id, COUNT(*) as sessions, SUM(xp_earned) as total_xp_from_sessions
    FROM game_sessions 
    WHERE user_id = (SELECT user_id FROM users WHERE username = "luciojolly")
    AND xp_earned IS NOT NULL
''')
row = cursor.fetchone()
if row:
    print(f'\nSessions count: {row[1]}')
    print(f'Sum of XP from all sessions: {row[2]}')

conn.close()
