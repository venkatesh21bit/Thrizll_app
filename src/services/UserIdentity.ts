import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import * as Application from 'expo-application';

export class UserIdentity {
  private static instance: UserIdentity;
  private userHash: string | null = null;
  private readonly APP_SALT = 'dbl_telemetry_salt_2024';

  static getInstance(): UserIdentity {
    if (!UserIdentity.instance) {
      UserIdentity.instance = new UserIdentity();
    }
    return UserIdentity.instance;
  }

  async getUserHash(): Promise<string> {
    if (this.userHash) {
      return this.userHash;
    }

    // Generate a stable device identifier
    const deviceId = await this.getDeviceId();
    const combined = `${this.APP_SALT}_${deviceId}`;
    
    // Hash the combined string
    this.userHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      combined
    );

    return this.userHash;
  }

  private async getDeviceId(): Promise<string> {
    try {
      // Try to get application ID (persistent across app reinstalls)
      const applicationId = Application.applicationId;

      if (applicationId) {
        return applicationId;
      }

      // Fallback to device-based identifier
      const modelName = Device.modelName || 'unknown';
      const osName = Device.osName || 'unknown';
      const osVersion = Device.osVersion || 'unknown';
      
      return `${modelName}_${osName}_${osVersion}_${Date.now()}`;
    } catch (error) {
      console.warn('Failed to generate device ID:', error);
      // Last resort: generate a random ID (not persistent)
      return `random_${Math.random().toString(36).substring(2)}_${Date.now()}`;
    }
  }

  async getDeviceInfo(): Promise<Record<string, any>> {
    return {
      modelName: Device.modelName,
      brand: Device.brand,
      osName: Device.osName,
      osVersion: Device.osVersion,
      totalMemory: Device.totalMemory,
      supportedCpuArchitectures: Device.supportedCpuArchitectures,
    };
  }
}
