import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.calibration import CalibratedClassifierCV
import joblib
import logging
from typing import Dict, Tuple, Optional
from datetime import datetime
import json

logger = logging.getLogger(__name__)

class InterestScoreModel:
    """Machine learning model for predicting interest scores from behavioral features"""
    
    def __init__(self):
        self.model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            n_jobs=-1
        )
        self.scaler = StandardScaler()
        self.feature_names = None
        self.is_trained = False
        self.model_version = "1.0"
        
    def prepare_features(self, features_dict: Dict[str, float]) -> np.ndarray:
        """Convert feature dictionary to model input array"""
        if self.feature_names is None:
            # Define expected feature names (should match feature extractor)
            self.feature_names = [
                'scroll_count', 'tap_count', 'type_count', 'long_press_count', 'pause_count',
                'scroll_ratio', 'tap_ratio', 'type_ratio', 'pause_ratio',
                'total_events', 'session_duration_seconds', 'events_per_second',
                'scroll_velocity_mean', 'scroll_velocity_std', 'scroll_velocity_max',
                'scroll_accel_mean', 'scroll_accel_std', 'scroll_direction_changes',
                'scroll_burst_count', 'typing_speed_chars_per_min', 'backspace_ratio',
                'typing_burst_count', 'inter_key_interval_mean', 'inter_key_interval_std',
                'typing_rhythm_entropy', 'tap_frequency', 'tap_interval_mean',
                'tap_interval_std', 'rapid_tap_sequences', 'temporal_regularity',
                'activity_density', 'pause_duration_mean', 'pause_duration_max',
                'long_pause_count'
            ]
        
        # Create feature vector with default values
        feature_vector = np.zeros(len(self.feature_names))
        
        for i, feature_name in enumerate(self.feature_names):
            if feature_name in features_dict:
                feature_vector[i] = features_dict[feature_name]
        
        # Handle NaN values
        feature_vector = np.nan_to_num(feature_vector, nan=0.0, posinf=0.0, neginf=0.0)
        
        return feature_vector.reshape(1, -1)
    
    def predict_score(self, features_dict: Dict[str, float]) -> Tuple[float, float]:
        """
        Predict interest score and confidence
        Returns: (score, confidence)
        """
        if not self.is_trained:
            # Return mock score for demo
            return self._generate_mock_score(features_dict)
        
        try:
            # Prepare features
            X = self.prepare_features(features_dict)
            
            # Scale features
            X_scaled = self.scaler.transform(X)
            
            # Predict score (0-100)
            raw_score = self.model.predict(X_scaled)[0]
            score = np.clip(raw_score, 0, 100)
            
            # Calculate confidence based on model uncertainty
            confidence = self._calculate_confidence(X_scaled, score)
            
            return float(score), float(confidence)
            
        except Exception as e:
            logger.error(f"Error predicting score: {e}")
            return self._generate_mock_score(features_dict)
    
    def _generate_mock_score(self, features_dict: Dict[str, float]) -> Tuple[float, float]:
        """Generate a realistic mock score for demo purposes"""
        
        # Base score around 50
        base_score = 50.0
        
        # Adjust based on activity level
        total_events = features_dict.get('total_events', 0)
        events_per_second = features_dict.get('events_per_second', 0)
        
        # More activity = higher score (up to a point)
        activity_boost = min(total_events * 0.5, 20)
        frequency_boost = min(events_per_second * 10, 15)
        
        # Typing activity indicates engagement
        typing_speed = features_dict.get('typing_speed_chars_per_min', 0)
        typing_boost = min(typing_speed * 0.1, 10)
        
        # Scroll activity
        scroll_velocity = features_dict.get('scroll_velocity_mean', 0)
        scroll_boost = min(scroll_velocity * 0.05, 8)
        
        # Pauses might indicate consideration (moderate boost)
        pause_count = features_dict.get('pause_count', 0)
        pause_effect = min(pause_count * 2, 10) if pause_count < 5 else -5
        
        # Combine factors
        score = base_score + activity_boost + frequency_boost + typing_boost + scroll_boost + pause_effect
        
        # Add some randomness
        score += np.random.normal(0, 5)
        
        # Clip to valid range
        score = np.clip(score, 0, 100)
        
        # Confidence based on data quality
        confidence = 0.6
        if total_events > 10:
            confidence += 0.1
        if events_per_second > 0.1:
            confidence += 0.1
        if typing_speed > 10:
            confidence += 0.1
        if scroll_velocity > 1:
            confidence += 0.1
        
        confidence = np.clip(confidence, 0.3, 0.95)
        
        return float(score), float(confidence)
    
    def _calculate_confidence(self, X_scaled: np.ndarray, score: float) -> float:
        """Calculate prediction confidence"""
        # For RandomForest, we can use tree variance as uncertainty measure
        try:
            # Get predictions from all trees
            tree_predictions = np.array([tree.predict(X_scaled)[0] for tree in self.model.estimators_])
            
            # Calculate variance across trees
            prediction_variance = np.var(tree_predictions)
            
            # Convert variance to confidence (0-1)
            # Lower variance = higher confidence
            max_variance = 400  # Tunable parameter
            confidence = 1.0 - min(prediction_variance / max_variance, 1.0)
            
            # Ensure minimum confidence
            confidence = max(confidence, 0.3)
            
            return confidence
            
        except Exception as e:
            logger.warning(f"Error calculating confidence: {e}")
            return 0.6  # Default confidence
    
    def train_model(self, features_df: pd.DataFrame, scores: np.ndarray) -> Dict[str, float]:
        """
        Train the model on behavioral features and engagement scores
        """
        try:
            # Prepare feature matrix
            X = features_df[self.feature_names].fillna(0).values
            y = scores
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
            
            # Scale features
            X_train_scaled = self.scaler.fit_transform(X_train)
            X_test_scaled = self.scaler.transform(X_test)
            
            # Train model
            self.model.fit(X_train_scaled, y_train)
            
            # Evaluate
            train_pred = self.model.predict(X_train_scaled)
            test_pred = self.model.predict(X_test_scaled)
            
            metrics = {
                'train_mse': mean_squared_error(y_train, train_pred),
                'test_mse': mean_squared_error(y_test, test_pred),
                'train_r2': r2_score(y_train, train_pred),
                'test_r2': r2_score(y_test, test_pred),
                'feature_count': len(self.feature_names),
                'training_samples': len(X_train)
            }
            
            self.is_trained = True
            logger.info(f"Model trained successfully: {metrics}")
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error training model: {e}")
            raise
    
    def save_model(self, filepath: str):
        """Save trained model to disk"""
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'feature_names': self.feature_names,
            'is_trained': self.is_trained,
            'model_version': self.model_version,
            'saved_at': datetime.utcnow().isoformat()
        }
        
        joblib.dump(model_data, filepath)
        logger.info(f"Model saved to {filepath}")
    
    def load_model(self, filepath: str):
        """Load trained model from disk"""
        try:
            model_data = joblib.load(filepath)
            
            self.model = model_data['model']
            self.scaler = model_data['scaler']
            self.feature_names = model_data['feature_names']
            self.is_trained = model_data['is_trained']
            self.model_version = model_data.get('model_version', '1.0')
            
            logger.info(f"Model loaded from {filepath}")
            
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            raise
    
    def get_feature_importance(self) -> Dict[str, float]:
        """Get feature importance scores"""
        if not self.is_trained:
            return {}
        
        importance_scores = self.model.feature_importances_
        
        return {
            feature: float(score) 
            for feature, score in zip(self.feature_names, importance_scores)
        }

# Global model instance
_model_instance = None

def get_model() -> InterestScoreModel:
    """Get or create global model instance"""
    global _model_instance
    if _model_instance is None:
        _model_instance = InterestScoreModel()
        
        # Try to load pre-trained model
        try:
            _model_instance.load_model('models/interest_score_model.joblib')
        except:
            logger.info("No pre-trained model found, using mock scoring")
    
    return _model_instance

def score_features(features_dict: Dict[str, float]) -> Tuple[float, float]:
    """Score behavioral features and return (score, confidence)"""
    model = get_model()
    return model.predict_score(features_dict)

if __name__ == "__main__":
    # Test the model with sample features
    sample_features = {
        'total_events': 25,
        'events_per_second': 0.5,
        'typing_speed_chars_per_min': 60,
        'scroll_velocity_mean': 150,
        'pause_count': 3,
        'backspace_ratio': 0.1
    }
    
    score, confidence = score_features(sample_features)
    print(f"Interest Score: {score:.1f}, Confidence: {confidence:.2f}")
