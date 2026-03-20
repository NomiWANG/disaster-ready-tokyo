/**
 * ============================================
 * EmergencyContactsService - 紧急联系人和自定义联系人服务
 * 
 * 功能说明：
 * - 管理内置官方紧急联系电话
 * - 支持用户添加和管理自定义联系人
 * - 提供联系人搜索和分类功能
 * - 支持联系人固定(置顶)显示
 * 
 * 内置联系人类型：
 * - emergency: 紧急电话（110、119等）
 * - disaster: 灾害相关热线
 * - medical: 医疗信息
 * - embassy: 使馆领事服务
 * - utility: 公共事业（电力、燃气、供水）
 * - transport: 交通信息
 * 
 * 使用示例：
 * const contacts = await EmergencyContactsService.getContacts();
 * await EmergencyContactsService.addContact({ name: '张三', number: '138xxxx' });
 * ============================================
 */

// 官方联系人缓存键
const OFFICIAL_CONTACTS_CACHE_KEY = 'emergencyContacts:official:v1';

/**
 * 紧急联系人服务 - 使用class风格
 */
import EmergencyContactsStorage from '../storage/emergencyContacts.storage';

class EmergencyContactsService {
  officialContacts = [];    // 内置官方联系人列表
  isInitialized = false;  // 是否已初始化

  async initialize() {
    if (this.isInitialized) {
      return true;
    }

    try {
      const cached = await this.loadOfficialFromCache();
      if (cached && cached.length > 0) {
        this.officialContacts = cached;
        this.isInitialized = true;
        console.log('loaded ' + cached.length + ' official contacts from cache');
        return true;
      }

      await this.loadBuiltInContacts();
      await this.saveOfficialToCache(this.officialContacts);
      
      this.isInitialized = true;
      console.log('initialized ' + this.officialContacts.length + ' official contacts');
      return true;
    } catch (error) {
      console.error('failed to init emergency contacts', error);
      return false;
    }
  }

