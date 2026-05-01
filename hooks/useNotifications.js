import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// اضبط سلوك الإشعار
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const useNotifications = (navigation) => {
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // سجل device token عند الفتح
    registerForPushNotifications();

    // استمع للإشعارات الواردة
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log('📲 إشعار وارد:', notification);
      });

    // استمع لنقر المستخدم على الإشعار
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const { notificationType, relatedId } = response.notification.request.content.data;
        handleNotificationPress(notificationType, relatedId, navigation);
      });

    return () => {
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
    };
  }, [navigation]);

  const registerForPushNotifications = async () => {
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

      // احصل على الـ device token
      const deviceToken = await Notifications.getDevicePushTokenAsync();
      console.log('✅ Device Token:', deviceToken.data);

      // أرسله للـ backend
      try {
        await api.post('/notifications/register-device', {
          deviceToken: deviceToken.data,
          deviceName: 'medikidney-mobile',
        });
        console.log('✅ تم تسجيل device token بنجاح');
      } catch (error) {
        console.error('⚠️ خطأ في تسجيل device token:', error);
      }

      // احفظه محلياً
      await AsyncStorage.setItem('deviceToken', deviceToken.data);
    } catch (error) {
      if (error.message.includes('FirebaseApp is not initialized')) {
        console.warn('⚠️ تنبيه: لم يتم تهيئة Firebase بعد. الإشعارات لن تعمل على أندرويد حتى تضيف ملف google-services.json.');
      } else {
        console.error('❌ خطأ في تسجيل الإشعارات:', error);
      }
    }
  };

  const handleNotificationPress = (notificationType, relatedId, navigation) => {
    // انقل المستخدم للصفحة المناسبة حسب نوع الإشعار
    if (!navigation) return;

    switch (notificationType) {
      case 'TEST_RESULT':
        console.log('➡️ الانتقال لنتائج الفحوصات - Test ID:', relatedId);
        // يمكنك إضافة navigation logic هنا
        break;
      case 'RADIOLOGY':
        console.log('➡️ الانتقال للأشعات - Image ID:', relatedId);
        // يمكنك إضافة navigation logic هنا
        break;
      case 'PRESCRIPTION':
        console.log('➡️ الانتقال للأدوية - Prescription ID:', relatedId);
        // يمكنك إضافة navigation logic هنا
        break;
      case 'SESSION_NO_WEIGHT':
        console.log('➡️ الانتقال لإدخال الوزن - Session ID:', relatedId);
        navigation.navigate('WeightInput');
        break;
      default:
        console.log('📣 إشعار عام:', notificationType);
    }
  };

  return { registerForPushNotifications };
};
