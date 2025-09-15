import React, { useRef, useCallback, useState } from 'react';
import { 
  TextInput as RNTextInput, 
  TextInputProps, 
  NativeSyntheticEvent, 
  TextInputChangeEventData 
} from 'react-native';
import { useInteractionTelemetry } from '../hooks/useTelemetry';

interface TelemetryTextInputProps extends TextInputProps {
  componentId?: string;
  sessionIdOverride?: string;
}

export const TelemetryTextInput: React.FC<TelemetryTextInputProps> = ({ 
  componentId, 
  sessionIdOverride,
  onChangeText, 
  onChange,
  ...props 
}) => {
  const { logType } = useInteractionTelemetry({ sessionIdOverride });
  const lastChangeTime = useRef(0);
  const lastTextLength = useRef(0);
  const keyIntervals = useRef<number[]>([]);

  const handleChangeText = useCallback((text: string) => {
    const currentTime = Date.now();
    const currentLength = text.length;
    const isBackspace = currentLength < lastTextLength.current;

    // Calculate inter-key interval
    if (lastChangeTime.current > 0) {
      const interval = currentTime - lastChangeTime.current;
      keyIntervals.current.push(interval);
      
      // Keep only last 10 intervals for burst detection
      if (keyIntervals.current.length > 10) {
        keyIntervals.current.shift();
      }
    }

    // Log typing event
    logType(currentLength, isBackspace, undefined, componentId);

    lastChangeTime.current = currentTime;
    lastTextLength.current = currentLength;

    // Call original onChangeText if provided
    onChangeText?.(text);
  }, [logType, componentId, onChangeText]);

  const handleChange = useCallback((event: NativeSyntheticEvent<TextInputChangeEventData>) => {
    handleChangeText(event.nativeEvent.text);
    onChange?.(event);
  }, [handleChangeText, onChange]);

  return (
    <RNTextInput
      {...props}
      onChangeText={handleChangeText}
      onChange={handleChange}
    />
  );
};
