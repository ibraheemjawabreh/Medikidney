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
import { Card, Button, Divider } from '@rneui/themed';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

const NotificationsScreen = () => {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications/unread');
      setNotifications(response.data || []);
    } catch (error) {
      console.error('Fetch notifications error:', error);
      Alert.alert(t.error, t.notifications.fetchError);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      console.error('Fetch unread count error:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    await fetchUnreadCount();
    setRefreshing(false);
  }, []);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      setNotifications((prev) =>
        prev.filter((n) => n.notification_id !== notificationId)
      );
      await fetchUnreadCount();
    } catch (error) {
      console.error('Update notification error:', error);
      Alert.alert(t.error, t.notifications.updateError);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/notifications/mark-all-read');
      setNotifications([]);
      await fetchUnreadCount();
      Alert.alert(t.success, t.notifications.markAllSuccess);
    } catch (error) {
      console.error('Mark all error:', error);
      Alert.alert(t.error, t.notifications.markAllError);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await api.patch(`/notifications/${notificationId}/delete`);
      setNotifications((prev) =>
        prev.filter((n) => n.notification_id !== notificationId)
      );
      await fetchUnreadCount();
    } catch (error) {
      console.error('Delete notification error:', error);
      Alert.alert(t.error, t.notifications.deleteError);
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

        <Divider style={styles.divider} />

        <View style={styles.buttonRow}>
          <TouchableOpacity
            onPress={() => handleMarkAsRead(item.notification_id)}
            style={styles.readButton}
          >
            <MaterialIcons name="done-all" size={20} color="#382120" />
            <Text style={styles.readButtonText}>{t.notifications.read}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleDeleteNotification(item.notification_id)}
            style={styles.deleteButton}
          >
            <MaterialIcons name="delete" size={20} color="#d32f2f" />
            <Text style={styles.deleteButtonText}>{t.notifications.delete}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#382120" />
        <Text style={styles.loadingText}>{t.loading}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{t.notifications.title}</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadText}>
              {unreadCount} {unreadCount === 1 ? t.notifications.newNotification : t.notifications.newNotifications}
            </Text>
          )}
        </View>
        {notifications.length > 0 && (
          <TouchableOpacity
            onPress={handleMarkAllAsRead}
            style={styles.markAllButton}
          >
            <Text style={styles.markAllText}>{t.notifications.markAll}</Text>
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="notifications-none" size={60} color="#ccc" />
          <Text style={styles.emptyText}>{t.notifications.noNotifications}</Text>
          <Text style={styles.emptySubText}>
            {t.notifications.emptySubtext}
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
    color: '#382120',
    marginBottom: 4,
  },
  unreadText: {
    fontSize: 12,
    color: '#d32f2f',
    fontWeight: '600',
  },
  markAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#e8f5e9',
    borderRadius: 6,
  },
  markAllText: {
    color: '#2e7d32',
    fontSize: 12,
    fontWeight: '600',
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
    color: '#382120',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  message: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 12,
  },
  divider: {
    marginVertical: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  readButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#e8f5e9',
    borderRadius: 6,
    gap: 4,
  },
  readButtonText: {
    color: '#2e7d32',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#ffebee',
    borderRadius: 6,
    gap: 4,
  },
  deleteButtonText: {
    color: '#d32f2f',
    fontSize: 12,
    fontWeight: '600',
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
    color: '#666',
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
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});
