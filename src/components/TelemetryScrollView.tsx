import React, { useRef, useState, useCallback } from 'react';
import { 
  ScrollView as RNScrollView, 
  ScrollViewProps, 
  NativeSyntheticEvent, 
  NativeScrollEvent 
} from 'react-native';
import { useInteractionTelemetry } from '../hooks/useTelemetry';

interface TelemetryScrollViewProps extends ScrollViewProps {
  componentId?: string;
  sessionIdOverride?: string;
}

export const TelemetryScrollView: React.FC<TelemetryScrollViewProps> = ({ 
  componentId, 
  sessionIdOverride,
  onScroll, 
  children, 
  ...props 
}) => {
  const { logScroll } = useInteractionTelemetry({ sessionIdOverride });
  const lastScrollTime = useRef(0);
  const lastScrollY = useRef(0);
  const velocityHistory = useRef<number[]>([]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentTime = Date.now();
    const currentY = event.nativeEvent.contentOffset.y;
    const deltaY = currentY - lastScrollY.current;
    const deltaTime = currentTime - lastScrollTime.current;

    if (deltaTime > 0) {
      const velocity = Math.abs(deltaY) / deltaTime * 1000; // px/s
      
      // Calculate acceleration
      velocityHistory.current.push(velocity);
      if (velocityHistory.current.length > 5) {
        velocityHistory.current.shift();
      }

      let acceleration = 0;
      if (velocityHistory.current.length >= 2) {
        const prevVelocity = velocityHistory.current[velocityHistory.current.length - 2];
        acceleration = (velocity - prevVelocity) / deltaTime * 1000; // px/s²
      }

      // Log scroll event
      logScroll(deltaY, velocity, acceleration, componentId);
    }

    lastScrollTime.current = currentTime;
    lastScrollY.current = currentY;

    // Call original onScroll if provided
    onScroll?.(event);
  }, [logScroll, componentId, onScroll]);

  return (
    <RNScrollView
      {...props}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      {children}
    </RNScrollView>
  );
};
