#!/usr/bin/env python3

import sqlite3
import json
from datetime import datetime

def debug_matches():
    try:
        # Connect to the database
        conn = sqlite3.connect('telemetry.db')
        cursor = conn.cursor()
        
        print("=== CONNECTION REQUESTS TABLE ===")
        cursor.execute('''
            SELECT id, from_user_hash, to_user_hash, status, created_at 
            FROM connection_requests 
            ORDER BY created_at DESC
        ''')
        requests = cursor.fetchall()
        for req in requests:
            print(f"ID: {req[0]}, From: {req[1]}, To: {req[2]}, Status: {req[3]}, Created: {req[4]}")
        
        print("\n=== MATCHES TABLE ===")
        cursor.execute('''
            SELECT id, user1_hash, user2_hash, created_at 
            FROM matches 
            ORDER BY created_at DESC
        ''')
        matches = cursor.fetchall()
        for match in matches:
            print(f"ID: {match[0]}, User1: {match[1]}, User2: {match[2]}, Created: {match[3]}")
        
        print("\n=== USERS TABLE (relevant users) ===")
        test_users = ['b3b8181c6bd4610a', '5c7d8b78b0190277']  # test6 and test1
        for user_hash in test_users:
            cursor.execute('SELECT user_hash, name, email FROM users WHERE user_hash = ?', (user_hash,))
            user = cursor.fetchone()
            if user:
                print(f"Hash: {user[0]}, Name: {user[1]}, Email: {user[2]}")
        
        print("\n=== TESTING MATCHES QUERY FOR TEST6 ===")
        user_hash = 'b3b8181c6bd4610a'  # test6
        cursor.execute('''
            SELECT m.id, m.created_at,
                   CASE 
                       WHEN m.user1_hash = ? THEN m.user2_hash
                       ELSE m.user1_hash
                   END as matched_user_hash,
                   u.name, u.age, u.bio, u.photos, u.location, u.interests
            FROM matches m
            JOIN users u ON (
                CASE 
                    WHEN m.user1_hash = ? THEN m.user2_hash
                    ELSE m.user1_hash
                END = u.user_hash
            )
            WHERE m.user1_hash = ? OR m.user2_hash = ?
            ORDER BY m.created_at DESC
        ''', (user_hash, user_hash, user_hash, user_hash))
        
        matches_for_test6 = cursor.fetchall()
        print(f"Matches found for test6: {len(matches_for_test6)}")
        for match in matches_for_test6:
            print(f"  Match ID: {match[0]}, Partner: {match[2]} ({match[3]}), Created: {match[1]}")
        
        print("\n=== TESTING MATCHES QUERY FOR TEST1 ===")
        user_hash = '5c7d8b78b0190277'  # test1
        cursor.execute('''
            SELECT m.id, m.created_at,
                   CASE 
                       WHEN m.user1_hash = ? THEN m.user2_hash
                       ELSE m.user1_hash
                   END as matched_user_hash,
                   u.name, u.age, u.bio, u.photos, u.location, u.interests
            FROM matches m
            JOIN users u ON (
                CASE 
                    WHEN m.user1_hash = ? THEN m.user2_hash
                    ELSE m.user1_hash
                END = u.user_hash
            )
            WHERE m.user1_hash = ? OR m.user2_hash = ?
            ORDER BY m.created_at DESC
        ''', (user_hash, user_hash, user_hash, user_hash))
        
        matches_for_test1 = cursor.fetchall()
        print(f"Matches found for test1: {len(matches_for_test1)}")
        for match in matches_for_test1:
            print(f"  Match ID: {match[0]}, Partner: {match[2]} ({match[3]}), Created: {match[1]}")
        
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_matches()