  async loadBuiltInContacts() {
    this.officialContacts = [
      // national emergency
      {
        id: 'emergency-police',
        name: 'Police',
        nameJa: '警察',
        nameEn: 'Police',
        number: '110',
        type: 'police',
        category: 'emergency',
        description: 'Crime, accidents, emergencies',
        descriptionEn: 'Crime, accidents, emergencies',
        available: '24/7',
        free: true,
        languages: ['Japanese', 'English'],
        priority: 1,
      },
      {
        id: 'emergency-fire',
        name: 'Fire/Ambulance',
        nameJa: '消防・救急',
        nameEn: 'Fire/Ambulance',
        number: '119',
        type: 'fire',
        category: 'emergency',
        description: 'Fire, medical emergency, rescue',
        descriptionEn: 'Fire, medical emergency, rescue',
        available: '24/7',
        free: true,
        languages: ['Japanese', 'English'],
        priority: 1,
      },
      {
        id: 'emergency-coast-guard',
        name: 'Japan Coast Guard',
        nameJa: '海上保安庁',
        nameEn: 'Japan Coast Guard',
        number: '118',
        type: 'coast_guard',
        category: 'emergency',
        description: 'Maritime accidents, rescue at sea',
        descriptionEn: 'Maritime accidents, rescue at sea',
        available: '24/7',
        free: true,
        languages: ['Japanese'],
        priority: 2,
      },
      // Tokyo disaster
      {
        id: 'tokyo-disaster-prevention',
        name: 'Tokyo Disaster Prevention Hotline',
        nameJa: '東京都防災ホットライン',
        nameEn: 'Tokyo Disaster Prevention Hotline',
        number: '03-5320-7892',
        type: 'disaster',
        category: 'information',
        description: 'Disaster information, shelter locations',
        descriptionEn: 'Disaster information, shelter locations',
        available: '24/7',
        free: false,
        languages: ['Japanese', 'English'],
        priority: 2,
      },
      {
        id: 'tokyo-foreign-residents',
        name: 'Tokyo Foreign Residents Advisory Center',
        nameJa: '東京都外国人相談センター',
        nameEn: 'Tokyo Foreign Residents Advisory Center',
        number: '03-5320-7744',
        type: 'support',
        category: 'information',
        description: 'Multilingual consultation for foreign residents',
        descriptionEn: 'Multilingual consultation for foreign residents',
        available: 'Mon-Fri 9:00-20:00',
        free: false,
        languages: ['English', 'Chinese', 'Korean', 'Spanish', 'Thai', 'Vietnamese'],
        priority: 3,
      },
      // medical
      {
        id: 'tokyo-medical-info',
        name: 'Tokyo Medical Institution Information',
        nameJa: '東京都医療機関案内',
        nameEn: 'Tokyo Medical Institution Information',
        number: '03-5272-0303',
        type: 'medical',
        category: 'information',
        description: 'Hospital information, medical consultation',
        descriptionEn: 'Hospital information, medical consultation',
        available: '24/7',
        free: false,
        languages: ['Japanese', 'English', 'Chinese', 'Korean', 'Thai'],
        priority: 2,
      },
      {
        id: 'japan-helpline',
        name: 'Japan Helpline',
        nameJa: 'ジャパンヘルプライン',
        nameEn: 'Japan Helpline',
        number: '0570-000-911',
        type: 'support',
        category: 'mental_health',
        description: 'Mental health support in English',
        descriptionEn: 'Mental health support in English',
        available: '24/7',
        free: false,
        languages: ['English'],
        priority: 3,
      },
      // embassies
      {
        id: 'embassy-us',
        name: 'US Embassy Tokyo',
        nameJa: '米国大使館',
        nameEn: 'US Embassy Tokyo',
        number: '03-3224-5000',
        type: 'embassy',
        category: 'consular',
        description: 'American Citizen Services',
        descriptionEn: 'American Citizen Services',
        available: 'Mon-Fri 9:00-17:30',
        free: false,
        languages: ['English'],
        priority: 3,
      },
      {
        id: 'embassy-uk',
        name: 'British Embassy Tokyo',
        nameJa: '英国大使館',
        nameEn: 'British Embassy Tokyo',
        number: '03-5211-1100',
        type: 'embassy',
        category: 'consular',
        description: 'British Citizen Services',
        descriptionEn: 'British Citizen Services',
        available: 'Mon-Fri 9:00-17:00',
        free: false,
        languages: ['English'],
        priority: 3,
      },
      {
        id: 'embassy-china',
        name: 'Embassy of China',
        nameJa: '中国大使館',
        nameEn: 'Embassy of China',
        number: '03-3403-3388',
        type: 'embassy',
        category: 'consular',
        description: 'Chinese Citizen Services',
        descriptionEn: 'Chinese Citizen Services',
        available: 'Mon-Fri 9:00-17:00',
        free: false,
        languages: ['Chinese', 'Japanese'],
        priority: 3,
      },
      // utilities
      {
        id: 'tokyo-electric',
        name: 'TEPCO Power Outage',
        nameJa: '東京電力（停電情報）',
        nameEn: 'TEPCO Power Outage',
        number: '0120-995-007',
        type: 'utility',
        category: 'infrastructure',
        description: 'Power outage information',
        descriptionEn: 'Power outage information',
        available: '24/7',
        free: true,
        languages: ['Japanese'],
        priority: 3,
      },
      {
        id: 'tokyo-gas',
        name: 'Tokyo Gas Emergency',
        nameJa: '東京ガス（緊急）',
        nameEn: 'Tokyo Gas Emergency',
        number: '0570-002-211',
        type: 'utility',
        category: 'infrastructure',
        description: 'Gas leak emergency',
        descriptionEn: 'Gas leak emergency',
        available: '24/7',
        free: true,
        languages: ['Japanese'],
        priority: 2,
      },
      {
        id: 'tokyo-water',
        name: 'Tokyo Waterworks Bureau',
        nameJa: '東京都水道局',
        nameEn: 'Tokyo Waterworks Bureau',
        number: '03-5326-1101',
        type: 'utility',
        category: 'infrastructure',
        description: 'Water main break, water outage',
        descriptionEn: 'Water main break, water outage',
        available: '24/7',
        free: false,
        languages: ['Japanese'],
        priority: 3,
      },
      // transport
      {
        id: 'jr-east-info',
        name: 'JR East Train Information',
        nameJa: 'JR東日本運行情報',
        nameEn: 'JR East Train Information',
        number: '050-2016-1600',
        type: 'transport',
        category: 'information',
        description: 'Train operation information',
        descriptionEn: 'Train operation information',
        available: '6:00-24:00',
        free: false,
        languages: ['Japanese', 'English'],
        priority: 3,
      },
      // other
      {
        id: 'ntt-disaster',
        name: 'NTT Disaster Message Board',
        nameJa: 'NTT災害用伝言ダイヤル',
        nameEn: 'NTT Disaster Message Board',
        number: '171',
        type: 'communication',
        category: 'information',
        description: 'Disaster message service',
        descriptionEn: 'Disaster message service',
        available: 'During disasters',
        free: true,
        languages: ['Japanese'],
        priority: 2,
      },
    ];
  }

