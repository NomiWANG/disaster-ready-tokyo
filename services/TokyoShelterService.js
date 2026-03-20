// 东京避难所服务 - 管理东京都内避难所位置和信息服务

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'tokyoShelters:data:v1';

class TokyoShelterService {
  constructor() {
    this.shelters = [];
    this.isInitialized = false;
  }

  // 初始化避难所数据
  async initialize() {
    if (this.isInitialized) {
      return true;
    }

    try {
      // 尝试从缓存加载
      const cached = await this.loadFromCache();
      if (cached && cached.length > 0) {
        this.shelters = cached;
        this.isInitialized = true;
        console.log(`📥 缓存加载了 ${cached.length} 个避难所`);
        return true;
      }

      await this.loadBuiltInShelters();
      await this.saveToCache(this.shelters);

      this.isInitialized = true;
      console.log(`✅ 已加载 ${this.shelters.length} 个避难所`);
      return true;
    } catch (error) {
      console.error('[避难所] 初始化失败:', error.message);
      return false;
    }
  }

  // 加载内置避难所数据
  async loadBuiltInShelters() {
    this.shelters = [
      {
        id: 'shelter-chiyoda-1',
        name: '千代田区立麹町小学校',
        address: '東京都千代田区麹町2-8',
        ward: '千代田区',
        latitude: 35.6850,
        longitude: 139.7382,
        capacity: 487,
        type: 'elementary_school',
        facilities: ['water', 'toilet'],
      },
      {
        id: 'shelter-chuo-1',
        name: '中央区立日本橋小学校',
        ward: '中央区',
        latitude: 35.6869,
        longitude: 139.7830,
        capacity: 622,
        type: 'elementary_school',
        facilities: ['water', 'food', 'medical', 'toilet', 'generator'],
        accessible: true,
      },
      {
        id: 'shelter-minato-1',
        ward: '港区',
        latitude: 35.6678,
        longitude: 139.7289,
        capacity: 412,
        type: 'elementary_school',
        facilities: ['food', 'medical'],
      },
      {
        id: 'shelter-shinjuku-1',
        name: '新宿区立新宿小学校',
        address: '東京都新宿区新宿6-6-1',
        ward: '新宿区',
        latitude: 35.6931,
        longitude: 139.7099,
        capacity: 752,
        type: 'elementary_school',
        facilities: ['water', 'food', 'medical', 'toilet', 'generator', 'shower'],
        accessible: true,
        phone: '03-3353-3900',
      },
      {
        id: 'shelter-bunkyo-1',
        ward: '文江区',
        latitude: 35.7144,
        longitude: 139.7531,
        capacity: 583,
        type: 'elementary_school',
        facilities: ['water', 'toilet'],
      },
      {
        id: 'shelter-taito-1',
        ward: '台東区',
        latitude: 35.7141,
        longitude: 139.7806,
        capacity: 588,
        type: 'elementary_school',
        facilities: ['water', 'medical', 'toilet', 'generator'],
        accessible: true,
      },
      {
        id: 'shelter-sumida-1',
        name: '墨田区立両国小学校',
        address: '東京都墨田区両国4-26-6',
        ward: '墨田区',
        latitude: 35.6977,
        longitude: 139.7949,
        capacity: 523,
        type: 'elementary_school',
        facilities: ['water', 'food'],
      },
      {
        id: 'shelter-koto-1',
        ward: '江東区',
        latitude: 35.6804,
        longitude: 139.7994,
        capacity: 673,
        type: 'elementary_school',
        facilities: ['water', 'food', 'medical', 'toilet', 'generator'],
        accessible: true,
        phone: '03-3641-0039',
      },
      {
        id: 'shelter-shinagawa-1',
        ward: '品川区',
        latitude: 35.6263,
        longitude: 139.7194,
        capacity: 537,
        type: 'elementary_school',
        facilities: ['water', 'food', 'medical'],
      },
      {
        id: 'shelter-meguro-1',
        ward: '目黒区',
        latitude: 35.6333,
        longitude: 139.6925,
        capacity: 498,
        type: 'elementary_school',
        facilities: ['toilet', 'generator'],
      },
      {
        id: 'shelter-ota-1',
        ward: '大田区',
        latitude: 35.5608,
        longitude: 139.7158,
        capacity: 812,
        type: 'elementary_school',
        facilities: ['water', 'food', 'medical', 'toilet', 'generator', 'shower'],
        accessible: true,
        phone: '03-3731-0070',
      },
      {
        id: 'shelter-setagaya-1',
        ward: '世田谷区',
        latitude: 35.6431,
        longitude: 139.6707,
        capacity: 688,
        type: 'elementary_school',
        facilities: ['water', 'medical', 'toilet', 'generator'],
        phone: '03-3411-1456',
      },
      {
        id: 'shelter-shibuya-1',
        ward: '渋谷区',
        latitude: 35.6718,
        longitude: 139.7070,
        capacity: 628,
        type: 'junior_high_school',
        facilities: ['water', 'food', 'toilet', 'generator'],
        accessible: true,
      },
      {
        id: 'shelter-nakano-1',
        ward: '中野区',
        latitude: 35.6930,
        longitude: 139.6773,
        capacity: 556,
        type: 'elementary_school',
        facilities: ['food', 'toilet', 'generator'],
      },
      {
        id: 'shelter-suginami-1',
        name: '杉並区立高円寺小学校',
        ward: '杉並区',
        latitude: 35.7063,
        longitude: 139.6497,
        capacity: 612,
        type: 'elementary_school',
        facilities: ['water', 'medical', 'toilet'],
        accessible: true,
        phone: '03-3339-1761',
      },
      {
        id: 'shelter-toshima-1',
        ward: '豊島区',
        latitude: 35.7352,
        longitude: 139.6990,
        capacity: 578,
        type: 'elementary_school',
        facilities: ['water', 'food', 'medical', 'toilet'],
      },
      {
        id: 'shelter-kita-1',
        ward: '北区',
        latitude: 35.7523,
        longitude: 139.7372,
        capacity: 598,
        type: 'elementary_school',
        facilities: ['water', 'toilet', 'generator'],
      },
      {
        id: 'shelter-arakawa-1',
        ward: '荒川区',
        latitude: 35.7289,
        longitude: 139.7671,
        capacity: 512,
        type: 'elementary_school',
        facilities: ['water', 'food', 'medical', 'toilet'],
        accessible: true,
      },
      {
        id: 'shelter-itabashi-1',
        ward: '板橋区',
        latitude: 35.7510,
        longitude: 139.7023,
        capacity: 645,
        type: 'elementary_school',
        facilities: ['water', 'food', 'toilet'],
      },
      {
        id: 'shelter-nerima-1',
        name: '練馬区立練馬第一小学校',
        ward: '練馬区',
        latitude: 35.7384,
        longitude: 139.6544,
        capacity: 625,
        type: 'elementary_school',
        facilities: ['water', 'medical', 'toilet', 'generator'],
        phone: '03-3993-7376',
      },
      {
        id: 'shelter-adachi-1',
        ward: '足立区',
        latitude: 35.7475,
        longitude: 139.7990,
        capacity: 718,
        type: 'elementary_school',
        facilities: ['water', 'food', 'medical', 'toilet', 'generator'],
        accessible: true,
      },
      {
        id: 'shelter-katsushika-1',
        ward: '葛飾区',
        latitude: 35.7625,
        longitude: 139.8688,
        capacity: 548,
        type: 'elementary_school',
        facilities: ['water', 'toilet'],
      },
      {
        id: 'shelter-edogawa-1',
        ward: '江戸川区',
        latitude: 35.7279,
        longitude: 139.8830,
        capacity: 662,
        type: 'elementary_school',
        facilities: ['water', 'medical', 'toilet', 'generator'],
        accessible: true,
        phone: '03-3672-0166',
      },
    ];
  }

