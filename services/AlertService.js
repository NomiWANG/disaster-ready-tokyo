import LocationService from './LocationService';
import NotificationService, { ALERT_LEVELS } from './NotificationService';
import WeatherAgencyApiService from './WeatherAgencyApiService';
import AlertHistoryStorage from '../storage/alertHistory.storage';

/**
 * 警报数据源类
 * 用于封装来自不同API的警报信息
 */
export class AlertSource {
  constructor(id, name, latitude, longitude, level, type, description = '') {
    this.id = id;
    this.name = name;
    this.latitude = latitude;
    this.longitude = longitude;
    this.level = level;
    this.type = type;
    this.description = description;
    this.timestamp = Date.now();
    // 根据等级设置默认影响半径
    this.radius = this.getDefaultRadius(level);
  }

  // 根据警报等级返回默认影响半径（米）
  getDefaultRadius(level) {
    const map = {
      [ALERT_LEVELS.URGENT]: 10000,   // 紧急：10km
      [ALERT_LEVELS.HIGH]: 5000,       // 高：5km
      [ALERT_LEVELS.MEDIUM]: 2000,     // 中：2km
      [ALERT_LEVELS.LOW]: 1000,        // 低：1km
    };
    return map[level] || 2000;
  }
}

/**
 * ============================================
 * AlertService - 灾害警报处理服务
 * 
 * 功能说明：
 * - 管理来自气象厅等API的灾害警报
 * - 根据用户位置计算是否需要发送通知
 * - 实现通知节流，避免频繁打扰
 * - 记录通知历史用于统计
 * 
 * 通知策略：
 * - 不同等级有不同的最小通知间隔
 * - 超出影响半径不发送通知
 * - 计算通知优先级用于排序
 * 
 * 使用示例：
 * await AlertService.loadAlertsFromApi();
 * AlertService.startMonitoring();
 * ============================================
 */
class AlertService {
  alertSources = [];      // 当前活跃的警报列表
  notificationHistory = [];   // 通知发送历史
  
  // 各等级最小通知间隔（毫秒）
  minNotificationInterval = {
    [ALERT_LEVELS.URGENT]: 60000,      // 紧急：1分钟
    [ALERT_LEVELS.HIGH]: 300000,        // 高：5分钟
    [ALERT_LEVELS.MEDIUM]: 600000,      // 中：10分钟
    [ALERT_LEVELS.LOW]: 1800000,        // 低：30分钟
  };
  
  // 各等级最大通知距离（米）
  maxDistanceForNotification = {
    [ALERT_LEVELS.URGENT]: 20000,       // 紧急：20km
    [ALERT_LEVELS.HIGH]: 10000,         // 高：10km
    [ALERT_LEVELS.MEDIUM]: 5000,        // 中：5km
    [ALERT_LEVELS.LOW]: 2000,           // 低：2km
  };
  
  isMonitoring = false;        // 是否正在监控
  checkInterval = null;       // 检查定时器
  checkIntervalMs = 5000;     // 检查间隔

  // 添加警报数据源
  addAlertSource(alertSource) {
    if (!(alertSource instanceof AlertSource)) {
      console.error('[AlertService] 必须使用AlertSource实例');
      return false;
    }

    const idx = this.alertSources.findIndex((a) => a.id === alertSource.id);
    if (idx !== -1) {
      this.alertSources[idx] = alertSource;
    } else {
      this.alertSources.push(alertSource);
    }

    return true;
  }

  // 移除警报数据源
  removeAlertSource(alertSourceId) {
    const idx = this.alertSources.findIndex((a) => a.id === alertSourceId);
    if (idx !== -1) {
      this.alertSources.splice(idx, 1)[0];
      return true;
    }
    return false;
  }

  // 获取所有警报数据源
  getAllAlertSources() {
    return [...this.alertSources];
  }

