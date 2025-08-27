import { TelemetryEvent, InterestScore } from '../types/telemetry';
import { LocalQueue } from './LocalQueue';
import axios, { AxiosInstance } from 'axios';
import { Platform } from 'react-native';

interface SessionCreateResponse {
  session_id: string;
  started_at: string;
}

interface UploadResult {
  sent: number;
  failed: number;
}

export class UploadService {
  private static instance: UploadService;
  private api: AxiosInstance;
  private localQueue: LocalQueue;
  private readonly baseURL: string;
  private readonly batchSize = 50;
  private readonly maxRetries = 3;

  static getInstance(): UploadService {
    if (!UploadService.instance) {
      UploadService.instance = new UploadService();
    }
    return UploadService.instance;
  }

  constructor() {
    // Use your deployed backend URL or localhost for development
    const isDevelopment = __DEV__;
    const isSimulator = Platform.OS === 'ios' && Platform.isPad === false;
    const isEmulator = Platform.OS === 'android';
    
    if (isDevelopment && (isSimulator || isEmulator)) {
      // Local development
      this.baseURL = isSimulator || isEmulator 
        ? 'http://localhost:8000' 
        : 'http://10.0.2.2:8000';
    } else {
      // Production - replace with your deployed backend URL
      this.baseURL = 'https://your-lovesync-backend.railway.app'; // Update this!
    }
    
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.localQueue = LocalQueue.getInstance();
  }

  async createSession(userHash: string, screen: string, deviceInfo?: any): Promise<SessionCreateResponse> {
    try {
      const response = await this.api.post('/v1/sessions', {
        user_hash: userHash,
        screen: screen,
        device: deviceInfo
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  }

  async uploadPendingEvents(): Promise<UploadResult> {
    try {
      const events = await this.localQueue.getPendingEvents(this.batchSize);
      
      if (events.length === 0) {
        return { sent: 0, failed: 0 };
      }

      // Upload events in batch
      const response = await this.api.post('/v1/ingest/events', {
        events: events
      });

      if (response.status === 200) {
        console.log(`Successfully uploaded ${events.length} events`);
        return { sent: events.length, failed: 0 };
      } else {
        console.warn('Upload failed with status:', response.status);
        return { sent: 0, failed: events.length };
      }

    } catch (error) {
      console.error('Failed to upload events:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED' || error.code === 'NETWORK_ERROR') {
          console.log('Network unavailable, will retry later');
        }
      }
      
      const events = await this.localQueue.getPendingEvents(this.batchSize);
      return { sent: 0, failed: events.length };
    }
  }

  async getScore(sessionId: string): Promise<InterestScore | null> {
    try {
      const response = await this.api.get(`/v1/score/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get score:', error);
      return null;
    }
  }

  async getInsights(sessionId: string): Promise<any> {
    try {
      const response = await this.api.get(`/v1/insights/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get insights:', error);
      return null;
    }
  }

  connectRealtime(sessionId: string, onScore: (score: InterestScore) => void): WebSocket | null {
    try {
      const wsUrl = this.baseURL.replace('http', 'ws') + `/v1/score/ws/${sessionId}`;
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connected for real-time scores');
      };
      
      ws.onmessage = (event) => {
        try {
          const score: InterestScore = JSON.parse(event.data);
          onScore(score);
        } catch (error) {
          console.error('Failed to parse score message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      ws.onclose = () => {
        console.log('WebSocket connection closed');
      };
      
      return ws;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      return null;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.api.get('/health');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  setBaseURL(url: string): void {
    this.api.defaults.baseURL = url;
  }

  setTimeout(timeoutMs: number): void {
    this.api.defaults.timeout = timeoutMs;
  }
}
