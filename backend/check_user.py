import sqlite3

conn = sqlite3.connect('telemetry.db')
cursor = conn.cursor()

# Check users with email 12@gmail.com
cursor.execute('SELECT user_hash, email, password_hash, name, is_active FROM users WHERE email = ?', ('12@gmail.com',))
result = cursor.fetchall()

print('Users with email 12@gmail.com:')
for row in result:
    print(f'  user_hash: {row[0]}, email: {row[1]}, password_hash: {row[2]}, name: {row[3]}, is_active: {row[4]}')

conn.close()
