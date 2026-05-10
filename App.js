import React, { useEffect } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import AppNavigator from './AppNavigation/AppNavigation';
import { useNotifications } from './hooks/useNotifications';
import { LanguageProvider } from './context/LanguageContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AnimatedSplashScreen from './components/AnimatedSplashScreen';

export const navigationRef = createNavigationContainerRef();

export default function App() {
  const { requestAndStoreDeviceToken } = useNotifications(navigationRef);

  useEffect(() => {
    // فقط احفظ token محلياً - لا تحاول الإرسال (سيتم الإرسال بعد تسجيل الدخول)
    requestAndStoreDeviceToken();
  }, []);

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AnimatedSplashScreen>
          <NavigationContainer ref={navigationRef}>
            <AppNavigator />
          </NavigationContainer>
        </AnimatedSplashScreen>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
