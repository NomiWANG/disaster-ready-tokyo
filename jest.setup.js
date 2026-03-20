// Jest setup file for mocking AsyncStorage and other React Native modules

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock expo notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('notification-id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// Mock LocationService
jest.mock('./services/LocationService', () => ({
  __esModule: true,
  default: {
    getLocation: jest.fn(() => null),
    requestPermissions: jest.fn(() => Promise.resolve(true)),
    watchLocation: jest.fn(),
    stopWatchingLocation: jest.fn(),
  },
}));

// Mock PrivacyStorage
jest.mock('./storage/privacy.storage', () => ({
  __esModule: true,
  default: {
    load: jest.fn(() => Promise.resolve({
      shareLocationInCommunity: true,
    })),
    save: jest.fn(() => Promise.resolve()),
  },
}));
