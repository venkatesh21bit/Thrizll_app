import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { TelemetrySDK } from '../services/TelemetrySDK';
import { SessionManager } from '../services/SessionManager';

export interface TelemetryOptions {
  pauseThresholdMs?: number;
  enableScrollTracking?: boolean;
  enableTapTracking?: boolean;
  enableTypeTracking?: boolean;
}

export function useInteractionTelemetry(options: TelemetryOptions = {}) {
  const route = useRoute();
  const telemetrySDK = useRef(TelemetrySDK.getInstance());
  const sessionManager = useRef(SessionManager.getInstance());
  const currentSessionId = useRef<string | null>(null);
  const screenName = route.name;

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        await telemetrySDK.current.endSession();
        currentSessionId.current = null;
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // Handle screen focus/blur
  useFocusEffect(
    useCallback(() => {
      const startSession = async () => {
        try {
          const sessionId = await telemetrySDK.current.startSession(screenName);
          currentSessionId.current = sessionId;
          
          await telemetrySDK.current.logFocusChange({
            sessionId,
            screen: screenName,
            state: 'focus'
          });
        } catch (error) {
          console.warn('Failed to start telemetry session:', error);
        }
      };

      startSession();

      return () => {
        const endSession = async () => {
          if (currentSessionId.current) {
            try {
              await telemetrySDK.current.logFocusChange({
                sessionId: currentSessionId.current,
                screen: screenName,
                state: 'blur'
              });
              await telemetrySDK.current.endSession();
            } catch (error) {
              console.warn('Failed to end telemetry session:', error);
            }
          }
        };
        endSession();
      };
    }, [screenName])
  );

  // Return session info and logging functions
  return {
    sessionId: currentSessionId.current,
    screenName,
    logScroll: useCallback(async (delta: number, velocity: number, accel?: number, componentId?: string) => {
      if (currentSessionId.current && options.enableScrollTracking !== false) {
        await telemetrySDK.current.logScroll({
          sessionId: currentSessionId.current,
          screen: screenName,
          delta,
          velocity,
          accel,
          component_id: componentId
        });
      }
    }, [screenName, options.enableScrollTracking]),

    logTap: useCallback(async (componentId?: string) => {
      if (currentSessionId.current && options.enableTapTracking !== false) {
        await telemetrySDK.current.logTap({
          sessionId: currentSessionId.current,
          screen: screenName,
          component_id: componentId
        });
      }
    }, [screenName, options.enableTapTracking]),

    logLongPress: useCallback(async (duration: number, componentId?: string) => {
      if (currentSessionId.current) {
        await telemetrySDK.current.logLongPress({
          sessionId: currentSessionId.current,
          screen: screenName,
          duration_ms: duration,
          component_id: componentId
        });
      }
    }, [screenName]),

    logType: useCallback(async (inputLength: number, isBackspace?: boolean, keyCode?: string, componentId?: string) => {
      if (currentSessionId.current && options.enableTypeTracking !== false) {
        await telemetrySDK.current.logType({
          sessionId: currentSessionId.current,
          screen: screenName,
          input_len: inputLength,
          backspace: isBackspace,
          key_code: keyCode,
          component_id: componentId
        });
      }
    }, [screenName, options.enableTypeTracking])
  };
}
