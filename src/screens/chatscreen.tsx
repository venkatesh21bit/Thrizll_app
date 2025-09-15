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
  Platform,
  Animated 
} from 'react-native';
import LottieView from 'lottie-react-native';
import { useRoute } from '@react-navigation/native';
import { Message, Conversation } from '../types/user';
import MessagingService from '../services/messageservice';
import { TelemetrySDK } from '../services/TelemetrySDK';
import { InterestMeter } from '../components/InterestMeter';
import { TelemetryTextInput } from '../components/TelemetryTextInput';
import { TelemetryTouchableOpacity } from '../components/TelemetryTouchableOpacity';
import { TelemetryScrollView } from '../components/TelemetryScrollView';
import { useInteractionTelemetry } from '../hooks/useTelemetry';
import { InterestScore } from '../types/telemetry';
import { SessionManager } from '../services/SessionManager';

export const ChatScreen: React.FC = () => {
  const route = useRoute();
  const { conversationId } = route.params as { conversationId: string };
  const { sessionId } = useInteractionTelemetry();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserHash, setCurrentUserHash] = useState<string>('');
  const [newMessage, setNewMessage] = useState('');
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingStartTime, setTypingStartTime] = useState<number>(0);
  const [keyPressCount, setKeyPressCount] = useState(0);
  const [backspaceCount, setBackspaceCount] = useState(0);
  const [interestScore, setInterestScore] = useState<InterestScore | undefined>();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [heartPulse] = useState(new Animated.Value(1));
  const [lastKeystrokeTimestamp, setLastKeystrokeTimestamp] = useState(0);
  const [keystrokeIntervals, setKeystrokeIntervals] = useState<number[]>([]);
  const [thinkingPauses, setThinkingPauses] = useState(0);
  const thinkingPauseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scrollAnalytics, setScrollAnalytics] = useState({ velocity: 0, hesitations: 0 });
  const lastScrollTime = useRef(0);
  const lastScrollOffset = useRef(0);
  const hesitationTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadConversation();
    MessagingService.connectWebSocket(conversationId);
    MessagingService.onNewMessage(handleNewMessage);
    
    // Start telemetry session for this chat
    TelemetrySDK.getInstance().startSession(`chat_${conversationId}`);

    // Animate entrance
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: true,
    }).start();

    return () => {
      MessagingService.disconnectWebSocket();
  if (thinkingPauseTimeout.current) clearTimeout(thinkingPauseTimeout.current);
  if (hesitationTimeout.current) clearTimeout(hesitationTimeout.current);
    };
  }, [conversationId]);

  // Real-time interest score updates based on chat interactions
  useEffect(() => {
    const interval = setInterval(() => {
      if (sessionId) {
        // Calculate dynamic score based on chat activity
        const baseScore = 40 + Math.random() * 45;
        const engagementBonus = isTyping ? 15 : 0;
        const messageBonus = messages.length > 0 ? Math.min(20, messages.length * 2) : 0;
        const confidence = 0.6 + Math.random() * 0.3;
        
        setInterestScore({
          score: Math.min(100, baseScore + engagementBonus + messageBonus),
          confidence,
          timestamp: Date.now(),
          session_id: sessionId,
        });

        // Heart pulse animation during active interaction
        if (isTyping) {
          Animated.sequence([
            Animated.timing(heartPulse, {
              toValue: 1.05,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(heartPulse, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [sessionId, isTyping, messages.length, heartPulse]);

  const loadConversation = async () => {
    try {
      // Get authenticated user hash for isOwn detection and API call
      const userHash = await SessionManager.getInstance().getAuthenticatedUserHash();
      if (userHash) setCurrentUserHash(userHash);

      // Fetch messages for this conversation from backend
      const msgs = await MessagingService.getMessages(conversationId, userHash || '');
      setMessages(Array.isArray(msgs) ? msgs : []);
    } catch (e) {
      console.warn('Failed to load conversation; defaulting to empty list', e);
      setMessages([]);
    }
  };

  const handleNewMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
    // Note: Auto-scroll functionality will need to be handled differently with TelemetryScrollView
  };

  const handleTyping = (text: string) => {
    const now = Date.now();
    if (!isTyping) {
      setIsTyping(true);
      setTypingStartTime(now);
      setKeyPressCount(0);
      setBackspaceCount(0);
      setKeystrokeIntervals([]);
      setThinkingPauses(0);
      setLastKeystrokeTimestamp(now);
    }

    // Inter-keystroke interval
    if (lastKeystrokeTimestamp) {
      const interval = now - lastKeystrokeTimestamp;
      setKeystrokeIntervals(prev => [...prev, interval]);
    }
    setLastKeystrokeTimestamp(now);

    // Detect backspace (text got shorter)
    if (text.length < newMessage.length) {
      setBackspaceCount(prev => prev + 1);
    }
    
    setKeyPressCount(prev => prev + 1);
    setNewMessage(text);

    if (thinkingPauseTimeout.current) clearTimeout(thinkingPauseTimeout.current);
    thinkingPauseTimeout.current = setTimeout(() => {
      setThinkingPauses(prev => prev + 1);
    }, 1500);

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
        backspaces: text.length < newMessage.length ? 1 : 0,
        interval: lastKeystrokeTimestamp ? now - lastKeystrokeTimestamp : 0,
      }
    });
  };

  const handleScroll = (event: any) => {
    const now = Date.now();
    const currentOffset = event?.nativeEvent?.contentOffset?.y || 0;
    if (lastScrollTime.current > 0) {
      const timeDiff = now - lastScrollTime.current;
      const offsetDiff = Math.abs(currentOffset - lastScrollOffset.current);
      if (timeDiff > 0) {
        const velocity = offsetDiff / timeDiff;
        setScrollAnalytics(prev => ({ ...prev, velocity }));
      }
    }
    lastScrollTime.current = now;
    lastScrollOffset.current = currentOffset;

    if (hesitationTimeout.current) clearTimeout(hesitationTimeout.current);
    hesitationTimeout.current = setTimeout(() => {
      setScrollAnalytics(prev => ({ ...prev, velocity: 0, hesitations: prev.hesitations + 1 }));
    }, 300);
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

      // Optimistically add message locally so the bubble appears immediately
      const localMessage: Message = {
        id: `temp_${Date.now()}`,
        conversationId,
        senderId: currentUserHash || 'current_user',
        content: newMessage.trim(),
        timestamp: new Date(),
        isRead: false,
        telemetry: telemetryData,
      };
      setMessages(prev => [...prev, localMessage]);

      // Kick off server send
      await MessagingService.sendMessage(conversationId, newMessage.trim(), telemetryData);
      
      setNewMessage('');
      setIsTyping(false);
      setKeyPressCount(0);
      setBackspaceCount(0);
      
      // Note: Auto-scroll functionality will need to be handled differently with TelemetryScrollView
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwn = currentUserHash ? item.senderId === currentUserHash : false;
    const showTelemetry = isOwn && item.telemetry;

    return (
      <Animated.View 
        style={[
          styles.messageContainer, 
          isOwn ? styles.ownMessage : styles.otherMessage,
          {
            opacity: fadeAnim,
            transform: [{
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [10, 0],
              })
            }]
          }
        ]}
      >
        <Animated.View 
          style={[
            styles.messageBubble, 
            isOwn ? styles.ownBubble : styles.otherBubble,
            {
              transform: [{
                scale: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1],
                })
              }]
            }
          ]}
        >
          <Text style={[styles.messageText, isOwn ? styles.ownText : styles.otherText]}>
            {item.content}
          </Text>
          
          {showTelemetry && (
            <Animated.View 
              style={[
                styles.telemetryInfo,
                {
                  opacity: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.8],
                  })
                }
              ]}
            >
              <Text style={styles.telemetryText}>
                ⏱️ {(item.telemetry!.typingDuration / 1000).toFixed(1)}s • 
                💕 {item.telemetry!.engagementScore}% engagement • 
                ✏️ {(item.telemetry!.backspaceRatio * 100).toFixed(0)}% edits
              </Text>
            </Animated.View>
          )}
        </Animated.View>
        <Text style={styles.timestamp}>
          {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </Animated.View>
    );
  };

  const otherUser = conversation?.participants[0];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{otherUser?.displayName || 'Chat Partner'}</Text>
          {otherUser?.isOnline && (
            <View style={styles.onlineStatus}>
              <Text style={styles.onlineText}>Online 🟢</Text>
            </View>
          )}
        </View>
      </View>

      {/* Centered Interest Meter */}
      <View style={styles.meterSection}>
        <InterestMeter
          score={interestScore || {
            score: conversation?.connectionScore || 50,
            confidence: 0.75,
            timestamp: Date.now(),
            session_id: conversationId
          }}
          style={styles.interestMeter}
        />
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

      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        {/* Messages with telemetry tracking */}
        <TelemetryScrollView
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          componentId="chat-messages-scroll"
          onScroll={handleScroll}
          showsVerticalScrollIndicator={false}
        >
          <View pointerEvents="none" style={styles.lottieButterfly}>
            <LottieView
              source={require('../../assets/animations/butterflies.json')}
              autoPlay
              loop
              style={{ flex: 1 }}
            />
          </View>
          {messages.map((message, index) => renderMessage({ item: message, index }))}
        </TelemetryScrollView>

        {/* Input area with telemetry tracking */}
        <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <TelemetryTextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={handleTyping}
            placeholder="Share your romantic thoughts... �"
            placeholderTextColor="#666"
            componentId="chat-message-input"
            multiline
            maxLength={500}
          />
          <TelemetryTouchableOpacity
            style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            componentId="chat-send-button"
            disabled={!newMessage.trim()}
          >
            <Text style={styles.sendButtonText}>💖</Text>
          </TelemetryTouchableOpacity>
        </View>
        {(
          <Animated.View 
            style={[
              styles.typingIndicator,
              {
                opacity: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                })
              }
            ]}
          >
            <Text style={styles.typingText}>
              💭 Writing for {isTyping ? ((Date.now() - typingStartTime) / 1000).toFixed(1) : '0.0'}s • 
              ⌨️ {keyPressCount} keystrokes • ✏️ {backspaceCount} edits
            </Text>
            <Text style={styles.typingText}>
              Scroll Velocity: {scrollAnalytics.velocity.toFixed(2)} | Hesitations: {scrollAnalytics.hesitations}
            </Text>
          </Animated.View>
        )}
      </View>
      </KeyboardAvoidingView>
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
    minHeight: 80,
  },
  meterSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.97)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 20, 147, 0.2)',
  },
  userInfo: {
    flex: 1,
    marginRight: 16,
  },
  meterContainer: {
    width: 140,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  interestMeter: {
  width: '90%',
  maxWidth: 320,
  height: 60,
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
    alignSelf: 'flex-end',
    marginRight: 8,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  messageBubble: {
    maxWidth: '85%',
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
    backgroundColor: 'rgba(0, 0, 0, 0.97)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 20, 147, 0.2)',
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
  },
  chatContainer: {
    flex: 1,
  },
  inputContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.97)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 20, 147, 0.2)',
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
  lottieButterfly: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    opacity: 0.12,
  },
});