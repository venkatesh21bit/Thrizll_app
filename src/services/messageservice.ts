import { Message, Conversation } from '../types/user';
import { TelemetrySDK } from './TelemetrySDK';

class MessagingService {
  private apiUrl = 'http://172.20.10.2:8000/api/v1';
  private websocket: WebSocket | null = null;
  private messageCallbacks: ((message: Message) => void)[] = [];

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
    telemetryData?: any
  ): Promise<Message> {
    try {
      const message = {
        conversationId,
        content,
        telemetry: telemetryData,
        timestamp: new Date()
      };

      const response = await fetch(`${this.apiUrl}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      const sentMessage = await response.json();
      
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

      return sentMessage;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  connectWebSocket(conversationId: string) {
    try {
      this.websocket = new WebSocket(`ws://172.20.10.2:8000/ws/chat/${conversationId}`);
      
      this.websocket.onmessage = (event) => {
        const message: Message = JSON.parse(event.data);
        this.messageCallbacks.forEach(callback => callback(message));
      };

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
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
            }
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