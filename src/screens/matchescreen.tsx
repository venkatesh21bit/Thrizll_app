import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Match } from '../types/user';
import UserService from '../services/userservice';

export const MatchesScreen: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const navigation = useNavigation();

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    const userMatches = await UserService.getMatches();
    setMatches(userMatches);
  };

  const renderMatch = ({ item }: { item: Match }) => (
    <TouchableOpacity
      style={styles.matchCard}
      onPress={() => (navigation as any).navigate('Chat', { conversationId: `conv_${item.user.id}` })}
    >
      <Image source={{ uri: item.user.photos[0] }} style={styles.avatar} />
      <View style={styles.matchInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{item.user.displayName}</Text>
          {item.isNewMatch && <Text style={styles.newBadge}>NEW</Text>}
          {item.user.isOnline && <View style={styles.onlineIndicator} />}
        </View>
        
        <Text style={styles.lastMessage}>
          {item.lastMessage ? item.lastMessage.content : 'Say hello! 👋'}
        </Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Compatibility</Text>
            <Text style={styles.statValue}>{item.compatibilityScore}% 💕</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Connection</Text>
            <Text style={styles.statValue}>{item.connectionStrength}% ✨</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💖 Your Matches</Text>
        <Text style={styles.subtitle}>{matches.length} amazing connections</Text>
      </View>

      <FlatList
        data={matches}
        renderItem={renderMatch}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 20, 147, 0.2)',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF1493',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#B0B0B0',
  },
  list: {
    padding: 20,
  },
  matchCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 20, 147, 0.1)',
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 16,
  },
  matchInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 8,
  },
  newBadge: {
    backgroundColor: '#FF1493',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 8,
  },
  onlineIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00FF88',
  },
  lastMessage: {
    fontSize: 14,
    color: '#B0B0B0',
    marginBottom: 12,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    color: '#FF69B4',
    fontWeight: '600',
  },
});