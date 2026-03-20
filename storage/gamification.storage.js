import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'gamification:v1';

const DEFAULT_STATE = {
  points: 0,
  badges: [],
  progress: { level: 1, percent: 0 },
  meta: { version: 1, updatedAt: Date.now() },
};

const GamificationStorage = {
  async load() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_STATE;
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_STATE, ...parsed };
    } catch (err) {
      console.warn('GamificationStorage.load failed, fallback default', err);
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
  async migrate() {
    // Currently only v1 no migration needed
    return this.load();
  },
};

export { STORAGE_KEY, DEFAULT_STATE };
export default GamificationStorage;

