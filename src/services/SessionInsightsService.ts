export type SessionSample = {
  t: number; // epoch ms
  type: 'keystroke' | 'pause' | 'backspace' | 'scroll';
  value?: number; // interval ms, velocity, etc
};

class SessionInsightsServiceImpl {
  private static _instance: SessionInsightsServiceImpl;
  private store: Map<string, SessionSample[]> = new Map();

  static getInstance() {
    if (!SessionInsightsServiceImpl._instance) {
      SessionInsightsServiceImpl._instance = new SessionInsightsServiceImpl();
    }
    return SessionInsightsServiceImpl._instance;
  }

  record(sessionId: string, sample: SessionSample) {
    const arr = this.store.get(sessionId) ?? [];
    arr.push(sample);
    this.store.set(sessionId, arr);
  }

  get(sessionId: string): SessionSample[] {
    return this.store.get(sessionId) ?? [];
  }

  reset(sessionId: string) {
    this.store.delete(sessionId);
  }
}

export const SessionInsightsService = SessionInsightsServiceImpl.getInstance();
