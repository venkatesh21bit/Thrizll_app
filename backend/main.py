




# ...existing code...

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends, Body
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, String, Integer, Float, DateTime, Text, Boolean
from sqlalchemy.orm import Session
from sqlalchemy.sql import text
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
import json
import logging
import hashlib

# User discovery models and endpoint (must be after app definition)
class UserProfile(BaseModel):
    id: str
    displayName: str
    age: int
    bio: str
    isOnline: bool
    avatarUrl: str

mock_users = [
    UserProfile(
        id="user1",
        displayName="Alex",
        age=27,
        bio="Love hiking and music!",
        isOnline=True,
        avatarUrl="https://randomuser.me/api/portraits/men/1.jpg"
    ),
    UserProfile(
        id="user2",
        displayName="Sam",
        age=25,
        bio="Coffee enthusiast and coder.",
        isOnline=False,
        avatarUrl="https://randomuser.me/api/portraits/men/2.jpg"
    ),
    UserProfile(
        id="user3",
        displayName="Priya",
        age=24,
        bio="Art, books, and travel.",
        isOnline=True,
        avatarUrl="https://randomuser.me/api/portraits/women/3.jpg"
    ),
]

from feature_extractor import FeatureExtractor, compute_and_store_features
from ml_model import score_features
from models import DBSession, DBEvent, DBFeatures, DBUser, DBLike, DBNotification, SessionLocal, Base, engine

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Create tables
Base.metadata.create_all(bind=engine)

# Pydantic Models
class TelemetryEvent(BaseModel):
    ts: int
    session_id: str
    user_hash: str
    screen: str
    component_id: Optional[str] = None
    etype: str
    duration_ms: Optional[int] = None
    delta: Optional[float] = None
    velocity: Optional[float] = None
    accel: Optional[float] = None
    key_code: Optional[str] = None
    input_len: Optional[int] = None
    backspaces: Optional[int] = None
    meta: Optional[Dict[str, Any]] = None

class SessionCreate(BaseModel):
    user_hash: str
    screen: str
    device: Optional[Dict[str, Any]] = None

class SessionResponse(BaseModel):
    session_id: str
    started_at: datetime

class EventBatch(BaseModel):
    events: List[TelemetryEvent]

class InterestScore(BaseModel):
    score: float
    confidence: float
    timestamp: datetime
    session_id: str

# User Profile Models
class ProfileCreate(BaseModel):
    name: str
    age: int
    bio: str
    location: str
    interests: List[str]
    photos: List[str]

class UserProfileResponse(BaseModel):
    user_hash: str
    name: str
    age: int
    bio: str
    location: str
    interests: List[str]
    photos: List[str]
    created_at: datetime

