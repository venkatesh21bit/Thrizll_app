#!/usr/bin/env python3

import sqlite3
import json

def test_matches_query():
    print("🔍 TESTING MATCHES QUERY")
    print("="*50)
    
    # Connect to database
    db_path = "telemetry.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    test6_hash = "b3b8181c6bd4610a"  # Test6
    test4_hash = "05d9a174cd560bbc"  # Test4
    
    try:
        # Test the exact query used in the API for Test6
        print(f"\n📋 MATCHES FOR TEST6 ({test6_hash}):")
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
        ''', (test6_hash, test6_hash, test6_hash, test6_hash))
        
        test6_matches = cursor.fetchall()
        print(f"Found {len(test6_matches)} matches for Test6:")
        for match in test6_matches:
            print(f"  - Match ID: {match[0]}")
            print(f"    Matched with: {match[2]} ({match[3]})")
            print(f"    Created: {match[1]}")
        
        # Test the exact query used in the API for Test4
        print(f"\n📋 MATCHES FOR TEST4 ({test4_hash}):")
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
        ''', (test4_hash, test4_hash, test4_hash, test4_hash))
        
        test4_matches = cursor.fetchall()
        print(f"Found {len(test4_matches)} matches for Test4:")
        for match in test4_matches:
            print(f"  - Match ID: {match[0]}")
            print(f"    Matched with: {match[2]} ({match[3]})")
            print(f"    Created: {match[1]}")
        
        # Show the raw matches table data
        print(f"\n📋 RAW MATCHES TABLE:")
        cursor.execute("SELECT * FROM matches")
        all_matches = cursor.fetchall()
        for match in all_matches:
            print(f"  - {match[0]}: {match[1]} ↔ {match[2]} (created: {match[3]})")
            
        # Show users table to verify user hashes
        print(f"\n📋 USERS TABLE (relevant users):")
        cursor.execute("SELECT user_hash, name FROM users WHERE user_hash IN (?, ?)", (test6_hash, test4_hash))
        users = cursor.fetchall()
        for user in users:
            print(f"  - {user[0]}: {user[1]}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    test_matches_query()
