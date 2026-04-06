import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen   from './src/screens/LoginScreen';
import HomeScreen    from './src/screens/HomeScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AlertsScreen  from './src/screens/AlertsScreen';
import CameraScreen  from './src/screens/CameraScreen';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2E7D8C" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={user ? 'Home' : 'Login'}
    >
      <Stack.Screen name="Login"   component={LoginScreen}   />
      <Stack.Screen name="Home"    component={HomeScreen}    />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Alerts"  component={AlertsScreen}  />
      <Stack.Screen name="Camera"  component={CameraScreen}  />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}