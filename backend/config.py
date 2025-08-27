# Development Configuration
DATABASE_URL = "sqlite:///./telemetry.db"  # Use SQLite for demo
# DATABASE_URL = "postgresql://username:password@localhost:5432/telemetry_db"  # Production PostgreSQL

# API Configuration  
API_HOST = "0.0.0.0"
API_PORT = 8000
API_DEBUG = True

# ML Model Configuration
MODEL_PATH = "models/"
FEATURE_WINDOW_MINUTES = 2
BATCH_SIZE = 50
MAX_RETRIES = 3

# Session Configuration
SESSION_TIMEOUT_MINUTES = 30
MAX_EVENTS_PER_BATCH = 100

# Privacy Configuration
DATA_RETENTION_DAYS = 30
CONSENT_VERSION = "1.0"

# Logging
LOG_LEVEL = "INFO"
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
