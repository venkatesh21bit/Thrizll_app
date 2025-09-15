import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  Alert,
  RefreshControl 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import UserService from '../services/userservice';
import { SessionManager } from '../services/SessionManager';

interface ConnectionRequest {
  id: string;
  from_user_hash?: string;
  to_user_hash?: string;
  name: string;
  age: number;
  bio: string;
  photos: string[];
  message: string;
  created_at: string;
  status?: string;
}

export const NotificationsScreen: React.FC = () => {
  const [receivedRequests, setReceivedRequests] = useState<ConnectionRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<ConnectionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserHash, setCurrentUserHash] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');

  useEffect(() => {
    initializeAndLoadRequests();
  }, []);

  // Refresh notifications when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (currentUserHash) {
        console.log('🔔 Notifications screen focused, refreshing requests...');
        loadConnectionRequests(currentUserHash);
      }
    }, [currentUserHash])
  );

  const initializeAndLoadRequests = async () => {
    const sessionManager = SessionManager.getInstance();
    const userHash = await sessionManager.getCurrentUserHash();
    setCurrentUserHash(userHash);
    await loadConnectionRequests(userHash);
  };

  const loadConnectionRequests = async (userHash: string) => {
    setIsLoading(true);
    try {
      console.log('🔔 Loading connection requests for:', userHash);
      
      // Load received requests (incoming)
      const receivedConnectionRequests = await UserService.getConnectionRequests(userHash);
      console.log('🔔 Loaded', receivedConnectionRequests.length, 'received connection requests');
      setReceivedRequests(receivedConnectionRequests);

      // Load sent requests (outgoing)
      const sentConnectionRequests = await UserService.getSentConnectionRequests(userHash);
      console.log('🔔 Loaded', sentConnectionRequests.length, 'sent connection requests');
      setSentRequests(sentConnectionRequests);
      
    } catch (error) {
      console.error('Failed to load connection requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResponse = async (requestId: string, action: 'accept' | 'decline', userName: string) => {
    try {
      const result = await UserService.respondToConnectionRequest(requestId, action);
      
      if (result.success) {
        if (action === 'accept') {
          Alert.alert(
            '🎉 Connection Accepted!', 
            `You and ${userName} are now connected! You can start chatting in the Matches tab.`,
            [{ text: 'Great!', style: 'default' }]
          );
        } else {
          Alert.alert('Connection Declined', `You declined ${userName}'s connection request.`);
        }
        
        // Refresh the requests list
        if (currentUserHash) {
          await loadConnectionRequests(currentUserHash);
        }
      } else {
        Alert.alert('Error', result.message || 'Failed to respond to connection request');
      }
    } catch (error) {
      console.error('Failed to respond to connection request:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    }
  };

  const renderRequest = ({ item }: { item: ConnectionRequest }) => (
    <View style={styles.requestCard}>
      <Image 
        source={{ uri: (item.photos && item.photos.length > 0 && item.photos[0]) || 'https://via.placeholder.com/70' }} 
        style={styles.avatar} 
      />
      
      <View style={styles.requestInfo}>
        <View style={styles.headerRow}>
          <Text style={styles.name}>{item.name}, {item.age || 'Unknown'}</Text>
          <Text style={styles.timeText}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        
        <Text style={styles.bio} numberOfLines={2}>{item.bio || 'No bio available'}</Text>
        
        {item.message && (
          <View style={styles.messageContainer}>
            <Text style={styles.messageLabel}>Message:</Text>
            <Text style={styles.messageText}>"{item.message}"</Text>
          </View>
        )}
        
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.responseButton, styles.declineButton]}
            onPress={() => handleResponse(item.id, 'decline', item.name)}
          >
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.responseButton, styles.acceptButton]}
            onPress={() => handleResponse(item.id, 'accept', item.name)}
          >
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderSentRequest = ({ item }: { item: ConnectionRequest }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestContent}>
        <Image source={{ uri: (item.photos && item.photos.length > 0 && item.photos[0]) || 'https://via.placeholder.com/60' }} style={styles.profileImage} />
        <View style={styles.requestInfo}>
          <Text style={styles.requestName}>{item.name}</Text>
          <Text style={styles.requestAge}>Age: {item.age || 'Unknown'}</Text>
          <Text style={styles.requestMessage}>"{item.message || 'No message'}"</Text>
          <Text style={styles.requestTime}>{new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
        <View style={styles.statusContainer}>
          <Text style={[styles.statusText, 
            item.status === 'pending' ? styles.pendingStatus : 
            item.status === 'accepted' ? styles.acceptedStatus : styles.declinedStatus
          ]}>
            {(item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'Unknown')}
          </Text>
        </View>
      </View>
    </View>
  );

  const onRefresh = () => {
    if (currentUserHash) {
      loadConnectionRequests(currentUserHash);
    }
  };

  const currentRequests = activeTab === 'received' ? receivedRequests : sentRequests;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💌 Connection Requests</Text>
        
        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'received' && styles.activeTab]}
            onPress={() => setActiveTab('received')}
          >
            <Text style={[styles.tabText, activeTab === 'received' && styles.activeTabText]}>
              Received ({receivedRequests.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
            onPress={() => setActiveTab('sent')}
          >
            <Text style={[styles.tabText, activeTab === 'sent' && styles.activeTabText]}>
              Sent ({sentRequests.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {currentRequests.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>💫</Text>
          <Text style={styles.emptyTitle}>
            {activeTab === 'received' ? 'No Connection Requests' : 'No Sent Requests'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'received' 
              ? 'When someone swipes right on you, their connection request will appear here.'
              : 'Connection requests you send will appear here with their status.'
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={currentRequests}
          renderItem={activeTab === 'received' ? renderRequest : renderSentRequest}
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
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#FF1493',
  },
  tabText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  activeTabText: {
    color: '#FFFFFF',
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
  requestCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 20, 147, 0.1)',
  },
  requestContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 16,
  },
  requestInfo: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  requestName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  requestAge: {
    fontSize: 14,
    color: '#B0B0B0',
    marginBottom: 2,
  },
  requestMessage: {
    fontSize: 14,
    color: '#FFFFFF',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
  },
  bio: {
    fontSize: 14,
    color: '#B0B0B0',
    marginBottom: 12,
    lineHeight: 20,
  },
  messageContainer: {
    backgroundColor: 'rgba(255, 20, 147, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  messageLabel: {
    fontSize: 12,
    color: '#FF69B4',
    fontWeight: '600',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontStyle: 'italic',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  responseButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#FF1493',
  },
  declineButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  declineButtonText: {
    color: '#B0B0B0',
    fontSize: 16,
    fontWeight: '600',
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
  requestTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  pendingStatus: {
    color: '#FFD700', // gold/yellow for pending
  },
  acceptedStatus: {
    color: '#32CD32', // green for accepted
  },
  declinedStatus: {
    color: '#FF6347', // red for declined
  },
});
