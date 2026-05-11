import React, { createContext, useState, useCallback, useContext } from 'react';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  const updateUnreadCount = useCallback((count) => {
    setUnreadCount(count);
  }, []);

  const decrementUnreadCount = useCallback(() => {
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const resetUnreadCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        updateUnreadCount,
        decrementUnreadCount,
        resetUnreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
};
