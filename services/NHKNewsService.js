// NHK新闻服务 - 多语言灾害相关新闻获取

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'nhkNews:cache:v1';
const CACHE_EXPIRY_MS = 15 * 60 * 1000;  // 15分钟缓存

class NHKNewsService {
  constructor() {
    this.rssEndpoints = {
      en: 'https://www3.nhk.or.jp/rss/news/cat0.xml',
      ja: 'https://www3.nhk.or.jp/rss/news/cat0.xml',
      zh: 'https://www3.nhk.or.jp/rss/news/cat0.xml',
    };
    this.lastFetchTime = {};
    this.lastFetchResult = {};
  }

  // 获取灾害相关新闻
  async fetchDisasterNews(language = 'en', forceRefresh = false) {
    try {
      if (!forceRefresh) {
        const cached = await this.loadFromCache(language);
        if (cached) {
          console.log(`[NHK] 使用缓存的 ${language} 新闻`);
          return cached;
        }
      }

      const news = await this.fetchFromNHKWorld(language);
      await this.saveToCache(language, news);

      this.lastFetchTime[language] = Date.now();
      this.lastFetchResult[language] = news;

      return news;
    } catch (error) {
      console.error(`[NHK] 获取新闻失败:`, error.message);

      const cached = await this.loadFromCache(language);
      if (cached) {
        console.log('[NHK] 使用缓存数据');
        return cached;
      }

      return [];
    }
  }

  async fetchFromNHKWorld(language) {
    try {
      const API_ENDPOINT = `https://www3.nhk.or.jp/nhkworld/rdnewsweb/v6b_${language}_top.json`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(API_ENDPOINT, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`NHK API request failed: ${response.status}`);
        }

        const data = await response.json();
        return this.transformNHKNewsData(data, language);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('NHK API request timeout');
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('[NHK] API请求失败:', error.message);
      throw error;
    }
  }

  // 过滤灾害相关关键词
  transformNHKNewsData(data, language) {
    if (!data || !data.channel || !data.channel.item) {
      return [];
    }

    const items = data.channel.item;

    const disasterKeywords = [
      'earthquake', 'tsunami', 'disaster', 'emergency', 'typhoon',
      'flood', 'warning', 'evacuation', 'alert',
      '地震', '津波', '災害', '警報', '避難', '台風', '洪水', '緊急'
    ];

    return items
      .filter(item => {
        const title = (item.title || '').toLowerCase();
        const description = (item.description || '').toLowerCase();
        return disasterKeywords.some(keyword =>
          title.includes(keyword.toLowerCase()) ||
          description.includes(keyword.toLowerCase())
        );
      })
      .slice(0, 10)
      .map(item => ({
        id: item.id || item.link || `nhk-${Date.now()}-${Math.random()}`,
        title: item.title || 'No title',
        description: item.description || '',
        pubDate: this.parseNHKDate(item.pubDate),
        link: item.link || '',
        language,
        source: 'NHK World',
        thumbnail: item.thumbnail || null,
      }));
  }

  parseNHKDate(dateStr) {
    if (!dateStr) {
      return Date.now();
    }
    try {
      return new Date(dateStr).getTime();
    } catch {
      return Date.now();
    }
  }

  async loadFromCache(language) {
    try {
      const key = `${STORAGE_KEY}:${language}`;
      const cached = await AsyncStorage.getItem(key);
      if (!cached) {
        return null;
      }

      const parsed = JSON.parse(cached);
      const now = Date.now();

      if (now - parsed.timestamp > CACHE_EXPIRY_MS) {
        return null;
      }

      return parsed.news;
    } catch (error) {
      console.warn('[NHK] 读取缓存失败');
      return null;
    }
  }

  // 保存到缓存
  async saveToCache(language, news) {
    try {
      const key = `${STORAGE_KEY}:${language}`;
      const cacheData = {
        news,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('[NHK] 保存缓存失败');
    }
  }

  // 清空缓存
  async clearCache() {
    try {
      const languages = ['en', 'ja', 'zh'];
      await Promise.all(
        languages.map(lang => 
          AsyncStorage.removeItem(`${STORAGE_KEY}:${lang}`)
        )
      );
      this.lastFetchTime = {};
      this.lastFetchResult = {};
    } catch (error) {
      console.warn('[NHK] 清空缓存失败');
    }
  }

  // 获取服务状态
  getStatus() {
    return {
      lastFetchTime: this.lastFetchTime,
      cachedLanguages: Object.keys(this.lastFetchResult),
      newsCount: Object.values(this.lastFetchResult).reduce(
        (sum, news) => sum + (news?.length || 0), 
        0
      ),
    };
  }
}

export default new NHKNewsService();
