// Weather Agency API service - fetches earthquake data from p2pquake
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ALERT_LEVELS } from './NotificationService';

const STORAGE_KEY = 'weatherAgency:cache:v1';
const CACHE_EXPIRY_MS = 5 * 60 * 1000;

const RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 60000,
};

class WeatherAgencyApiService {
  constructor() {
    this.useMockApi = false;
    this.rateLimitHistory = [];
    this.lastFetchTime = null;
    this.lastFetchResult = null;
  }

  setUseMockApi(useMock) {
    this.useMockApi = useMock;
  }

  checkRateLimit() {
    const now = Date.now();
    this.rateLimitHistory = this.rateLimitHistory.filter(
      (time) => now - time < RATE_LIMIT.windowMs
    );

    if (this.rateLimitHistory.length >= RATE_LIMIT.maxRequests) {
      const oldestRequest = this.rateLimitHistory[0];
      const waitTime = RATE_LIMIT.windowMs - (now - oldestRequest);
      return {
        allowed: false,
        waitTime,
        message: `slow down - wait ${Math.ceil(waitTime / 1000)}s`,
      };
    }

    return { allowed: true };
  }

  recordRequest() {
    this.rateLimitHistory.push(Date.now());
  }

  async fetchFromMockApi() {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const mockAlerts = [
      {
        id: 'mock-eq-1',
        name: 'Tokyo Earthquake Alert',
        latitude: 35.6812,
        longitude: 139.6511,
        level: ALERT_LEVELS.URGENT,
        type: 'earthquake',
        description: 'Earthquake detected in Tokyo area',
        timestamp: Date.now() - 1000 * 60 * 5,
        radius: 10000,
      },
      {
        id: 'mock-fire-1',
        name: 'Arakawa Fire Alert',
        latitude: 35.7350,
        longitude: 139.7850,
        level: ALERT_LEVELS.HIGH,
        type: 'fire',
        description: 'Fire reported in Arakawa - fire dept responding',
        timestamp: Date.now() - 1000 * 60 * 15,
        radius: 5000,
      },
      {
        id: 'mock-flood-1',
        name: 'Taito Flood Warning',
        latitude: 35.7127,
        longitude: 139.7800,
        level: ALERT_LEVELS.MEDIUM,
        type: 'flood',
        description: 'Possible flooding in parts of Taito',
        timestamp: Date.now() - 1000 * 60 * 30,
        radius: 2000,
      },
    ];

    return mockAlerts;
  }

  async fetchFromRealApi() {
    try {
      return await this.fetchFromP2PApi();
    } catch (error) {
      console.error('real API failed - falling back to mock', error);
      return await this.fetchFromMockApi();
    }
  }

  async fetchFromP2PApi(limit = 5) {
    const url = `https://api.p2pquake.net/v1/human-readable?limit=${Math.max(1, Math.min(limit, 20))}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`p2p API failed ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error('unexpected API response format');
      }

      return this.transformP2PQuakeData(data);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  transformP2PQuakeData(data) {
    return data
      .filter((item) => item.code === 551 || item.code === 552 || item.code === 554)
      .map((item, idx) => {
        const earthquake = item.earthquake || {};
        const points = item.points || [];

        let maxIntensity = 0;
        let areaName = 'Unknown';

        if (points.length > 0) {
          points.forEach((p) => {
            if (p.pref && p.scale !== undefined) {
              if (p.scale > maxIntensity) {
                maxIntensity = p.scale;
                areaName = p.pref.name || 'Unknown';
              }
            }
          });
        }

        const level = this.intensityToLevel(maxIntensity);
        const hypocenter = earthquake.hypocenter || {};

        return {
          id: `p2p-${earthquake.date || Date.now()}-${idx}`,
          name: earthquake.text || `${areaName} Earthquake`,
          latitude: hypocenter.latitude || 35.6762,
          longitude: hypocenter.longitude || 139.6503,
          level,
          type: 'earthquake',
          description: this.getIntensityDescription(maxIntensity),
          timestamp: new Date(earthquake.date || Date.now()).getTime(),
          radius: this.levelToRadius(level),
        };
      });
  }

  intensityToLevel(intensity) {
    if (intensity >= 6) return ALERT_LEVELS.URGENT;
    if (intensity >= 5) return ALERT_LEVELS.HIGH;
    if (intensity >= 4) return ALERT_LEVELS.MEDIUM;
    return ALERT_LEVELS.LOW;
  }

  levelToRadius(level) {
    switch (level) {
      case ALERT_LEVELS.URGENT: return 10000;
      case ALERT_LEVELS.HIGH: return 5000;
      case ALERT_LEVELS.MEDIUM: return 2000;
      default: return 1000;
    }
  }

  getIntensityDescription(intensity) {
    const descriptions = {
      0: 'Intensity 0 - Not felt',
      1: 'Intensity 1 - Slight tremor',
      2: 'Intensity 2 - Weak tremor',
      3: 'Intensity 3 - Moderate tremor',
      4: 'Intensity 4 - Strong tremor',
      5: 'Intensity 5 Lower - Weak shaking',
      6: 'Intensity 5 Upper - Strong shaking',
      7: 'Intensity 7 - Severe shaking',
    };
    return descriptions[intensity] || `Intensity ${intensity}`;
  }

  async fetchAlerts(options = {}) {
    const { forceRefresh = false, useCache = true } = options;

    const rateCheck = this.checkRateLimit();
    if (!rateCheck.allowed) {
      console.warn(rateCheck.message);
      return this.lastFetchResult || [];
    }

    if (!forceRefresh && useCache) {
      const cached = await this.getCachedData();
      if (cached) {
        return cached;
      }
    }

    this.recordRequest();

    try {
      const alerts = this.useMockApi
        ? await this.fetchFromMockApi()
        : await this.fetchFromRealApi();

      await this.cacheData(alerts);
      this.lastFetchTime = Date.now();
      this.lastFetchResult = alerts;
      return alerts;
    } catch (error) {
      console.error('failed to fetch alerts', error);
      return this.lastFetchResult || [];
    }
  }

  async getCachedData() {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;

      if (age > CACHE_EXPIRY_MS) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('cache read error', error);
      return null;
    }
  }

  async cacheData(alerts) {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          data: alerts,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.error('cache write error', error);
    }
  }

  async clearCache() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('cache clear error', error);
    }
  }

  getLastFetchTime() {
    return this.lastFetchTime;
  }

  getLastResult() {
    return this.lastFetchResult || [];
  }
}

export default new WeatherAgencyApiService();
