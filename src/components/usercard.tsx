import React from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { UserProfile } from '../types/user';

const { width } = Dimensions.get('window');

interface UserCardProps {
  user: UserProfile;
  onLike: () => void;
  onPass: () => void;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onLike, onPass }) => {
  const getEngagementEmoji = (score: number) => {
    if (score >= 90) return '🔥';
    if (score >= 80) return '✨';
    if (score >= 70) return '💫';
    return '🌟';
  };

  const getResponseSpeedEmoji = (speed: string) => {
    switch (speed) {
      case 'lightning': return '⚡';
      case 'quick': return '💨';
      case 'thoughtful': return '🤔';
      default: return '🌸';
    }
  };

  return (
    <View style={styles.card}>
      <ImageBackground
        source={{ uri: user.photos[0] }}
        style={styles.backgroundImage}
        imageStyle={styles.image}
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.gradient}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.name}>{user.displayName}, {user.age}</Text>
              {user.isOnline && <View style={styles.onlineIndicator} />}
            </View>
            
            <Text style={styles.bio}>{user.bio}</Text>
            
            <View style={styles.compatibilitySection}>
              <Text style={styles.compatibilityLabel}>Compatibility</Text>
              <View style={styles.compatibilityRow}>
                <Text style={styles.compatibilityScore}>{user.compatibilityScore}%</Text>
                <Text style={styles.emoji}>{getEngagementEmoji(user.compatibilityScore || 0)}</Text>
              </View>
            </View>

            <View style={styles.insightsSection}>
              <Text style={styles.insightsTitle}>💕 Connection Style</Text>
              <View style={styles.insightRow}>
                <Text style={styles.insightLabel}>
                  {getResponseSpeedEmoji(user.communicationStyle.responseSpeed)} Response Style:
                </Text>
                <Text style={styles.insightValue}>
                  {user.communicationStyle.responseSpeed}
                </Text>
              </View>
              <View style={styles.insightRow}>
                <Text style={styles.insightLabel}>💬 Communication:</Text>
                <Text style={styles.insightValue}>
                  {user.communicationStyle.engagementStyle}
                </Text>
              </View>
              <View style={styles.insightRow}>
                <Text style={styles.insightLabel}>🎯 Attention Level:</Text>
                <Text style={styles.insightValue}>
                  {user.communicationStyle.attentionLevel}%
                </Text>
              </View>
            </View>

            <View style={styles.interestsSection}>
              <Text style={styles.interestsTitle}>✨ Interests</Text>
              <View style={styles.interestsContainer}>
                {user.interests.slice(0, 3).map((interest, index) => (
                  <View key={index} style={styles.interestTag}>
                    <Text style={styles.interestText}>{interest}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.passButton} onPress={onPass}>
          <Text style={styles.actionEmoji}>👎</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.likeButton} onPress={onLike}>
          <Text style={styles.actionEmoji}>💖</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: width - 40,
    height: 600,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  backgroundImage: {
    flex: 1,
  },
  image: {
    borderRadius: 20,
  },
  gradient: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 10,
  },
  onlineIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00FF88',
    shadowColor: '#00FF88',
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  bio: {
    fontSize: 16,
    color: '#E0E0E0',
    marginBottom: 16,
    lineHeight: 22,
  },
  compatibilitySection: {
    backgroundColor: 'rgba(255, 20, 147, 0.2)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 20, 147, 0.3)',
  },
  compatibilityLabel: {
    fontSize: 14,
    color: '#FF69B4',
    fontWeight: '600',
    marginBottom: 4,
  },
  compatibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compatibilityScore: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  emoji: {
    fontSize: 24,
  },
  insightsSection: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF69B4',
    marginBottom: 8,
  },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  insightLabel: {
    fontSize: 14,
    color: '#B0B0B0',
    flex: 1,
  },
  insightValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  interestsSection: {
    marginBottom: 16,
  },
  interestsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF69B4',
    marginBottom: 8,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  interestTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  interestText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  actionsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  passButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(150, 150, 150, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  likeButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 20, 147, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  actionEmoji: {
    fontSize: 24,
  },
});