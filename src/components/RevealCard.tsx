import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { UserProfile } from '../types/user';
import { TelemetryTextInput } from './TelemetryTextInput';
import { TelemetryTouchableOpacity } from './TelemetryTouchableOpacity';
import { TelemetrySDK } from '../services/TelemetrySDK';

type Section = {
  key: string;
  title: string;
  content: string | undefined;
  prompt?: string;
  lockedUntil?: number; // epoch ms
};

export const RevealCard: React.FC<{
  user: UserProfile;
  sessionId: string;
  onComplete?: () => void;
  answers?: Record<string, string>;
  onAnswerChange?: (sectionKey: string, text: string) => void;
}> = ({ user, onComplete, sessionId, answers = {}, onAnswerChange }) => {
  const [now, setNow] = useState(Date.now());
  const [fade] = useState(new Animated.Value(0));

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    return () => clearInterval(t);
  }, [fade]);

  const sections: Section[] = useMemo(() => {
    // Define 3 phased reveals: basics -> vibe -> deeper
    const base = Date.now();
  return [
      {
        key: 'basics',
        title: 'Basics',
    content: `${user.name} • ${user.age ?? ''} • ${user.location ?? ''}`.trim(),
        prompt: 'What caught your eye here?',
        lockedUntil: base + 1_000,
      },
      {
        key: 'vibe',
        title: 'Vibe',
    content: user.bio,
        prompt: 'Describe your ideal weekend in one line',
        lockedUntil: base + 5_000, // unlock after 5s
      },
      {
        key: 'deeper',
        title: 'Deeper',
        content: user.interests?.slice(0, 5)?.join(' • ') || 'Interests hidden',
        prompt: 'Pick one shared interest and say why',
        lockedUntil: base + 10_000, // unlock after 10s
      },
    ];
  }, [user]);

  const isUnlocked = (s: Section) => (s.lockedUntil ?? 0) <= now;
  const allDone = sections.every(s => isUnlocked(s) && (s.prompt ? ((answers[s.key] || '').trim().length > 0) : true));

  // No auto-advance; user must tap Continue.

  return (
    <Animated.View style={[styles.card, { opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0,1], outputRange: [12,0] }) }] }]}> 
      <Text style={styles.header}>Get to know {user.name}</Text>
      {sections.map((s) => {
        const unlocked = isUnlocked(s);
        const remaining = Math.max(0, Math.ceil(((s.lockedUntil ?? 0) - now) / 1000));
        return (
          <View key={s.key} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            {!unlocked ? (
              <Text style={styles.lockText}>Unlocks in {remaining}s</Text>
            ) : (
              <>
                <Text style={styles.contentText}>{s.content || '—'}</Text>
                {s.prompt && (
                  <View style={styles.promptBox}>
                    <Text style={styles.prompt}>{s.prompt}</Text>
                    <TelemetryTextInput
                      componentId={`reveal-${s.key}-input`}
                      style={styles.input}
                      value={answers[s.key] || ''}
                      placeholder="Type your answer..."
                      placeholderTextColor="#888"
                      onChangeText={(t) => {
                        onAnswerChange && onAnswerChange(s.key, t);
                        TelemetrySDK.getInstance().trackCustomEvent({
                          session_id: sessionId,
                          screen: 'discover',
                          etype: 'TYPE',
                          input_len: t.length,
                          meta: { section: s.key },
                        });
                      }}
                      multiline
                    />
                  </View>
                )}
              </>
            )}
          </View>
        );
      })}
      <TelemetryTouchableOpacity
        componentId="reveal-complete"
        style={[styles.cta, { opacity: allDone ? 1 : 0.5 }]}
        disabled={!allDone}
        onPress={() => {
          TelemetrySDK.getInstance().trackCustomEvent({
            session_id: sessionId,
            screen: 'discover',
            etype: 'TAP',
            meta: { action: 'complete_reveal' },
          });
          if (allDone) onComplete && onComplete();
        }}
      >
        <Text style={styles.ctaText}>Continue</Text>
      </TelemetryTouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '90%',
    backgroundColor: '#0B0B0B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 20, 147, 0.2)',
  },
  header: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  section: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectionTitle: {
    color: '#FF69B4',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  lockText: {
    color: '#888',
    fontSize: 12,
    fontStyle: 'italic',
  },
  contentText: {
    color: '#FFF',
    fontSize: 14,
    marginBottom: 8,
  },
  promptBox: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 10,
  },
  prompt: {
    color: '#B0B0B0',
    fontSize: 12,
    marginBottom: 8,
  },
  input: {
    color: '#FFF',
    minHeight: 40,
  },
  cta: {
    marginTop: 16,
    backgroundColor: '#FF1493',
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ctaText: {
    color: '#FFF',
    fontWeight: '700',
  },
});

export default RevealCard;
