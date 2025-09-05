import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime, timedelta
from models import DBEvent, DBFeatures, SessionLocal
import uuid
import logging

logger = logging.getLogger(__name__)

def convert_numpy_types(obj):
    """Convert numpy types to JSON-serializable Python types"""
    if isinstance(obj, dict):
        return {key: convert_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    else:
        return obj

class FeatureExtractor:
    """Extract behavioral features from telemetry events"""
    
    def __init__(self):
        self.window_size_minutes = 5  # Feature extraction window
        
    def extract_session_features(self, session_id: str) -> Dict[str, float]:
        """Extract features for a complete session"""
        db = SessionLocal()
        try:
            events = db.query(DBEvent).filter(
                DBEvent.session_id == session_id
            ).order_by(DBEvent.ts).all()
            
            if not events:
                return {}
            
            # Convert to DataFrame for easier processing
            df = pd.DataFrame([{
                'ts': event.ts,
                'etype': event.etype,
                'duration_ms': event.duration_ms,
                'delta': event.delta,
                'velocity': event.velocity,
                'accel': event.accel,
                'input_len': event.input_len,
                'backspaces': event.backspaces,
                'screen': event.screen,
                'component_id': event.component_id
            } for event in events])
            
            return self._extract_features_from_df(df)
            
        finally:
            db.close()
    
    def extract_realtime_features(self, session_id: str, window_minutes: int = 2) -> Dict[str, float]:
        """Extract features for recent activity in a session"""
        db = SessionLocal()
        try:
            cutoff_time = datetime.utcnow() - timedelta(minutes=window_minutes)
            
            events = db.query(DBEvent).filter(
                and_(
                    DBEvent.session_id == session_id,
                    DBEvent.ts >= cutoff_time
                )
            ).order_by(DBEvent.ts).all()
            
            if not events:
                return {}
            
            # Convert to DataFrame
            df = pd.DataFrame([{
                'ts': event.ts,
                'etype': event.etype,
                'duration_ms': event.duration_ms,
                'delta': event.delta,
                'velocity': event.velocity,
                'accel': event.accel,
                'input_len': event.input_len,
                'backspaces': event.backspaces,
                'screen': event.screen,
                'component_id': event.component_id
            } for event in events])
            
            return self._extract_features_from_df(df)
            
        finally:
            db.close()
    
    def _extract_features_from_df(self, df: pd.DataFrame) -> Dict[str, float]:
        """Extract features from event DataFrame"""
        if df.empty:
            return {}
        
        features = {}
        
        # Basic event statistics
        features.update(self._extract_basic_features(df))
        
        # Scroll behavior features
        features.update(self._extract_scroll_features(df))
        
        # Typing behavior features
        features.update(self._extract_typing_features(df))
        
        # Tap behavior features
        features.update(self._extract_tap_features(df))
        
        # Temporal features
        features.update(self._extract_temporal_features(df))
        
        # Pause analysis
        features.update(self._extract_pause_features(df))
        
        return features
    
    def _extract_basic_features(self, df: pd.DataFrame) -> Dict[str, float]:
        """Basic event count and frequency features"""
        features = {}
        
        # Event counts by type
        event_counts = df['etype'].value_counts()
        total_events = len(df)
        
        for etype in ['SCROLL', 'TAP', 'TYPE', 'LONG_PRESS', 'PAUSE', 'FOCUS_CHANGE']:
            features[f'{etype.lower()}_count'] = event_counts.get(etype, 0)
            features[f'{etype.lower()}_ratio'] = event_counts.get(etype, 0) / max(total_events, 1)
        
        features['total_events'] = total_events
        
        # Session duration
        if total_events > 1:
            duration_seconds = (df['ts'].max() - df['ts'].min()).total_seconds()
            features['session_duration_seconds'] = duration_seconds
            features['events_per_second'] = total_events / max(duration_seconds, 1)
        else:
            features['session_duration_seconds'] = 0
            features['events_per_second'] = 0
        
        return features
    
    def _extract_scroll_features(self, df: pd.DataFrame) -> Dict[str, float]:
        """Extract scroll behavior features"""
        scroll_df = df[df['etype'] == 'SCROLL'].copy()
        features = {}
        
        if scroll_df.empty:
            return {
                'scroll_velocity_mean': 0,
                'scroll_velocity_std': 0,
                'scroll_velocity_max': 0,
                'scroll_accel_mean': 0,
                'scroll_accel_std': 0,
                'scroll_direction_changes': 0,
                'scroll_burst_count': 0
            }
        
        # Velocity statistics
        velocities = scroll_df['velocity'].dropna()
        if not velocities.empty:
            features['scroll_velocity_mean'] = velocities.mean()
            features['scroll_velocity_std'] = velocities.std()
            features['scroll_velocity_max'] = velocities.max()
            features['scroll_velocity_p95'] = velocities.quantile(0.95)
        
        # Acceleration statistics
        accelerations = scroll_df['accel'].dropna()
        if not accelerations.empty:
            features['scroll_accel_mean'] = accelerations.mean()
            features['scroll_accel_std'] = accelerations.std()
            features['scroll_accel_max'] = accelerations.max()
        
        # Direction changes (delta sign changes)
        deltas = scroll_df['delta'].dropna()
        if len(deltas) > 1:
            sign_changes = np.sum(np.diff(np.sign(deltas)) != 0)
            features['scroll_direction_changes'] = sign_changes
        
        # Scroll bursts (rapid consecutive scrolls)
        scroll_df['time_diff'] = scroll_df['ts'].diff().dt.total_seconds()
        burst_threshold = 0.1  # 100ms
        bursts = (scroll_df['time_diff'] < burst_threshold).sum()
        features['scroll_burst_count'] = bursts
        
        return features
    
    def _extract_typing_features(self, df: pd.DataFrame) -> Dict[str, float]:
        """Extract typing behavior features"""
        type_df = df[df['etype'] == 'TYPE'].copy()
        features = {}
        
        if type_df.empty:
            return {
                'typing_speed_chars_per_min': 0,
                'backspace_ratio': 0,
                'typing_burst_count': 0,
                'inter_key_interval_mean': 0,
                'inter_key_interval_std': 0,
                'typing_rhythm_entropy': 0
            }
        
        # Inter-key intervals
        type_df['time_diff'] = type_df['ts'].diff().dt.total_seconds()
        intervals = type_df['time_diff'].dropna()
        
        if not intervals.empty:
            features['inter_key_interval_mean'] = intervals.mean()
            features['inter_key_interval_std'] = intervals.std()
            features['inter_key_interval_median'] = intervals.median()
            
            # Typing rhythm entropy
            interval_bins = pd.cut(intervals, bins=10, duplicates='drop')
            if len(interval_bins.dropna()) > 0:
                probs = interval_bins.value_counts(normalize=True)
                features['typing_rhythm_entropy'] = -np.sum(probs * np.log2(probs + 1e-10))
        
        # Backspace analysis
        total_backspaces = type_df['backspaces'].sum()
        total_chars = type_df['input_len'].max() if not type_df['input_len'].empty else 0
        features['backspace_ratio'] = total_backspaces / max(total_chars + total_backspaces, 1)
        features['total_backspaces'] = total_backspaces
        
        # Typing bursts
        burst_threshold = 0.2  # 200ms
        if not intervals.empty:
            bursts = (intervals < burst_threshold).sum()
            features['typing_burst_count'] = bursts
        
        # Typing speed (chars per minute)
        if len(type_df) > 1:
            duration_minutes = (type_df['ts'].max() - type_df['ts'].min()).total_seconds() / 60
            chars_typed = type_df['input_len'].diff().sum()
            features['typing_speed_chars_per_min'] = chars_typed / max(duration_minutes, 0.01)
        
        return features
    
    def _extract_tap_features(self, df: pd.DataFrame) -> Dict[str, float]:
        """Extract tap behavior features"""
        tap_df = df[df['etype'] == 'TAP'].copy()
        features = {}
        
        if tap_df.empty:
            return {
                'tap_frequency': 0,
                'tap_interval_mean': 0,
                'tap_interval_std': 0,
                'rapid_tap_sequences': 0
            }
        
        # Tap intervals
        tap_df['time_diff'] = tap_df['ts'].diff().dt.total_seconds()
        intervals = tap_df['time_diff'].dropna()
        
        if not intervals.empty:
            features['tap_interval_mean'] = intervals.mean()
            features['tap_interval_std'] = intervals.std()
            features['tap_interval_median'] = intervals.median()
            
            # Rapid tap sequences
            rapid_threshold = 0.5  # 500ms
            rapid_taps = (intervals < rapid_threshold).sum()
            features['rapid_tap_sequences'] = rapid_taps
        
        # Tap frequency
        if len(tap_df) > 1:
            duration_seconds = (tap_df['ts'].max() - tap_df['ts'].min()).total_seconds()
            features['tap_frequency'] = len(tap_df) / max(duration_seconds, 1)
        
        return features
    
    def _extract_temporal_features(self, df: pd.DataFrame) -> Dict[str, float]:
        """Extract temporal pattern features"""
        features = {}
        
        if len(df) < 2:
            return {'temporal_regularity': 0, 'activity_density': 0}
        
        # Inter-event intervals
        df = df.sort_values('ts')
        df['time_diff'] = df['ts'].diff().dt.total_seconds()
        intervals = df['time_diff'].dropna()
        
        if not intervals.empty:
            # Temporal regularity (inverse of coefficient of variation)
            cv = intervals.std() / max(intervals.mean(), 0.001)
            features['temporal_regularity'] = 1 / (1 + cv)
            
            # Activity density (events per minute)
            total_duration = (df['ts'].max() - df['ts'].min()).total_seconds() / 60
            features['activity_density'] = len(df) / max(total_duration, 0.01)
        
        return features
    
    def _extract_pause_features(self, df: pd.DataFrame) -> Dict[str, float]:
        """Extract pause and hesitation features"""
        pause_df = df[df['etype'] == 'PAUSE'].copy()
        features = {}
        
        if pause_df.empty:
            return {
                'pause_count': 0,
                'pause_duration_mean': 0,
                'pause_duration_max': 0,
                'long_pause_count': 0
            }
        
        # Pause duration statistics
        durations = pause_df['duration_ms'].dropna()
        if not durations.empty:
            features['pause_count'] = len(durations)
            features['pause_duration_mean'] = durations.mean()
            features['pause_duration_std'] = durations.std()
            features['pause_duration_max'] = durations.max()
            features['pause_duration_median'] = durations.median()
            
            # Long pauses (>2 seconds)
            long_pauses = (durations > 2000).sum()
            features['long_pause_count'] = long_pauses
            features['long_pause_ratio'] = long_pauses / len(durations)
        
        return features

def compute_and_store_features(session_id: str) -> bool:
    """Compute features for a session and store in database"""
    try:
        extractor = FeatureExtractor()
        features = extractor.extract_session_features(session_id)
        
        if not features:
            logger.warning(f"No features extracted for session {session_id}")
            return False
        
        # Store features in database
        db = SessionLocal()
        try:
            # Convert numpy types to JSON-serializable types
            json_features = convert_numpy_types(features)
            
            # Check if features already exist
            existing = db.query(DBFeatures).filter(
                DBFeatures.session_id == session_id
            ).first()
            
            if existing:
                # Update existing features
                existing.f = json_features
                existing.computed_at = datetime.utcnow()
            else:
                # Create new features record
                db_features = DBFeatures(
                    session_id=session_id,
                    computed_at=datetime.utcnow(),
                    f=json_features
                )
                db.add(db_features)
            
            db.commit()
            logger.info(f"Features computed and stored for session {session_id}")
            return True
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error computing features for session {session_id}: {e}")
        return False

if __name__ == "__main__":
    # Test feature extraction
    extractor = FeatureExtractor()
    # This would need a real session ID from the database
    # features = extractor.extract_session_features("test-session-id")
    # print(features)
