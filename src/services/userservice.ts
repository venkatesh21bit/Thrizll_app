import { UserProfile, Match } from '../types/user';

class UserService {
  private apiUrl = 'http://172.20.10.2:8000/api/v1';

  async discoverUsers(filters?: {
    minAge?: number;
    maxAge?: number;
    maxDistance?: number;
    interests?: string[];
  }): Promise<UserProfile[]> {
    // Always return mock users for prototype
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
        username: 'emma_rose',
        displayName: 'Emma',
        age: 26,
        bio: 'Love deep conversations and spontaneous adventures 🌟',
        interests: ['Photography', 'Hiking', 'Books', 'Coffee'],
        photos: ['https://images.unsplash.com/photo-1494790108755-2616b612b1af?w=400'],
        isOnline: true,
        lastSeen: new Date(),
        location: { city: 'San Francisco', distance: 2 },
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
        username: 'alex_adventure',
        displayName: 'Alex',
        age: 28,
        bio: 'Thoughtful soul seeking genuine connections 💫',
        interests: ['Music', 'Travel', 'Cooking', 'Art'],
        photos: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400'],
        isOnline: false,
        lastSeen: new Date(Date.now() - 1000 * 60 * 30),
        location: { city: 'San Francisco', distance: 5 },
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
      id: `match_${user.id}`,
      userId: 'current_user',
      matchedUserId: user.id,
      user,
      matchedAt: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 7),
      compatibilityScore: user.compatibilityScore || 75,
      connectionStrength: Math.floor(Math.random() * 40) + 60,
      isNewMatch: Math.random() > 0.5
    }));
  }
}

export default new UserService();