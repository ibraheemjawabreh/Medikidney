import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './AppNavigation/AppNavigation';
import { useNotifications } from './hooks/useNotifications';
import { LanguageProvider } from './context/LanguageContext';

export default function App() {
  const { registerForPushNotifications } = useNotifications();

  useEffect(() => {
    registerForPushNotifications();
  }, []);

  return (
    <LanguageProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </LanguageProvider>
  );
}