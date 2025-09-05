import { UserProfile, Match } from '../types/user';
import { API_CONFIG } from '../config/api';

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

  async discoverUsers(filters?: {
    minAge?: number;
    maxAge?: number;
    maxDistance?: number;
    interests?: string[];
  }): Promise<UserProfile[]> {
    try {
      const response = await fetch(`${this.apiUrl}/discover`);
      if (response.ok) {
        const data = await response.json();
        return data.users || [];
      }
    } catch (error) {
      console.error('Failed to fetch discover users:', error);
    }
    
    // Fallback to mock users if API fails
    return this.getMockUsers();
  }

  async getMatches(): Promise<Match[]> {
    try {
      const response = await fetch(`${this.apiUrl}/matches`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get matches:', error);
      return this.getMockMatches();
    }
  }

  async likeUser(userId: string): Promise<{ isMatch: boolean; match?: Match }> {
    try {
      const response = await fetch(`${this.apiUrl}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to like user:', error);
      return { isMatch: false };
    }
  }

  async passUser(userId: string): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/pass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
    } catch (error) {
      console.error('Failed to pass user:', error);
    }
  }

  private getMockUsers(): UserProfile[] {
    return [
      {
        id: '1',
        user_hash: 'hash_1',
        name: 'Emma Rose',
        username: 'emma_rose',
        displayName: 'Emma',
        age: 26,
        bio: 'Love deep conversations and spontaneous adventures 🌟',
        interests: ['Photography', 'Hiking', 'Books', 'Coffee'],
        photos: ['https://images.unsplash.com/photo-1494790108755-2616b612b1af?w=400'],
        isOnline: true,
        lastSeen: new Date(),
        location: 'San Francisco',
        communicationStyle: {
          responseSpeed: 'quick',
          typingPattern: 'passionate',
          attentionLevel: 92,
          engagementStyle: 'romantic'
        },
        compatibilityScore: 89
      },
      {
        id: '2',
        user_hash: 'hash_2',
        name: 'Alex Adventure',
        username: 'alex_adventure',
        displayName: 'Alex',
        age: 28,
        bio: 'Thoughtful soul seeking genuine connections 💫',
        interests: ['Music', 'Travel', 'Cooking', 'Art'],
        photos: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400'],
        isOnline: false,
        lastSeen: new Date(Date.now() - 1000 * 60 * 30),
        location: 'San Francisco',
        communicationStyle: {
          responseSpeed: 'thoughtful',
          typingPattern: 'careful',
          attentionLevel: 87,
          engagementStyle: 'intense'
        },
        compatibilityScore: 76
      }
    ];
  }

  private getMockMatches(): Match[] {
    const users = this.getMockUsers();
    return users.map(user => ({
      id: `match_${user.user_hash || user.id}`,
      userId: 'current_user',
      matchedUserId: user.user_hash || user.id || '', // Use user_hash for real users
      user,
      matchedAt: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 7),
      compatibilityScore: user.compatibilityScore || 75,
      connectionStrength: Math.floor(Math.random() * 40) + 60,
      isNewMatch: Math.random() > 0.5
    }));
  }
}

export default new UserService();