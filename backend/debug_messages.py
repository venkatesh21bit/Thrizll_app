#!/usr/bin/env python3

import sqlite3
import json
from datetime import datetime

def debug_messages():
    print("🔍 MESSAGE DEBUG - Chat Analysis")
    print("="*50)
    
    # Connect to database
    db_path = "telemetry.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    test6_hash = "b3b8181c6bd4610a"  # Test6
    test4_hash = "05d9a174cd560bbc"  # Test4
    
    try:
        # Check if messages table exists
        print("\n📋 MESSAGES TABLE INFO:")
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='messages'")
        if cursor.fetchone():
            print("✅ Messages table exists")
            
            # Get table schema
            cursor.execute("PRAGMA table_info(messages)")
            columns = cursor.fetchall()
            print("Messages table schema:")
            for col in columns:
                print(f"  - {col[1]} ({col[2]})")
            
            # Check all messages
            cursor.execute("SELECT * FROM messages ORDER BY created_at DESC LIMIT 20")
            all_messages = cursor.fetchall()
            print(f"\nTotal recent messages: {len(all_messages)}")
            for msg in all_messages:
                print(f"  - {msg}")
            
            # Check messages between Test4 and Test6
            print(f"\n📋 MESSAGES BETWEEN TEST4 ({test4_hash}) AND TEST6 ({test6_hash}):")
            cursor.execute("""
                SELECT * FROM messages 
                WHERE (sender_hash = ? AND receiver_hash = ?) 
                   OR (sender_hash = ? AND receiver_hash = ?)
                ORDER BY created_at ASC
            """, (test4_hash, test6_hash, test6_hash, test4_hash))
            
            chat_messages = cursor.fetchall()
            print(f"Found {len(chat_messages)} messages in their conversation:")
            for msg in chat_messages:
                print(f"  - From: {msg[1]} → To: {msg[2]}")
                print(f"    Content: {msg[3]}")
                print(f"    Timestamp: {msg[4]}")
                print()
                
        else:
            print("❌ Messages table does not exist!")
            
        # Check conversations table if it exists
        print("\n📋 CONVERSATIONS TABLE INFO:")
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='conversations'")
        if cursor.fetchone():
            print("✅ Conversations table exists")
            cursor.execute("SELECT * FROM conversations")
            conversations = cursor.fetchall()
            print(f"Total conversations: {len(conversations)}")
            for conv in conversations:
                print(f"  - {conv}")
        else:
            print("❌ Conversations table does not exist!")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    debug_messages()
