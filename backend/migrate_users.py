#!/usr/bin/env python3
"""
Database migration script to add authentication columns to users table
"""

import sqlite3
import json
from datetime import datetime

def migrate_users_table():
    # Connect to the database
    conn = sqlite3.connect('telemetry.db')
    cursor = conn.cursor()
    
    try:
        print("🔄 Starting users table migration...")
        
        # Check if users table exists and what columns it has
        cursor.execute("PRAGMA table_info(users)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]
        
        print(f"📋 Current columns: {column_names}")
        
        # Check if email column exists
        if 'email' not in column_names:
            print("❌ Email column missing, recreating table...")
            
            # Step 1: Backup existing data
            cursor.execute("SELECT * FROM users")
            existing_data = cursor.fetchall()
            print(f"💾 Backing up {len(existing_data)} users")
            
            # Step 2: Rename old table
            cursor.execute("ALTER TABLE users RENAME TO users_backup")
            print("📦 Renamed old table to users_backup")
            
            # Step 3: Create new table with all columns
            cursor.execute('''
                CREATE TABLE users (
                    user_hash VARCHAR PRIMARY KEY,
                    email VARCHAR UNIQUE,
                    password_hash VARCHAR,
                    name VARCHAR NOT NULL,
                    age INTEGER,
                    bio TEXT,
                    location VARCHAR,
                    photos TEXT,
                    interests TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_active BOOLEAN DEFAULT TRUE,
                    is_guest BOOLEAN DEFAULT FALSE
                )
            ''')
            print("✅ Created new users table with authentication columns")
            
            # Step 4: Restore data (as guest users for now)
            for row in existing_data:
                # Map old columns to new structure
                user_hash, name, age, bio, location, photos, interests, created_at, is_active = row
                
                cursor.execute('''
                    INSERT INTO users 
                    (user_hash, name, age, bio, location, photos, interests, created_at, is_active, is_guest)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (user_hash, name, age, bio, location, photos, interests, created_at, is_active, True))
            
            print(f"✅ Restored {len(existing_data)} users as guest accounts")
            
            # Step 5: Drop backup table
            cursor.execute("DROP TABLE users_backup")
            print("🗑️ Dropped backup table")
            
        else:
            print("✅ Email column already exists, no migration needed")
        
        # Commit changes
        conn.commit()
        print("✅ Database migration completed successfully!")
        
        # Show final table structure
        cursor.execute("PRAGMA table_info(users)")
        new_columns = cursor.fetchall()
        print("\n📋 New table structure:")
        for col in new_columns:
            print(f"  - {col[1]} ({col[2]})")
            
        # Show sample data
        cursor.execute("SELECT user_hash, name, email, is_guest FROM users LIMIT 3")
        sample_data = cursor.fetchall()
        print(f"\n📊 Sample data ({len(sample_data)} users):")
        for row in sample_data:
            print(f"  - {row}")
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
        
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_users_table()
