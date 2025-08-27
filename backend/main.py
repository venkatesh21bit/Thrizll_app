




# ...existing code...

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Digital Body Language API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.post("/api/v1/discover")
async def discover_users(payload: dict = Body(...)):
    """Return a list of user profiles for discovery (mock data)."""
    return {"users": [user.dict() for user in mock_users]}
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, String, Integer, Float, DateTime, Text, Boolean
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
import json
import logging
from feature_extractor import FeatureExtractor, compute_and_store_features
from ml_model import score_features
from models import DBSession, DBEvent, DBFeatures, SessionLocal, Base, engine
# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Import DB models and SessionLocal from models.py
from models import DBSession, DBEvent, DBFeatures, SessionLocal

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

# FastAPI App
app = FastAPI(title="Digital Body Language API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    db_session = DBSession(
        user_hash=session_data.user_hash,
        started_at=datetime.utcnow(),
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
        for event in batch.events:
            db_event = DBEvent(
                ts=datetime.fromtimestamp(event.ts / 1000),
                session_id=uuid.UUID(event.session_id),
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
        session_uuid = uuid.UUID(session_id)
        features_record = db.query(DBFeatures).filter(
            DBFeatures.session_id == session_uuid
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
                        session_id=session_uuid,
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
        session_uuid = uuid.UUID(session_id)
        
        # Get session info
        session = db.query(DBSession).filter(
            DBSession.session_id == session_uuid
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get event counts by type
        events = db.query(DBEvent).filter(
            DBEvent.session_id == session_uuid
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

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
