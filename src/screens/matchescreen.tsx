import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  RefreshControl,
  Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { UserProfile, Match } from '../types/user';
import UserService from '../services/userservice';
import { SessionManager } from '../services/SessionManager';

interface MatchWithProfile {
  id: string;
  user_profile: UserProfile;
  matched_at: string;
  is_new: boolean;
}

export const MatchesScreen: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserHash, setCurrentUserHash] = useState<string>('');
  const navigation = useNavigation();

  useEffect(() => {
    initializeAndLoadMatches();
  }, []);

  const initializeAndLoadMatches = async () => {
    const sessionManager = SessionManager.getInstance();
    const userHash = await sessionManager.getCurrentUserHash();
    setCurrentUserHash(userHash);
    await loadMatches(userHash);
  };

  const loadMatches = async (userHash: string) => {
    setIsLoading(true);
    try {
      const userMatches = await UserService.getMatches(userHash);
      console.log('🎯 Raw matches data:', userMatches);
      setMatches(userMatches);
    } catch (error) {
      console.error('Failed to load matches:', error);
      Alert.alert('Error', 'Failed to load your matches. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const startChat = (match: Match) => {
    // Navigate to chat screen with the matched user
    console.log('Starting chat with match:', match);
    (navigation as any).navigate('Chat', { 
      conversationId: `${currentUserHash}_${match.matchedUserId}`,
      chatPartnerId: match.matchedUserId,
      chatPartnerName: match.user.name
    });
  };

  const renderMatch = ({ item }: { item: Match }) => {
    // Simple template: just show the matched user's name and chat button
    if (!item.user || !item.user.name) {
      return (
        <View style={styles.matchCard}>
          <Text style={styles.errorText}>User data not available</Text>
        </View>
      );
    }

    return (
      <View style={styles.matchCard}>
        <View style={styles.matchInfo}>
          <Text style={styles.name}>{item.user.name}</Text>
        </View>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => startChat(item)}
        >
          <Text style={styles.chatButtonText}>💬 Chat</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const onRefresh = () => {
    if (currentUserHash) {
      loadMatches(currentUserHash);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💖 Your Matches</Text>
        <Text style={styles.subtitle}>
          {matches.length === 0 ? 'No matches yet' : `${matches.length} amazing connection${matches.length > 1 ? 's' : ''}`}
        </Text>
      </View>

      {matches.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>💔</Text>
          <Text style={styles.emptyTitle}>No Matches Yet</Text>
          <Text style={styles.emptySubtitle}>
            Keep swiping to find your perfect match! When someone accepts your connection request, they'll appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          renderItem={renderMatch}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl 
              refreshing={isLoading} 
              onRefresh={onRefresh}
              tintColor="#FF1493"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
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
    width: 80,
    height: 80,
    borderRadius: 40,
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
    fontSize: 18,
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
  },
  bio: {
    fontSize: 14,
    color: '#B0B0B0',
    marginBottom: 8,
    lineHeight: 20,
  },
  matchDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  interestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    alignItems: 'center',
  },
  interestTag: {
    backgroundColor: 'rgba(255, 20, 147, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  interestText: {
    fontSize: 12,
    color: '#FF69B4',
    fontWeight: '600',
  },
  moreInterests: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  chatButton: {
    backgroundColor: '#FF1493',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#B0B0B0',
    textAlign: 'center',
    lineHeight: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#FF6B6B',
    textAlign: 'center',
    padding: 16,
  },
});