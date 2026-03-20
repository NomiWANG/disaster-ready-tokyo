import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'map:markers:v1';
const REGION_STORAGE_KEY = 'map:lastRegion:v1';

const DEFAULT_STATE = {
  shelters: [],
  helpRequests: [],
  lastRegion: null, // latitude longitude latitudeDelta longitudeDelta - last viewed region
  meta: { version: 1, updatedAt: Date.now() },
};

const MapStorage = {
  /**
   * Load map marker data
   */
  async load() {
    console.log('[MapStorage] Starting load...');
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      console.log('[MapStorage] Raw data:', raw ? 'found' : 'not found');
      if (!raw) {
        console.log('[MapStorage] No data, returning defaults');
        return DEFAULT_STATE;
      }

      const parsed = JSON.parse(raw);
      const result = {
        ...DEFAULT_STATE,
        ...parsed,
        meta: {
          ...DEFAULT_STATE.meta,
          ...(parsed.meta || {}),
        },
      };
      console.log('[MapStorage] Loaded:', result);
      return result;
    } catch (error) {
      console.warn('MapStorage.load failed, fallback to default', error);
      return DEFAULT_STATE;
    }
  },

  /**
   * Save map marker data
   */
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

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch (error) {
      console.warn('MapStorage.save failed', error);
    }

    return merged;
  },

  /**
   * Save last viewed region - separate key to avoid being overwritten by markers save
   */
  async saveLastRegion(region) {
    if (!region || typeof region.latitude !== 'number' || typeof region.longitude !== 'number') return;
    try {
      await AsyncStorage.setItem(REGION_STORAGE_KEY, JSON.stringify({
        latitude: region.latitude,
        longitude: region.longitude,
        latitudeDelta: region.latitudeDelta ?? 0.05,
        longitudeDelta: region.longitudeDelta ?? 0.05,
      }));
    } catch (error) {
      console.warn('MapStorage.saveLastRegion failed', error);
    }
  },

  /**
   * Load last viewed region
   */
  async loadLastRegion() {
    try {
      const raw = await AsyncStorage.getItem(REGION_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') return parsed;
      return null;
    } catch (error) {
      console.warn('MapStorage.loadLastRegion failed', error);
      return null;
    }
  },

  /**
   * Clear cache including last viewed region
   */
  async clear() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      await AsyncStorage.removeItem(REGION_STORAGE_KEY);
    } catch (error) {
      console.warn('MapStorage.clear failed', error);
    }
  },
};

export { STORAGE_KEY, REGION_STORAGE_KEY, DEFAULT_STATE };
export default MapStorage;

