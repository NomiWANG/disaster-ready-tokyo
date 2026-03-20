import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const ALERT_LEVELS = {
  URGENT: 'urgent',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

// 推送通知服务 - 管理本地通知的发送和调度
class NotificationService {
  notificationListener = null;
  responseListener = null;
  isConfigured = false;

  async configure() {
    if (this.isConfigured) {
      return;
    }

    try {
      if (Platform.OS === 'web') {
        if (!('Notification' in window)) {
          return false;
        }

        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            return false;
          }
        } else if (Notification.permission !== 'granted') {
          return false;
        }

        this.isConfigured = true;
        return true;
      }

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return false;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('urgent', {
          name: 'Urgent Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF0000',
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('high', {
          name: 'High Priority',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 200, 200, 200],
          lightColor: '#FF9800',
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('medium', {
          name: 'Medium Priority',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 150, 150, 150],
          lightColor: '#FFC107',
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('low', {
          name: 'Low Priority',
          importance: Notifications.AndroidImportance.LOW,
          vibrationPattern: [0, 100],
          lightColor: '#2196F3',
          sound: 'default',
        });
      }

      this.isConfigured = true;
      return true;
    } catch (error) {
      return false;
    }
  }

  getNotificationConfig(level) {
    const configs = {
      [ALERT_LEVELS.URGENT]: {
        color: '#F44336',
        sound: 'default',
        priority: Notifications.AndroidImportance.MAX,
        channelId: 'urgent',
        vibrationPattern: [0, 500, 200, 500],
        badge: true,
      },
      [ALERT_LEVELS.HIGH]: {
        color: '#FF9800',
        sound: 'default',
        priority: Notifications.AndroidImportance.HIGH,
        channelId: 'high',
        vibrationPattern: [0, 300, 200, 300],
        badge: true,
      },
      [ALERT_LEVELS.MEDIUM]: {
        color: '#FFC107',
        sound: 'default',
        priority: Notifications.AndroidImportance.DEFAULT,
        channelId: 'medium',
        vibrationPattern: [0, 200, 100, 200],
        badge: false,
      },
      [ALERT_LEVELS.LOW]: {
        color: '#2196F3',
        sound: 'default',
        priority: Notifications.AndroidImportance.LOW,
        channelId: 'low',
        vibrationPattern: [0, 100],
        badge: false,
      },
    };

    return configs[level] || configs[ALERT_LEVELS.MEDIUM];
  }

  async sendLocalNotification(title, body, level = ALERT_LEVELS.MEDIUM, data = {}) {
    try {
      if (Platform.OS === 'web') {
        if (Notification.permission === 'granted') {
          new Notification(title, { body: body, icon: '/icon.png' });
        }
        return true;
      }

      const config = this.getNotificationConfig(level);

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: config.sound,
          priority: config.priority,
          color: config.color,
          badge: config.badge ? 1 : 0,
        },
        trigger: null,
      });

      return true;
    } catch (error) {
      console.error('send notif error', error);
      return false;
    }
  }

  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      return true;
    } catch (error) {
      return false;
    }
  }

  async cancelNotification(notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getBadgeNumber() {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      return 0;
    }
  }

  async setBadgeNumber(number) {
    try {
      await Notifications.setBadgeCountAsync(number);
      return true;
    } catch (error) {
      return false;
    }
  }

  setNotificationListener(callback) {
    if (this.notificationListener) {
      this.notificationListener.remove();
    }

    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        if (callback) {
          callback(notification);
        }
      }
    );
  }

  setNotificationResponseListener(callback) {
    if (this.responseListener) {
      this.responseListener.remove();
    }

    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        if (callback) {
          callback(response);
        }
      }
    );
  }

  removeNotificationListeners() {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
  }
}

export default new NotificationService();
