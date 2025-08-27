# Copilot Instructions for Digital Body Language MVP

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a React Native Digital Body Language MVP that captures micro-interactions, extracts behavior features, and outputs real-time "interest" scores.

## Key Guidelines

### Frontend (React Native + Expo)
- Use TypeScript for all code
- Implement telemetry SDK for capturing micro-interactions (scrolls, taps, typing rhythm, pauses)
- Follow privacy-by-design principles - never capture actual text content
- Use SQLite/MMKV for local storage and queuing
- Implement offline-first architecture with secure batch uploads
- Use React Navigation for navigation
- Follow the TelemetryEvent schema for all captured events

### Event Types to Capture
- SCROLL: velocity, acceleration, overscrolls, stop-start bursts
- TAP: intervals between taps, repeated taps
- LONG_PRESS: duration
- TYPE: inter-key intervals, backspace ratio, burstiness
- FOCUS_CHANGE: screen/component focus/blur
- PAUSE: idle gaps above threshold (>800ms)

### Privacy & Security
- Use SHA-256 hashing for user identification
- Never store or transmit actual message content
- Implement explicit consent management
- Use anonymized IDs only
- Follow data retention policies

### Backend Integration
- Use FastAPI for backend services
- Implement real-time scoring via WebSockets
- Use PostgreSQL for event storage
- Follow the defined API endpoints: /sessions, /ingest/events, /score, /insights

### Code Style
- Use proper TypeScript interfaces
- Implement proper error handling
- Use async/await for all async operations
- Follow React hooks best practices
- Implement proper session management
