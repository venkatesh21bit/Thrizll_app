import React, { useRef, useCallback } from 'react';
import { 
  TouchableOpacity as RNTouchableOpacity, 
  TouchableOpacityProps 
} from 'react-native';
import { useInteractionTelemetry } from '../hooks/useTelemetry';

interface TelemetryTouchableOpacityProps extends TouchableOpacityProps {
  componentId?: string;
}

export const TelemetryTouchableOpacity: React.FC<TelemetryTouchableOpacityProps> = ({ 
  componentId, 
  onPress,
  onLongPress,
  delayLongPress = 500,
  children,
  ...props 
}) => {
  const { logTap, logLongPress } = useInteractionTelemetry();
  const pressStartTime = useRef<number>(0);

  const handlePressIn = useCallback(() => {
    pressStartTime.current = Date.now();
  }, []);

  const handlePress = useCallback((event: any) => {
    // Log tap event
    logTap(componentId);
    
    // Call original onPress if provided
    onPress?.(event);
  }, [logTap, componentId, onPress]);

  const handleLongPress = useCallback((event: any) => {
    const duration = Date.now() - pressStartTime.current;
    
    // Log long press event
    logLongPress(duration, componentId);
    
    // Call original onLongPress if provided
    onLongPress?.(event);
  }, [logLongPress, componentId, onLongPress]);

  return (
    <RNTouchableOpacity
      {...props}
      onPressIn={handlePressIn}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={delayLongPress}
    >
      {children}
    </RNTouchableOpacity>
  );
};
