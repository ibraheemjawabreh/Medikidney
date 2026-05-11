import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Card } from '@rneui/themed';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { useNotificationContext } from '../../context/NotificationContext';
import { markNotificationsSeen } from '../../utils/notificationBadge';

const NotificationsScreen = () => {
  const { t } = useLanguage();
  const { resetUnreadCount } = useNotificationContext();
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const initPage = async () => {
      await fetchNotifications();
      await fetchUnreadCount();
      try {
        await markNotificationsSeen();
        setUnreadCount(0);
        resetUnreadCount();
      } catch (error) {
        console.error('Error clearing badge on entry:', error);
      }
    };
    
    initPage();
  }, []);



  const fetchUnreadCount = async () => {
    try {
      const { getVisibleUnreadCount } = require('../../utils/notificationBadge');
      const count = await getVisibleUnreadCount(api);
      setUnreadCount(count);
    } catch (error) {
      setUnreadCount(0);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      // Fetch all notifications (or fallback to unread if /notifications is not supported)
      let response;
      try {
        response = await api.get('/notifications');
      } catch (err) {
        response = await api.get('/notifications/unread');
      }
      setNotifications(response.data || []);
    } catch (error) {
      console.error('Fetch notifications error:', error);
      Alert.alert(t.error, t.notifications.fetchError);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    await markNotificationsSeen();
    setUnreadCount(0);
    resetUnreadCount();
    setRefreshing(false);
  }, []);

  const handleNotificationTap = async (notification) => {
    const notificationType = notification.notification_type;
    const relatedId = notification.related_id;

    console.log('🔔 معالجة الإشعار:', { notificationType, relatedId });

    // تشغيل haptic feedback
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) {
      // لا نوقف العملية إذا فشل Haptics
    }

    // Remove only the notification the patient opened.
    try {
      await api.patch(`/notifications/${notification.notification_id}/delete`);
      setNotifications((prev) =>
        prev.filter((n) => n.notification_id !== notification.notification_id)
      );
    } catch (err) {
      console.error('Error deleting opened notification:', err);
      Alert.alert(t.error, t.notifications.deleteError);
      return;
    }

    // ثم انتقل للمكان المناسب
    switch (notificationType) {
      case 'TEST_RESULT':
      case 'LAB_TEST':
      case 'TEST':
        console.log('➡️ الانتقال لنتائج الفحوصات - Test ID:', relatedId);
        navigation.navigate('PatientProfile', {
          initialTab: 2,  // Tests tab
          initialSubTab: 1,  // Lab Tests subtab
          testId: relatedId
        });
        break;

      case 'RADIOLOGY':
      case 'IMAGING':
        console.log('➡️ الانتقال للأشعات - Image ID:', relatedId);
        navigation.navigate('PatientProfile', {
          initialTab: 2,  // Tests tab
          initialSubTab: 2,  // Radiology subtab
          radiologyId: relatedId
        });
        break;

      case 'PRESCRIPTION':
      case 'MEDICATION':
        console.log('➡️ الانتقال للأدوية - Prescription ID:', relatedId);
        navigation.navigate('PatientProfile', {
          initialTab: 2,  // Tests tab
          initialSubTab: 0,  // Prescriptions subtab
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
          initialTab: 3,  // Appointments tab
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
          initialTab: 1,  // Sessions tab
          sessionId: relatedId
        });
        break;

      default:
        console.log('📣 إشعار عام:', notificationType);
        // تم بالفعل وضع علامة "تمت قراءته"
        break;
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'TEST_RESULT':
        return '📋';
      case 'RADIOLOGY':
        return '🖼️';
      case 'PRESCRIPTION':
        return '💊';
      case 'SESSION_NO_WEIGHT':
        return '⚠️';
      default:
        return '📢';
    }
  };

  const renderNotification = ({ item }) => (
    <TouchableOpacity 
      activeOpacity={0.85}
      onPress={() => handleNotificationTap(item)}
    >
      <Card containerStyle={styles.card}>
        <View style={styles.notificationContent}>
          <View style={styles.headerRow}>
            <Text style={styles.icon}>{getNotificationIcon(item.notification_type)}</Text>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.date}>
                {new Date(item.created_at).toLocaleDateString(t.vitalSigns.now === 'الآن' ? 'ar-SA' : 'en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>

          <Text style={styles.message}>{item.message}</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#193B6B" />
        <Text style={styles.loadingText}>{t.loading}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialIcons name={t.vitalSigns.now === 'الآن' ? "chevron-right" : "chevron-left"} size={28} color="#193B6B" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>{t.notifications.title}</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadText}>
              {unreadCount} {unreadCount === 1 ? t.notifications.newSingular : t.notifications.newPlural}
            </Text>
          )}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="notifications-none" size={60} color="#ccc" />
          <Text style={styles.emptyText}>{t.notifications.empty}</Text>
          <Text style={styles.emptySubText}>
            {t.notifications.emptySub}
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.notification_id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

export default NotificationsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#193B6B',
    marginBottom: 4,
  },
  unreadText: {
    fontSize: 12,
    color: '#DE1A1C',
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  listContainer: {
    padding: 12,
  },
  card: {
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  notificationContent: {
    padding: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  icon: {
    fontSize: 28,
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#193B6B',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: '#8296B1',
  },
  message: {
    fontSize: 14,
    color: '#8296B1',
    lineHeight: 20,
    marginBottom: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8296B1',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8296B1',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#8296B1',
    marginTop: 8,
    textAlign: 'center',
  },
});
