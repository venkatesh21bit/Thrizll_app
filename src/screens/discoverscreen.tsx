import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Animated, Text, TouchableOpacity, Alert } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import RevealCard from '../components/RevealCard';
import { UserCard } from '../components/usercard';
import { UserProfile } from '../types/user';
import UserService from '../services/userservice';
import { TelemetrySDK } from '../services/TelemetrySDK';
import { SessionManager } from '../services/SessionManager';
import { API_CONFIG } from '../config/api';

export const DiscoverScreen: React.FC = () => {
  const navigation = useNavigation();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentUserHash, setCurrentUserHash] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRefresh, setShowRefresh] = useState(false);
  const [answersByUser, setAnswersByUser] = useState<Record<string, Record<string, string>>>({});
  const [sessionId, setSessionId] = useState<string>('discover');
  const [mode, setMode] = useState<'swipe' | 'reveal'>('swipe');
  const translateX = new Animated.Value(0);
  const translateY = new Animated.Value(0);
  const rotate = new Animated.Value(0);

  useEffect(() => {
    initializeAndLoadUsers();
  }, []);

  const initializeAndLoadUsers = async () => {
    const sessionManager = SessionManager.getInstance();
    const userHash = await sessionManager.getCurrentUserHash();
    setCurrentUserHash(userHash);
    
  TelemetrySDK.getInstance().startSession('discover');
  setSessionId('discover');
    await loadUsers(userHash);
  };

  const loadUsers = async (userHash: string, isRefresh: boolean = false) => {
    setIsLoading(true);
    try {
      console.log('🔄 Loading users for hash:', userHash, 'refresh:', isRefresh);
      console.log('🌐 API URL will be:', `${API_CONFIG.baseUrl}/api/v1/discover/${userHash}${isRefresh ? '?refresh=true' : ''}`);
      
      const discoveredUsers = await UserService.discoverUsers(userHash, isRefresh);
      console.log('📋 Discovered users:', discoveredUsers.length, 'users');
      console.log('👥 First user:', discoveredUsers[0]);
      
      // Additional check for hardcoded users
      if (discoveredUsers.length > 0) {
        const firstUser = discoveredUsers[0];
        if (firstUser.name === 'Emma Rose' || firstUser.name === 'Alex Adventure') {
          console.warn('⚠️ WARNING: Still getting hardcoded users!');
        } else {
          console.log('✅ Getting real database users');
        }
      }
      
      setUsers(discoveredUsers);
      setCurrentIndex(0);
      setShowRefresh(discoveredUsers.length === 0);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const proceedToNextUser = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= users.length) {
      setShowRefresh(true);
    } else {
      setCurrentIndex(nextIndex);
    }
    setMode('swipe');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              await UserService.logout();
              (navigation as any).reset({
                index: 0,
                routes: [{ name: 'Auth' }],
              });
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleCompleteReveal = async () => {
    const currentUser = users[currentIndex];
    if (!currentUser || !currentUserHash) {
      proceedToNextUser();
      return;
    }
    const sectionAnswers = answersByUser[currentUser.user_hash] || {};
    const prettyKey = (k: string) => k.charAt(0).toUpperCase() + k.slice(1);
    const lines = Object.entries(sectionAnswers)
      .filter(([, v]) => (v || '').trim().length > 0)
      .map(([k, v]) => `- ${prettyKey(k)}: ${v.trim()}`);
    const message = lines.length
      ? `Why I'm reaching out:\n${lines.join('\n')}`
      : undefined;

  try {
      // Submit structured answers for ML/training
      try {
        await UserService.submitRevealAnswers(currentUserHash, currentUser.user_hash, sectionAnswers);
      } catch {}

      const result = await UserService.sendConnectionRequest(currentUserHash, currentUser.user_hash, message);
      await TelemetrySDK.getInstance().trackCustomEvent({
        session_id: sessionId,
        screen: 'discover',
        etype: 'TAP',
        meta: { action: 'send_connection_with_reason', target: currentUser.user_hash, hasMessage: !!message }
      });
      if (result?.success) {
        Alert.alert('✨ Connection Request Sent', 'Your reasons were shared with this user.');
      } else {
        Alert.alert('Error', result?.message || 'Failed to send connection request');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setMode('swipe');
      proceedToNextUser();
    }
  };

  const handleSwipe = async (direction: 'left' | 'right') => {
    const currentUser = users[currentIndex];
    if (!currentUser || !currentUserHash) return;

    if (direction === 'left') {
      // Record pass and move to next
      try { await UserService.recordSwipe(currentUserHash, currentUser.user_hash, 'pass'); } catch {}
      Animated.parallel([
        Animated.timing(translateX, { toValue: -300, duration: 250, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: -0.3, duration: 250, useNativeDriver: true }),
      ]).start(() => {
        translateX.setValue(0);
        translateY.setValue(0);
        rotate.setValue(0);
        const nextIndex = currentIndex + 1;
        if (nextIndex >= users.length) {
          setShowRefresh(true);
        } else {
          setCurrentIndex(nextIndex);
        }
      });
    } else {
      // Like: record swipe and show reveal card for this user
      try { await UserService.recordSwipe(currentUserHash, currentUser.user_hash, 'like'); } catch {}
      setMode('reveal');
      // Snap card back visually
      translateX.setValue(0);
      translateY.setValue(0);
      rotate.setValue(0);
    }
  };

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX, velocityX } = event.nativeEvent;
      if (Math.abs(translationX) > 100 || Math.abs(velocityX) > 500) {
        handleSwipe(translationX > 0 ? 'right' : 'left');
      } else {
        Animated.parallel([
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
          Animated.spring(rotate, { toValue: 0, useNativeDriver: true }),
        ]).start();
      }
    }
  };

  const handleRefresh = async () => {
    if (currentUserHash) {
      console.log('🔄 Refreshing users with refresh mode...');
      setShowRefresh(false); // Hide refresh screen while loading
      await loadUsers(currentUserHash, true); // Pass true for refresh mode
    }
  };

  // Legacy swipe handlers removed for reveal flow

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Finding amazing people for you... ✨</Text>
      </View>
    );
  }

  if (showRefresh || currentIndex >= users.length) {
    return (
      <View style={styles.container}>
        {/* Header with logout button */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Discover</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.refreshContainer}>
          <Text style={styles.refreshTitle}>🎉 You've seen everyone!</Text>
          <Text style={styles.refreshSubtitle}>
            Refresh to see users you haven't sent connection requests to yet, or check back later for new members!
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <Text style={styles.refreshButtonText}>Refresh & Find More</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentUser = users[currentIndex];
  if (!currentUser) return <View style={styles.container} />;

  if (mode === 'reveal') {
    return (
      <View style={styles.container}>
        {/* Header with logout button */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Discover</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.cardArea}>
          <RevealCard
            user={currentUser}
            sessionId={sessionId}
            answers={answersByUser[currentUser.user_hash] || {}}
            onAnswerChange={(sectionKey, text) => {
              setAnswersByUser(prev => ({
                ...prev,
                [currentUser.user_hash]: {
                  ...(prev[currentUser.user_hash] || {}),
                  [sectionKey]: text,
                }
              }));
            }}
            onComplete={handleCompleteReveal}
          />
          <View style={{ height: 16 }} />
          <TouchableOpacity style={styles.refreshButton} onPress={() => { setMode('swipe'); proceedToNextUser(); }}>
            <Text style={styles.refreshButtonText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Swipe mode
  return (
    <View style={styles.container}>
      {/* Header with logout button */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.cardArea}>
        <PanGestureHandler onGestureEvent={onGestureEvent} onHandlerStateChange={onHandlerStateChange}>
          <Animated.View
            style={[
              styles.cardContainer,
              {
                transform: [
                  { translateX },
                  { translateY },
                  { rotate: rotate.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-30deg', '0deg', '30deg'] }) },
                ],
              },
            ]}
          >
            <UserCard user={currentUser} onLike={() => handleSwipe('right')} onPass={() => handleSwipe('left')} />
          </Animated.View>
        </PanGestureHandler>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    zIndex: 10,
  },
  headerTitle: {
    color: '#FF1493',
    fontSize: 24,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 20, 147, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF1493',
  },
  logoutButtonText: {
    color: '#FF1493',
    fontSize: 14,
    fontWeight: '600',
  },
  cardArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 80,
  },
  cardContainer: {
    alignItems: 'center',
  },
  loadingText: {
    color: '#FF1493',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  refreshContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  refreshTitle: {
    color: '#FF1493',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  refreshSubtitle: {
    color: '#B0B0B0',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  refreshButton: {
    backgroundColor: '#FF1493',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});