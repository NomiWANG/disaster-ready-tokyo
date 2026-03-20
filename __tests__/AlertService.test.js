import AlertService, { AlertSource } from '../services/AlertService';

// Mock LocationService and NotificationService to isolate logic
jest.mock('../services/LocationService', () => ({
  __esModule: true,
  default: {
    calculateDistance: jest.fn(() => 1000),
  },
}));

jest.mock('../services/NotificationService', () => {
  const ALERT_LEVELS = {
    URGENT: 'urgent',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
  };

  return {
    __esModule: true,
    default: {
      sendLocalNotification: jest.fn(async () => ({
        success: true,
        notificationId: 'test-id',
      })),
      configure: jest.fn(async () => true),
    },
    ALERT_LEVELS,
  };
});

jest.mock('../services/WeatherAgencyApiService', () => ({
  __esModule: true,
  default: {
    fetchAlerts: jest.fn(async () => []),
    getOfflineAlertHistory: jest.fn(async () => []),
  },
}));

jest.mock('../services/AlertHistoryService', () => ({
  __esModule: true,
  default: {
    addAlert: jest.fn(async () => {}),
    listRecent: jest.fn(async () => []),
  },
}));

describe('AlertService', () => {
  it('calculateDistanceToAlert uses LocationService', () => {
    const userLocation = { latitude: 1, longitude: 2 };
    const source = new AlertSource('id', 'name', 3, 4, 'urgent', 'earthquake');
    const distance = (AlertService as any).calculateDistanceToAlert(userLocation, source);
    expect(typeof distance).toBe('number');
  });

  it('shouldSendNotification respects max distance', () => {
    const source = new AlertSource('id', 'name', 3, 4, 'urgent', 'earthquake');
    const decisionFar = (AlertService as any).shouldSendNotification(source, 999999);
    expect(decisionFar.shouldSend).toBe(false);

    const decisionNear = (AlertService as any).shouldSendNotification(source, 1000);
    expect(decisionNear.shouldSend).toBe(true);
  });

  it('shouldSendNotification enforces frequency limit', () => {
    const service: any = AlertService;
    const source = new AlertSource('id-freq', 'name', 3, 4, 'high', 'earthquake');

    // push a recent notification into history
    service.notificationHistory.push({
      alertSourceId: source.id,
      timestamp: Date.now(),
      level: source.level,
    });

    const decision = service.shouldSendNotification(source, 1000);
    expect(decision.shouldSend).toBe(false);
    expect(decision.reason).toBe('通知频率限制');
  });
});

