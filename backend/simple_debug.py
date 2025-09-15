#!/usr/bin/env python3

import sqlite3
import json
from datetime import datetime

def debug_database():
    print("🔍 DATABASE DEBUG - Matches Analysis")
    print("="*50)
    
    # Connect to database
    db_path = "telemetry.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # First check if matches table exists and what's in it
        print("\n📋 MATCHES TABLE:")
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='matches'")
        if cursor.fetchone():
            cursor.execute("SELECT * FROM matches")
            matches = cursor.fetchall()
            print(f"Total matches found: {len(matches)}")
            for match in matches:
                print(f"  - Match ID: {match[0]}, User1: {match[1]}, User2: {match[2]}, Created: {match[3]}")
        else:
            print("❌ Matches table does not exist!")
        
        # Check connection_requests table
        print("\n📋 CONNECTION REQUESTS TABLE:")
        cursor.execute("SELECT * FROM connection_requests ORDER BY created_at DESC LIMIT 10")
        requests = cursor.fetchall()
        print(f"Recent connection requests: {len(requests)}")
        for req in requests:
            print(f"  - ID: {req[0]}, From: {req[1]}, To: {req[2]}, Status: {req[3]}, Created: {req[4]}")
        
        # Check specific users
        print("\n👤 USER SPECIFIC ANALYSIS:")
        
        # Test6 (b3b8181c6bd4610a) matches
        test6_id = "b3b8181c6bd4610a"
        cursor.execute("""
            SELECT user1_id, user2_id FROM matches 
            WHERE user1_id = ? OR user2_id = ?
        """, (test6_id, test6_id))
        test6_matches = cursor.fetchall()
        print(f"Test6 ({test6_id}) matches: {len(test6_matches)}")
        for match in test6_matches:
            print(f"  - {match[0]} ↔ {match[1]}")
        
        # Test4 (05d9a174cd560bbc) matches  
        test4_id = "05d9a174cd560bbc"
        cursor.execute("""
            SELECT user1_id, user2_id FROM matches 
            WHERE user1_id = ? OR user2_id = ?
        """, (test4_id, test4_id))
        test4_matches = cursor.fetchall()
        print(f"Test4 ({test4_id}) matches: {len(test4_matches)}")
        for match in test4_matches:
            print(f"  - {match[0]} ↔ {match[1]}")
            
        # Test2 (28fe3a7d46fdaa0c) matches
        test2_id = "28fe3a7d46fdaa0c"
        cursor.execute("""
            SELECT user1_id, user2_id FROM matches 
            WHERE user1_id = ? OR user2_id = ?
        """, (test2_id, test2_id))
        test2_matches = cursor.fetchall()
        print(f"Test2 ({test2_id}) matches: {len(test2_matches)}")
        for match in test2_matches:
            print(f"  - {match[0]} ↔ {match[1]}")
        
        # Check what Test6→Test4 connection request looks like
        print("\n🔍 TEST6→TEST4 CONNECTION REQUEST:")
        cursor.execute("""
            SELECT id, from_user_id, to_user_id, status, created_at 
            FROM connection_requests 
            WHERE from_user_id = ? AND to_user_id = ?
        """, (test6_id, test4_id))
        test6_to_test4 = cursor.fetchall()
        for req in test6_to_test4:
            print(f"  - ID: {req[0]}, From: {req[1]}, To: {req[2]}, Status: {req[3]}, Created: {req[4]}")
        
    except Exception as e:
        print(f"❌ Error accessing database: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    debug_database()
