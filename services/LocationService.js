import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

const LOCATION_TASK_NAME = 'background-location-task';
const IS_WEB = Platform.OS === 'web';

// 位置追踪服务 - 处理位置权限请求、追踪和计算
class LocationService {
  // 内部状态
  currentLocation = null;
  watchSubscription = null;
  locationUpdateCallback = null;
  updateInterval = 5000;
  isTracking = false;
  locationHistory = [];
  watchId = undefined;

  constructor() {
    this._isWeb = Platform.OS === 'web';
  }

  /**
   * 请求位置权限
   * @returns {Promise<{foreground: boolean, background: boolean}>}
   */
  async requestPermissions() {
    try {
      if (this._isWeb) {
        if (!navigator.geolocation) {
          console.warn('浏览器不支持Geolocation');
          return { foreground: false, background: false };
        }
        
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => {
              resolve({ foreground: true, background: false });
            },
            () => {
              resolve({ foreground: false, background: false });
            }
          );
        });
      }

      const currentForeground = await Location.getForegroundPermissionsAsync();
      const currentBackground = await Location.getBackgroundPermissionsAsync();

      if (currentForeground.granted) {
        return {
          foreground: currentForeground.granted,
          background: currentBackground.granted,
        };
      }

      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        return { foreground: false, background: false };
      }

      const updatedBackground = await Location.getBackgroundPermissionsAsync();
      
      if (!updatedBackground.granted) {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        
        if (backgroundStatus !== 'granted') {
          return { foreground: true, background: false };
        }
      }

      return { foreground: true, background: true };
    } catch (error) {
      try {
        const currentStatus = await this.checkPermissions();
        return currentStatus;
      } catch (checkError) {
        return { foreground: false, background: false };
      }
    }
  }

  // 检查当前权限状态
  async checkPermissions() {
    try {
      if (this._isWeb) {
        if (!navigator.geolocation) {
          return { foreground: false, background: false };
        }
        return { foreground: true, background: false };
      }

      const foregroundStatus = await Location.getForegroundPermissionsAsync();
      const backgroundStatus = await Location.getBackgroundPermissionsAsync();
      
      return {
        foreground: foregroundStatus.granted,
        background: backgroundStatus.granted,
      };
    } catch (error) {
      return { foreground: false, background: false };
    }
  }

  async getCurrentLocation(options = {}) {
    try {
      if (this._isWeb) {
        if (!navigator.geolocation) {
          return {
            success: false,
            error: '浏览器不支持Geolocation',
          };
        }

        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const location = {
                coords: {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  accuracy: position.coords.accuracy || 50,
                  altitude: position.coords.altitude || null,
                  heading: position.coords.heading || null,
                },
                timestamp: position.timestamp,
              };
              this.currentLocation = location;
              resolve({ success: true, location });
            },
            (error) => {
              resolve({
                success: false,
                error: error.message || '获取位置失败',
              });
            }
          );
        });
      }

      // Native平台获取位置 - 添加超时
      const location = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: options.accuracy || Location.Accuracy.Balanced,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Location timeout')), 10000)
        ),
      ]);

      this.currentLocation = location;
      return { success: true, location };
    } catch (error) {
      return { success: false, error: error.message || '获取位置失败' };
    }
  }

  startLocationTracking(options = {}) {
    if (this.isTracking) {
      return;
    }

    const {
      accuracy = Location.Accuracy.Balanced,
      timeInterval = this.updateInterval,
      distanceInterval = 0,
      callback,
    } = options;

    this.locationUpdateCallback = callback || this.defaultLocationCallback;

    if (this._isWeb) {
      this.startWebLocationTracking(callback);
      return;
    }

    try {
      this.watchSubscription = Location.watchPositionAsync(
        {
          accuracy,
          timeInterval,
          distanceInterval,
        },
        (location) => {
          this.currentLocation = location;
          this.locationHistory.push(location);
          // 保持最近100条位置记录
          if (this.locationHistory.length > 100) {
            this.locationHistory.shift();
          }
          if (this.locationUpdateCallback) {
            this.locationUpdateCallback(location);
          }
        }
      );

      this.isTracking = true;
    } catch (error) {
      console.error('location tracking error:', error);
    }
  }

  startWebLocationTracking(callback) {
    if (!navigator.geolocation) {
      console.warn('no web geolocation');
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location = {
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy || 50,
            altitude: position.coords.altitude || null,
            heading: position.coords.heading || null,
          },
          timestamp: position.timestamp,
        };
        this.currentLocation = location;
        if (callback) {
          callback(location);
        }
      },
      (error) => {
        console.error('web tracking error', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 1000,
      }
    );

    this.isTracking = true;
    console.log('web tracking started');
  }

  stopLocationTracking() {
    if (IS_WEB) {
      if (this.watchId !== undefined) {
        navigator.geolocation.clearWatch(this.watchId);
        this.watchId = undefined;
      }
    } else {
      if (this.watchSubscription) {
        if (typeof this.watchSubscription.remove === 'function') {
          this.watchSubscription.remove();
        }
        this.watchSubscription = null;
      }
    }

    this.isTracking = false;
    console.log('tracking stopped');
  }

  defaultLocationCallback(location) {
    // 位置更新回调
  }

  async startBackgroundLocationTracking(options = {}) {
    if (IS_WEB) {
      return false;
    }

    try {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      if (status !== 'granted') {
        return false;
      }

      TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
        if (error) {
          return;
        }
        if (data) {
          const { locations } = data;
          if (locations && locations.length > 0) {
            const location = locations[0];
            this.currentLocation = location;
            if (this.locationUpdateCallback) {
              this.locationUpdateCallback(location);
            }
          }
        }
      });

      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: options.accuracy || Location.Accuracy.Balanced,
        timeInterval: options.timeInterval || 10000,
        distanceInterval: options.distanceInterval || 0,
        foregroundService: {
          notificationTitle: 'Location Tracking',
          notificationBody: 'Tracking your location for disaster alerts',
          notificationColor: '#2196F3',
        },
        pausesUpdatesAutomatically: false,
        activityType: Location.ActivityType.Other,
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  async stopBackgroundLocationTracking() {
    if (IS_WEB) {
      return;
    }

    try {
      const hasStarted = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      if (hasStarted) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }
    } catch (error) {
      // 忽略错误
    }
  }

  getLocation() {
    return this.currentLocation;
  }

  getLocationHistory() {
    return [...this.locationHistory];
  }

  clearLocationHistory() {
    this.locationHistory = [];
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
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

  toRad(deg) {
    return deg * (Math.PI / 180);
  }

  getAccuracyInfo() {
    if (!this.currentLocation) {
      return null;
    }
    const accuracy = this.currentLocation.coords.accuracy;
    let quality = 'unknown';
    if (accuracy <= 10) {
      quality = 'excellent';
    } else if (accuracy <= 50) {
      quality = 'good';
    } else if (accuracy <= 100) {
      quality = 'fair';
    } else {
      quality = 'poor';
    }
    return {
      accuracy,
      quality,
      latitude: this.currentLocation.coords.latitude,
      longitude: this.currentLocation.coords.longitude,
    };
  }
}

export default new LocationService();
