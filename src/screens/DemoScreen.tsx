import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
} from 'react-native';
import { useInteractionTelemetry } from '../hooks/useTelemetry';
import { TelemetryScrollView } from '../components/TelemetryScrollView';
import { TelemetryTextInput } from '../components/TelemetryTextInput';
import { TelemetryTouchableOpacity } from '../components/TelemetryTouchableOpacity';
import { InterestMeter } from '../components/InterestMeter';
import { InterestScore } from '../types/telemetry';

export const DemoScreen: React.FC = () => {
  const { sessionId } = useInteractionTelemetry();
  const [interestScore, setInterestScore] = useState<InterestScore | undefined>();
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<string[]>([
    '💕 Welcome to LoveSync Demo!',
    '✨ Start typing or scrolling to discover your connection patterns',
    '💖 The Chemistry Meter above shows your real-time romantic vibes',
  ]);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [heartPulse] = useState(new Animated.Value(1));

  // Animate entrance
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Simulate real-time score updates with romantic context
  useEffect(() => {
    const interval = setInterval(() => {
      if (sessionId) {
        // More dynamic scoring based on romantic engagement
        const baseScore = 30 + Math.random() * 55;
        const confidence = 0.5 + Math.random() * 0.4;
        
        setInterestScore({
          score: baseScore,
          confidence,
          timestamp: Date.now(),
          session_id: sessionId,
        });

        // Heart pulse animation on score update
        Animated.sequence([
          Animated.timing(heartPulse, {
            toValue: 1.1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(heartPulse, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [sessionId, heartPulse]);

  const handleSendMessage = () => {
    if (messageText.trim()) {
      setMessages(prev => [...prev, `💌 ${messageText}`]);
      setMessageText('');
    }
  };

  const generateDemoContent = () => {
    const romanticDemoTexts = [
      '🌟 This is how we discover your digital chemistry',
      '💫 Try scrolling through these messages at different speeds',
      '🔥 Notice how your Connection Level responds to interactions',
      '🔒 We capture romantic patterns without storing any personal content',
      '💕 Your typing rhythm reveals your emotional engagement',
      '✨ Scroll patterns show your level of interest and attention',
      '🎯 Tap frequency indicates excitement and connection',
      '🛡️ Privacy is our priority - only interaction patterns, never content',
      '🧠 Our AI learns your unique romantic communication style',
      '💖 Different conversation topics might spark different connection levels',
      '🌹 Fast typing might indicate excitement and passion',
      '😍 Slow, thoughtful typing could show deep consideration',
      '🔥 Rapid scrolling might suggest high engagement',
      '💫 Long pauses could indicate meaningful reflection',
    ];

    return romanticDemoTexts.map((text, index) => (
      <Animated.View 
        key={index} 
        style={[
          styles.messageContainer,
          {
            opacity: fadeAnim,
            transform: [{
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              })
            }]
          }
        ]}
      >
        <Text style={styles.messageText}>{text}</Text>
      </Animated.View>
    ));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <View style={styles.background}>
        <Animated.View style={[styles.content, { transform: [{ scale: heartPulse }] }]}>
          <InterestMeter score={interestScore} style={styles.meter} />
        </Animated.View>

        <TelemetryScrollView 
          style={styles.messagesContainer}
          componentId="romantic-chat-scroll"
          showsVerticalScrollIndicator={false}
        >
          {generateDemoContent()}
          {messages.map((message, index) => (
            <Animated.View 
              key={`user-${index}`} 
              style={[
                styles.messageContainer, 
                styles.userMessage,
                {
                  opacity: fadeAnim,
                  transform: [{
                    scale: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    })
                  }]
                }
              ]}
            >
              <Text style={styles.userMessageText}>{message}</Text>
            </Animated.View>
          ))}
        </TelemetryScrollView>

        <View style={styles.inputContainer}>
          <TelemetryTextInput
            style={styles.textInput}
            placeholder="Share your romantic thoughts... 💕"
            placeholderTextColor="#666666"
            value={messageText}
            onChangeText={setMessageText}
            componentId="romantic-message-input"
            multiline
          />
          <TelemetryTouchableOpacity
            style={styles.sendButton}
            onPress={handleSendMessage}
            componentId="romantic-send-button"
          >
            <Text style={styles.sendButtonText}>Send 💕</Text>
          </TelemetryTouchableOpacity>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            💫 Session: {sessionId ? sessionId.substring(0, 12) + '...' : 'Starting...'}
          </Text>
          <Text style={styles.infoSubtext}>
            🔐 Your romantic patterns are being analyzed with complete privacy
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  background: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
  },
  meter: {
    marginTop: 10,
    marginHorizontal: 16,
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    maxWidth: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255, 20, 147, 0.2)',
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  userMessage: {
    backgroundColor: 'rgba(255, 20, 147, 0.9)',
    alignSelf: 'flex-end',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#FF1493',
    shadowOpacity: 0.3,
  },
  messageText: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
    fontWeight: '400',
  },
  userMessageText: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 20, 147, 0.3)',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 20, 147, 0.4)',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 120,
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    color: '#FFFFFF',
    minHeight: 48,
  },
  sendButton: {
    backgroundColor: '#FF1493',
    borderRadius: 25,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginLeft: 12,
    minHeight: 48,
    justifyContent: 'center',
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  infoContainer: {
    padding: 16,
    backgroundColor: 'rgba(15, 15, 15, 0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 20, 147, 0.2)',
  },
  infoText: {
    fontSize: 13,
    color: '#FF6B9D',
    textAlign: 'center',
    fontWeight: '500',
  },
  infoSubtext: {
    fontSize: 11,
    color: '#AAAAAA',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '400',
  },
});
