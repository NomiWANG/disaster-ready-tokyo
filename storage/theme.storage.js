import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEME_MODES, FONT_SIZES } from '../config/themes';

const STORAGE_KEY = 'app_theme:v1';

const DEFAULT_STATE = {
  mode: THEME_MODES.LIGHT, // light dark auto
  fontSize: FONT_SIZES.MEDIUM, // small medium large
  meta: {
    version: 1,
    updatedAt: Date.now(),
  },
};

const ThemeStorage = {
  async load() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_STATE;
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_STATE, ...parsed };
    } catch (err) {
      console.warn('ThemeStorage.load failed, fallback default', err);
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

  async setThemeMode(mode) {
    const state = await this.load();
    return this.save({ ...state, mode });
  },

  async getThemeMode() {
    const state = await this.load();
    return state.mode;
  },

  async setFontSize(fontSize) {
    const state = await this.load();
    return this.save({ ...state, fontSize });
  },

  async getFontSize() {
    const state = await this.load();
    return state.fontSize;
  },

  async clear() {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return DEFAULT_STATE;
  },
};

export { STORAGE_KEY, DEFAULT_STATE };
export default ThemeStorage;
