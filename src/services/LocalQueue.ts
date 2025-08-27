import * as SQLite from 'expo-sqlite';
import { TelemetryEvent } from '../types/telemetry';

export class LocalQueue {
  private static instance: LocalQueue;
  private db: SQLite.SQLiteDatabase | null = null;
  private readonly DB_NAME = 'telemetry.db';
  private readonly TABLE_NAME = 'events';
  private isInitialized = false;

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
    if (this.isInitialized && this.db) {
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
  }  async clearOldEvents(olderThanDays: number = 7): Promise<void> {
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
