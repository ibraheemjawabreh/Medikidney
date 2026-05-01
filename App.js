import React, { useEffect } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import AppNavigator from './AppNavigation/AppNavigation';
import { useNotifications } from './hooks/useNotifications';
import { LanguageProvider } from './context/LanguageContext';

export const navigationRef = createNavigationContainerRef();

export default function App() {
  const { registerForPushNotifications } = useNotifications(navigationRef);

  useEffect(() => {
    registerForPushNotifications();
  }, []);

  return (
    <LanguageProvider>
      <NavigationContainer ref={navigationRef}>
        <AppNavigator />
      </NavigationContainer>
    </LanguageProvider>
  );
}