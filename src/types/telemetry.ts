export type EType = 'SCROLL' | 'TAP' | 'LONG_PRESS' | 'TYPE' | 'FOCUS_CHANGE' | 'PAUSE';

export interface TelemetryEvent {
  ts: number;              // epoch ms
  session_id: string;
  user_hash: string;       // salted hash
  screen: string;
  component_id?: string;
  etype: EType;
  duration_ms?: number;
  delta?: number;          // e.g., scroll deltaY
  velocity?: number;       // px/s
  accel?: number;          // px/s^2
  key_code?: string;       // for TYPE
  input_len?: number;      // length after change
  backspaces?: number;     // increment
  meta?: Record<string, any>;
}

export interface ScrollEvent {
  sessionId: string;
  screen: string;
  delta: number;
  velocity: number;
  accel?: number;
  component_id?: string;
}

export interface TapEvent {
  sessionId: string;
  screen: string;
  component_id?: string;
}

export interface LongPressEvent {
  sessionId: string;
  screen: string;
  duration_ms: number;
  component_id?: string;
}

export interface TypeEvent {
  sessionId: string;
  screen: string;
  key_code?: string;
  input_len: number;
  backspace?: boolean;
  component_id?: string;
}

export interface FocusChangeEvent {
  sessionId: string;
  screen: string;
  state: 'focus' | 'blur';
  component_id?: string;
}

export interface PauseEvent {
  sessionId: string;
  screen: string;
  duration_ms: number;
}

export interface InterestScore {
  score: number;           // 0-100
  confidence: number;      // 0-1
  timestamp: number;
  session_id: string;
}

export interface SessionSummary {
  session_id: string;
  started_at: number;
  ended_at?: number;
  event_count: number;
  interest_scores: InterestScore[];
  avg_score: number;
  peak_score: number;
}
