import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATIONS_SEEN_AT_KEY = 'notificationsSeenAt';

export const markNotificationsSeen = async () => {
  const seenAt = new Date().toISOString();
  await AsyncStorage.setItem(NOTIFICATIONS_SEEN_AT_KEY, seenAt);
  return seenAt;
};

export const getNotificationsSeenAt = async () => {
  return AsyncStorage.getItem(NOTIFICATIONS_SEEN_AT_KEY);
};

export const getVisibleUnreadCount = async (api) => {
  try {
    const seenAt = await getNotificationsSeenAt();
    const response = await api.get('/notifications/unread');
    const notifications = Array.isArray(response.data) ? response.data : [];

    if (!seenAt) {
      return notifications.length;
    }

    const seenTime = new Date(seenAt).getTime();
    return notifications.filter((notification) => {
      const createdAt = notification.created_at || notification.createdAt;
      if (!createdAt) return true;
      return new Date(createdAt).getTime() > seenTime;
    }).length;
  } catch (error) {
    return 0;
  }
};
