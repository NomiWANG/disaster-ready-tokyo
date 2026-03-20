// 灾害服务 - 整合位置、围栏和警报功能

import LocationService from './LocationService';
import GeofenceService from './GeofenceService';
import NotificationService, { ALERT_LEVELS } from './NotificationService';
import AlertService from './AlertService';
import WeatherAgencyApiService from './WeatherAgencyApiService';

class DisasterService {
  constructor() {
    this.isInitialized = false;
    this.initializationPromise = null;
  }

  async initialize() {
    if (this.isInitialized) {
      return true;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._doInitialize();
    return this.initializationPromise;
  }

  async _doInitialize() {
    try {
      const notificationConfigured = await NotificationService.configure();
      if (!notificationConfigured) {
        console.warn('[DisasterService] 通知配置失败，但继续运行');
      }

      const locationPermissions = await LocationService.requestPermissions();
      if (!locationPermissions.foreground) {
        console.warn('[DisasterService] 缺少位置权限，部分功能将受限');
      }

      GeofenceService.initializeTestGeofences();

      try {
        await AlertService.loadAlertsFromApi({ forceRefresh: false });
      } catch (error) {
        console.warn('[DisasterService] 加载警报失败，使用离线数据', error.message);
      }

      this.setupGeofenceListeners();
      this.setupNotificationListeners();

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('[DisasterService] 初始化失败:', error);
      return false;
    }
  }

  setupGeofenceListeners() {
    GeofenceService.onEnter((geofence, location) => {
      const distance = LocationService.calculateDistance(
        location.latitude,
        location.longitude,
        geofence.latitude,
        geofence.longitude
      );

      let level = ALERT_LEVELS.MEDIUM;
      if (geofence.type === 'danger') {
        level = ALERT_LEVELS.URGENT;
      } else if (geofence.type === 'shelter') {
        level = ALERT_LEVELS.LOW;
      }

      NotificationService.sendLocalNotification(
        `Entered ${geofence.name}`,
        `You are now near ${geofence.name} - about ${distance.toFixed(0)}m from center`,
        level,
        {
          geofenceId: geofence.id,
          geofenceType: geofence.type,
          eventType: 'enter',
        }
      );
    });

    GeofenceService.onExit((geofence, location) => {
      const distance = LocationService.calculateDistance(
        location.latitude,
        location.longitude,
        geofence.latitude,
        geofence.longitude
      );

      NotificationService.sendLocalNotification(
        `Left ${geofence.name}`,
        `You have left ${geofence.name} - current distance about ${distance.toFixed(0)}m`,
        ALERT_LEVELS.LOW,
        {
          geofenceId: geofence.id,
          geofenceType: geofence.type,
          eventType: 'exit',
        }
      );
    });
  }

  setupNotificationListeners() {
    NotificationService.setNotificationListener((notification) => {
      console.log('[DisasterService] 收到推送通知');
    });

    NotificationService.setNotificationResponseListener((response) => {
      console.log('[DisasterService] 用户点击通知');
      const data = response.notification.request.content.data;

      if (data.alertSourceId) {
        console.log('[DisasterService] 处理警报通知', data.alertSourceId);
      } else if (data.geofenceId) {
        console.log('[DisasterService] 处理地理围栏通知', data.geofenceId);
      }
    });
  }

  async startMonitoring() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      LocationService.startLocationTracking({
        accuracy: 6,
        timeInterval: 5000,
        callback: (location) => {
          GeofenceService.checkAllGeofences(location);
        },
      });

      GeofenceService.startMonitoring();
      AlertService.startMonitoring();
      AlertService.startApiRefresh(5 * 60 * 1000);

      const permissions = await LocationService.checkPermissions();
      if (permissions.background) {
        await LocationService.startBackgroundLocationTracking({
          accuracy: 6,
          timeInterval: 10000,
        });
      }

      console.log('✅ 监控服务全部启动');
      return true;
    } catch (error) {
      console.error('[DisasterService] 启动监控失败', error);
      return false;
    }
  }

  async stopMonitoring() {
    try {
      LocationService.stopLocationTracking();
      LocationService.stopBackgroundLocationTracking();
      GeofenceService.stopMonitoring();
      AlertService.stopMonitoring();
      console.log('✅ 监控服务已停止');
      return true;
    } catch (error) {
      console.error('[DisasterService] 停止监控失败', error);
      return false;
    }
  }

  getStats() {
    return {
      isInitialized: this.isInitialized,
      geofences: GeofenceService.getAllGeofences().length,
      alerts: AlertService.getAllAlertSources().length,
      currentLocation: LocationService.getLocation(),
      currentZone: GeofenceService.getCurrentZone(),
    };
  }

  getStatus() {
    const geofences = GeofenceService.getAllGeofences();
    const alerts = AlertService.getAllAlertSources();
    const location = LocationService.getLocation();
    const currentZone = GeofenceService.getCurrentZone();

    return {
      location: {
        current: location,
      },
      geofences: {
        count: geofences.length,
        stats: geofences.map(g => ({
          id: g.id,
          name: g.name,
          type: g.type,
          distance: g.distance,
        })),
      },
      alerts: {
        count: alerts.length,
        sources: alerts,
      },
      zone: currentZone,
      isInitialized: this.isInitialized,
    };
  }
}

export default new DisasterService();
