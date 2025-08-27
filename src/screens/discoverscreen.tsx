import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { UserCard } from '../components/usercard';
import { UserProfile } from '../types/user';
import UserService from '../services/userservice';
import { TelemetrySDK } from '../services/TelemetrySDK';

export const DiscoverScreen: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const translateX = new Animated.Value(0);
  const translateY = new Animated.Value(0);
  const rotate = new Animated.Value(0);

  useEffect(() => {
    loadUsers();
    TelemetrySDK.getInstance().startSession('discover');
  }, []);

  const loadUsers = async () => {
    const discoveredUsers = await UserService.discoverUsers();
    setUsers(discoveredUsers);
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    const currentUser = users[currentIndex];
    if (!currentUser) return;

    if (direction === 'right') {
      handleLike();
    } else {
      handlePass();
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
      setCurrentIndex(currentIndex + 1);
    });
  };

  const handleLike = async () => {
    const currentUser = users[currentIndex];
    if (!currentUser) return;

    try {
      const result = await UserService.likeUser(currentUser.id);
      
      // Log telemetry for like action
      await TelemetrySDK.getInstance().trackCustomEvent({
        session_id: 'discover',
        screen: 'discover',
        etype: 'TAP',
        meta: {
          action: 'like',
          userId: currentUser.id,
          compatibilityScore: currentUser.compatibilityScore
        }
      });

      if (result.isMatch) {
        // Show match animation/modal
        console.log('It\'s a match! 💖');
      }
    } catch (error) {
      console.error('Failed to like user:', error);
    }
  };

  const handlePass = async () => {
    const currentUser = users[currentIndex];
    if (!currentUser) return;

    try {
      await UserService.passUser(currentUser.id);
      
      // Log telemetry for pass action
      await TelemetrySDK.getInstance().trackCustomEvent({
        session_id: 'discover',
        screen: 'discover',
        etype: 'TAP',
        meta: {
          action: 'pass',
          userId: currentUser.id,
          compatibilityScore: currentUser.compatibilityScore
        }
      });
    } catch (error) {
      console.error('Failed to pass user:', error);
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
});