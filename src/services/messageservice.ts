import { Message, Conversation } from '../types/user';
import { TelemetrySDK } from './TelemetrySDK';
import { API_CONFIG } from '../config/api';
import { SessionManager } from './SessionManager';

class MessagingService {
  private apiUrl = `${API_CONFIG.baseUrl}/api/v1`;
  private websocket: WebSocket | null = null;
  private messageCallbacks: ((message: Message) => void)[] = [];

  async getMessages(conversationId: string, userHash: string): Promise<Message[]> {
    try {
      if (!userHash) {
        console.log('No authenticated user, returning empty messages');
        return [];
      }
      
      const response = await fetch(`${this.apiUrl}/messages/${conversationId}?user_hash=${encodeURIComponent(userHash)}`);
      
      if (!response.ok) {
        console.log(`Messages API returned ${response.status}, using empty array`);
        return [];
      }
      
      const messagesData = await response.json();
      
      // Convert backend message format to frontend Message format
      const messages: Message[] = messagesData.map((msg: any) => ({
        id: msg.id,
        conversationId: conversationId,
        senderId: msg.sender_hash,
        content: msg.content,
        timestamp: new Date(msg.created_at),
        isRead: msg.is_read || false,
        telemetry: msg.telemetry_data ? JSON.parse(msg.telemetry_data) : undefined
      }));
      
      return messages;
    } catch (error) {
      console.error('Failed to get messages:', error);
      return [];
    }
  }

  async getConversations(): Promise<Conversation[]> {
    try {
      const response = await fetch(`${this.apiUrl}/conversations`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get conversations:', error);
      return this.getMockConversations();
    }
  }

  async sendMessage(
    conversationId: string,
    content: string,
    telemetryData?: any,
    toUserHash?: string
  ): Promise<Message> {
    try {
      // Get current user hash and extract the other user hash from conversationId
      const userHash = await SessionManager.getInstance().getAuthenticatedUserHash();
      if (!userHash) {
        throw new Error('User not authenticated');
      }
      
      // Determine the other user hash
      let otherUserHash = toUserHash || '';
      if (!otherUserHash) {
        // Try to parse from composite conversationId
        if (conversationId.includes('_')) {
          const parts = conversationId.split('_');
          otherUserHash = parts.find(part => part !== userHash) || '';
        }
      }
      
      if (!otherUserHash) {
        throw new Error('Invalid conversation ID format');
      }

      const messageRequest = {
        from_user_hash: userHash,
        to_user_hash: otherUserHash,
        content: content,
        message_type: 'text'
      };

      const response = await fetch(`${this.apiUrl}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageRequest),
      });

      if (!response.ok) {
        let bodyText = '';
        try {
          bodyText = await response.text();
        } catch {}
        throw new Error(`Failed to send message: ${response.status} ${response.statusText} ${bodyText ? '- ' + bodyText : ''}`);
      }

      const result = await response.json();
      
      // Log telemetry for message sending
      await TelemetrySDK.getInstance().trackCustomEvent({
        session_id: conversationId,
        screen: 'chat',
        etype: 'MESSAGE_SENT',
        input_len: content.length,
        meta: {
          conversationId,
          messageLength: content.length,
          ...telemetryData
        }
      });

      // Return a Message object
      const sentMessage: Message = {
        id: result.message_id || Math.random().toString(),
        conversationId: conversationId,
        senderId: userHash,
        content: content,
        timestamp: new Date(),
        isRead: false,
        telemetry: telemetryData
      };

      return sentMessage;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  async connectWebSocket(conversationId: string) {
    try {
      this.websocket = new WebSocket(`${API_CONFIG.wsUrl}/ws/chat/${conversationId}`);
      
      this.websocket.onopen = async () => {
        console.log('WebSocket connected, sending authentication...');
        // Send authentication message
        const userHash = await SessionManager.getInstance().getAuthenticatedUserHash();
        if (userHash) {
          const authMessage = {
            type: 'auth',
            user_hash: userHash
          };
          this.websocket?.send(JSON.stringify(authMessage));
        }
      };
      
      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle authentication response
          if (data.type === 'auth_success') {
            console.log('✅ WebSocket authenticated successfully');
            return;
          }
          
          // Handle regular messages
          if (data.type !== 'pong') {
            const message: Message = {
              id: data.id || Math.random().toString(),
              conversationId: data.conversation_id || conversationId,
              senderId: data.sender_hash,
              content: data.content,
              timestamp: new Date(data.created_at || Date.now()),
              isRead: false
            };
            this.messageCallbacks.forEach(callback => callback(message));
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      this.websocket.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }

  onNewMessage(callback: (message: Message) => void) {
    this.messageCallbacks.push(callback);
  }

  disconnectWebSocket() {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }

  private getMockConversations(): Conversation[] {
    return [
      {
        id: 'conv_1',
        participants: [
          {
            id: '1',
            username: 'emma_rose',
            displayName: 'Emma',
            age: 26,
            bio: 'Love deep conversations 🌟',
            interests: ['Photography', 'Hiking'],
            photos: ['https://images.unsplash.com/photo-1494790108755-2616b612b1af?w=400'],
            isOnline: true,
            lastSeen: new Date(),
            communicationStyle: {
              responseSpeed: 'quick',
              typingPattern: 'passionate',
              attentionLevel: 92,
              engagementStyle: 'romantic'
            },
            user_hash: 'hash_1',
            name: 'Emma Rose',
            location: 'San Francisco, CA'
          }
        ],
        messages: [
          {
            id: 'msg_1',
            conversationId: 'conv_1',
            senderId: '1',
            content: 'Hey! I loved your photo from that hiking trip 🏔️',
            timestamp: new Date(Date.now() - 1000 * 60 * 30),
            isRead: true,
            telemetry: {
              typingDuration: 12500,
              pauseCount: 3,
              backspaceRatio: 0.1,
              engagementScore: 87
            }
          }
        ],
        lastActivity: new Date(Date.now() - 1000 * 60 * 30),
        unreadCount: 0,
        connectionScore: 89,
        chemistryTrend: [65, 72, 78, 85, 89]
      }
    ];
  }
}

export default new MessagingService();