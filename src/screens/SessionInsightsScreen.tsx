import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { SessionInsightsService, SessionSample } from '../services/SessionInsightsService';

const { width } = Dimensions.get('window');

export const SessionInsightsScreen: React.FC<{ sessionId: string }> = ({ sessionId }) => {
  const [samples, setSamples] = useState<SessionSample[]>([]);

  useEffect(() => {
    const t = setInterval(() => {
      setSamples([...SessionInsightsService.get(sessionId)]);
    }, 1000);
    return () => clearInterval(t);
  }, [sessionId]);

  const now = Date.now();
  const windowMs = 5 * 60 * 1000;
  const recent = useMemo(() => samples.filter(s => now - s.t <= windowMs), [samples, now]);

  // Derive metrics
  const pauses = recent.filter(s => s.type === 'pause');
  const corrections = recent.filter(s => s.type === 'backspace').length;
  const keystrokes = recent.filter(s => s.type === 'keystroke');
  const scrolls = recent.filter(s => s.type === 'scroll');

  // Simple heatmap bins (60 bins over last 5 min)
  const bins = 60;
  const binMs = windowMs / bins;
  const heat = new Array(bins).fill(0);
  pauses.forEach(p => {
    const idx = Math.max(0, Math.min(bins - 1, Math.floor((now - p.t) / binMs)));
    heat[idx] += 1;
  });

  const avgInterval = keystrokes.length ? (keystrokes.reduce((s, k) => s + (k.value || 0), 0) / keystrokes.length) : 0;
  const avgScroll = scrolls.length ? (scrolls.reduce((s, r) => s + (r.value || 0), 0) / scrolls.length) : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Session Insights</Text>
      <Text style={styles.sub}>Session: {sessionId}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Pauses Heatmap (last 5 min)</Text>
        <View style={styles.heatRow}>
          {heat.map((v, i) => (
            <View key={i} style={[styles.heatCell, { opacity: Math.min(1, v / 3) }]} />
          ))}
        </View>
        <Text style={styles.meta}>Total pauses: {pauses.length}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Typing Bursts & Corrections</Text>
        <Text style={styles.meta}>Avg inter-keystroke interval: {avgInterval.toFixed(0)} ms</Text>
        <Text style={styles.meta}>Corrections (backspaces): {corrections}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Scroll Rhythm</Text>
        <Text style={styles.meta}>Avg scroll velocity: {avgScroll.toFixed(2)}</Text>
        <View style={styles.sparkline}>
          {scrolls.slice(-50).map((s, i) => (
            <View key={i} style={{ width: 3, marginRight: 1, height: Math.min(60, (s.value || 0) * 60), backgroundColor: '#FF69B4' }} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  title: { color: '#FFF', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  sub: { color: '#B0B0B0', marginBottom: 12 },
  card: { backgroundColor: '#0B0B0B', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255, 20, 147, 0.2)' },
  cardTitle: { color: '#FF69B4', fontWeight: '700', marginBottom: 8 },
  meta: { color: '#B0B0B0' },
  heatRow: { flexDirection: 'row', flexWrap: 'wrap' },
  heatCell: { width: (width - 60) / 30, height: 10, backgroundColor: '#FF1493', margin: 1, borderRadius: 2 },
  sparkline: { height: 60, flexDirection: 'row', alignItems: 'flex-end' },
});

export default SessionInsightsScreen;
