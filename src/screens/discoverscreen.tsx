import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Animated, Text, TouchableOpacity, Alert } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { UserCard } from '../components/usercard';
import { UserProfile } from '../types/user';
import UserService from '../services/userservice';
import { TelemetrySDK } from '../services/TelemetrySDK';
import { SessionManager } from '../services/SessionManager';
import { API_CONFIG } from '../config/api';

export const DiscoverScreen: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentUserHash, setCurrentUserHash] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRefresh, setShowRefresh] = useState(false);
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

  const handleSwipe = async (direction: 'left' | 'right') => {
    const currentUser = users[currentIndex];
    if (!currentUser || !currentUserHash) {
      console.log('❌ Swipe failed: missing user data', { currentUser: !!currentUser, currentUserHash });
      return;
    }

    const action = direction === 'right' ? 'like' : 'pass';
    console.log(`👆 Swipe ${direction} on user:`, {
      swiper: currentUserHash,
      target: currentUser.user_hash,
      targetName: currentUser.name,
      action
    });
    
    try {
      // Record the swipe first
      console.log('📝 Recording swipe...');
      await UserService.recordSwipe(currentUserHash, currentUser.user_hash, action);
      console.log('✅ Swipe recorded successfully');
      
      if (action === 'like') {
        // Send connection request for right swipe
        console.log('💕 Sending connection request...');
        const connectionResult = await UserService.sendConnectionRequest(currentUserHash, currentUser.user_hash);
        console.log('🔗 Connection request result:', connectionResult);
        
        if (connectionResult.success) {
          Alert.alert('✨ Connection Request Sent!', 'You have sent a connection request to ' + currentUser.name);
        } else {
          Alert.alert('Error', connectionResult.message || 'Failed to send connection request');
        }
      }

      // Log telemetry
      await TelemetrySDK.getInstance().trackCustomEvent({
        session_id: 'discover',
        screen: 'discover',
        etype: 'TAP',
        meta: {
          action: action,
          userId: currentUser.user_hash,
          compatibilityScore: currentUser.compatibilityScore
        }
      });

    } catch (error) {
      console.error('❌ Failed to process swipe:', error);
      Alert.alert('Error', 'Failed to process swipe. Please try again.');
    }

    // Animate card out
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: direction === 'right' ? 300 : -300,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: direction === 'right' ? 0.3 : -0.3,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Reset animations and move to next card
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
  };

  const handleLike = () => handleSwipe('right');
  const handlePass = () => handleSwipe('left');

  const handleRefresh = async () => {
    if (currentUserHash) {
      console.log('🔄 Refreshing users with refresh mode...');
      setShowRefresh(false); // Hide refresh screen while loading
      await loadUsers(currentUserHash, true); // Pass true for refresh mode
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
        // Snap back to center
        Animated.parallel([
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }),
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }),
          Animated.spring(rotate, {
            toValue: 0,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  };

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

  return (
    <View style={styles.container}>
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
      >
        <Animated.View
          style={[
            styles.cardContainer,
            {
              transform: [
                { translateX },
                { translateY },
                { rotate: rotate.interpolate({
                    inputRange: [-1, 0, 1],
                    outputRange: ['-30deg', '0deg', '30deg']
                  })
                }
              ]
            }
          ]}
        >
          <UserCard
            user={currentUser}
            onLike={handleLike}
            onPass={handlePass}
          />
        </Animated.View>
      </PanGestureHandler>
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