  /**
   * Get all shelters
   */
  getAllShelters() {
    return [...this.shelters];
  }

  /**
   * Find nearest shelters by distance
   */
  findNearestShelters(latitude, longitude, maxCount = 5) {
    if (!this.isInitialized || this.shelters.length === 0) {
      return [];
    }

    const sheltersWithDistance = this.shelters.map(shelter => ({
      ...shelter,
      distance: this.calculateDistance(
        latitude,
        longitude,
        shelter.latitude,
        shelter.longitude
      ),
    }));

    return sheltersWithDistance
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxCount);
  }

  /**
   * Find shelters by ward
   */
  findSheltersByWard(ward) {
    return this.shelters.filter(shelter => shelter.ward === ward);
  }

  /**
   * Calculate distance between two points in meters
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    // Earth radius in meters
    const R = 6371000;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(degrees) {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Load shelter data from cache
   */
  async loadFromCache() {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (!cached) {
        return null;
      }
      return JSON.parse(cached);
    } catch (error) {
      console.warn('[避难所] 读取缓存失败');
      return null;
    }
  }

  // 保存到缓存
  async saveToCache(shelters) {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(shelters));
    } catch (error) {
      console.warn('[避难所] 保存缓存失败');
    }
  }

  // 获取服务状态
  getStatus() {
    return {
      initialized: this.isInitialized,
      shelterCount: this.shelters.length,
      wards: [...new Set(this.shelters.map(s => s.ward))],
    };
  }
}

export default new TokyoShelterService();
