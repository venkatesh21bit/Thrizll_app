export interface UserProfile {
  user_hash: string;
  name: string;
  age: number;
  bio: string;
  location: string;
  interests: string[];
  photos: string[];
  created_at?: string;
  
  // Legacy fields for backward compatibility
  id?: string;
  username?: string;
  displayName?: string;
  avatar?: string;
  isOnline?: boolean;
  lastSeen?: Date;
  
  // Digital body language insights
  communicationStyle?: {
    responseSpeed: 'lightning' | 'quick' | 'thoughtful' | 'deliberate';
    typingPattern: 'burst' | 'steady' | 'careful' | 'passionate';
    attentionLevel: number; // 0-100
    engagementStyle: 'intense' | 'playful' | 'romantic' | 'casual';
  };
  
  compatibilityScore?: number;
  mutualInterests?: string[];
}

export interface Match {
  id: string;
  userId: string;
  matchedUserId: string;
  user: UserProfile;
  matchedAt: Date;
  compatibilityScore: number;
  connectionStrength: number;
  lastMessage?: Message;
  isNewMatch: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  reactionEmoji?: string;
  
  // Digital body language metrics for this message
  telemetry?: {
    typingDuration: number;
    pauseCount: number;
    backspaceRatio: number;
    engagementScore: number;
  };
}

export interface Conversation {
  id: string;
  participants: UserProfile[];
  messages: Message[];
  lastActivity: Date;
  unreadCount: number;
  connectionScore: number;
  chemistryTrend: number[]; // Array of scores over time
}