import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView,
  KeyboardAvoidingView,
  Platform 
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Message, Conversation } from '../types/user';
import MessagingService from '../services/messageservice';
import { TelemetrySDK } from '../services/TelemetrySDK';
import { InterestMeter } from '../components/InterestMeter';

export const ChatScreen: React.FC = () => {
  const route = useRoute();
  const { conversationId } = route.params as { conversationId: string };
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingStartTime, setTypingStartTime] = useState<number>(0);
  const [keyPressCount, setKeyPressCount] = useState(0);
  const [backspaceCount, setBackspaceCount] = useState(0);
  
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadConversation();
    MessagingService.connectWebSocket(conversationId);
    MessagingService.onNewMessage(handleNewMessage);
    
    // Start telemetry session for this chat
    TelemetrySDK.getInstance().startSession(`chat_${conversationId}`);

    return () => {
      MessagingService.disconnectWebSocket();
    };
  }, [conversationId]);

  const loadConversation = async () => {
    const conversations = await MessagingService.getConversations();
    const currentConv = conversations.find(c => c.id === conversationId);
    if (currentConv) {
      setConversation(currentConv);
      setMessages(currentConv.messages);
    }
  };

  const handleNewMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
    flatListRef.current?.scrollToEnd();
  };

  const handleTyping = (text: string) => {
    if (!isTyping) {
      setIsTyping(true);
      setTypingStartTime(Date.now());
      setKeyPressCount(0);
      setBackspaceCount(0);
    }

    // Detect backspace (text got shorter)
    if (text.length < newMessage.length) {
      setBackspaceCount(prev => prev + 1);
    }
    
    setKeyPressCount(prev => prev + 1);
    setNewMessage(text);

    // Log typing telemetry
    TelemetrySDK.getInstance().trackCustomEvent({
      session_id: conversationId,
      screen: 'chat',
      etype: 'TYPE',
      input_len: text.length,
      meta: {
        conversationId,
        isBackspace: text.length < newMessage.length,
        key_code: text.length > newMessage.length ? 'character' : 'backspace',
        backspaces: text.length < newMessage.length ? 1 : 0
      }
    });
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const typingDuration = Date.now() - typingStartTime;
    const backspaceRatio = keyPressCount > 0 ? backspaceCount / keyPressCount : 0;

    try {
      const telemetryData = {
        typingDuration,
        pauseCount: 0, // Would need more sophisticated tracking
        backspaceRatio,
        engagementScore: Math.min(100, Math.max(0, 100 - (backspaceRatio * 50)))
      };

      await MessagingService.sendMessage(conversationId, newMessage, telemetryData);
      
      setNewMessage('');
      setIsTyping(false);
      setKeyPressCount(0);
      setBackspaceCount(0);
      
      flatListRef.current?.scrollToEnd();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwn = item.senderId === 'current_user'; // In real app, use actual user ID
    const showTelemetry = isOwn && item.telemetry;

    return (
      <View style={[styles.messageContainer, isOwn ? styles.ownMessage : styles.otherMessage]}>
        <View style={[styles.messageBubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
          <Text style={[styles.messageText, isOwn ? styles.ownText : styles.otherText]}>
            {item.content}
          </Text>
          
          {showTelemetry && (
            <View style={styles.telemetryInfo}>
              <Text style={styles.telemetryText}>
                ⏱️ {(item.telemetry!.typingDuration / 1000).toFixed(1)}s • 
                🎯 {item.telemetry!.engagementScore}% • 
                ↩️ {(item.telemetry!.backspaceRatio * 100).toFixed(0)}%
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.timestamp}>
          {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  const otherUser = conversation?.participants[0];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with connection score */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{otherUser?.displayName}</Text>
          {otherUser?.isOnline && (
            <View style={styles.onlineStatus}>
              <Text style={styles.onlineText}>Online 🟢</Text>
            </View>
          )}
        </View>
        {conversation && (
          <InterestMeter
            score={{
              score: conversation.connectionScore,
              confidence: 0.85,
              timestamp: Date.now(),
              session_id: conversation.id
            }}
            style={{ height: 40 }}
          />
        )}
      </View>

      {/* Chemistry trend */}
      {conversation && conversation.chemistryTrend.length > 0 && (
        <View style={styles.trendContainer}>
          <Text style={styles.trendTitle}>💕 Chemistry Trend</Text>
          <View style={styles.trendChart}>
            {conversation.chemistryTrend.map((score, index) => (
              <View
                key={index}
                style={[
                  styles.trendBar,
                  { height: `${score}%`, backgroundColor: `hsl(${score * 1.2}, 70%, 60%)` }
                ]}
              />
            ))}
          </View>
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Input area - custom keyboard accessory always above keyboard */}
      <View style={styles.keyboardAccessoryContainer}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={handleTyping}
            placeholder="Share your thoughts... 💭"
            placeholderTextColor="#666"
            multiline
            maxLength={500}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!newMessage.trim()}
          >
            <Text style={styles.sendButtonText}>💖</Text>
          </TouchableOpacity>
        </View>
        {isTyping && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>
              ⌨️ Typing for {((Date.now() - typingStartTime) / 1000).toFixed(1)}s • 
              Keys: {keyPressCount} • Backspaces: {backspaceCount}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 20, 147, 0.2)',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineText: {
    fontSize: 14,
    color: '#00FF88',
  },
  trendContainer: {
    padding: 16,
    backgroundColor: 'rgba(255, 20, 147, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 20, 147, 0.2)',
  },
  trendTitle: {
    fontSize: 14,
    color: '#FF69B4',
    fontWeight: '600',
    marginBottom: 8,
  },
  trendChart: {
    flexDirection: 'row',
    height: 30,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  trendBar: {
    width: 6,
    borderRadius: 3,
    marginHorizontal: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 16,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  ownBubble: {
    backgroundColor: '#FF1493',
  },
  otherBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  ownText: {
    color: '#FFFFFF',
  },
  otherText: {
    color: '#FFFFFF',
  },
  telemetryInfo: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  telemetryText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginHorizontal: 16,
  },
  keyboardAccessoryContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.97)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 20, 147, 0.2)',
    zIndex: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 20, 147, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF1493',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255, 20, 147, 0.3)',
  },
  sendButtonText: {
    fontSize: 20,
  },
  typingIndicator: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  typingText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});