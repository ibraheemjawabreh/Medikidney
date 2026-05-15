import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useNotificationContext } from '../context/NotificationContext';
import { getVisibleUnreadCount } from '../utils/notificationBadge';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,      
    shouldPlaySound: true,       
    shouldSetBadge: true,        
  }),
});

export const useNotifications = (navigation) => {
  const { updateUnreadCount } = useNotificationContext();
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    
    requestAndStoreDeviceToken();

    const checkInitialNotification = async () => {
      const notification = await Notifications.getLastNotificationResponseAsync();
      if (notification) {
        console.log('🔔 تم فتح التطبيق من إشعار:', notification);
        const data = notification.notification.request.content.data;
        const notificationType = data?.notificationType || data?.type;
        const relatedId = data?.relatedId || data?.id;
        handleNotificationPress(notificationType, relatedId, navigation);
      }
    };
    
    checkInitialNotification();

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log('📲 إشعار وارد:', {
          title: notification.request.content.title,
          body: notification.request.content.body,
          data: notification.request.content.data,
        });
        syncUnreadCount();
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        console.log('✅ تم النقر على الإشعار:', data);
        
        const notificationType = data?.notificationType || data?.type;
        const relatedId = data?.relatedId || data?.id;
        
        handleNotificationPress(notificationType, relatedId, navigation);
      });

    return () => {
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
    };
  }, [navigation, updateUnreadCount]);

  const syncUnreadCount = async () => {
    try {
      const count = await getVisibleUnreadCount(api);
      updateUnreadCount(count);
    } catch (error) {
      console.warn('Unable to sync unread notification count:', error?.message);
    }
  };

  const requestAndStoreDeviceToken = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ تم رفض إذن الإشعارات');
        return;
      }

      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      const deviceToken = await Notifications.getExpoPushTokenAsync({
        projectId: projectId || 'db1d55b0-3193-4b75-b568-cc57c3faea0c'
      });
      console.log('✅ Expo Push Token:', deviceToken.data);

      await AsyncStorage.setItem('deviceToken', deviceToken.data);
    } catch (error) {
      if (error.message.includes('FirebaseApp is not initialized')) {
        console.warn('⚠️ تنبيه: لم يتم تهيئة Firebase بعد.');
      } else {
        console.error('❌ خطأ في تسجيل الإشعارات:', error);
      }
    }
  };

  const registerDeviceTokenAfterLogin = async () => {
    try {
      const deviceToken = await AsyncStorage.getItem('deviceToken');
      if (!deviceToken) {
        console.log('⚠️ لا يوجد device token محفوظ');
        return;
      }

      await api.post('/notifications/register-device', {
        deviceToken: deviceToken,
        deviceName: 'medikidney-mobile',
      });
      console.log('✅ Device token registered after login');
    } catch (error) {
      console.error('⚠️ خطأ في تسجيل device token:', error);
    }
  };

  const registerForPushNotifications = registerDeviceTokenAfterLogin;

  const handleNotificationPress = (notificationType, relatedId, navigation) => {
    
    if (!navigation || !navigation.isReady()) {
      console.warn('⚠️ Navigation ليس جاهزاً');
      return;
    }

    console.log('🔔 معالجة الإشعار:', { notificationType, relatedId });

    switch (notificationType) {
      case 'TEST_RESULT':
      case 'LAB_TEST':
      case 'TEST':
        console.log('➡️ الانتقال لنتائج الفحوصات - Test ID:', relatedId);
        
        navigation.navigate('PatientProfile', { 
          initialTab: 2,  
          initialSubTab: 1,  
          testId: relatedId 
        });
        break;

      case 'RADIOLOGY':
      case 'IMAGING':
        console.log('➡️ الانتقال للأشعات - Image ID:', relatedId);
        
        navigation.navigate('PatientProfile', { 
          initialTab: 2,  
          initialSubTab: 2,  
          radiologyId: relatedId 
        });
        break;

      case 'PRESCRIPTION':
      case 'MEDICATION':
        console.log('➡️ الانتقال للأدوية - Prescription ID:', relatedId);
        
        navigation.navigate('PatientProfile', { 
          initialTab: 2,  
          initialSubTab: 0,  
          prescriptionId: relatedId 
        });
        break;

      case 'SESSION_NO_WEIGHT':
        console.log('➡️ الانتقال لإدخال الوزن - Session ID:', relatedId);
        navigation.navigate('WeightInput', { sessionId: relatedId });
        break;

      case 'APPOINTMENT':
      case 'SCHEDULE':
        console.log('➡️ الانتقال للمواعيد - Appointment ID:', relatedId);
        
        navigation.navigate('PatientProfile', { 
          initialTab: 3,  
          appointmentId: relatedId 
        });
        break;

      case 'MESSAGE':
      case 'CONSULTATION':
        console.log('➡️ الانتقال للاستشارات - Consultation ID:', relatedId);
        navigation.navigate('ConsultationDetails', { consultationId: relatedId });
        break;

      case 'SESSION':
      case 'DIALYSIS_SESSION':
        console.log('➡️ الانتقال لتفاصيل الجلسة - Session ID:', relatedId);
        
        navigation.navigate('PatientProfile', { 
          initialTab: 1,  
          sessionId: relatedId 
        });
        break;

      default:
        console.log('📣 إشعار عام:', notificationType);
        
        navigation.navigate('Notifications');
    }
  };

  return { requestAndStoreDeviceToken, registerForPushNotifications, registerDeviceTokenAfterLogin };
};
