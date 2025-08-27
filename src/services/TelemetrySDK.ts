import { 
  TelemetryEvent, 
  ScrollEvent, 
  TapEvent, 
  LongPressEvent, 
  TypeEvent, 
  FocusChangeEvent, 
  PauseEvent 
} from '../types/telemetry';
import { LocalQueue } from './LocalQueue';
import { SessionManager } from './SessionManager';
import { UserIdentity } from './UserIdentity';
import { UploadService } from './UploadManager';
import { ConsentManager } from './ConsentManager';

export class TelemetrySDK {
  private static instance: TelemetrySDK;
  private localQueue: LocalQueue;
  private sessionManager: SessionManager;
  private userIdentity: UserIdentity;
  private uploadService: UploadService;
  private consentManager: ConsentManager;
  private isInitialized = false;
  private lastEventTime = 0;
  private pauseThreshold = 800; // ms
  private uploadTimer: NodeJS.Timeout | null = null;

  static getInstance(): TelemetrySDK {
    if (!TelemetrySDK.instance) {
      TelemetrySDK.instance = new TelemetrySDK();
    }
    return TelemetrySDK.instance;
  }

  constructor() {
    this.localQueue = LocalQueue.getInstance();
    this.sessionManager = SessionManager.getInstance();
    this.userIdentity = UserIdentity.getInstance();
    this.uploadService = UploadService.getInstance();
    this.consentManager = ConsentManager.getInstance();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.localQueue.initialize();
      
      // Start periodic upload with a longer delay to ensure everything is ready
      this.startPeriodicUpload();
      
      this.isInitialized = true;
      console.log('TelemetrySDK initialized successfully');
    } catch (error) {
      console.error('Failed to initialize TelemetrySDK:', error);
      throw error;
    }
  }

  async startSession(screen: string): Promise<string> {
    await this.ensureInitialized();
    
    // Check consent
    const hasConsent = await this.consentManager.hasValidConsent();
    if (!hasConsent) {
      throw new Error('Telemetry consent not granted');
    }
    
    const sessionId = await this.sessionManager.startSession(screen);
    
    // Create session on backend
    const userHash = await this.userIdentity.getUserHash();
    const deviceInfo = await this.userIdentity.getDeviceInfo();
    
    try {
      await this.uploadService.createSession(userHash, screen, deviceInfo);
    } catch (error) {
      console.warn('Failed to create backend session:', error);
    }
    
    return sessionId;
  }

  async endSession(): Promise<void> {
    await this.sessionManager.endSession();
    
    // Trigger immediate upload
    await this.flushQueue();
  }

  async logScroll(event: ScrollEvent): Promise<void> {
    if (!this.consentManager.isTrackingEnabled('scrollTracking')) {
      return;
    }
    
    await this.logEvent({
      ts: Date.now(),
      session_id: event.sessionId,
      user_hash: await this.userIdentity.getUserHash(),
      screen: event.screen,
      component_id: event.component_id,
      etype: 'SCROLL',
      delta: event.delta,
      velocity: event.velocity,
      accel: event.accel
    });
  }

  async logTap(event: TapEvent): Promise<void> {
    if (!this.consentManager.isTrackingEnabled('tapTracking')) {
      return;
    }
    
    const now = Date.now();
    await this.checkForPause(now, event.sessionId, event.screen);
    
    await this.logEvent({
      ts: now,
      session_id: event.sessionId,
      user_hash: await this.userIdentity.getUserHash(),
      screen: event.screen,
      component_id: event.component_id,
      etype: 'TAP'
    });
  }

  async logLongPress(event: LongPressEvent): Promise<void> {
    if (!this.consentManager.isTrackingEnabled('tapTracking')) {
      return;
    }
    
    await this.logEvent({
      ts: Date.now(),
      session_id: event.sessionId,
      user_hash: await this.userIdentity.getUserHash(),
      screen: event.screen,
      component_id: event.component_id,
      etype: 'LONG_PRESS',
      duration_ms: event.duration_ms
    });
  }

  async logType(event: TypeEvent): Promise<void> {
    if (!this.consentManager.isTrackingEnabled('typingTracking')) {
      return;
    }
    
    const now = Date.now();
    await this.checkForPause(now, event.sessionId, event.screen);

    await this.logEvent({
      ts: now,
      session_id: event.sessionId,
      user_hash: await this.userIdentity.getUserHash(),
      screen: event.screen,
      component_id: event.component_id,
      etype: 'TYPE',
      key_code: event.key_code,
      input_len: event.input_len,
      backspaces: event.backspace ? 1 : 0
    });
  }

  async logFocusChange(event: FocusChangeEvent): Promise<void> {
    await this.logEvent({
      ts: Date.now(),
      session_id: event.sessionId,
      user_hash: await this.userIdentity.getUserHash(),
      screen: event.screen,
      component_id: event.component_id,
      etype: 'FOCUS_CHANGE',
      meta: { state: event.state }
    });
  }

  async logPause(event: PauseEvent): Promise<void> {
    await this.logEvent({
      ts: Date.now(),
      session_id: event.sessionId,
      user_hash: await this.userIdentity.getUserHash(),
      screen: event.screen,
      etype: 'PAUSE',
      duration_ms: event.duration_ms
    });
  }

  // Public method for custom events (e.g., MESSAGE_SENT)
  async trackCustomEvent(params: {
    session_id: string;
    screen: string;
    component_id?: string;
    etype: string;
    input_len?: number;
    meta?: any;
  }): Promise<void> {
    await this.ensureInitialized();
    const user_hash = await this.userIdentity.getUserHash();
    // Check consent
    const hasConsent = await this.consentManager.hasValidConsent();
    if (!hasConsent) return;
    await this.localQueue.enqueue({
      ts: Date.now(),
      session_id: params.session_id,
      user_hash,
      screen: params.screen,
      component_id: params.component_id,
      etype: params.etype as any, // allow custom event type
      input_len: params.input_len,
      meta: params.meta
    });
  }

  private async logEvent(event: TelemetryEvent): Promise<void> {
    await this.ensureInitialized();
    
    // Check consent
    const hasConsent = await this.consentManager.hasValidConsent();
    if (!hasConsent) {
      return;
    }
    
    // Update session activity
    this.sessionManager.updateActivity();
    this.lastEventTime = event.ts;
    
    await this.localQueue.enqueue(event);
  }

  private async checkForPause(currentTime: number, sessionId: string, screen: string): Promise<void> {
    if (this.lastEventTime > 0) {
      const timeSinceLastEvent = currentTime - this.lastEventTime;
      if (timeSinceLastEvent > this.pauseThreshold) {
        await this.logPause({
          sessionId,
          screen,
          duration_ms: timeSinceLastEvent
        });
      }
    }
  }

  async flushQueue(): Promise<{ sent: number; failed: number }> {
    try {
      // Ensure we're initialized and have a valid database
      if (!this.isInitialized) {
        console.log('TelemetrySDK not initialized, skipping queue flush');
        return { sent: 0, failed: 0 };
      }
      
      await this.ensureInitialized();
      return this.uploadService.uploadPendingEvents();
    } catch (error) {
      console.warn('Failed to flush queue:', error);
      return { sent: 0, failed: 0 };
    }
  }

  async getQueueSize(): Promise<number> {
    await this.ensureInitialized();
    return this.localQueue.getEventCount();
  }

  private startPeriodicUpload(): void {
    // Wait longer before starting the timer to ensure full initialization
    setTimeout(() => {
      // Upload every 30 seconds, but only after initialization
      this.uploadTimer = setInterval(async () => {
        try {
          if (this.isInitialized) {
            await this.flushQueue();
            
            // Clean old events
            await this.localQueue.clearOldEvents();
            
            // Check session timeout
            await this.sessionManager.checkSessionTimeout();
          }
        } catch (error) {
          console.warn('Periodic upload failed:', error);
        }
      }, 30000);
    }, 5000); // 5 second delay instead of 2
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  dispose(): void {
    if (this.uploadTimer) {
      clearInterval(this.uploadTimer);
      this.uploadTimer = null;
    }
  }
}
