#!/usr/bin/env python3
import sqlite3
import hashlib

def check_user_auth():
    # Connect to database
    conn = sqlite3.connect('telemetry.db')
    cursor = conn.cursor()
    
    print("=== CHECKING AUTHENTICATION DATA IN DATABASE ===\n")
    
    # Check recent users from your database output
    recent_users = [
        '5c7d8b78b0190277',  # Recent Jacob user (auth only)
        'ccb1f01f662d05b0',  # Recent Jacob user (with profile)
        '541d26158be908f4',  # Test User
        'b95a7974e07fc79b',  # Jacob (auth only)
        '0a1ab28bd4c09c09'   # Joseph (auth only)
    ]
    
    for user_hash in recent_users:
        cursor.execute('SELECT user_hash, email, password_hash, name, age, location, is_guest, is_active FROM users WHERE user_hash = ?', (user_hash,))
        user = cursor.fetchone()
        
        if user:
            print(f"User Hash: {user_hash}")
            print(f"  Email: {user[1]}")
            print(f"  Password Hash: {user[2][:20] + '...' if user[2] else 'None'}")
            print(f"  Name: {user[3]}")
            print(f"  Age: {user[4]}")
            print(f"  Location: {user[5]}")
            print(f"  Is Guest: {user[6]}")
            print(f"  Is Active: {user[7]}")
            print(f"  Has Auth Data: {user[1] is not None and user[2] is not None}")
            print()
        else:
            print(f"User {user_hash}: Not found")
            print()
    
    # Check how many users have authentication data
    print("=== AUTHENTICATION DATA SUMMARY ===")
    cursor.execute('SELECT COUNT(*) FROM users WHERE email IS NOT NULL AND password_hash IS NOT NULL')
    auth_users_count = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM users')
    total_users = cursor.fetchone()[0]
    
    print(f"Total users: {total_users}")
    print(f"Users with auth data: {auth_users_count}")
    print(f"Users without auth data: {total_users - auth_users_count}")
    
    # Show some users with auth data
    print("\n=== USERS WITH AUTHENTICATION DATA ===")
    cursor.execute('SELECT user_hash, email, name FROM users WHERE email IS NOT NULL AND password_hash IS NOT NULL LIMIT 5')
    auth_users = cursor.fetchall()
    
    for user in auth_users:
        print(f"Hash: {user[0]}, Email: {user[1]}, Name: {user[2]}")
    
    # Test password hashing for a known user
    if auth_users:
        test_user_hash = auth_users[0][0]
        cursor.execute('SELECT password_hash FROM users WHERE user_hash = ?', (test_user_hash,))
        stored_hash = cursor.fetchone()[0]
        
        print(f"\n=== PASSWORD VERIFICATION TEST ===")
        print(f"Testing user: {test_user_hash}")
        print(f"Stored hash: {stored_hash}")
        
        # Test common passwords
        test_passwords = ["123456", "joshua123", "password"]
        salt = "thrillz_salt_2024"
        
        for pwd in test_passwords:
            expected_hash = hashlib.sha256((pwd + salt).encode()).hexdigest()
            matches = stored_hash == expected_hash
            print(f"Password '{pwd}': {'✅ MATCH' if matches else '❌ No match'}")
    
    conn.close()

if __name__ == "__main__":
    check_user_auth()
