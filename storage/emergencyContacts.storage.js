import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'emergencyContacts:v1';

const DEFAULT_STATE = {
  contacts: [
    // Emergency numbers
    { id: 'built-in-police', nameKey: 'home.emergency.police', number: '110', builtin: true, isEmergency: true },
    { id: 'built-in-fire-ambulance', nameKey: 'home.emergency.fireAmbulance', number: '119', builtin: true, isEmergency: true },
    // Non-emergency numbers
    { id: 'built-in-yorisoi', nameKey: 'home.emergency.yorisoi', number: '0120-279-338', builtin: true, isEmergency: false, hours: '24/7', noteKey: 'home.emergency.yorisoiNote' },
    { id: 'built-in-fresc', nameKey: 'home.emergency.fresc', number: '0570-011000', builtin: true, isEmergency: false, hours: 'home.emergency.frescHours', noteKey: 'home.emergency.frescNote' },
    { id: 'built-in-human-rights', nameKey: 'home.emergency.humanRights', number: '0570-090911', builtin: true, isEmergency: false, hours: 'home.emergency.humanRightsHours', noteKey: 'home.emergency.humanRightsNote' },
    { id: 'built-in-consumer', nameKey: 'home.emergency.consumer', number: '03-5449-0906', builtin: true, isEmergency: false, noteKey: 'home.emergency.consumerNote' },
  ],
  meta: { version: 2, updatedAt: Date.now() },
};

const EmergencyContactsStorage = {
  async load() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_STATE;
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_STATE, ...parsed };
    } catch (err) {
      console.warn('EmergencyContactsStorage.load failed, fallback default', err);
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
export default EmergencyContactsStorage;

