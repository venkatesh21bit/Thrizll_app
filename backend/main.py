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

# Mock users removed - now using real database users

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

class RevealAnswers(BaseModel):
    from_user_hash: str
    to_user_hash: str
    answers: Dict[str, Any]

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
# Old hardcoded discover, like, and pass endpoints removed - now using connection request system

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

# Connection Request Models
class ConnectionRequest(BaseModel):
    from_user_hash: str
    to_user_hash: str
    message: Optional[str] = None

class ConnectionResponse(BaseModel):
    connection_id: str
    action: str  # 'accept' or 'decline'

# Connection Request Endpoints
@app.post("/api/v1/connection/request")
async def send_connection_request(request: ConnectionRequest, db: Session = Depends(get_db)):
    """Send a connection request to another user"""
    try:
        logger.info(f"📤 Connection request: {request.from_user_hash} → {request.to_user_hash}")
        
        # Create connection requests table if it doesn't exist
        db.execute(text('''
            CREATE TABLE IF NOT EXISTS connection_requests (
                id VARCHAR PRIMARY KEY,
                from_user_hash VARCHAR NOT NULL,
                to_user_hash VARCHAR NOT NULL,
                message TEXT,
                status VARCHAR DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                responded_at TIMESTAMP NULL,
                UNIQUE(from_user_hash, to_user_hash)
            )
        '''))
        
        # Check if request already exists
        logger.info(f"🔍 Checking for existing request: {request.from_user_hash} → {request.to_user_hash}")
        existing = db.execute(text('''
            SELECT id, status, created_at FROM connection_requests 
            WHERE from_user_hash = :from_user AND to_user_hash = :to_user
        '''), {
            "from_user": request.from_user_hash,
            "to_user": request.to_user_hash
        }).fetchone()
        
        if existing:
            logger.info(f"⚠️ Found existing request: ID={existing.id}, status={existing.status}, created={existing.created_at}")
            return {"success": False, "message": "You have already sent a connection request to this user"}
        
        # Create new connection request
        request_id = hashlib.sha256(f"{request.from_user_hash}_{request.to_user_hash}_{datetime.utcnow()}".encode()).hexdigest()[:16]
        
        db.execute(text('''
            INSERT INTO connection_requests (id, from_user_hash, to_user_hash, message, status)
            VALUES (:id, :from_user, :to_user, :message, :status)
        '''), {
            "id": request_id,
            "from_user": request.from_user_hash,
            "to_user": request.to_user_hash,
            "message": request.message,
            "status": "pending"
        })
        
        db.commit()
        logger.info(f"✅ Connection request created: {request_id} ({request.from_user_hash} → {request.to_user_hash})")
        return {"success": True, "message": "Connection request sent successfully", "request_id": request_id}
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error sending connection request: {e}")
        raise HTTPException(status_code=500, detail="Failed to send connection request")

@app.get("/api/v1/connection/requests/{user_hash}")
async def get_connection_requests(user_hash: str, db: Session = Depends(get_db)):
    """Get pending connection requests for a user"""
    try:
        logger.info(f"🔍 Getting connection requests for user: {user_hash}")
        
        requests = db.execute(text('''
            SELECT cr.id, cr.from_user_hash, cr.message, cr.created_at, u.name, u.photos, u.age, u.bio
            FROM connection_requests cr
            JOIN users u ON cr.from_user_hash = u.user_hash
            WHERE cr.to_user_hash = :user_hash AND cr.status = 'pending'
            ORDER BY cr.created_at DESC
        '''), {"user_hash": user_hash}).fetchall()
        
        request_list = []
        for req in requests:
            photos = json.loads(req.photos) if req.photos else []
            request_list.append({
                "id": req.id,
                "from_user_hash": req.from_user_hash,
                "name": req.name,
                "age": req.age,
                "bio": req.bio,
                "photos": photos,
                "message": req.message,
                "created_at": req.created_at
            })
        
        logger.info(f"📋 Found {len(request_list)} connection requests for {user_hash}")
        return {"requests": request_list, "count": len(request_list)}
        
    except Exception as e:
        logger.error(f"❌ Error getting connection requests for {user_hash}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get connection requests")

