#!/usr/bin/env python3
"""
Debug script to check users in database
"""

import sqlite3
import json

def check_users():
    # Connect to the database
    conn = sqlite3.connect('telemetry.db')
    cursor = conn.cursor()
    
    try:
        print("🔍 Checking all users in database...")
        
        # Get all users
        cursor.execute("SELECT user_hash, email, password_hash, name, is_active FROM users")
        users = cursor.fetchall()
        
        print(f"📊 Total users found: {len(users)}")
        
        for i, user in enumerate(users):
            user_hash, email, password_hash, name, is_active = user
            print(f"  {i+1}. Hash: {user_hash}")
            print(f"     Email: {email}")
            print(f"     Name: {name}")
            print(f"     Password Hash: {password_hash}")
            print(f"     Is Active: {is_active}")
            print()
        
        # Check specifically for josh123@gmail.com
        print("🔍 Searching specifically for josh123@gmail.com...")
        cursor.execute("SELECT user_hash, email, password_hash, name, is_active FROM users WHERE email = ?", ("josh123@gmail.com",))
        josh_user = cursor.fetchone()
        
        if josh_user:
            print("✅ Found josh123@gmail.com:")
            print(f"   Hash: {josh_user[0]}")
            print(f"   Email: {josh_user[1]}")
            print(f"   Name: {josh_user[3]}")
            print(f"   Is Active: {josh_user[4]}")
        else:
            print("❌ josh123@gmail.com not found!")
        
        # Check with is_active condition
        print("\n🔍 Searching with is_active = TRUE condition...")
        cursor.execute("SELECT user_hash, email, password_hash, name, is_active FROM users WHERE email = ? AND is_active = TRUE", ("josh123@gmail.com",))
        josh_user_active = cursor.fetchone()
        
        if josh_user_active:
            print("✅ Found josh123@gmail.com with is_active = TRUE")
        else:
            print("❌ josh123@gmail.com not found with is_active = TRUE condition!")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        
    finally:
        conn.close()

if __name__ == "__main__":
    check_users()
