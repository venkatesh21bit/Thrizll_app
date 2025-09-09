import axios from 'axios';
import { TelemetryEvent, InterestScore } from '../types/telemetry';
import { LocalQueue } from './LocalQueue';
import { API_CONFIG } from '../config/api';

export interface UploadConfig {
  baseUrl: string;
  batchSize: number;
  retryAttempts: number;
  retryDelayMs: number;
}

export class UploadService {
  private static instance: UploadService;
  private config: UploadConfig;
  private localQueue: LocalQueue;
  private isUploading = false;

  static getInstance(config?: UploadConfig): UploadService {
    if (!UploadService.instance) {
      UploadService.instance = new UploadService(config);
    }
    return UploadService.instance;
  }

  constructor(config?: UploadConfig) {
    this.config = {
      baseUrl: API_CONFIG.baseUrl,
      batchSize: 50,
      retryAttempts: API_CONFIG.retryAttempts,
      retryDelayMs: API_CONFIG.retryDelayMs,
      ...config
    };
    this.localQueue = LocalQueue.getInstance();
  }

  async uploadPendingEvents(): Promise<{ sent: number; failed: number }> {
    if (this.isUploading) {
      return { sent: 0, failed: 0 };
    }

    this.isUploading = true;
    let totalSent = 0;
    let totalFailed = 0;

    try {
      await this.localQueue.initialize();
      
      while (true) {
        const events = await this.localQueue.getPendingEvents(this.config.batchSize);
        
        if (events.length === 0) {
          break;
        }

        const result = await this.uploadBatch(events);
        
        if (result.success) {
          // Mark events as uploaded
          const eventIds = events.map((_, index) => index + 1); // Simplified ID mapping
          await this.localQueue.markAsUploaded(eventIds);
          totalSent += events.length;
        } else {
          totalFailed += events.length;
          break; // Stop uploading on failure
        }
      }
    } catch (error) {
      console.error('Upload service error:', error);
    } finally {
      this.isUploading = false;
    }

    return { sent: totalSent, failed: totalFailed };
  }

  private async uploadBatch(events: TelemetryEvent[]): Promise<{ success: boolean; error?: string }> {
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const response = await axios.post(
          `${this.config.baseUrl}/v1/ingest/events`,
          { events },
          {
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.status === 200) {
          return { success: true };
        }
      } catch (error: any) {
        console.warn(`Upload attempt ${attempt} failed:`, error.message);
        
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelayMs * attempt);
        }
      }
    }

    return { success: false, error: 'Max retry attempts exceeded' };
  }

  async createSession(userHash: string, screen: string, deviceInfo?: any): Promise<string | null> {
    try {
      const response = await axios.post(
        `${this.config.baseUrl}/v1/sessions`,
        {
          user_hash: userHash,
          screen,
          device: deviceInfo,
        },
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 200) {
        return response.data.session_id;
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }

    return null;
  }

  async fetchScore(sessionId: string): Promise<InterestScore | null> {
    try {
      const response = await axios.get(
        `${this.config.baseUrl}/v1/score/${sessionId}`,
        {
          timeout: 5000,
        }
      );

      if (response.status === 200) {
        return {
          ...response.data,
          timestamp: new Date(response.data.timestamp).getTime(),
        };
      }
    } catch (error) {
      console.error('Failed to fetch score:', error);
    }

    return null;
  }

  async getInsights(sessionId: string): Promise<any | null> {
    try {
      const response = await axios.get(
        `${this.config.baseUrl}/v1/insights/${sessionId}`,
        {
          timeout: 5000,
        }
      );

      if (response.status === 200) {
        return response.data;
      }
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    }

    return null;
  }

  connectWebSocket(sessionId: string, onScore: (score: InterestScore) => void): WebSocket {
    const wsUrl = `${this.config.baseUrl.replace('http', 'ws')}/v1/score/ws/${sessionId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      // Send a ping to start receiving scores
      ws.send(JSON.stringify({ type: 'ping' }));
    };

    ws.onmessage = (event) => {
      try {
        const score = JSON.parse(event.data);
        onScore({
          ...score,
          timestamp: new Date(score.timestamp).getTime(),
        });
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
    };

    return ws;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  updateConfig(config: Partial<UploadConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