  getAllOfficialContacts() {
    return [...this.officialContacts];
  }

  getOfficialContactsByType(type) {
    return this.officialContacts.filter(contact => contact.type === type);
  }

  getOfficialContactsByCategory(category) {
    return this.officialContacts.filter(contact => contact.category === category);
  }

  getEmergencyContacts() {
    return this.officialContacts
      .filter(contact => contact.category === 'emergency')
      .sort((a, b) => a.priority - b.priority);
  }

  searchOfficialContacts(query) {
    if (!query) return this.officialContacts;
    
    const lowerQuery = query.toLowerCase();
    return this.officialContacts.filter(contact =>
      contact.name.toLowerCase().includes(lowerQuery) ||
      contact.nameEn.toLowerCase().includes(lowerQuery) ||
      contact.nameJa.includes(query) ||
      contact.number.includes(query)
    );
  }

  async loadOfficialFromCache() {
    try {
      const cached = await AsyncStorage.getItem(OFFICIAL_CONTACTS_CACHE_KEY);
      if (!cached) return null;
      return JSON.parse(cached);
    } catch (error) {
      console.warn('failed to load official contacts cache', error);
      return null;
    }
  }

  async saveOfficialToCache(contacts) {
    try {
      await AsyncStorage.setItem(OFFICIAL_CONTACTS_CACHE_KEY, JSON.stringify(contacts));
    } catch (error) {
      console.warn('failed to save official contacts cache', error);
    }
  }

  getStatus() {
    return {
      initialized: this.isInitialized,
      officialContactCount: this.officialContacts.length,
      types: [...new Set(this.officialContacts.map(c => c.type))],
      categories: [...new Set(this.officialContacts.map(c => c.category))],
    };
  }

  async getCustomContacts() {
    const state = await EmergencyContactsStorage.load();
    return state.contacts || [];
  }

  async getContacts() {
    return this.getCustomContacts();
  }

  async addCustomContact(contact) {
    const state = await EmergencyContactsStorage.load();
    const nextContacts = [
      ...state.contacts,
      {
        id: contact.id || `custom-${Date.now()}`,
        name: contact.name || '',
        number: contact.number || '',
        builtin: false,
        pinned: false,
      },
    ];
    await EmergencyContactsStorage.save({ ...state, contacts: nextContacts });
    return nextContacts;
  }

  async addContact(contact) {
    return this.addCustomContact(contact);
  }

  async togglePin(contactId) {
    const state = await EmergencyContactsStorage.load();
    const contact = state.contacts.find((c) => c.id === contactId);
    if (!contact || contact.builtin) {
      return state.contacts;
    }

    const pinnedCount = state.contacts.filter((c) => c.pinned === true).length;
    const willPin = !contact.pinned;

    if (!willPin) {
      const nextContacts = state.contacts.map((c) =>
        c.id === contactId ? { ...c, pinned: false } : c
      );
      await EmergencyContactsStorage.save({ ...state, contacts: nextContacts });
      return nextContacts;
    }

    if (pinnedCount >= 2) {
      return state.contacts;
    }

    const nextContacts = state.contacts.map((c) =>
      c.id === contactId ? { ...c, pinned: true } : c
    );
    await EmergencyContactsStorage.save({ ...state, contacts: nextContacts });
    return nextContacts;
  }

  async deleteCustomContact(contactId) {
    const state = await EmergencyContactsStorage.load();
    const nextContacts = state.contacts.filter((c) => c.id !== contactId);
    await EmergencyContactsStorage.save({ ...state, contacts: nextContacts });
    return nextContacts;
  }

  async getAllContacts() {
    const customContacts = await this.getCustomContacts();
    return {
      official: this.officialContacts,
      custom: customContacts,
      all: [...this.officialContacts, ...customContacts],
    };
  }
}

export default new EmergencyContactsService();