  // 计算用户到警报的距离
  calculateDistanceToAlert(userLocation, alertSource) {
    if (!userLocation || !alertSource) {
      return null;
    }

    return LocationService.calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      alertSource.latitude,
      alertSource.longitude
    );
  }

  // 判断是否应该发送通知
  shouldSendNotification(alertSource, distance) {
    const maxDistance = this.maxDistanceForNotification[alertSource.level];
    // 超出最大距离，不发送
    if (distance > maxDistance) {
      return { shouldSend: false, reason: '超出通知范围' };
    }

    // 检查节流：同等级警报是否有最小间隔
    const last = this.getLastNotificationForAlert(alertSource.id);
    if (last) {
      const elapsed = Date.now() - last.timestamp;
      const minInterval = this.minNotificationInterval[alertSource.level];
      if (elapsed < minInterval) {
        return {
          shouldSend: false,
          reason: '节流中',
          timeUntilNext: minInterval - elapsed,
        };
      }
    }

    // 计算通知优先级
    const priority = this.calculateNotificationPriority(alertSource, distance);
    return { shouldSend: true, priority, distance };
  }

  // 计算通知优先级（考虑距离因素）
  calculateNotificationPriority(alertSource, distance) {
    const basePriority = {
      [ALERT_LEVELS.URGENT]: 100,
      [ALERT_LEVELS.HIGH]: 75,
      [ALERT_LEVELS.MEDIUM]: 50,
      [ALERT_LEVELS.LOW]: 25,
    };

    let priority = basePriority[alertSource.level] || 50;
    // 距离越近，优先级越高
    const distFactor = Math.max(0, 1 - distance / alertSource.radius);
    priority = Math.round(priority * (0.5 + 0.5 * distFactor));
    return priority;
  }

  // 获取某警报最近一次通知记录
  getLastNotificationForAlert(alertSourceId) {
    const notifs = this.notificationHistory.filter((n) => n.alertSourceId === alertSourceId);
    if (notifs.length === 0) {
      return null;
    }
    return notifs.sort((a, b) => b.timestamp - a.timestamp)[0];
  }

  // 处理单个警报：检查是否需要通知，然后发送
  async processAlert(alertSource, userLocation) {
    const distance = this.calculateDistanceToAlert(userLocation, alertSource);
    if (distance === null) {
      return { success: false, error: '无法获取用户位置' };
    }

    const decision = this.shouldSendNotification(alertSource, distance);

    if (!decision.shouldSend) {
      return {
        success: false,
        reason: decision.reason,
        distance,
        timeUntilNext: decision.timeUntilNext,
      };
    }

    const level = alertSource.level;
    const title = alertSource.name;
    const body = alertSource.description || '您所在区域收到灾害警报';

    try {
      // 发送本地推送通知
      await NotificationService.sendLocalNotification(title, body, level, {
        alertSourceId: alertSource.id,
        alertLevel: alertSource.level,
        alertType: alertSource.type,
        timestamp: alertSource.timestamp,
        priority: decision.priority,
      });

      // 记录到历史
      this.notificationHistory.push({
        alertSourceId: alertSource.id,
        timestamp: Date.now(),
        level,
      });

      // 持久化历史记录
      await this.saveAlertHistory();

      return {
        success: true,
        priority: decision.priority,
        distance,
      };
    } catch (error) {
      console.error('[AlertService] 发送通知失败:', error);
      return { success: false, error: '通知发送失败' };
    }
  }

  // 保存警报历史到本地存储
  async saveAlertHistory() {
    try {
      const historyData = {
        notifications: this.notificationHistory.slice(-100), // 仅保留最近100条
        lastUpdated: Date.now(),
      };
      await AlertHistoryStorage.save(historyData);
    } catch (error) {
      console.error('[AlertService] 保存历史记录失败:', error);
    }
  }

  // 从本地存储加载历史记录
  async loadAlertHistory() {
    try {
      const data = await AlertHistoryStorage.load();
      if (data && data.notifications) {
        this.notificationHistory = data.notifications;
      }
    } catch (error) {
      console.error('[AlertService] 加载历史记录失败:', error);
    }
  }

  // 启动警报监控
  startMonitoring() {
    if (this.isMonitoring) {
      return;
    }

    this.loadAlertHistory();

    // 定期检查所有警报
    this.checkInterval = setInterval(async () => {
      await this.checkAllAlerts();
    }, this.checkIntervalMs);

    this.isMonitoring = true;
    console.log('[AlertService] 警报监控已启动');
  }

  // 停止警报监控
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isMonitoring = false;
    console.log('[AlertService] 警报监控已停止');
  }

  // 检查所有警报
  async checkAllAlerts() {
    const location = LocationService.getLocation();
    if (!location || !location.latitude || !location.longitude) {
      return;
    }

    const results = [];
    for (const source of this.alertSources) {
      const result = await this.processAlert(source, location);
      results.push({ sourceId: source.id, result });
    }
    return results;
  }

  // 从API加载警报数据
  async loadAlertsFromApi(options = {}) {
    const { forceRefresh = false } = options;

    try {
      const alerts = await WeatherAgencyApiService.fetchAlerts({ forceRefresh });

      // 清空旧数据，加载新数据
      this.alertSources = [];

      for (const alert of alerts) {
        const source = new AlertSource(
          alert.id,
          alert.name,
          alert.latitude,
          alert.longitude,
          alert.level,
          alert.type,
          alert.description
        );
        source.timestamp = alert.timestamp || Date.now();
        source.radius = alert.radius || source.getDefaultRadius(alert.level);
        this.addAlertSource(source);
      }

      console.log(`[AlertService] 从API加载了 ${alerts.length} 条警报`);
      return this.getAllAlertSources();
    } catch (error) {
      console.error('[AlertService] 从API加载警报失败:', error);
      return this.getAllAlertSources();
    }
  }

  // 启动API定期刷新
  startApiRefresh(intervalMs = 300000) {
    // 默认每5分钟刷新一次
    setInterval(() => {
      this.loadAlertsFromApi({ forceRefresh: true });
    }, intervalMs);
  }

  // 清空所有警报源
  clearAlertSources() {
    this.alertSources = [];
  }

  // 按等级筛选警报
  getAlertsByLevel(level) {
    return this.alertSources.filter((a) => a.level === level);
  }

  // 按类型筛选警报
  getAlertsByType(type) {
    return this.alertSources.filter((a) => a.type === type);
  }

  // 获取通知历史
  getNotificationHistory() {
    return [...this.notificationHistory];
  }

  // 清空通知历史
  clearNotificationHistory() {
    this.notificationHistory = [];
    this.saveAlertHistory();
  }

  // 获取统计数据
  getStats() {
    return {
      totalAlerts: this.alertSources.length,
      byLevel: {
        urgent: this.getAlertsByLevel(ALERT_LEVELS.URGENT).length,
        high: this.getAlertsByLevel(ALERT_LEVELS.HIGH).length,
        medium: this.getAlertsByLevel(ALERT_LEVELS.MEDIUM).length,
        low: this.getAlertsByLevel(ALERT_LEVELS.LOW).length,
      },
      byType: this.alertSources.reduce((acc, a) => {
        acc[a.type] = (acc[a.type] || 0) + 1;
        return acc;
      }, {}),
      notificationsSent: this.notificationHistory.length,
    };
  }

  // 重置服务状态
  reset() {
    this.stopMonitoring();
    this.alertSources = [];
    this.notificationHistory = [];
    console.log('[AlertService] 服务已重置');
  }
}

export default new AlertService();