@app.get("/api/v1/connection/sent/{user_hash}")
async def get_sent_connection_requests(user_hash: str, db: Session = Depends(get_db)):
    """Get connection requests sent by a user"""
    try:
        logger.info(f"🔍 Getting sent connection requests for user: {user_hash}")
        
        requests = db.execute(text('''
            SELECT cr.id, cr.to_user_hash, cr.message, cr.created_at, cr.status, u.name, u.photos, u.age, u.bio
            FROM connection_requests cr
            JOIN users u ON cr.to_user_hash = u.user_hash
            WHERE cr.from_user_hash = :user_hash
            ORDER BY cr.created_at DESC
        '''), {"user_hash": user_hash}).fetchall()
        
        request_list = []
        for req in requests:
            photos = json.loads(req.photos) if req.photos else []
            request_list.append({
                "id": req.id,
                "to_user_hash": req.to_user_hash,
                "name": req.name,
                "age": req.age,
                "bio": req.bio,
                "photos": photos,
                "message": req.message,
                "status": req.status,
                "created_at": req.created_at
            })
        
        logger.info(f"📋 Found {len(request_list)} sent connection requests for {user_hash}")
        return {"requests": request_list, "count": len(request_list)}
        
    except Exception as e:
        logger.error(f"❌ Error getting sent connection requests for {user_hash}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get sent connection requests")

@app.post("/api/v1/connection/respond")
async def respond_to_connection_request(response: ConnectionResponse, db: Session = Depends(get_db)):
    """Accept or decline a connection request"""
    try:
        # Update the connection request status
        db.execute(text('''
            UPDATE connection_requests 
            SET status = :status, responded_at = :responded_at
            WHERE id = :request_id
        '''), {
            "status": response.action,
            "responded_at": datetime.utcnow(),
            "request_id": response.connection_id
        })
        
        if response.action == 'accept':
            # Create matches table if it doesn't exist
            db.execute(text('''
                CREATE TABLE IF NOT EXISTS matches (
                    id VARCHAR PRIMARY KEY,
                    user1_hash VARCHAR NOT NULL,
                    user2_hash VARCHAR NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user1_hash, user2_hash)
                )
            '''))
            
            # Get the connection request details
            request_details = db.execute(text('''
                SELECT from_user_hash, to_user_hash FROM connection_requests WHERE id = :request_id
            '''), {"request_id": response.connection_id}).fetchone()
            
            if request_details:
                # Create a match
                match_id = hashlib.sha256(f"{request_details.from_user_hash}_{request_details.to_user_hash}_match_{datetime.utcnow()}".encode()).hexdigest()[:16]
                
                db.execute(text('''
                    INSERT INTO matches (id, user1_hash, user2_hash)
                    VALUES (:id, :user1, :user2)
                    ON CONFLICT (user1_hash, user2_hash) DO NOTHING
                '''), {
                    "id": match_id,
                    "user1": request_details.from_user_hash,
                    "user2": request_details.to_user_hash
                })
        
        db.commit()
        return {"success": True, "message": f"Connection request {response.action}ed successfully"}
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error responding to connection request: {e}")
        raise HTTPException(status_code=500, detail="Failed to respond to connection request")

@app.get("/api/v1/matches/{user_hash}")
async def get_user_matches(user_hash: str, db: Session = Depends(get_db)):
    """Get all matches for a user"""
    try:
        matches = db.execute(text('''
            SELECT m.id, m.created_at,
                   CASE 
                       WHEN m.user1_hash = :user_hash THEN m.user2_hash
                       ELSE m.user1_hash
                   END as matched_user_hash,
                   u.name, u.age, u.bio, u.photos, u.location, u.interests
            FROM matches m
            JOIN users u ON (
                CASE 
                    WHEN m.user1_hash = :user_hash THEN m.user2_hash
                    ELSE m.user1_hash
                END = u.user_hash
            )
            WHERE m.user1_hash = :user_hash OR m.user2_hash = :user_hash
            ORDER BY m.created_at DESC
        '''), {"user_hash": user_hash}).fetchall()
        
        match_list = []
        for match in matches:
            photos = json.loads(match.photos) if match.photos else []
            interests = json.loads(match.interests) if match.interests else []
            
            match_list.append({
                "id": match.id,
                "matched_user_hash": match.matched_user_hash,
                "name": match.name,
                "age": match.age,
                "bio": match.bio,
                "photos": photos,
                "location": match.location,
                "interests": interests,
                "matched_at": match.created_at
            })
        
        return {"matches": match_list, "count": len(match_list)}
        
    except Exception as e:
        logger.error(f"Error getting matches: {e}")
        raise HTTPException(status_code=500, detail="Failed to get matches")

