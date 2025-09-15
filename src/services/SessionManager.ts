import { UserIdentity } from './UserIdentity';
import { TelemetryEvent } from '../types/telemetry';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SessionInfo {
  sessionId: string;
  userHash: string;
  startedAt: number;
  screen: string;
  endedAt?: number;
}

export class SessionManager {
  private static instance: SessionManager;
  private currentSession: SessionInfo | null = null;
  private lastActivityTime: number = 0;
  private readonly IDLE_TIMEOUT = 30000; // 30 seconds
  private readonly SESSIONS_KEY = 'telemetry_sessions';
  private readonly USER_HASH_KEY = 'authenticated_user_hash';

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  async startSession(screen: string): Promise<string> {
    const userIdentity = UserIdentity.getInstance();
    const userHash = await userIdentity.getUserHash();
    
    const sessionId = this.generateSessionId();
    const now = Date.now();

    this.currentSession = {
      sessionId,
      userHash,
      startedAt: now,
      screen
    };

    this.lastActivityTime = now;

    // Store session info
    await this.persistSession();

    return sessionId;
  }

  async getCurrentUserHash(): Promise<string> {
    // First try to get the authenticated user hash
    const authenticatedUserHash = await this.getAuthenticatedUserHash();
    if (authenticatedUserHash) {
      return authenticatedUserHash;
    }
    
    // Fallback to device-based hash for telemetry only
    const userIdentity = UserIdentity.getInstance();
    return await userIdentity.getUserHash();
  }

  async setAuthenticatedUserHash(userHash: string): Promise<void> {
    try {
      await AsyncStorage.setItem(this.USER_HASH_KEY, userHash);
      console.log('✅ Authenticated user hash saved:', userHash);
    } catch (error) {
      console.error('❌ Failed to save authenticated user hash:', error);
    }
  }

  async getAuthenticatedUserHash(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.USER_HASH_KEY);
    } catch (error) {
      console.error('❌ Failed to get authenticated user hash:', error);
      return null;
    }
  }

  async clearAuthenticatedUserHash(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.USER_HASH_KEY);
      console.log('✅ Authenticated user hash cleared');
    } catch (error) {
      console.error('❌ Failed to clear authenticated user hash:', error);
    }
  }

  async endSession(): Promise<void> {
    if (!this.currentSession) {
      return;
    }

    this.currentSession.endedAt = Date.now();
    await this.persistSession();
    this.currentSession = null;
  }

  getCurrentSession(): SessionInfo | null {
    return this.currentSession;
  }

  updateActivity(): void {
    this.lastActivityTime = Date.now();
  }

  isSessionExpired(): boolean {
    if (!this.currentSession) {
      return true;
    }

    return Date.now() - this.lastActivityTime > this.IDLE_TIMEOUT;
  }

  async checkSessionTimeout(): Promise<void> {
    if (this.isSessionExpired() && this.currentSession) {
      await this.endSession();
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private async persistSession(): Promise<void> {
    if (!this.currentSession) {
      return;
    }

    try {
      const existingSessions = await this.getSessions();
      const updatedSessions = [
        ...existingSessions.filter(s => s.sessionId !== this.currentSession!.sessionId),
        this.currentSession
      ];

      await AsyncStorage.setItem(this.SESSIONS_KEY, JSON.stringify(updatedSessions));
    } catch (error) {
      console.warn('Failed to persist session:', error);
    }
  }

  async getSessions(): Promise<SessionInfo[]> {
    try {
      const sessionsData = await AsyncStorage.getItem(this.SESSIONS_KEY);
      return sessionsData ? JSON.parse(sessionsData) : [];
    } catch (error) {
      console.warn('Failed to get sessions:', error);
      return [];
    }
  }

  async clearOldSessions(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const sessions = await this.getSessions();
      const cutoffTime = Date.now() - maxAgeMs;
      const recentSessions = sessions.filter(s => s.startedAt > cutoffTime);
      
      await AsyncStorage.setItem(this.SESSIONS_KEY, JSON.stringify(recentSessions));
    } catch (error) {
      console.warn('Failed to clear old sessions:', error);
    }
  }
}
