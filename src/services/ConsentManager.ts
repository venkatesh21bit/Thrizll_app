import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ConsentSettings {
  telemetryEnabled: boolean;
  scrollTracking: boolean;
  tapTracking: boolean;
  typingTracking: boolean;
  dataSharing: boolean;
  agreedAt?: number;
  version: string;
}

export class ConsentManager {
  private static instance: ConsentManager;
  private readonly CONSENT_KEY = 'telemetry_consent';
  private readonly CURRENT_VERSION = '1.0';
  private consentSettings: ConsentSettings | null = null;

  static getInstance(): ConsentManager {
    if (!ConsentManager.instance) {
      ConsentManager.instance = new ConsentManager();
    }
    return ConsentManager.instance;
  }

  async getConsentSettings(): Promise<ConsentSettings | null> {
    if (this.consentSettings) {
      return this.consentSettings;
    }

    try {
      const stored = await AsyncStorage.getItem(this.CONSENT_KEY);
      if (stored) {
        this.consentSettings = JSON.parse(stored);
        return this.consentSettings;
      }
    } catch (error) {
      console.warn('Failed to load consent settings:', error);
    }

    return null;
  }

  async setConsentSettings(settings: Partial<ConsentSettings>): Promise<void> {
    const currentSettings = await this.getConsentSettings();
    
    this.consentSettings = {
      telemetryEnabled: false,
      scrollTracking: true,
      tapTracking: true,
      typingTracking: true,
      dataSharing: false,
      version: this.CURRENT_VERSION,
      ...currentSettings,
      ...settings,
      agreedAt: Date.now()
    };

    try {
      await AsyncStorage.setItem(this.CONSENT_KEY, JSON.stringify(this.consentSettings));
    } catch (error) {
      console.warn('Failed to save consent settings:', error);
    }
  }

  async hasValidConsent(): Promise<boolean> {
    const settings = await this.getConsentSettings();
    return settings?.telemetryEnabled === true && settings?.version === this.CURRENT_VERSION;
  }

  async revokeConsent(): Promise<void> {
    this.consentSettings = {
      telemetryEnabled: false,
      scrollTracking: false,
      tapTracking: false,
      typingTracking: false,
      dataSharing: false,
      version: this.CURRENT_VERSION
    };

    try {
      await AsyncStorage.setItem(this.CONSENT_KEY, JSON.stringify(this.consentSettings));
    } catch (error) {
      console.warn('Failed to revoke consent:', error);
    }
  }

  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.CONSENT_KEY);
      // TODO: Clear telemetry database as well
      this.consentSettings = null;
    } catch (error) {
      console.warn('Failed to clear consent data:', error);
    }
  }

  isTrackingEnabled(trackingType: keyof ConsentSettings): boolean {
    if (!this.consentSettings?.telemetryEnabled) {
      return false;
    }

    return this.consentSettings[trackingType] === true;
  }
}
