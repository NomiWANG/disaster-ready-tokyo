import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'notification_preferences:v1';

// Notification types
export const NOTIFICATION_TYPES = {
  ALERT: 'alert',
  TASK_REMINDER: 'taskReminder',
  DAILY_CHECKIN: 'dailyCheckin',
  COMMUNITY: 'community',
  EMERGENCY_KIT: 'emergencyKit',
  WEATHER: 'weather',
};

// Notification priorities
export const NOTIFICATION_PRIORITIES = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

const DEFAULT_STATE = {
  enabled: true,
  types: {
    [NOTIFICATION_TYPES.ALERT]: true,
    [NOTIFICATION_TYPES.TASK_REMINDER]: true,
    [NOTIFICATION_TYPES.DAILY_CHECKIN]: true,
    [NOTIFICATION_TYPES.COMMUNITY]: false,
    [NOTIFICATION_TYPES.EMERGENCY_KIT]: true,
    [NOTIFICATION_TYPES.WEATHER]: true,
  },
  quietHours: {
    enabled: false,
    startTime: '22:00',
    endTime: '08:00',
    allowHighPriority: true,
  },
  sound: true,
  vibration: true,
  meta: {
    version: 1,
    updatedAt: Date.now(),
  },
};

const NotificationPreferencesStorage = {
  async load() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_STATE;
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_STATE, ...parsed };
    } catch (err) {
      console.warn('NotificationPreferencesStorage.load failed, fallback default', err);
      return DEFAULT_STATE;
    }
  },

  async save(payload) {
    const merged = {
      ...DEFAULT_STATE,
      ...payload,
      meta: {
        ...DEFAULT_STATE.meta,
        ...(payload?.meta || {}),
        updatedAt: Date.now(),
      },
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  },

  async updateGlobalEnabled(enabled) {
    const state = await this.load();
    return this.save({ ...state, enabled });
  },

  async updateTypeEnabled(type, enabled) {
    const state = await this.load();
    return this.save({
      ...state,
      types: { ...state.types, [type]: enabled },
    });
  },

  async updateQuietHours(quietHoursConfig) {
    const state = await this.load();
    return this.save({
      ...state,
      quietHours: { ...state.quietHours, ...quietHoursConfig },
    });
  },

  async updateSound(enabled) {
    const state = await this.load();
    return this.save({ ...state, sound: enabled });
  },

  async updateVibration(enabled) {
    const state = await this.load();
    return this.save({ ...state, vibration: enabled });
  },

  async clear() {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return DEFAULT_STATE;
  },
};

export { STORAGE_KEY, DEFAULT_STATE };
export default NotificationPreferencesStorage;
