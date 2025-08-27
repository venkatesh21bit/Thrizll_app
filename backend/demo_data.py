#!/usr/bin/env python3
"""
Demo data generator for testing the Digital Body Language backend
Generates realistic telemetry events and tests the ML scoring pipeline
"""

import requests
import json
import time
import random
from datetime import datetime, timedelta
import uuid

BASE_URL = "http://localhost:8000"

def generate_user_hash():
    """Generate a mock user hash"""
    return f"user_{random.randint(1000, 9999)}"

def create_session(user_hash: str):
    """Create a new session"""
    response = requests.post(f"{BASE_URL}/v1/sessions", json={
        "user_hash": user_hash,
        "screen": "ChatScreen",
        "device": {
            "model": "iPhone 12",
            "os": "iOS 15.0",
            "app_version": "1.0.0"
        }
    })
    
    if response.status_code == 200:
        return response.json()["session_id"]
    else:
        print(f"Failed to create session: {response.status_code}")
        return None

def generate_realistic_events(session_id: str, user_hash: str, duration_minutes: int = 5):
    """Generate realistic telemetry events for a session"""
    events = []
    start_time = int(time.time() * 1000)
    
    # Simulate a conversation session
    for minute in range(duration_minutes):
        minute_start = start_time + (minute * 60 * 1000)
        
        # Typing burst (composing a message)
        typing_start = minute_start + random.randint(0, 30000)
        message_length = random.randint(20, 150)
        
        for char in range(message_length):
            # Inter-key interval varies by typing skill
            interval = random.gauss(150, 50)  # ~150ms average
            if interval < 50:
                interval = 50
            
            events.append({
                "ts": int(typing_start + char * interval),
                "session_id": session_id,
                "user_hash": user_hash,
                "screen": "ChatScreen",
                "component_id": "message-input",
                "etype": "TYPE",
                "input_len": char + 1,
                "backspaces": 1 if random.random() < 0.05 else 0  # 5% backspace rate
            })
        
        # Pause before sending
        pause_duration = random.randint(500, 3000)
        events.append({
            "ts": int(typing_start + message_length * 150 + pause_duration),
            "session_id": session_id,
            "user_hash": user_hash,
            "screen": "ChatScreen",
            "etype": "PAUSE",
            "duration_ms": pause_duration
        })
        
        # Send button tap
        events.append({
            "ts": int(typing_start + message_length * 150 + pause_duration + 100),
            "session_id": session_id,
            "user_hash": user_hash,
            "screen": "ChatScreen",
            "component_id": "send-button",
            "etype": "TAP"
        })
        
        # Scrolling while reading response
        scroll_start = typing_start + message_length * 150 + pause_duration + 5000
        scroll_events = random.randint(5, 15)
        
        for scroll in range(scroll_events):
            velocity = random.gauss(200, 100)  # pixels/second
            if velocity < 0:
                velocity = abs(velocity)
            
            events.append({
                "ts": int(scroll_start + scroll * random.randint(100, 500)),
                "session_id": session_id,
                "user_hash": user_hash,
                "screen": "ChatScreen",
                "component_id": "chat-scroll",
                "etype": "SCROLL",
                "delta": random.randint(-50, 150),
                "velocity": velocity,
                "accel": random.gauss(0, 50)
            })
    
    return events

def upload_events(events):
    """Upload events to the backend"""
    response = requests.post(f"{BASE_URL}/v1/ingest/events", json={
        "events": events
    })
    
    if response.status_code == 200:
        print(f"✅ Uploaded {len(events)} events")
        return True
    else:
        print(f"❌ Failed to upload events: {response.status_code}")
        print(response.text)
        return False

def get_score(session_id: str):
    """Get interest score for session"""
    response = requests.get(f"{BASE_URL}/v1/score/{session_id}")
    
    if response.status_code == 200:
        score_data = response.json()
        print(f"📊 Interest Score: {score_data['score']:.1f} (confidence: {score_data['confidence']:.2f})")
        return score_data
    else:
        print(f"❌ Failed to get score: {response.status_code}")
        return None

def get_insights(session_id: str):
    """Get session insights"""
    response = requests.get(f"{BASE_URL}/v1/insights/{session_id}")
    
    if response.status_code == 200:
        insights = response.json()
        print(f"📈 Session Insights:")
        print(f"   Duration: {insights['duration_minutes']:.1f} minutes")
        print(f"   Total Events: {insights['total_events']}")
        print(f"   Event Breakdown: {insights['event_counts']}")
        return insights
    else:
        print(f"❌ Failed to get insights: {response.status_code}")
        return None

def health_check():
    """Check if backend is running"""
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend is healthy")
            return True
    except:
        pass
    
    print("❌ Backend is not responding")
    return False

def demo_scenario():
    """Run a complete demo scenario"""
    print("🚀 Starting Digital Body Language Demo")
    print("=" * 50)
    
    # Health check
    if not health_check():
        print("Please start the backend server first: cd backend && python main.py")
        return
    
    # Create user and session
    user_hash = generate_user_hash()
    print(f"👤 User: {user_hash}")
    
    session_id = create_session(user_hash)
    if not session_id:
        return
    
    print(f"📱 Session: {session_id}")
    
    # Generate and upload events
    print("\n📡 Generating telemetry events...")
    events = generate_realistic_events(session_id, user_hash, duration_minutes=3)
    
    if upload_events(events):
        print("\n⏱️  Waiting for processing...")
        time.sleep(2)  # Give backend time to process
        
        # Get results
        print("\n📊 Results:")
        score = get_score(session_id)
        print()
        insights = get_insights(session_id)
    
    print("\n✨ Demo complete!")

if __name__ == "__main__":
    demo_scenario()
