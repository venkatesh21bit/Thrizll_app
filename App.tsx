import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { ConsentScreen } from './src/screens/ConsentScreen';
import { DemoScreen } from './src/screens/DemoScreen';
import { DiscoverScreen } from './src/screens/discoverscreen';
import { MatchesScreen } from './src/screens/matchescreen';
import { ChatScreen } from './src/screens/chatscreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import { AuthScreen } from './src/screens/AuthScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

import { Text } from 'react-native';

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopColor: 'rgba(255, 20, 147, 0.2)',
          borderTopWidth: 1,
          height: 80, // Increased height
          paddingBottom: 18, // More padding for bigger touch area
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#FF1493',
        tabBarInactiveTintColor: '#666',
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: 16, // Larger label
          marginBottom: 4,
        },
      }}
    >
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{
          tabBarLabel: 'Discover',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 34, color }}>{'💖'}</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarLabel: 'Notifications',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 34, color }}>{'🔔'}</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Matches"
        component={MatchesScreen}
        options={{
          tabBarLabel: 'Matches',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 34, color }}>{'✨'}</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Demo"
        component={DemoScreen}
        options={{
          tabBarLabel: 'Demo',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 34, color }}>{'🔬'}</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor="#000" />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#000' },
        }}
      >
        <Stack.Screen
          name="Consent"
          children={({ navigation }) => (
            <ConsentScreen
              onConsentGiven={() => navigation.replace('Auth')}
              onConsentDeclined={() => {
                // Handle declined consent, e.g., exit app or show message
              }}
            />
          )}
        />
        <Stack.Screen 
          name="Auth" 
          component={AuthScreen}
        />
        <Stack.Screen 
          name="ProfileSetup" 
          component={ProfileSetupScreen}
        />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen 
          name="Chat" 
          component={ChatScreen}
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: '#000' },
            headerTintColor: '#FF1493',
            headerTitle: '',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}