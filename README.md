# Digital Body Language MVP

A React Native app that captures micro-interactions, extracts behavioral features, and outputs real-time "interest" scores using machine learning.

## 🚀 Features

- **Micro-Interaction Capture**: Scrolling, tapping, typing rhythm, pauses, and focus changes
- **Real-time Scoring**: ML-powered engagement scoring with confidence intervals
- **Privacy-by-Design**: No content capture, only interaction patterns
- **Offline-First**: Local queuing with secure batch uploads
- **Consent Management**: Granular privacy controls
- **Cross-Platform**: iOS and Android via React Native + Expo

## 📋 Tech Stack

### Frontend
- React Native + Expo
- TypeScript
- React Navigation
- SQLite (local storage)
- Axios (networking)
- WebSocket (real-time updates)

### Backend
- FastAPI (Python)
- PostgreSQL (events & features)
- SQLAlchemy ORM
- scikit-learn (ML models)
- WebSocket support

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL 15+
- Expo CLI
- Git

### Frontend Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the Expo development server**:
   ```bash
   npx expo start
   ```

3. **Run on device/simulator**:
   - iOS: Press `i` in terminal or scan QR code with camera
   - Android: Press `a` in terminal or scan QR code with Expo Go app
   - Web: Press `w` in terminal

### Backend Setup

1. **Install Python dependencies**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Setup PostgreSQL database**:
   ```sql
   CREATE DATABASE telemetry_db;
   CREATE USER telemetry_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE telemetry_db TO telemetry_user;
   ```

3. **Update database URL in `backend/main.py`**:
   ```python
   DATABASE_URL = "postgresql://telemetry_user:your_password@localhost:5432/telemetry_db"
   ```

4. **Start the FastAPI server**:
   ```bash
   cd backend
   python main.py
   ```

   The API will be available at `http://localhost:8000`
   API docs at `http://localhost:8000/docs`

### Network Configuration

For testing on real devices, update the `baseURL` in `src/services/UploadManager.ts`:

```typescript
// Replace with your computer's IP address
this.baseURL = 'http://YOUR_IP_ADDRESS:8000'
```

## 📱 Usage

1. **Launch the app** - You'll see the consent screen
2. **Grant permissions** - Enable telemetry tracking with granular controls
3. **Interact naturally** - Type, scroll, tap in the demo chat interface
4. **Watch the Interest Meter** - Real-time engagement scoring updates
5. **View session data** - See analytics and interaction patterns

## 🏗️ Project Structure

```
thrizillapp/
├── src/
│   ├── components/          # Telemetry-enabled UI components
│   │   ├── TelemetryScrollView.tsx
│   │   ├── TelemetryTextInput.tsx
│   │   ├── TelemetryTouchableOpacity.tsx
│   │   └── InterestMeter.tsx
│   ├── hooks/               # React hooks for telemetry
│   │   └── useTelemetry.ts
│   ├── screens/            # App screens
│   │   ├── ConsentScreen.tsx
│   │   └── DemoScreen.tsx
│   ├── services/           # Core telemetry services
│   │   ├── TelemetrySDK.ts
│   │   ├── LocalQueue.ts
│   │   ├── SessionManager.ts
│   │   ├── UserIdentity.ts
│   │   ├── ConsentManager.ts
│   │   └── UploadManager.ts
│   └── types/              # TypeScript interfaces
│       └── telemetry.ts
├── backend/                # FastAPI backend
│   ├── main.py            # API endpoints
│   ├── feature_extractor.py  # Behavioral feature extraction
│   ├── ml_model.py        # ML scoring model
│   └── requirements.txt
└── .github/
    └── copilot-instructions.md
```

## 🔍 Key Components

### TelemetrySDK
Central service managing event capture, consent, and uploads:
```typescript
const sdk = TelemetrySDK.getInstance();
await sdk.initialize();
const sessionId = await sdk.startSession('ChatScreen');
```

### Enhanced UI Components
Drop-in replacements that automatically capture interactions:
```typescript
<TelemetryScrollView componentId="chat-scroll">
  <TelemetryTextInput componentId="message-input" />
  <TelemetryTouchableOpacity componentId="send-button">
    <Text>Send</Text>
  </TelemetryTouchableOpacity>
</TelemetryScrollView>
```

### Real-time Hook
Easy integration for any screen:
```typescript
const { sessionId, logTap, logScroll } = useInteractionTelemetry();
```

## 📊 Event Types Captured

| Event Type | Data Captured | Use Case |
|------------|---------------|----------|
| SCROLL | Velocity, acceleration, direction | Engagement, attention |
| TAP | Timing, frequency, duration | Decisiveness, focus |
| TYPE | Rhythm, pauses, backspaces | Cognitive load, certainty |
| LONG_PRESS | Duration | Deliberation |
| FOCUS_CHANGE | Screen transitions | Context switching |
| PAUSE | Idle time gaps | Reflection, hesitation |

## 🔬 Machine Learning Features

The system extracts 30+ behavioral features:

- **Scroll Behavior**: Velocity patterns, direction changes, burst detection
- **Typing Dynamics**: Inter-key intervals, backspace ratios, rhythm entropy  
- **Temporal Patterns**: Activity density, pause analysis, regularity
- **Interaction Rhythm**: Event sequences, frequency distributions

## 🛡️ Privacy & Compliance

- **Explicit Consent**: Granular controls for each tracking type
- **Content-Free**: Never captures text, only interaction patterns  
- **Anonymized IDs**: SHA-256 hashed device identifiers
- **Local-First**: Data queued locally, uploaded in batches
- **Retention Policies**: Automatic cleanup of old events
- **Transparency**: Users can see exactly what's captured

## 🚧 Development Status

This is an MVP demonstrating the core concepts. Production considerations:

- [ ] Production database configuration
- [ ] Authentication and API security
- [ ] Model training pipeline
- [ ] Data labeling interface
- [ ] Performance optimization
- [ ] Error handling and recovery
- [ ] Analytics dashboard
- [ ] A/B testing framework

## 📈 Next Steps

1. **Model Training**: Collect labeled data for engagement prediction
2. **Feature Engineering**: Advanced behavioral pattern recognition  
3. **Real-time Processing**: Stream processing for instant scoring
4. **SDK Distribution**: Package as reusable library
5. **Privacy Review**: Legal compliance and security audit

## 🤝 Contributing

This project demonstrates advanced React Native development with:
- TypeScript best practices
- Privacy-focused design patterns
- Real-time data processing
- Machine learning integration
- Cross-platform development

## 📄 License

MIT License - see LICENSE file for details.

---

Built with ❤️ using React Native, Expo, FastAPI, and scikit-learn.
