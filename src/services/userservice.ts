import { UserProfile, Match } from '../types/user';
import { API_CONFIG } from '../config/api';
import { SessionManager } from './SessionManager';

class UserService {
  private apiUrl = `${API_CONFIG.baseUrl}/api/v1`;

  async signup(userData: {
    email: string;
    password: string;
    name: string;
  }): Promise<{ success: boolean; message: string; user?: any }> {
    try {
      console.log('Attempting signup for:', userData.email);
      
      const response = await fetch(`${this.apiUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      
      const result = await response.json();
      console.log('Signup response:', result);
      
      if (result.success) {
        console.log('✅ Signup successful:', result.user_hash);
        
        // Save the authenticated user hash for session management
        const sessionManager = SessionManager.getInstance();
        await sessionManager.setAuthenticatedUserHash(result.user_hash);
        
        return { success: true, message: result.message, user: result.user };
      } else {
        console.error('❌ Signup failed:', result.message);
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('❌ Network error during signup:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  }

  async login(userData: {
    email: string;
    password: string;
  }): Promise<{ success: boolean; message: string; user?: any }> {
    try {
      console.log('Attempting login for:', userData.email);
      
      const response = await fetch(`${this.apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      
      const result = await response.json();
      console.log('Login response:', result);
      
      if (result.success) {
        console.log('✅ Login successful:', result.user_hash);
        
        // Save the authenticated user hash for session management
        const sessionManager = SessionManager.getInstance();
        await sessionManager.setAuthenticatedUserHash(result.user_hash);
        
        return { success: true, message: result.message, user: result.user };
      } else {
        console.error('❌ Login failed:', result.message);
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('❌ Network error during login:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  }

  async logout(): Promise<void> {
    try {
      const sessionManager = SessionManager.getInstance();
      await sessionManager.clearAuthenticatedUserHash();
      console.log('✅ User logged out successfully');
    } catch (error) {
      console.error('❌ Error during logout:', error);
    }
  }

  async createProfile(profileData: {
    name: string;
    age: number;
    bio: string;
    location: string;
    interests: string[];
    photos: string[];
  }): Promise<{ success: boolean; message?: string; profile?: UserProfile }> {
    try {
      console.log('Creating profile with data:', profileData);
      
      const response = await fetch(`${this.apiUrl}/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });
      
      const result = await response.json();
      console.log('Profile creation response:', result);
      
      if (response.ok) {
        console.log('✅ Profile created successfully:', result.user_hash);
        
        // Save the authenticated user hash for session management
        const sessionManager = SessionManager.getInstance();
        await sessionManager.setAuthenticatedUserHash(result.user_hash);
        
        return { success: true, profile: result };
      } else {
        console.error('❌ Profile creation failed:', result);
        return { success: false, message: result.message || 'Failed to create profile' };
      }
    } catch (error) {
      console.error('❌ Network error during profile creation:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  }

  async getAllUsers(): Promise<{ users: any[]; total_count: number }> {
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/admin/users`);
      if (response.ok) {
        const data = await response.json();
        console.log('📊 All users in database:', data);
        return data;
      } else {
        console.error('Failed to fetch users list');
        return { users: [], total_count: 0 };
      }
    } catch (error) {
      console.error('Error fetching users list:', error);
      return { users: [], total_count: 0 };
    }
  }

  async discoverUsers(currentUserHash: string, refresh: boolean = false, filters?: {
    minAge?: number;
    maxAge?: number;
    maxDistance?: number;
    interests?: string[];
  }): Promise<UserProfile[]> {
    try {
      console.log('🔍 Fetching discover users for:', currentUserHash, 'refresh:', refresh);
      const url = `${this.apiUrl}/discover/${currentUserHash}${refresh ? '?refresh=true' : ''}`;
      console.log('🌐 API URL:', url);
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Discover users response:', data);
        return data.users || [];
      } else {
        console.error('❌ Discover API response not ok:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        return [];
      }
    } catch (error) {
      console.error('❌ Network error fetching discover users:', error);
      return [];
    }
  }

  async sendConnectionRequest(fromUserHash: string, toUserHash: string, message?: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('📤 Sending connection request:', fromUserHash, '→', toUserHash);
      const response = await fetch(`${this.apiUrl}/connection/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_user_hash: fromUserHash,
          to_user_hash: toUserHash,
          message
        }),
      });
      const result = await response.json();
      console.log('📤 Connection request result:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to send connection request:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  }

  async submitRevealAnswers(fromUserHash: string, toUserHash: string, answers: Record<string, string>): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.apiUrl}/reveal/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_user_hash: fromUserHash, to_user_hash: toUserHash, answers }),
      });
      if (response.ok) {
        const result = await response.json();
        return result;
      }
    } catch (error) {
      console.warn('submitRevealAnswers failed (non-blocking):', error);
    }
    return { success: false, message: 'not submitted' };
  }

  async getConnectionRequests(userHash: string): Promise<any[]> {
    try {
      console.log('📥 Getting connection requests for:', userHash);
      const response = await fetch(`${this.apiUrl}/connection/requests/${userHash}`);
      if (response.ok) {
        const data = await response.json();
        console.log('📥 Connection requests received:', data.requests?.length || 0, 'requests');
        return data.requests || [];
      } else {
        console.error('❌ Failed to get connection requests:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ Failed to get connection requests:', error);
    }
    return [];
  }

  async getSentConnectionRequests(userHash: string): Promise<any[]> {
    try {
      console.log('📤 Getting sent connection requests for:', userHash);
      const response = await fetch(`${this.apiUrl}/connection/sent/${userHash}`);
      if (response.ok) {
        const data = await response.json();
        console.log('📤 Sent connection requests received:', data.requests?.length || 0, 'requests');
        return data.requests || [];
      } else {
        console.error('❌ Failed to get sent connection requests:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ Failed to get sent connection requests:', error);
    }
    return [];
  }

  async respondToConnectionRequest(connectionId: string, action: 'accept' | 'decline'): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.apiUrl}/connection/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connection_id: connectionId,
          action
        }),
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to respond to connection request:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  }

  async recordSwipe(fromUserHash: string, toUserHash: string, action: 'like' | 'pass'): Promise<{ success: boolean; message: string }> {
    try {
      console.log('👆 Recording swipe:', fromUserHash, '→', toUserHash, `(${action})`);
      const response = await fetch(`${this.apiUrl}/swipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_user_hash: fromUserHash,
          to_user_hash: toUserHash,
          action
        }),
      });
      const result = await response.json();
      console.log('✅ Swipe recorded:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to record swipe:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  }

  async getMatches(userHash: string): Promise<Match[]> {
    try {
      const response = await fetch(`${this.apiUrl}/matches/${userHash}`);
      if (response.ok) {
        const data = await response.json();
        return data.matches?.map((match: any) => ({
          id: match.id,
          userId: userHash,
          matchedUserId: match.matched_user_hash,
          user: {
            user_hash: match.matched_user_hash,
            name: match.name,
            age: match.age,
            bio: match.bio,
            location: match.location,
            photos: match.photos,
            interests: match.interests,
            id: match.matched_user_hash,
            displayName: match.name,
            isOnline: Math.random() > 0.5,
            compatibilityScore: 75 + Math.floor(Math.random() * 25)
          },
          matchedAt: new Date(match.matched_at),
          compatibilityScore: 75 + Math.floor(Math.random() * 25),
          connectionStrength: Math.floor(Math.random() * 40) + 60,
          isNewMatch: new Date(match.matched_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        })) || [];
      }
    } catch (error) {
      console.error('Failed to get matches:', error);
    }
    // Return empty array instead of mock data
    return [];
  }
}

export default new UserService();