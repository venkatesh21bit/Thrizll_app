import os
from sqlalchemy import create_engine, Column, String, Integer, Float, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.types import JSON

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://thrizll_user:YImqNQ1YXFPRHZXquTuUMF5iu6OKqxTD@dpg-d341fs6mcj7s73apn2a0-a/thrizll")

# For Render, DATABASE_URL might have postgres:// instead of postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://") and "+psycopg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Models
class DBSession(Base):
    __tablename__ = "sessions"
    session_id = Column(String, primary_key=True)
    user_hash = Column(String, nullable=False)
    started_at = Column(DateTime, nullable=False)
    ended_at = Column(DateTime, nullable=True)
    device = Column(JSON)

class DBEvent(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True, autoincrement=True)
    ts = Column(DateTime, nullable=False)
    session_id = Column(String, nullable=False)
    user_hash = Column(String, nullable=False)
    screen = Column(String, nullable=False)
    component_id = Column(String, nullable=True)
    etype = Column(String, nullable=False)
    duration_ms = Column(Integer, nullable=True)
    delta = Column(Float, nullable=True)
    velocity = Column(Float, nullable=True)
    accel = Column(Float, nullable=True)
    key_code = Column(String, nullable=True)
    input_len = Column(Integer, nullable=True)
    backspaces = Column(Integer, nullable=True)
    meta = Column(JSON, nullable=True)

class DBFeatures(Base):
    __tablename__ = "features"
    session_id = Column(String, primary_key=True)
    computed_at = Column(DateTime, nullable=False)
    f = Column(JSON, nullable=False)  # features
    label = Column(Integer, nullable=True)
    score = Column(Float, nullable=True)
    conf = Column(Float, nullable=True)

class DBUser(Base):
    __tablename__ = "users"
    user_hash = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=True)  # Nullable for guest users
    password_hash = Column(String, nullable=True)  # Nullable for guest users
    name = Column(String, nullable=False)
    age = Column(Integer, nullable=True)
    bio = Column(String, nullable=True)
    location = Column(String, nullable=True)
    photos = Column(String, nullable=True)  # JSON string
    interests = Column(String, nullable=True)  # JSON string
    created_at = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True)
    is_guest = Column(Boolean, default=False)

class DBLike(Base):
    __tablename__ = "likes"
    id = Column(Integer, primary_key=True, autoincrement=True)
    liker_user_hash = Column(String, nullable=False)  # User who likes
    liked_user_hash = Column(String, nullable=False)  # User being liked
    created_at = Column(DateTime, nullable=False)
    is_match = Column(Boolean, default=False)  # True if mutual like

class DBNotification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_hash = Column(String, nullable=False)  # User receiving notification
    type = Column(String, nullable=False)  # 'like', 'match', etc.
    from_user_hash = Column(String, nullable=False)  # User who triggered notification
    message = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False)
    is_read = Column(Boolean, default=False)
    extra_data = Column(JSON, nullable=True)  # Additional data
