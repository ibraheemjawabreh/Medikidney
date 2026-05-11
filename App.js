import React from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import AppNavigator from './AppNavigation/AppNavigation';
import { useNotifications } from './hooks/useNotifications';
import { LanguageProvider } from './context/LanguageContext';
import { NotificationProvider } from './context/NotificationContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AnimatedSplashScreen from './components/AnimatedSplashScreen';

export const navigationRef = createNavigationContainerRef();

function AppContent() {
  useNotifications(navigationRef);

  return (
    <AnimatedSplashScreen>
      <NavigationContainer ref={navigationRef}>
        <AppNavigator />
      </NavigationContainer>
    </AnimatedSplashScreen>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