# Authentication Models
class UserSignup(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

class AuthResponse(BaseModel):
    success: bool
    message: str
    user_hash: Optional[str] = None
    user: Optional[Dict[str, Any]] = None

# Password hashing utilities
def hash_password(password: str) -> str:
    """Hash a password using SHA256 (simple for demo - use bcrypt in production)"""
    salt = "thrillz_salt_2024"  # In production, use random salt per user
    return hashlib.sha256((password + salt).encode()).hexdigest()

def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash"""
    return hash_password(password) == password_hash

# FastAPI App
app = FastAPI(title="Digital Body Language API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Endpoints for user actions
@app.post("/api/v1/discover")
async def discover_users(payload: dict = Body(...)):
    """Return a list of user profiles for discovery (mock data)."""
    return {"users": [user.dict() for user in mock_users]}

@app.post("/api/v1/like")
async def like_user(payload: dict = Body(...)):
    """Handle user like action with notifications."""
    liked_user_id = payload.get("userId")
    if not liked_user_id:
        raise HTTPException(status_code=400, detail="userId is required")
    
    # For demo purposes, use a current user ID (in real app, get from auth)
    current_user_id = "current_user_hash"
    
    # Create explicit session 
    session = SessionLocal()
    try:
        # Check if this like already exists
        existing_like = session.query(DBLike).filter(
            DBLike.liker_user_hash == current_user_id,
            DBLike.liked_user_hash == liked_user_id
        ).first()
        
        if existing_like:
            return {"isMatch": existing_like.is_match, "message": "Already liked"}
        
        # Check if the other user already liked this user (mutual like)
        reverse_like = session.query(DBLike).filter(
            DBLike.liker_user_hash == liked_user_id,
            DBLike.liked_user_hash == current_user_id
        ).first()
        
        is_match = reverse_like is not None
        
        # Create the like record
        new_like = DBLike(
            liker_user_hash=current_user_id,
            liked_user_hash=liked_user_id,
            created_at=datetime.now(timezone.utc),
            is_match=is_match
        )
        session.add(new_like)
        
        # If it's a match, update the reverse like as well
        if is_match and reverse_like:
            reverse_like.is_match = True
            session.add(reverse_like)
        
        # Create notification for the liked user
        notification_message = "Someone is interested in you! 💖" if not is_match else "It's a match! 🔥💕"
        notification_type = "like" if not is_match else "match"
        
        notification = DBNotification(
            user_hash=liked_user_id,
            type=notification_type,
            from_user_hash=current_user_id,
            message=notification_message,
            created_at=datetime.now(timezone.utc),
            is_read=False,
            extra_data={"like_id": str(new_like.id)} if hasattr(new_like, 'id') else None
        )
        session.add(notification)
        
        # Commit all changes
        session.commit()
        
        if is_match:
            # Return match data
            return {
                "isMatch": True,
                "match": {
                    "id": f"match_{liked_user_id}",
                    "userId": liked_user_id,
                    "matchedAt": datetime.now(timezone.utc).isoformat(),
                    "user": next((user.dict() for user in mock_users if user.id == liked_user_id), None)
                }
            }
        else:
            return {
                "isMatch": False,
                "message": "Like sent! They'll be notified of your interest 💖"
            }
            
    except Exception as e:
        session.rollback()
        print(f"Error in like_user: {e}")
        raise HTTPException(status_code=500, detail="Failed to process like")
    finally:
        session.close()

@app.post("/api/v1/pass")
async def pass_user(payload: dict = Body(...)):
    """Handle user pass action (mock implementation)."""
    user_id = payload.get("userId")
    if not user_id:
        raise HTTPException(status_code=400, detail="userId is required")
    
    # Mock implementation - just return success
    return {"success": True, "message": f"Passed user {user_id}"}

@app.get("/api/v1/notifications")
async def get_notifications(user_id: Optional[str] = None):
    """Get notifications for a user."""
    # For demo purposes, use a default user ID if none provided
    target_user_id = user_id or "current_user_hash"
    
    session = SessionLocal()
    try:
        notifications = session.query(DBNotification).filter(
            DBNotification.user_hash == target_user_id
        ).order_by(DBNotification.created_at.desc()).limit(50).all()
        
        notification_list = []
        for notif in notifications:
            notification_list.append({
                "id": notif.id,
                "type": notif.type,
                "message": notif.message,
                "from_user_hash": notif.from_user_hash,
                "created_at": notif.created_at.isoformat(),
                "is_read": notif.is_read,
                "metadata": notif.extra_data
            })
        
        return {"notifications": notification_list}
        
    except Exception as e:
        print(f"Error getting notifications: {e}")
        raise HTTPException(status_code=500, detail="Failed to get notifications")
    finally:
        session.close()

@app.post("/api/v1/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: int):
    """Mark a notification as read."""
    session = SessionLocal()
    try:
        notification = session.query(DBNotification).filter(
            DBNotification.id == notification_id
        ).first()
        
        if not notification:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        notification.is_read = True
        session.commit()
        
        return {"success": True, "message": "Notification marked as read"}
        
    except Exception as e:
        session.rollback()
        print(f"Error marking notification as read: {e}")
        raise HTTPException(status_code=500, detail="Failed to mark notification as read")
    finally:
        session.close()

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Create tables
Base.metadata.create_all(bind=engine)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.session_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections.append(websocket)
        if session_id not in self.session_connections:
            self.session_connections[session_id] = []
        self.session_connections[session_id].append(websocket)

    def disconnect(self, websocket: WebSocket, session_id: str):
        self.active_connections.remove(websocket)
        if session_id in self.session_connections:
            self.session_connections[session_id].remove(websocket)

    async def send_score_to_session(self, session_id: str, score: InterestScore):
        if session_id in self.session_connections:
            for connection in self.session_connections[session_id]:
                try:
                    await connection.send_text(score.json())
                except:
                    pass

manager = ConnectionManager()

# Routes
@app.post("/v1/sessions", response_model=SessionResponse)
async def create_session(session_data: SessionCreate, db: Session = Depends(get_db)):
    """Create a new telemetry session"""
    # Generate a unique session ID
    session_id = f"session_{int(datetime.now().timestamp() * 1000)}_{session_data.user_hash[:10]}"
    
    db_session = DBSession(
        session_id=session_id,
        user_hash=session_data.user_hash,
        started_at=datetime.now(timezone.utc),
        device=session_data.device
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    
    return SessionResponse(
        session_id=str(db_session.session_id),
        started_at=db_session.started_at
    )

@app.post("/v1/ingest/events")
async def ingest_events(batch: EventBatch, db: Session = Depends(get_db)):
    """Ingest a batch of telemetry events"""
    try:
        logger.info(f"Received batch with {len(batch.events)} events")
        for i, event in enumerate(batch.events):
            logger.info(f"Processing event {i}: {event.etype} for session {event.session_id}")
            db_event = DBEvent(
                ts=datetime.fromtimestamp(event.ts / 1000),
                session_id=event.session_id,
                user_hash=event.user_hash,
                screen=event.screen,
                component_id=event.component_id,
                etype=event.etype,
                duration_ms=event.duration_ms,
                delta=event.delta,
                velocity=event.velocity,
                accel=event.accel,
                key_code=event.key_code,
                input_len=event.input_len,
                backspaces=event.backspaces,
                meta=event.meta
            )
            db.add(db_event)
        
        db.commit()
        logger.info("Successfully committed events to database")
        
        # Trigger feature extraction for each unique session
        unique_sessions = set(event.session_id for event in batch.events)
        for session_id in unique_sessions:
            # Compute features and score in background
            try:
                success = compute_and_store_features(session_id)
                if success:
                    # Compute real-time score
                    extractor = FeatureExtractor()
                    features = extractor.extract_realtime_features(session_id)
                    if features:
                        score, confidence = score_features(features)
                        
                        # Send score via WebSocket if connected
                        score_obj = InterestScore(
                            score=score,
                            confidence=confidence,
                            timestamp=datetime.utcnow(),
                            session_id=session_id
                        )
                        await manager.send_score_to_session(session_id, score_obj)
                        
            except Exception as e:
                logger.error(f"Error processing session {session_id}: {e}")
        
        return {"status": "success", "processed": len(batch.events)}
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/v1/score/{session_id}", response_model=InterestScore)
async def get_score(session_id: str, db: Session = Depends(get_db)):
    """Get the latest interest score for a session"""
    try:
        features_record = db.query(DBFeatures).filter(
            DBFeatures.session_id == session_id
        ).first()
        
        if features_record and features_record.score is not None:
            # Return stored score
            score = features_record.score
            confidence = features_record.conf or 0.6
        else:
            # Compute score from features
            extractor = FeatureExtractor()
            features = extractor.extract_session_features(session_id)
            
            if features:
                score, confidence = score_features(features)
                
                # Store the computed score
                if features_record:
                    features_record.score = score
                    features_record.conf = confidence
                else:
                    features_record = DBFeatures(
                        session_id=session_id,
                        computed_at=datetime.utcnow(),
                        f=features,
                        score=score,
                        conf=confidence
                    )
                    db.add(features_record)
                
                db.commit()
            else:
                # Fallback to mock score
                score = 50.0 + (hash(session_id) % 50)
                confidence = 0.6 + (hash(session_id) % 40) / 100
        
        return InterestScore(
            score=score,
            confidence=confidence,
            timestamp=datetime.utcnow(),
            session_id=session_id
        )
    
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID")
    except Exception as e:
        logger.error(f"Error getting score for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.websocket("/v1/score/ws/{session_id}")
async def websocket_score(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time score updates"""
    await manager.connect(websocket, session_id)
    try:
        while True:
            # Wait for any message (keep connection alive)
            data = await websocket.receive_text()
            
            # Send current score
            score = InterestScore(
                score=50.0 + (hash(session_id + str(datetime.utcnow())) % 50),
                confidence=0.6 + (hash(session_id) % 40) / 100,
                timestamp=datetime.utcnow(),
                session_id=session_id
            )
            await websocket.send_text(score.json())
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)

