import sqlite3

conn = sqlite3.connect('backend/app/game_platform.db')
cursor = conn.cursor()

cursor.execute('''
    SELECT user_id, username, email, total_xp_earned, cur8_multiplier, is_anonymous
    FROM users
    ORDER BY total_xp_earned DESC
    LIMIT 10
''')

print("\n" + "="*80)
print("TOP 10 USERS BY XP")
print("="*80)
print(f"{'Username':<20} {'Email':<30} {'Total XP':<15} {'Multiplier':<12} {'Type':<10}")
print("-"*80)

for row in cursor.fetchall():
    user_id, username, email, total_xp, multiplier, is_anon = row
    username_display = username or f"Anonymous_{user_id[-6:]}"
    email_display = email or "-"
    user_type = "Anonymous" if is_anon else "Registered"
    
    print(f"{username_display:<20} {email_display:<30} {total_xp:<15.2f} {multiplier:<12.1f}x {user_type:<10}")

print("="*80 + "\n")

conn.close()