@app.get("/api/v1/discover/{user_hash}")
async def discover_users(user_hash: str, refresh: bool = False, db: Session = Depends(get_db)):
    """Get users for discovery, with optional refresh mode to show all users again"""
    try:
        logger.info(f"🔍 Discovering users for: {user_hash} (refresh={refresh})")
        
        # Create swipes table if it doesn't exist
        db.execute(text('''
            CREATE TABLE IF NOT EXISTS swipes (
                id VARCHAR PRIMARY KEY,
                from_user_hash VARCHAR NOT NULL,
                to_user_hash VARCHAR NOT NULL,
                action VARCHAR NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(from_user_hash, to_user_hash)
            )
        '''))
        
        if refresh:
            # Refresh mode: Show all users except current user (no filtering)
            logger.info(f"🔄 Refresh mode: showing all users for {user_hash}")
            users = db.execute(text('''
                SELECT u.user_hash, u.name, u.age, u.bio, u.location, u.photos, u.interests
                FROM users u
                WHERE u.user_hash != :current_user 
                ORDER BY RANDOM()
                LIMIT 50
            '''), {"current_user": user_hash}).fetchall()
        else:
            # Normal mode: Filter out swiped users and connection requests
            # Check how many users this user has already swiped on
            swiped_count = db.execute(text('''
                SELECT COUNT(*) as count FROM swipes WHERE from_user_hash = :current_user
            '''), {"current_user": user_hash}).fetchone()
            
            # Check how many connection requests this user has sent
            requests_count = db.execute(text('''
                SELECT COUNT(*) as count FROM connection_requests WHERE from_user_hash = :current_user
            '''), {"current_user": user_hash}).fetchone()
            
            logger.info(f"📊 User {user_hash} has swiped on {swiped_count.count if swiped_count else 0} users")
            logger.info(f"📊 User {user_hash} has sent {requests_count.count if requests_count else 0} connection requests")
            
            # Debug: Get users excluded by connection requests
            excluded_by_requests = db.execute(text('''
                SELECT to_user_hash FROM connection_requests WHERE from_user_hash = :current_user
            '''), {"current_user": user_hash}).fetchall()
            
            # Debug: Get users excluded by swipes  
            excluded_by_swipes = db.execute(text('''
                SELECT to_user_hash FROM swipes WHERE from_user_hash = :current_user
            '''), {"current_user": user_hash}).fetchall()
            
            logger.info(f"🚫 Users excluded by requests: {[r.to_user_hash for r in excluded_by_requests]}")
            logger.info(f"🚫 Users excluded by swipes: {[s.to_user_hash for s in excluded_by_swipes]}")
            
            # Get users excluding current user, users with existing connection requests, and already swiped users
            users = db.execute(text('''
                SELECT u.user_hash, u.name, u.age, u.bio, u.location, u.photos, u.interests
                FROM users u
                WHERE u.user_hash != :current_user 
                AND u.user_hash NOT IN (
                    SELECT to_user_hash FROM connection_requests WHERE from_user_hash = :current_user
                )
                AND u.user_hash NOT IN (
                    SELECT to_user_hash FROM swipes WHERE from_user_hash = :current_user
                )
                ORDER BY RANDOM()
                LIMIT 20
            '''), {"current_user": user_hash}).fetchall()
        
        logger.info(f"✅ Found {len(users)} discoverable users for {user_hash}")
        
        user_list = []
        for user in users:
            photos = json.loads(user.photos) if user.photos else []
            interests = json.loads(user.interests) if user.interests else []
            
            user_list.append({
                "user_hash": user.user_hash,
                "name": user.name,
                "age": user.age,
                "bio": user.bio,
                "location": user.location,
                "photos": photos,
                "interests": interests,
                "compatibilityScore": 75 + (hash(user.user_hash) % 25)  # Mock compatibility score
            })
        
        return {"users": user_list, "count": len(user_list)}
        
    except Exception as e:
        logger.error(f"Error discovering users: {e}")
        raise HTTPException(status_code=500, detail="Failed to discover users")

