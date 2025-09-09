#!/usr/bin/env python3
"""
Script to add sample user data for matches in the Thrizll app
"""
import sqlite3
import json
import random
from datetime import datetime

def add_sample_users():
    db_path = "telemetry.db"
    
    # Sample user data
    sample_users = [
        {
            "user_hash": "user_001_alex",
            "name": "Alex Johnson",
            "age": 24,
            "bio": "Love hiking and photography. Looking for someone to explore the city with!",
            "location": "San Francisco, CA",
            "photos": [
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
                "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400"
            ],
            "interests": ["hiking", "photography", "travel", "coffee"]
        },
        {
            "user_hash": "user_002_sarah",
            "name": "Sarah Chen",
            "age": 26,
            "bio": "Artist and yoga instructor. Seeking genuine connections and good conversations.",
            "location": "New York, NY",
            "photos": [
                "https://images.unsplash.com/photo-1494790108755-2616b612b5e5?w=400",
                "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400"
            ],
            "interests": ["yoga", "art", "meditation", "cooking"]
        },
        {
            "user_hash": "user_003_mike",
            "name": "Mike Rodriguez",
            "age": 28,
            "bio": "Software engineer who loves rock climbing and live music. Let's grab a concert!",
            "location": "Austin, TX",
            "photos": [
                "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400",
                "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400"
            ],
            "interests": ["rock climbing", "music", "technology", "festivals"]
        },
        {
            "user_hash": "user_004_emma",
            "name": "Emma Thompson",
            "age": 23,
            "bio": "Book lover and aspiring writer. Looking for someone who enjoys deep conversations.",
            "location": "Seattle, WA",
            "photos": [
                "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400",
                "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400"
            ],
            "interests": ["reading", "writing", "coffee", "indie films"]
        },
        {
            "user_hash": "user_005_david",
            "name": "David Kim",
            "age": 29,
            "bio": "Chef and foodie always trying new restaurants. Let's explore the food scene together!",
            "location": "Los Angeles, CA",
            "photos": [
                "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400",
                "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400"
            ],
            "interests": ["cooking", "food", "wine", "travel"]
        },
        {
            "user_hash": "user_006_lisa",
            "name": "Lisa Wang",
            "age": 25,
            "bio": "Dancer and fitness enthusiast. Love staying active and trying new workouts!",
            "location": "Miami, FL",
            "photos": [
                "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400",
                "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400"
            ],
            "interests": ["dancing", "fitness", "beach", "music"]
        },
        {
            "user_hash": "user_007_ryan",
            "name": "Ryan Miller",
            "age": 27,
            "bio": "Adventure seeker and startup founder. Always up for trying something new!",
            "location": "Denver, CO",
            "photos": [
                "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400",
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400"
            ],
            "interests": ["entrepreneurship", "skiing", "adventure", "networking"]
        },
        {
            "user_hash": "user_008_maya",
            "name": "Maya Patel",
            "age": 24,
            "bio": "Medical student with a passion for helping others. Love weekend getaways!",
            "location": "Boston, MA",
            "photos": [
                "https://images.unsplash.com/photo-1494790108755-2616b612b5e5?w=400",
                "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400"
            ],
            "interests": ["medicine", "travel", "volunteering", "nature"]
        }
    ]
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Create users table if it doesn't exist
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                user_hash VARCHAR PRIMARY KEY,
                name VARCHAR NOT NULL,
                age INTEGER,
                bio TEXT,
                location VARCHAR,
                photos TEXT,
                interests TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE
            )
        ''')
        
        # Insert sample users
        for user in sample_users:
            cursor.execute('''
                INSERT OR REPLACE INTO users 
                (user_hash, name, age, bio, location, photos, interests)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                user["user_hash"],
                user["name"],
                user["age"],
                user["bio"],
                user["location"],
                json.dumps(user["photos"]),
                json.dumps(user["interests"])
            ))
        
        conn.commit()
        print(f"Successfully added {len(sample_users)} sample users to the database!")
        
        # Show added users
        cursor.execute("SELECT user_hash, name, age, location FROM users")
        users = cursor.fetchall()
        print("\nAdded users:")
        for user in users:
            print(f"- {user[1]} ({user[2]}) from {user[3]}")
            
    except Exception as e:
        print(f"Error adding sample users: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    add_sample_users()