@app.get("/v1/insights/{session_id}")
async def get_insights(session_id: str, db: Session = Depends(get_db)):
    """Get session insights and analytics"""
    try:
        # Get session info
        session = db.query(DBSession).filter(
            DBSession.session_id == session_id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get event counts by type
        events = db.query(DBEvent).filter(
            DBEvent.session_id == session_id
        ).all()
        
        event_counts = {}
        for event in events:
            event_counts[event.etype] = event_counts.get(event.etype, 0) + 1
        
        return {
            "session_id": session_id,
            "started_at": session.started_at,
            "ended_at": session.ended_at,
            "total_events": len(events),
            "event_counts": event_counts,
            "duration_minutes": (
                (session.ended_at or datetime.utcnow()) - session.started_at
            ).total_seconds() / 60
        }
    
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID")

# Authentication Endpoints
@app.post("/api/v1/auth/signup", response_model=AuthResponse)
async def signup(user_data: UserSignup):
    """Register a new user account with explicit session management"""
    # Create a new session explicitly (not using dependency injection)
    db = SessionLocal()
    
    try:
        # Create users table if it doesn't exist
        db.execute(text('''
            CREATE TABLE IF NOT EXISTS users (
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
        '''))
        
        # Check if email already exists
        existing_user = db.execute(text('''
            SELECT user_hash FROM users WHERE email = :email
        '''), {"email": user_data.email}).fetchone()
        
        if existing_user:
            return AuthResponse(
                success=False,
                message="Email already exists. Please use a different email or try logging in."
            )
        
        # Create new user
        user_hash = hashlib.sha256(f"{user_data.email}_{user_data.name}_{datetime.utcnow()}".encode()).hexdigest()[:16]
        password_hash = hash_password(user_data.password)
        
        print(f"🔍 Debug signup - user_hash: {user_hash}")
        print(f"🔍 Debug signup - email: {user_data.email}")
        print(f"🔍 Debug signup - password_hash: {password_hash}")
        print(f"🔍 Debug signup - name: {user_data.name}")
        
        # Insert the new user with explicit is_active value
        result = db.execute(text('''
            INSERT INTO users 
            (user_hash, email, password_hash, name, created_at, is_guest, is_active)
            VALUES (:user_hash, :email, :password_hash, :name, :created_at, :is_guest, :is_active)
        '''), {
            "user_hash": user_hash,
            "email": user_data.email,
            "password_hash": password_hash,
            "name": user_data.name,
            "created_at": datetime.utcnow(),
            "is_guest": False,
            "is_active": True
        })
        
        # Explicitly commit the transaction before verification
        db.commit()
        print(f"✅ Debug signup - User inserted and committed successfully")
        
        # Verify the user was actually saved with the correct data
        verification = db.execute(text('''
            SELECT user_hash, email, password_hash, name, is_active FROM users WHERE user_hash = :user_hash
        '''), {"user_hash": user_hash}).fetchone()
        print(f"🔍 Debug signup - Verification query result: {verification}")
        
        if not verification:
            print("❌ Debug signup - User not found after insert, transaction failed!")
            return AuthResponse(
                success=False,
                message="Failed to create account. Database transaction error."
            )
        
        return AuthResponse(
            success=True,
            message="Account created successfully! Please complete your profile.",
            user_hash=user_hash,
            user={
                "user_hash": user_hash,
                "email": user_data.email,
                "name": user_data.name,
                "is_guest": False
            }
        )
        
    except Exception as e:
        # Rollback on any error
        db.rollback()
        logging.error(f"Signup error: {e}")
        print(f"❌ Debug signup - Exception occurred: {e}")
        return AuthResponse(
            success=False,
            message="Failed to create account. Please try again."
        )
    finally:
        # Always close the session
        db.close()

@app.post("/api/v1/auth/login", response_model=AuthResponse)
async def login(user_data: UserLogin):
    """Authenticate user login with explicit session management"""
    # Create a new session explicitly
    db = SessionLocal()
    
    try:
        print(f"🔍 Debug login - email: {user_data.email}")
        print(f"🔍 Debug login - password: {user_data.password}")
        
        # First check if user exists at all (without is_active condition)
        user_check = db.execute(text('''
            SELECT user_hash, email, password_hash, name, is_active FROM users WHERE email = :email
        '''), {"email": user_data.email}).fetchone()
        print(f"🔍 Debug login - user exists check: {user_check}")
        
        # Find active user by email
        user = db.execute(text('''
            SELECT user_hash, email, password_hash, name, age, bio, location, photos, interests, is_guest
            FROM users WHERE email = :email AND is_active = TRUE
        '''), {"email": user_data.email}).fetchone()
        
        print(f"🔍 Debug login - active user found: {user is not None}")
        if user:
            print(f"🔍 Debug login - stored password_hash: {user.password_hash}")
            
        if not user:
            if user_check:
                print("❌ Debug login - User exists but is not active")
                return AuthResponse(
                    success=False,
                    message="Account is not active. Please contact support."
                )
            else:
                print("❌ Debug login - User not found")
                return AuthResponse(
                    success=False,
                    message="Invalid email or password."
                )
        
        # Verify password
        hashed_input_password = hash_password(user_data.password)
        print(f"🔍 Debug login - hashed input password: {hashed_input_password}")
        print(f"🔍 Debug login - passwords match: {hashed_input_password == user.password_hash}")
        
        if not verify_password(user_data.password, user.password_hash):
            print("❌ Debug login - Password verification failed")
            return AuthResponse(
                success=False,
                message="Invalid email or password."
            )
        
        print("✅ Debug login - Password verification successful")
        
        # Convert photos and interests from JSON strings
        photos = json.loads(user.photos) if user.photos else []
        interests = json.loads(user.interests) if user.interests else []
        
        user_profile = {
            "user_hash": user.user_hash,
            "email": user.email,
            "name": user.name,
            "age": user.age,
            "bio": user.bio,
            "location": user.location,
            "photos": photos,
            "interests": interests,
            "is_guest": user.is_guest
        }
        
        print(f"✅ Debug login - Returning successful login for user: {user.user_hash}")
        
        return AuthResponse(
            success=True,
            message="Login successful!",
            user_hash=user.user_hash,
            user=user_profile
        )
        
    except Exception as e:
        logging.error(f"Login error: {e}")
        print(f"❌ Debug login - Exception occurred: {e}")
        return AuthResponse(
            success=False,
            message="Failed to login. Please try again."
        )
    finally:
        # Always close the session
        db.close()

@app.post("/api/v1/profile", response_model=UserProfileResponse)
async def create_profile(profile_data: ProfileCreate, db: Session = Depends(get_db)):
    """Create a new user profile"""
    try:
        # Generate user hash
        user_hash = hashlib.sha256(f"{profile_data.name}_{profile_data.age}_{datetime.utcnow()}".encode()).hexdigest()[:16]
        
        # Create users table if it doesn't exist (with updated schema)
        db.execute(text('''
            CREATE TABLE IF NOT EXISTS users_new (
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
        '''))
        
        # Check if old table exists and migrate data
        db.execute(text('''
            INSERT OR IGNORE INTO users_new 
            (user_hash, name, age, bio, location, photos, interests, created_at, is_active, is_guest)
            SELECT user_hash, name, age, bio, location, photos, interests, 
                   created_at, is_active, TRUE as is_guest
            FROM users WHERE EXISTS (SELECT name FROM sqlite_master WHERE type='table' AND name='users')
        '''))
        
        # Drop old table and rename new table
        db.execute(text('DROP TABLE IF EXISTS users'))
        db.execute(text('ALTER TABLE users_new RENAME TO users'))
        
        # Insert new user (guest user for profile-only creation)
        db.execute(text('''
            INSERT INTO users 
            (user_hash, name, age, bio, location, photos, interests, is_guest)
            VALUES (:user_hash, :name, :age, :bio, :location, :photos, :interests, :is_guest)
        '''), {
            "user_hash": user_hash,
            "name": profile_data.name,
            "age": profile_data.age,
            "bio": profile_data.bio,
            "location": profile_data.location,
            "photos": json.dumps(profile_data.photos),
            "interests": json.dumps(profile_data.interests),
            "is_guest": True
        })
        
        db.commit()
        
        # Log successful creation
        logger.info(f"Successfully created profile for {profile_data.name} with hash {user_hash}")
        
        return UserProfileResponse(
            user_hash=user_hash,
            name=profile_data.name,
            age=profile_data.age,
            bio=profile_data.bio,
            location=profile_data.location,
            interests=profile_data.interests,
            photos=profile_data.photos,
            created_at=datetime.utcnow()
        )
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating profile: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create profile")

@app.get("/api/v1/discover")
async def get_discover_users(db: Session = Depends(get_db), limit: int = 10):
    """Get users for the discover screen"""
    try:
        # Get users from database
        result = db.execute(
            text("SELECT user_hash, name, age, bio, location, photos, interests FROM users WHERE is_active = TRUE ORDER BY RANDOM() LIMIT :limit"),
            {"limit": limit}
        )
        users = result.fetchall()
        
        discover_users = []
        for user in users:
            discover_users.append({
                "user_hash": user[0],
                "name": user[1],
                "age": user[2],
                "bio": user[3],
                "location": user[4],
                "photos": json.loads(user[5]) if user[5] else [],
                "interests": json.loads(user[6]) if user[6] else []
            })
        
        return {"users": discover_users, "count": len(discover_users)}
        
    except Exception as e:
        logger.error(f"Error fetching discover users: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch users")

@app.get("/admin/users")
async def list_all_users(db: Session = Depends(get_db)):
    """List all users in the database (for debugging)"""
    try:
        result = db.execute(
            text("SELECT user_hash, name, age, location, created_at FROM users ORDER BY created_at DESC")
        )
        users = result.fetchall()
        
        user_list = []
        for user in users:
            user_list.append({
                "user_hash": user[0],
                "name": user[1],
                "age": user[2],
                "location": user[3],
                "created_at": user[4]
            })
        
        return {"users": user_list, "total_count": len(user_list)}
        
    except Exception as e:
        logger.error(f"Error listing users: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to list users")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
