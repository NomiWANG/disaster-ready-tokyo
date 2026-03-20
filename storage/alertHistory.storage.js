import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'alerts:v1';

const DEFAULT_STATE = {
  alerts: [],
  meta: { version: 1, updatedAt: Date.now() },
};

const AlertHistoryStorage = {
  async load() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_STATE;
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_STATE, ...parsed };
    } catch (err) {
      console.warn('AlertHistoryStorage.load failed, fallback default', err);
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
        version: 1,
      },
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  },
};

export { STORAGE_KEY, DEFAULT_STATE };
export default AlertHistoryStorage;