@app.get("/api/v1/debug/user-actions/{user_hash}")
async def debug_user_actions(user_hash: str, db: Session = Depends(get_db)):
    """Debug endpoint to check what actions a user has taken"""
    try:
        # Get all swipes by this user
        swipes = db.execute(text('''
            SELECT to_user_hash, action, created_at FROM swipes 
            WHERE from_user_hash = :user_hash 
            ORDER BY created_at DESC
        '''), {"user_hash": user_hash}).fetchall()
        
        # Get all connection requests by this user
        requests = db.execute(text('''
            SELECT to_user_hash, status, created_at FROM connection_requests 
            WHERE from_user_hash = :user_hash 
            ORDER BY created_at DESC
        '''), {"user_hash": user_hash}).fetchall()
        
        # Get all users except current user
        all_users = db.execute(text('''
            SELECT user_hash, name FROM users WHERE user_hash != :user_hash
        '''), {"user_hash": user_hash}).fetchall()
        
        return {
            "user_hash": user_hash,
            "total_users_in_db": len(all_users),
            "swipes_made": len(swipes),
            "requests_sent": len(requests),
            "swipes": [{"to_user": s.to_user_hash, "action": s.action, "created_at": str(s.created_at)} for s in swipes],
            "requests": [{"to_user": r.to_user_hash, "status": r.status, "created_at": str(r.created_at)} for r in requests],
            "all_users": [{"user_hash": u.user_hash, "name": u.name} for u in all_users]
        }
        
    except Exception as e:
        logger.error(f"Error in debug endpoint: {e}")
        raise HTTPException(status_code=500, detail="Debug failed")

@app.get("/api/v1/users/count")
async def get_user_count(db: Session = Depends(get_db)):
    """Get total number of users in the database for debugging"""
    try:
        count = db.execute(text("SELECT COUNT(*) as count FROM users")).fetchone()
        all_users = db.execute(text("SELECT user_hash, name, email FROM users")).fetchall()
        
        user_list = []
        for user in all_users:
            user_list.append({
                "user_hash": user.user_hash,
                "name": user.name,
                "email": user.email
            })
        
        return {
            "total_users": count.count if count else 0,
            "users": user_list
        }
    except Exception as e:
        logger.error(f"Error getting user count: {e}")
        raise HTTPException(status_code=500, detail="Failed to get user count")

@app.post("/api/v1/swipe")
async def record_swipe(swipe_data: dict, db: Session = Depends(get_db)):
    """Record a swipe action (like or pass)"""
    try:
        from_user = swipe_data.get('from_user_hash')
        to_user = swipe_data.get('to_user_hash')
        action = swipe_data.get('action')  # 'like' or 'pass'
        
        logger.info(f"👆 Recording swipe: {from_user} → {to_user} ({action})")
        
        if not all([from_user, to_user, action]):
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        # Record the swipe
        swipe_id = hashlib.sha256(f"{from_user}_{to_user}_{action}_{datetime.utcnow()}".encode()).hexdigest()[:16]
        
        db.execute(text('''
            INSERT INTO swipes (id, from_user_hash, to_user_hash, action)
            VALUES (:id, :from_user, :to_user, :action)
            ON CONFLICT (from_user_hash, to_user_hash) DO UPDATE SET
                action = EXCLUDED.action,
                id = EXCLUDED.id
        '''), {
            "id": swipe_id,
            "from_user": from_user,
            "to_user": to_user,
            "action": action
        })
        
        db.commit()
        logger.info(f"✅ Swipe recorded successfully: {from_user} → {to_user} ({action})")
        
        if action == 'like':
            return {"success": True, "message": "You have sent a connection request"}
        else:
            return {"success": True, "message": "User passed"}
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error recording swipe: {e}")
        raise HTTPException(status_code=500, detail="Failed to record swipe")

