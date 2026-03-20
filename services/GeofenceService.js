import LocationService from './LocationService';

// 地理围栏服务 - 管理虚拟围栏的创建、删除和进出检测
class GeofenceService {
  // 围栏列表
  geofences = [];
  isMonitoring = false;
  lastLocation = null;
  enterCallbacks = [];
  exitCallbacks = [];
  checkInterval = null;
  checkIntervalMs = 3000;

  /**
   * 添加或更新地理围栏
   * @param {Object} geofence - 围栏配置 {id, name, latitude, longitude, radius, type}
   * @returns {boolean} 是否成功
   */
  addGeofence(geofence) {
    const { id, name, latitude, longitude, radius, type = 'custom' } = geofence;

    // 参数校验
    if (!id || !name || latitude === undefined || longitude === undefined || !radius) {
      console.error('Geofence: 缺少必要参数');
      return false;
    }

    // 检查是否已存在
    const existingIndex = this.geofences.findIndex((g) => g.id === id);
    const fenceData = {
      id,
      name,
      latitude,
      longitude,
      radius,
      type,
      isInside: false,
      lastEnterTime: null,
      lastExitTime: null,
      enterCount: 0,
      exitCount: 0,
    };

    if (existingIndex !== -1) {
      this.geofences[existingIndex] = fenceData;
    } else {
      this.geofences.push(fenceData);
    }

    return true;
  }

  removeGeofence(geofenceId) {
    const index = this.geofences.findIndex((g) => g.id === geofenceId);
    if (index !== -1) {
      this.geofences.splice(index, 1)[0];
      return true;
    }
    return false;
  }

  getCurrentZone() {
    const location = this.lastLocation || LocationService.getLocation();
    if (!location || !location.latitude || !location.longitude) {
      return null;
    }

    const { latitude, longitude } = location.coords || location;
    let currentZone = null;
    let minRadius = Infinity;

    this.geofences.forEach((geofence) => {
      const distance = LocationService.calculateDistance(
        latitude,
        longitude,
        geofence.latitude,
        geofence.longitude
      );

      if (distance <= geofence.radius && geofence.radius < minRadius) {
        currentZone = {
          id: geofence.id,
          name: geofence.name,
          radius: geofence.radius,
          type: geofence.type,
          distance,
        };
        minRadius = geofence.radius;
      }
    });

    return currentZone;
  }

  getAllGeofences() {
    return [...this.geofences];
  }

  getGeofence(geofenceId) {
    return this.geofences.find((g) => g.id === geofenceId);
  }

  initializeTestGeofences() {
    const centerLat = 35.7325;
    const centerLng = 139.7833;

    this.addGeofence({
      id: 'test-500m',
      name: 'Nearby Zone',
      latitude: centerLat,
      longitude: centerLng,
      radius: 500,
      type: 'test',
    });

    this.addGeofence({
      id: 'test-5km',
      name: 'City Zone',
      latitude: centerLat,
      longitude: centerLng,
      radius: 5000,
      type: 'test',
    });

    this.addGeofence({
      id: 'test-1km',
      name: 'Offset Zone',
      latitude: centerLat + 0.01,
      longitude: centerLng + 0.01,
      radius: 1000,
      type: 'test',
    });

    this.addGeofence({
      id: 'test-20km',
      name: 'Regional Zone',
      latitude: centerLat,
      longitude: centerLng,
      radius: 20000,
      type: 'test',
    });

    console.log('initialized ' + this.geofences.length + ' test geofences');
    const loc = this.lastLocation || LocationService.getLocation();

    if (!loc || !loc.latitude || !loc.longitude) {
      return null;
    }

    const { latitude, longitude } = loc;
    let currentZone = null;

    this.geofences.forEach((geofence) => {
      const distance = LocationService.calculateDistance(
        latitude,
        longitude,
        geofence.latitude,
        geofence.longitude
      );

      if (distance <= geofence.radius) {
        if (!currentZone || geofence.radius < currentZone.radius) {
          currentZone = {
            id: geofence.id,
            name: geofence.name,
            radius: geofence.radius,
            type: geofence.type,
            distance,
          };
        }
      }
    });

    return currentZone;
  }

  isInsideGeofence(latitude, longitude, geofence) {
    const distance = LocationService.calculateDistance(
      latitude,
      longitude,
      geofence.latitude,
      geofence.longitude
    );
    return distance <= geofence.radius;
  }

  checkAllGeofences(location) {
    if (!location || !location.latitude || !location.longitude) {
      return;
    }

    const { latitude, longitude } = location;

    this.geofences.forEach((geofence) => {
      const isInside = this.isInsideGeofence(latitude, longitude, geofence);
      const wasInside = geofence.isInside;

      if (isInside && !wasInside) {
        geofence.isInside = true;
        geofence.lastEnterTime = Date.now();
        geofence.enterCount++;
        this.triggerEnterEvent(geofence, location);
      } else if (!isInside && wasInside) {
        geofence.isInside = false;
        geofence.lastExitTime = Date.now();
        geofence.exitCount++;
        this.triggerExitEvent(geofence, location);
      }
    });

    this.lastLocation = location;
  }

  triggerEnterEvent(geofence, location) {
    this.enterCallbacks.forEach((callback) => {
      try {
        callback(geofence, location);
      } catch (error) {
        console.error('enter callback error:', error);
      }
    });
  }

  triggerExitEvent(geofence, location) {
    this.exitCallbacks.forEach((callback) => {
      try {
        callback(geofence, location);
      } catch (error) {
        console.error('exit callback error:', error);
      }
    });
  }

  startMonitoring() {
    if (this.isMonitoring) {
      return;
    }

    LocationService.startLocationTracking({
      accuracy: 6,
      timeInterval: this.checkIntervalMs,
      callback: (location) => {
        this.checkAllGeofences(location);
      },
    });

    this.checkInterval = setInterval(() => {
      const location = LocationService.getLocation();
      if (location) {
        this.checkAllGeofences(location);
      }
    }, this.checkIntervalMs);

    this.isMonitoring = true;
  }

  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    LocationService.stopLocationTracking();
    this.isMonitoring = false;
  }

  onEnter(callback) {
    if (typeof callback === 'function') {
      this.enterCallbacks.push(callback);
    }
  }

  onExit(callback) {
    if (typeof callback === 'function') {
      this.exitCallbacks.push(callback);
    }
  }

  removeEnterCallback(callback) {
    const index = this.enterCallbacks.indexOf(callback);
    if (index !== -1) {
      this.enterCallbacks.splice(index, 1);
    }
  }

  removeExitCallback(callback) {
    const index = this.exitCallbacks.indexOf(callback);
    if (index !== -1) {
      this.exitCallbacks.splice(index, 1);
    }
  }

  getGeofenceStats(geofenceId) {
    const geofence = this.getGeofence(geofenceId);
    if (!geofence) {
      return null;
    }

    return {
      id: geofence.id,
      name: geofence.name,
      isInside: geofence.isInside,
      enterCount: geofence.enterCount,
      exitCount: geofence.exitCount,
      lastEnterTime: geofence.lastEnterTime,
      lastExitTime: geofence.lastExitTime,
    };
  }

  reset() {
    this.stopMonitoring();
    this.geofences = [];
    this.enterCallbacks = [];
    this.exitCallbacks = [];
    this.lastLocation = null;
  }
}

export default new GeofenceService();
