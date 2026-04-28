import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { I18nManager } from 'react-native';
import AppNavigator from './AppNavigation/AppNavigation';
import { useNotifications } from './hooks/useNotifications';

export default function App() {
  const { registerForPushNotifications } = useNotifications();

  useEffect(() => {
    // سجل للإشعارات عند فتح التطبيق
    registerForPushNotifications();
  }, []);

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}