import { Platform } from 'react-native';
import { TelemetryEvent } from '../types/telemetry';

// Conditionally import SQLite only on non-web platforms
let SQLite: any = null;
if (Platform.OS !== 'web') {
  SQLite = require('expo-sqlite');
}

export class LocalQueue {
  private static instance: LocalQueue;
  private db: any = null;
  private readonly DB_NAME = 'telemetry.db';
  private readonly TABLE_NAME = 'events';
  private isInitialized = false;
  private webStorage: TelemetryEvent[] = []; // Fallback storage for web

  static getInstance(): LocalQueue {
    if (!LocalQueue.instance) {
      LocalQueue.instance = new LocalQueue();
    }
    return LocalQueue.instance;
  }

  private constructor() {
    // Private constructor for singleton
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (Platform.OS === 'web') {
      // Use localStorage for web
      try {
        const stored = localStorage.getItem('telemetry_events');
        this.webStorage = stored ? JSON.parse(stored) : [];
      } catch (error) {
        console.warn('Failed to load telemetry from localStorage:', error);
        this.webStorage = [];
      }
      this.isInitialized = true;
      return;
    }

    // Native platform SQLite initialization
    if (!SQLite) {
      console.warn('SQLite not available on this platform');
      this.isInitialized = true;
      return;
    }

    this.db = await SQLite.openDatabaseAsync(this.DB_NAME);
    
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS ${this.TABLE_NAME} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts INTEGER NOT NULL,
        session_id TEXT NOT NULL,
        user_hash TEXT NOT NULL,
        screen TEXT NOT NULL,
        component_id TEXT,
        etype TEXT NOT NULL,
        duration_ms INTEGER,
        delta REAL,
        velocity REAL,
        accel REAL,
        key_code TEXT,
        input_len INTEGER,
        backspaces INTEGER,
        meta TEXT,
        uploaded INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_session_id ON ${this.TABLE_NAME}(session_id);
      CREATE INDEX IF NOT EXISTS idx_uploaded ON ${this.TABLE_NAME}(uploaded);
      CREATE INDEX IF NOT EXISTS idx_ts ON ${this.TABLE_NAME}(ts);
    `);
    
    this.isInitialized = true;
  }

  async enqueue(event: TelemetryEvent): Promise<void> {
    if (Platform.OS === 'web') {
      // Use localStorage for web
      try {
        const eventWithId = { ...event, id: Date.now() + Math.random(), uploaded: false };
        this.webStorage.push(eventWithId);
        localStorage.setItem('telemetry_events', JSON.stringify(this.webStorage));
      } catch (error) {
        console.warn('Failed to store telemetry event on web:', error);
      }
      return;
    }

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const metaJson = event.meta ? JSON.stringify(event.meta) : null;

    await this.db.runAsync(
      `INSERT INTO ${this.TABLE_NAME} 
       (ts, session_id, user_hash, screen, component_id, etype, duration_ms, 
        delta, velocity, accel, key_code, input_len, backspaces, meta) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.ts,
        event.session_id,
        event.user_hash,
        event.screen,
        event.component_id || null,
        event.etype,
        event.duration_ms || null,
        event.delta || null,
        event.velocity || null,
        event.accel || null,
        event.key_code || null,
        event.input_len || null,
        event.backspaces || null,
        metaJson
      ]
    );
  }

  async getPendingEvents(limit: number = 100): Promise<TelemetryEvent[]> {
    if (Platform.OS === 'web') {
      // Use localStorage for web
      try {
        const stored = localStorage.getItem('telemetry_events');
        const events = stored ? JSON.parse(stored) : [];
        return events.filter((event: any) => !event.uploaded).slice(0, limit);
      } catch (error) {
        console.warn('Failed to get pending events from localStorage:', error);
        return [];
      }
    }

    if (!this.db || !this.isInitialized) {
      console.log('LocalQueue database not initialized, returning empty events array');
      return [];
    }

    try {
      const rows = await this.db.getAllAsync(
        `SELECT * FROM ${this.TABLE_NAME} WHERE uploaded = 0 ORDER BY ts LIMIT ?`,
        [limit]
      );

      return rows.map((row: any) => ({
        ts: row.ts,
        session_id: row.session_id,
        user_hash: row.user_hash,
        screen: row.screen,
        component_id: row.component_id,
        etype: row.etype,
        duration_ms: row.duration_ms,
        delta: row.delta,
        velocity: row.velocity,
        accel: row.accel,
        key_code: row.key_code,
        input_len: row.input_len,
        backspaces: row.backspaces,
        meta: row.meta ? JSON.parse(row.meta) : undefined
      }));
    } catch (error) {
      console.error('Failed to get pending events:', error);
      return [];
    }
  }

  async markAsUploaded(eventIds: number[]): Promise<void> {
    if (Platform.OS === 'web') {
      // Use localStorage for web
      try {
        const stored = localStorage.getItem('telemetry_events');
        const events = stored ? JSON.parse(stored) : [];
        events.forEach((event: any) => {
          if (eventIds.includes(event.id)) {
            event.uploaded = true;
          }
        });
        localStorage.setItem('telemetry_events', JSON.stringify(events));
        this.webStorage = events;
      } catch (error) {
        console.warn('Failed to mark events as uploaded on web:', error);
      }
      return;
    }

    if (!this.db || !this.isInitialized || eventIds.length === 0) {
      console.log('LocalQueue database not initialized or no events to mark');
      return;
    }

    try {
      const placeholders = eventIds.map(() => '?').join(',');
      await this.db.runAsync(
        `UPDATE ${this.TABLE_NAME} SET uploaded = 1 WHERE id IN (${placeholders})`,
        eventIds
      );
    } catch (error) {
      console.error('Failed to mark events as uploaded:', error);
    }
  }

  async getEventCount(): Promise<number> {
    if (Platform.OS === 'web') {
      // Use localStorage for web
      try {
        const stored = localStorage.getItem('telemetry_events');
        const events = stored ? JSON.parse(stored) : [];
        return events.filter((event: any) => !event.uploaded).length;
      } catch (error) {
        console.warn('Failed to get event count from localStorage:', error);
        return 0;
      }
    }

    if (!this.db || !this.isInitialized) {
      console.log('LocalQueue database not initialized, returning 0 count');
      return 0;
    }

    try {
      const result = await this.db.getFirstAsync(
        `SELECT COUNT(*) as count FROM ${this.TABLE_NAME} WHERE uploaded = 0`
      ) as any;
      
      return result.count;
    } catch (error) {
      console.error('Failed to get event count:', error);
      return 0;
    }
  }

  async clearOldEvents(olderThanDays: number = 7): Promise<void> {
    if (Platform.OS === 'web') {
      // Use localStorage for web
      try {
        const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
        const stored = localStorage.getItem('telemetry_events');
        const events = stored ? JSON.parse(stored) : [];
        const filteredEvents = events.filter((event: any) => 
          event.ts >= cutoffTime || !event.uploaded
        );
        localStorage.setItem('telemetry_events', JSON.stringify(filteredEvents));
        this.webStorage = filteredEvents;
      } catch (error) {
        console.warn('Failed to clear old events from localStorage:', error);
      }
      return;
    }

    if (!this.db || !this.isInitialized) {
      console.log('LocalQueue database not initialized, skipping cleanup');
      return;
    }

    try {
      const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
      await this.db.runAsync(
        `DELETE FROM ${this.TABLE_NAME} WHERE ts < ? AND uploaded = 1`,
        [cutoffTime]
      );
    } catch (error) {
      console.error('Failed to clear old events:', error);
    }
  }
}
