#!/usr/bin/env python3

import sqlite3

def check_schema():
    print("🔍 DATABASE SCHEMA ANALYSIS")
    print("="*50)
    
    # Connect to database
    db_path = "telemetry.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check matches table schema
        print("\n📋 MATCHES TABLE SCHEMA:")
        cursor.execute("PRAGMA table_info(matches)")
        columns = cursor.fetchall()
        for col in columns:
            print(f"  - {col[1]} ({col[2]}) - Primary Key: {col[5]}")
        
        # Show actual matches data
        print("\n📋 ACTUAL MATCHES DATA:")
        cursor.execute("SELECT * FROM matches")
        matches = cursor.fetchall()
        for match in matches:
            print(f"  - {match}")
            
        # Check connection_requests schema too
        print("\n📋 CONNECTION_REQUESTS TABLE SCHEMA:")
        cursor.execute("PRAGMA table_info(connection_requests)")
        columns = cursor.fetchall()
        for col in columns:
            print(f"  - {col[1]} ({col[2]}) - Primary Key: {col[5]}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_schema()
