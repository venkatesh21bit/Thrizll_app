import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { ConsentManager, ConsentSettings } from '../services/ConsentManager';
import { getScrollableContentStyle } from '../styles/webStyles';

interface ConsentScreenProps {
  onConsentGiven: (settings: ConsentSettings) => void;
  onConsentDeclined: () => void;
}

export const ConsentScreen: React.FC<ConsentScreenProps> = ({
  onConsentGiven,
  onConsentDeclined,
}) => {
  const [settings, setSettings] = useState<Partial<ConsentSettings>>({
    telemetryEnabled: false,
    scrollTracking: true,
    tapTracking: true,
    typingTracking: true,
    dataSharing: false,
  });

  const consentManager = ConsentManager.getInstance();
  const { width } = Dimensions.get('window');

  const handleAccept = async () => {
    if (!settings.telemetryEnabled) {
      Alert.alert(
        '💕 Enable Love Analytics',
        'Please enable connection analytics to discover your romantic communication patterns.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    await consentManager.setConsentSettings(settings);
    onConsentGiven(settings as ConsentSettings);
  };

  const handleDecline = async () => {
    await consentManager.revokeConsent();
    onConsentDeclined();
  };

  const updateSetting = (key: keyof ConsentSettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={[styles.scrollContainer, Platform.OS === 'web' ? getScrollableContentStyle() as any : undefined]} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.emoji}>💕</Text>
            <Text style={styles.title}>LoveSync</Text>
            <Text style={styles.subtitle}>Discover Your Connection Patterns</Text>
          </View>

          <View style={styles.description}>
            <Text style={styles.descriptionText}>
              💝 LoveSync analyzes how you communicate to help you understand your 
              romantic connection patterns. We study your typing rhythm, touch patterns, 
              and scrolling behavior - never your actual messages.
            </Text>
          </View>

          <View style={styles.settingsContainer}>
            <Text style={styles.sectionTitle}>🔐 Privacy Controls</Text>

            <View style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Text style={styles.iconText}>💖</Text>
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Enable Love Analytics</Text>
                <Text style={styles.settingDescription}>
                  Discover your unique communication heartbeat
                </Text>
              </View>
              <Switch
                value={settings.telemetryEnabled}
                onValueChange={(value) => updateSetting('telemetryEnabled', value)}
                trackColor={{ false: '#3A3A3C', true: '#FF6B9D' }}
                thumbColor={settings.telemetryEnabled ? '#FF1493' : '#8E8E93'}
              />
            </View>

            {settings.telemetryEnabled && (
              <>
                <View style={styles.settingItem}>
                  <View style={styles.settingIcon}>
                    <Text style={styles.iconText}>📱</Text>
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingTitle}>Touch Patterns</Text>
                    <Text style={styles.settingDescription}>
                      How you scroll reveals your interest level
                    </Text>
                  </View>
                  <Switch
                    value={settings.scrollTracking}
                    onValueChange={(value) => updateSetting('scrollTracking', value)}
                    trackColor={{ false: '#3A3A3C', true: '#FF6B9D' }}
                    thumbColor={settings.scrollTracking ? '#FF1493' : '#8E8E93'}
                  />
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingIcon}>
                    <Text style={styles.iconText}>👆</Text>
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingTitle}>Tap Rhythm</Text>
                    <Text style={styles.settingDescription}>
                      Your tap patterns show excitement and anticipation
                    </Text>
                  </View>
                  <Switch
                    value={settings.tapTracking}
                    onValueChange={(value) => updateSetting('tapTracking', value)}
                    trackColor={{ false: '#3A3A3C', true: '#FF6B9D' }}
                    thumbColor={settings.tapTracking ? '#FF1493' : '#8E8E93'}
                  />
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingIcon}>
                    <Text style={styles.iconText}>⌨️</Text>
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingTitle}>Typing Heartbeat</Text>
                    <Text style={styles.settingDescription}>
                      Your typing rhythm reveals emotional intensity
                    </Text>
                  </View>
                  <Switch
                    value={settings.typingTracking}
                    onValueChange={(value) => updateSetting('typingTracking', value)}
                    trackColor={{ false: '#3A3A3C', true: '#FF6B9D' }}
                    thumbColor={settings.typingTracking ? '#FF1493' : '#8E8E93'}
                  />
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingIcon}>
                    <Text style={styles.iconText}>🤝</Text>
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingTitle}>Anonymous Sharing</Text>
                    <Text style={styles.settingDescription}>
                      Help improve love analytics for everyone
                    </Text>
                  </View>
                  <Switch
                    value={settings.dataSharing}
                    onValueChange={(value) => updateSetting('dataSharing', value)}
                    trackColor={{ false: '#3A3A3C', true: '#FF6B9D' }}
                    thumbColor={settings.dataSharing ? '#FF1493' : '#8E8E93'}
                  />
                </View>
              </>
            )}
          </View>

          <View style={styles.dataInfo}>
            <Text style={styles.dataInfoTitle}>💝 What We Analyze:</Text>
            <Text style={styles.dataInfoText}>
              • 💓 Typing rhythm and emotional intensity{'\n'}
              • 📱 Touch patterns and scrolling behavior{'\n'}
              • 💭 Pause patterns and thinking moments{'\n'}
              • 🎯 Response timing and engagement{'\n'}
              • 💕 Connection strength indicators
            </Text>
            
            <Text style={styles.dataInfoTitle}>🔒 What We Never See:</Text>
            <Text style={styles.dataInfoText}>
              • 💬 Your actual messages or conversations{'\n'}
              • 👤 Personal information or contacts{'\n'}
              • 📍 Your location or whereabouts{'\n'}
              • 📸 Photos, videos, or media{'\n'}
              • 🔑 Passwords or sensitive data
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.declineButton} onPress={handleDecline}>
              <Text style={styles.declineButtonText}>❌ Not Now</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.acceptButton, !settings.telemetryEnabled && styles.disabledButton]} 
              onPress={handleAccept}
              disabled={!settings.telemetryEnabled}
            >
              <Text style={styles.acceptButtonText}>💕 Start Discovering</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF1493',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 18,
    color: '#FF6B9D',
    textAlign: 'center',
    fontWeight: '300',
  },
  description: {
    backgroundColor: 'rgba(255, 20, 147, 0.1)',
    padding: 20,
    borderRadius: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 20, 147, 0.2)',
  },
  descriptionText: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
    textAlign: 'center',
  },
  settingsContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FF1493',
    marginBottom: 20,
    textAlign: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 20, 147, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconText: {
    fontSize: 20,
  },
  settingContent: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#AAAAAA',
    lineHeight: 20,
  },
  dataInfo: {
    backgroundColor: '#1A1A1A',
    padding: 20,
    borderRadius: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  dataInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B9D',
    marginBottom: 12,
    marginTop: 8,
  },
  dataInfoText: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 16,
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  declineButtonText: {
    color: '#AAAAAA',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#FF1493',
    padding: 18,
    borderRadius: 16,
    shadowColor: '#FF1493',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  disabledButton: {
    backgroundColor: '#3A3A3A',
    shadowOpacity: 0,
    elevation: 0,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
