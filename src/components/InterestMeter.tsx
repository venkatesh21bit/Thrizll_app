import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { InterestScore } from '../types/telemetry';

interface InterestMeterProps {
  score?: InterestScore;
  style?: any;
}

export const InterestMeter: React.FC<InterestMeterProps> = ({ score, style }) => {
  const [animatedValue] = useState(new Animated.Value(0));
  const [displayScore, setDisplayScore] = useState(0);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (score) {
      const targetScore = Math.round(score.score);
      
      Animated.timing(animatedValue, {
        toValue: targetScore,
        duration: 1200,
        useNativeDriver: false,
      }).start();

      // Animate the display score
      const startScore = displayScore;
      const scoreRange = targetScore - startScore;
      const steps = 40;
      let currentStep = 0;

      const timer = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        const currentScore = Math.round(startScore + (scoreRange * progress));
        
        setDisplayScore(currentScore);
        
        if (currentStep >= steps) {
          clearInterval(timer);
          setDisplayScore(targetScore);
        }
      }, 30);

      return () => clearInterval(timer);
    }
  }, [score, animatedValue, displayScore]);

  // Pulse animation for high scores
  useEffect(() => {
    if (displayScore > 75) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [displayScore, pulseAnim]);

  const getScoreColor = (scoreValue: number): string => {
    if (scoreValue < 25) return '#8E8E93'; // Gray - No connection
    if (scoreValue < 50) return '#FF9500'; // Orange - Warming up
    if (scoreValue < 75) return '#FF6B9D'; // Pink - Interest growing
    return '#FF1493'; // Deep pink - Strong connection
  };

  const getScoreEmoji = (scoreValue: number): string => {
    if (scoreValue < 25) return '💤'; // Sleeping
    if (scoreValue < 50) return '😊'; // Slight smile
    if (scoreValue < 75) return '😍'; // Heart eyes
    return '🔥'; // Fire
  };

  const getScoreLabel = (scoreValue: number): string => {
    if (scoreValue < 25) return 'Just Friends';
    if (scoreValue < 50) return 'Getting Warmer';
    if (scoreValue < 75) return 'Sparks Flying';
    return 'Chemistry Alert!';
  };

  const getConfidenceIndicator = (confidence?: number): string => {
    if (!confidence) return '';
    if (confidence > 0.8) return '💎💎💎';
    if (confidence > 0.6) return '💎💎✨';
    if (confidence > 0.4) return '💎✨✨';
    return '✨✨✨';
  };

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={[styles.meterContainer, { transform: [{ scale: pulseAnim }] }]}>
        <View style={styles.titleContainer}>
          <Text style={styles.emoji}>{getScoreEmoji(displayScore)}</Text>
          <Text style={styles.title}>Connection Level</Text>
        </View>
        
        <View style={styles.scoreContainer}>
          <View style={styles.scoreTrack}>
            <Animated.View 
              style={[
                styles.scoreFill,
                {
                  width: animatedValue.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                    extrapolate: 'clamp',
                  }),
                  backgroundColor: getScoreColor(displayScore),
                }
              ]}
            />
            
            {/* Gradient overlay for depth */}
            <Animated.View 
              style={[
                styles.scoreGradient,
                {
                  width: animatedValue.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                    extrapolate: 'clamp',
                  }),
                }
              ]}
            />
          </View>
          
          <Text style={styles.scoreText}>{displayScore}</Text>
        </View>

        <Text style={[styles.scoreLabel, { color: getScoreColor(displayScore) }]}>
          {getScoreLabel(displayScore)}
        </Text>

        {score && (
          <View style={styles.metaContainer}>
            <Text style={styles.confidence}>
              Accuracy: {getConfidenceIndicator(score.confidence)}
            </Text>
            <Text style={styles.timestamp}>
              💕 Updated: {new Date(score.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderRadius: 20,
    padding: 24,
    margin: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 20, 147, 0.2)',
    shadowColor: '#FF1493',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  meterContainer: {
    alignItems: 'center',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  emoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  scoreContainer: {
    width: 240,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  scoreTrack: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2A2A2A',
    borderRadius: 25,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  scoreFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    borderRadius: 25,
  },
  scoreGradient: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  scoreText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    zIndex: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  scoreLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  metaContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 20, 147, 0.05)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 20, 147, 0.1)',
    minWidth: 200,
  },
  confidence: {
    fontSize: 14,
    color: '#FF6B9D',
    marginBottom: 6,
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 12,
    color: '#AAAAAA',
    fontWeight: '400',
  },
});