# Messaging System Models
class MessageRequest(BaseModel):
    from_user_hash: str
    to_user_hash: str
    content: str
    message_type: str = "text"

class ConversationResponse(BaseModel):
    id: str
    participants: List[str]
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None
    unread_count: int = 0

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_hash: str):
        await websocket.accept()
        self.active_connections[user_hash] = websocket
        logger.info(f"📱 User {user_hash} connected to chat WebSocket")

    def disconnect(self, user_hash: str):
        if user_hash in self.active_connections:
            del self.active_connections[user_hash]
            logger.info(f"📱 User {user_hash} disconnected from chat WebSocket")

    async def send_personal_message(self, message: str, user_hash: str):
        if user_hash in self.active_connections:
            try:
                await self.active_connections[user_hash].send_text(message)
                return True
            except Exception as e:
                logger.error(f"Error sending message to {user_hash}: {e}")
                self.disconnect(user_hash)
                return False
        return False

manager = ConnectionManager()

# Messaging Endpoints
@app.post("/api/v1/messages")
async def send_message(message: MessageRequest, db: Session = Depends(get_db)):
    """Send a message between matched users"""
    try:
        logger.info(f"💬 Sending message: {message.from_user_hash} → {message.to_user_hash}")
        
        # Create messages table if it doesn't exist
        db.execute(text('''
            CREATE TABLE IF NOT EXISTS messages (
                id VARCHAR PRIMARY KEY,
                conversation_id VARCHAR NOT NULL,
                sender_hash VARCHAR NOT NULL,
                receiver_hash VARCHAR NOT NULL,
                content TEXT NOT NULL,
                message_type VARCHAR DEFAULT 'text',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                read_at TIMESTAMP NULL
            )
        '''))
        
        # Create conversations table if it doesn't exist
        db.execute(text('''
            CREATE TABLE IF NOT EXISTS conversations (
                id VARCHAR PRIMARY KEY,
                participant1_hash VARCHAR NOT NULL,
                participant2_hash VARCHAR NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(participant1_hash, participant2_hash)
            )
        '''))
        
        # Verify users are matched
        match_check = db.execute(text('''
            SELECT id FROM matches 
            WHERE (user1_hash = :user1 AND user2_hash = :user2) 
               OR (user1_hash = :user2 AND user2_hash = :user1)
        '''), {
            "user1": message.from_user_hash,
            "user2": message.to_user_hash
        }).fetchone()
        
        if not match_check:
            logger.warning(f"⚠️ No match found between {message.from_user_hash} and {message.to_user_hash}")
            raise HTTPException(status_code=403, detail="You can only message matched users")
        
        # Create conversation ID (consistent ordering)
        conversation_participants = sorted([message.from_user_hash, message.to_user_hash])
        conversation_id = hashlib.sha256(f"{conversation_participants[0]}_{conversation_participants[1]}".encode()).hexdigest()[:16]
        
        # Create conversation if it doesn't exist
        db.execute(text('''
            INSERT INTO conversations (id, participant1_hash, participant2_hash, last_message_at)
            VALUES (:id, :p1, :p2, CURRENT_TIMESTAMP)
            ON CONFLICT (participant1_hash, participant2_hash) DO NOTHING
        '''), {
            "id": conversation_id,
            "p1": conversation_participants[0],
            "p2": conversation_participants[1]
        })
        
        # Create message
        message_id = hashlib.sha256(f"{message.from_user_hash}_{message.to_user_hash}_{message.content}_{datetime.utcnow()}".encode()).hexdigest()[:16]
        
        db.execute(text('''
            INSERT INTO messages (id, conversation_id, sender_hash, receiver_hash, content, message_type)
            VALUES (:id, :conv_id, :sender, :receiver, :content, :type)
        '''), {
            "id": message_id,
            "conv_id": conversation_id,
            "sender": message.from_user_hash,
            "receiver": message.to_user_hash,
            "content": message.content,
            "type": message.message_type
        })
        
        # Update conversation last_message_at
        db.execute(text('''
            UPDATE conversations 
            SET last_message_at = CURRENT_TIMESTAMP 
            WHERE id = :conv_id
        '''), {"conv_id": conversation_id})
        
        db.commit()
        
        # Send real-time notification via WebSocket
        message_data = {
            "id": message_id,
            "conversation_id": conversation_id,
            "sender_hash": message.from_user_hash,
            "receiver_hash": message.to_user_hash,
            "content": message.content,
            "message_type": message.message_type,
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Send to receiver if they're connected
        await manager.send_personal_message(json.dumps(message_data), message.to_user_hash)
        
        logger.info(f"✅ Message sent successfully: {message_id}")
        return {"success": True, "message_id": message_id, "conversation_id": conversation_id}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error sending message: {e}")
        raise HTTPException(status_code=500, detail="Failed to send message")

@app.get("/api/v1/messages/{conversation_id}")
async def get_messages(conversation_id: str, user_hash: str, db: Session = Depends(get_db)):
    """Get messages for a conversation"""
    try:
        logger.info(f"📨 Getting messages for conversation {conversation_id}, user {user_hash}")
        
        # Extract participant hashes from the conversation_id string
        user_hashes = conversation_id.split('_')
        if len(user_hashes) != 2:
            raise HTTPException(status_code=400, detail="Invalid conversation ID format")
        
        participant1_hash, participant2_hash = sorted(user_hashes)

        # Find the canonical conversation ID from the database
        db_conversation_id = db.execute(text('''
            SELECT id FROM conversations 
            WHERE participant1_hash = :p1 AND participant2_hash = :p2
        '''), {
            "p1": participant1_hash,
            "p2": participant2_hash
        }).scalar()

        if not db_conversation_id:
            # If no conversation exists, return an empty list, which is a valid scenario
            logger.warning(f"Conversation not found for participants {participant1_hash} and {participant2_hash}. Returning empty list.")
            return []

        # Verify the requesting user is part of this conversation
        if user_hash not in user_hashes:
            raise HTTPException(status_code=403, detail="User not part of this conversation")
        
        # Get messages using the canonical ID
        messages = db.execute(text('''
            SELECT id, sender_hash, receiver_hash, content, message_type, created_at, read_at
            FROM messages 
            WHERE conversation_id = :conv_id 
            ORDER BY created_at ASC
        '''), {"conv_id": db_conversation_id}).fetchall()
        
        logger.info(f"✅ Found {len(messages)} messages for conversation {db_conversation_id}")
        
        return [dict(row._mapping) for row in messages]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting messages for conversation {conversation_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Persist reveal answers tied to a connection context
@app.post("/api/v1/reveal/answers")
async def submit_reveal_answers(payload: RevealAnswers, db: Session = Depends(get_db)):
    try:
        # Create table if not exists
        db.execute(text('''
            CREATE TABLE IF NOT EXISTS reveal_answers (
                id SERIAL PRIMARY KEY,
                from_user_hash VARCHAR NOT NULL,
                to_user_hash VARCHAR NOT NULL,
                answers TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        '''))
        db.execute(text('''
            INSERT INTO reveal_answers (from_user_hash, to_user_hash, answers)
            VALUES (:from_user, :to_user, :answers)
        '''), {
            "from_user": payload.from_user_hash,
            "to_user": payload.to_user_hash,
            "answers": json.dumps(payload.answers)
        })
        db.commit()
        return {"success": True, "message": "Answers saved"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving reveal answers: {e}")
        raise HTTPException(status_code=500, detail="Failed to save answers")

# Simple behavioral state classification based on recent features
@app.get("/v1/state/{session_id}")
async def get_behavior_state(session_id: str):
    try:
        extractor = FeatureExtractor()
        feats = extractor.extract_realtime_features(session_id)
        if not feats:
            return {"state": "unknown", "confidence": 0.4}

        # Heuristic rules
        typing_speed = float(feats.get('typing_speed_chars_per_min', 0) or 0)
        backspace_ratio = float(feats.get('backspace_ratio', 0) or 0)
        pause_long = float(feats.get('long_pause_count', 0) or 0)
        scroll_mean = float(feats.get('scroll_velocity_mean', 0) or 0)
        activity_density = float(feats.get('activity_density', 0) or 0)

        # Scores for states
        engaged_score = (typing_speed/80.0) + (scroll_mean*0.2) + (activity_density*0.1)
        hesitate_score = backspace_ratio*0.8 + min(pause_long, 3)*0.1
        disengaged_score = max(0.0, 0.4 - activity_density*0.1) + max(0.0, 0.2 - scroll_mean*0.05)

        # Normalize
        total = engaged_score + hesitate_score + disengaged_score + 1e-6
        engaged_p = engaged_score/total
        hesitate_p = hesitate_score/total
        disengaged_p = disengaged_score/total

        if max(engaged_p, hesitate_p, disengaged_p) == engaged_p:
            return {"state": "engaged", "confidence": round(min(1.0, engaged_p + 0.2), 2)}
        if max(engaged_p, hesitate_p, disengaged_p) == hesitate_p:
            return {"state": "hesitating", "confidence": round(min(1.0, hesitate_p + 0.2), 2)}
        return {"state": "disengaged", "confidence": round(min(1.0, disengaged_p + 0.2), 2)}
    except Exception as e:
        logger.error(f"Error getting behavior state: {e}")
        raise HTTPException(status_code=500, detail="Failed to compute state")

@app.get("/api/v1/conversations", response_model=List[ConversationResponse])
async def get_conversations(user_hash: str, db: Session = Depends(get_db)):
    """
    Get all conversations for a user, including the latest message and participants' details.
    """
    try:
        logger.info(f"🔍 Fetching conversations for user {user_hash}")
        
        # This query is complex. It joins conversations, messages, and users tables.
        # It uses a subquery with ROW_NUMBER() to get only the latest message for each conversation.
        conversations_query = text("""
            WITH LatestMessages AS (
                SELECT
                    m.conversation_id,
                    m.content,
                    m.created_at,
                    ROW_NUMBER() OVER(PARTITION BY m.conversation_id ORDER BY m.created_at DESC) as rn
                FROM messages m
            )
            SELECT
                c.id as conversation_id,
                c.participant1_hash,
                c.participant2_hash,
                u1.name as participant1_name,
                u2.name as participant2_name,
                u1.photos as participant1_photos,
                u2.photos as participant2_photos,
                lm.content as last_message_content,
                c.last_message_at
            FROM conversations c
            JOIN users u1 ON c.participant1_hash = u1.user_hash
            JOIN users u2 ON c.participant2_hash = u2.user_hash
            LEFT JOIN LatestMessages lm ON c.id = lm.conversation_id AND lm.rn = 1
            WHERE c.participant1_hash = :user_hash OR c.participant2_hash = :user_hash
            ORDER BY c.last_message_at DESC
        """)
        
        results = db.execute(conversations_query, {"user_hash": user_hash}).fetchall()
        
        response_data = []
        for row in results:
            other_participant_hash = row.participant2_hash if row.participant1_hash == user_hash else row.participant1_hash
            other_participant_name = row.participant2_name if row.participant1_hash == user_hash else row.participant1_name
            other_participant_photos = row.participant2_photos if row.participant1_hash == user_hash else row.participant1_photos
            
            # Safely parse photos
            try:
                photos = json.loads(other_participant_photos) if other_participant_photos else []
            except (json.JSONDecodeError, TypeError):
                photos = []

            response_data.append({
                "id": f"{row.participant1_hash}_{row.participant2_hash}", # Use frontend-compatible ID
                "other_user": {
                    "user_hash": other_participant_hash,
                    "name": other_participant_name,
                    "photos": photos
                },
                "last_message": {
                    "content": row.last_message_content or "No messages yet.",
                    "timestamp": row.last_message_at.isoformat() if row.last_message_at else None
                }
            })
            
        logger.info(f"✅ Found {len(response_data)} conversations for user {user_hash}")
        return response_data

    except Exception as e:
        logger.error(f"❌ Error fetching conversations for user {user_hash}: {e}")
        # It's better to return an empty list than to crash the app
        return []

@app.websocket("/ws/chat/{conversation_id}")
async def websocket_chat(websocket: WebSocket, conversation_id: str, db: Session = Depends(get_db)):
    """WebSocket endpoint for real-time chat"""
    try:
        logger.info(f"🔗 WebSocket connection attempt for conversation: {conversation_id}")
        
        # For the conversation_id format like "user1_user2", we need to determine which user is connecting
        # We'll handle authentication through WebSocket messages instead
        await websocket.accept()
        
        # Wait for authentication message from client
        try:
            auth_data = await websocket.receive_text()
            auth_message = json.loads(auth_data)
            
            if auth_message.get("type") != "auth":
                await websocket.close(code=1008, reason="Authentication required")
                return
                
            user_hash = auth_message.get("user_hash")
            if not user_hash:
                await websocket.close(code=1008, reason="User hash required")
                return
                
            logger.info(f"🔐 WebSocket authentication: user={user_hash}, conversation={conversation_id}")
            
            # Verify user exists
            user = db.execute(text('''
                SELECT user_hash FROM users WHERE user_hash = :hash AND is_active = 1
            '''), {"hash": user_hash}).fetchone()
            
            if not user:
                logger.warning(f"❌ User not found: {user_hash}")
                await websocket.close(code=1008, reason="User not found")
                return
            
            # Verify user is part of this conversation by checking if they're matched
            # Parse conversation_id to get the two user hashes
            if "_" in conversation_id:
                parts = conversation_id.split("_")
                if len(parts) == 2:
                    user1_hash, user2_hash = parts
                    if user_hash not in [user1_hash, user2_hash]:
                        logger.warning(f"❌ User {user_hash} not part of conversation {conversation_id}")
                        await websocket.close(code=1008, reason="Not part of this conversation")
                        return
                        
                    # Verify these users are actually matched
                    match_check = db.execute(text('''
                        SELECT id FROM matches 
                        WHERE (user1_hash = :u1 AND user2_hash = :u2) 
                           OR (user1_hash = :u2 AND user2_hash = :u1)
                    '''), {"u1": user1_hash, "u2": user2_hash}).fetchone()
                    
                    if not match_check:
                        logger.warning(f"❌ No match found between users in conversation {conversation_id}")
                        await websocket.close(code=1008, reason="Users are not matched")
                        return
            
            # Add to connection manager
            manager.active_connections[user_hash] = websocket
            logger.info(f"✅ WebSocket authenticated and connected: {user_hash}")
            
            # Send confirmation
            await websocket.send_text(json.dumps({"type": "auth_success", "user_hash": user_hash}))
            
        except json.JSONDecodeError:
            await websocket.close(code=1008, reason="Invalid authentication message")
            return
        except Exception as e:
            logger.error(f"❌ Authentication error: {e}")
            await websocket.close(code=1008, reason="Authentication failed")
            return
        
        try:
            while True:
                # Keep connection alive and handle any incoming messages
                data = await websocket.receive_text()
                logger.info(f"💬 WebSocket message from {user_hash}: {data}")
                
                # Parse incoming message (could be ping/pong or message events)
                try:
                    message_data = json.loads(data)
                    if message_data.get("type") == "ping":
                        await websocket.send_text(json.dumps({"type": "pong"}))
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON from {user_hash}: {data}")
                    
        except WebSocketDisconnect:
            manager.disconnect(user_hash)
            logger.info(f"📱 User {user_hash} disconnected from WebSocket")
            
    except Exception as e:
        logger.error(f"❌ WebSocket error for {user_hash}: {e}")
        manager.disconnect(user_hash)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
