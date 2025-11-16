"""Check claimed status of user quests"""
import sqlite3

conn = sqlite3.connect('app/game_platform.db')
cursor = conn.cursor()

cursor.execute('''
    SELECT id, quest_id, is_completed, is_claimed, claimed_at 
    FROM user_quests 
    WHERE user_id="user_9808e87567534e83"
    ORDER BY quest_id
''')

print('ID | QuestID | Completed | Claimed | ClaimedAt')
print('-' * 80)

for row in cursor.fetchall():
    claimed_at = row[4] if row[4] else 'NULL'
    print(f'{row[0]:3} | {row[1]:7} | {row[2]:9} | {row[3]:7} | {claimed_at}')

conn.close()
