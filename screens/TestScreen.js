import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from '../languages';
import { useAlert } from '../context/AlertContext';
import { useGamification } from '../context/GamificationContext';
import { useTasks } from '../context/TaskContext';
import DisasterService from '../services/DisasterService';
import LocationService from '../services/LocationService';
import GeofenceService from '../services/GeofenceService';
import AlertService from '../services/AlertService';
import NotificationService, { ALERT_LEVELS } from '../services/NotificationService';
import TaskService from '../services/TaskService';
import GamificationService from '../services/GamificationService';

export default function TestScreen() {
  const { t } = useTranslation();
  const { activeAlert, triggerAlert, clearAlert } = useAlert();
  const { refresh: refreshGamification } = useGamification();
  const { refresh: refreshTasks } = useTasks();
  const [status, setStatus] = useState(null);
  const [location, setLocation] = useState(null);
  const [geofenceStats, setGeofenceStats] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [resetLogs, setResetLogs] = useState([]);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const currentStatus = await DisasterService.getStatus();
      setStatus(currentStatus);
      setLocation(currentStatus?.location?.current);
      setGeofenceStats(currentStatus?.geofences?.stats || []);
    } catch (error) {
      console.error('加载状态失败:', error);
    }
  };

  const testLocationPermission = async () => {
    setIsLoading(true);
    try {
      const result = await LocationService.requestPermissions();
      const yes = t('permissions.granted');
      const no = t('permissions.denied');
      Alert.alert(
        '',
        `${t('permissions.foreground')}: ${result.foreground ? yes : no}\n${t('permissions.background')}: ${result.background ? yes : no}`,
        [{ text: t('common.ok') }]
      );
      await loadStatus();
    } catch (error) {
      Alert.alert('', error.message || 'Failed');
    } finally {
      setIsLoading(false);
    }
  };

  const testGetCurrentLocation = async () => {
    setIsLoading(true);
    try {
      const result = await LocationService.getCurrentLocation();
      if (result.success) {
        Alert.alert(
          '',
          `${result.location.latitude.toFixed(6)}, ${result.location.longitude.toFixed(6)}\n${result.location.accuracy?.toFixed(0) || 'N/A'}m`,
          [{ text: t('common.ok') }]
        );
        await loadStatus();
      } else {
        Alert.alert('', result.error || 'Failed');
      }
    } catch (error) {
      Alert.alert('', error.message || 'Failed');
    } finally {
      setIsLoading(false);
    }
  };

  const testLocationAccuracy = () => {
    const accuracy = LocationService.validateLocationAccuracy();
    if (accuracy.count === 0) {
      Alert.alert('', 'No data');
      return;
    }
    Alert.alert(
      '',
      `Avg: ${accuracy.average || 'N/A'}m\nMin: ${accuracy.min || 'N/A'}m\nMax: ${accuracy.max || 'N/A'}m`,
      [{ text: t('common.ok') }]
    );
  };

  const testUpdateFrequency = () => {
    const frequency = LocationService.validateUpdateFrequency();
    if (frequency.count < 2) {
      Alert.alert('', 'No data');
      return;
    }
    Alert.alert(
      '',
      `Avg: ${frequency.averageInterval || 'N/A'}ms\nExpected: ${frequency.expectedInterval}ms`,
      [{ text: t('common.ok') }]
    );
  };

  const testNotification = async (level) => {
    setIsLoading(true);
    try {
      const levelNames = {
        [ALERT_LEVELS.URGENT]: t('alerts.urgent'),
        [ALERT_LEVELS.HIGH]: t('alerts.high'),
        [ALERT_LEVELS.MEDIUM]: t('alerts.medium'),
        [ALERT_LEVELS.LOW]: t('alerts.low'),
      };
      const result = await NotificationService.sendLocalNotification(
        `${levelNames[level]} ${t('alerts.notification')}`,
        t('alerts.checkNotification'),
        level,
        { test: true }
      );
      if (result.success) {
        Alert.alert(
          `${levelNames[level]} ${t('alerts.notification')}`,
          `${t('alerts.sent')} ${levelNames[level]} ${t('alerts.level')} ${t('alerts.notification')}`,
          [{ text: t('common.ok') }]
        );
      } else {
        Alert.alert('', result.error || 'Failed');
      }
    } catch (error) {
      Alert.alert('', error.message || 'Failed');
    } finally {
      setIsLoading(false);
    }
  };

  const testGeofenceEnter = () => {
    if (!location) {
      Alert.alert('', 'No location');
      return;
    }
    GeofenceService.addGeofence({
      id: 'test-temp-' + Date.now(),
      name: 'Test',
      latitude: location.latitude + 0.001,
      longitude: location.longitude + 0.001,
      radius: 200,
      type: 'test',
    });
    loadStatus();
  };

  const viewGeofenceStats = () => {
    if (geofenceStats.length === 0) {
      Alert.alert('', 'No data');
      return;
    }
    const statsText = geofenceStats
      .map((stat) => {
        // Translate name by ID
        let translatedName = stat.name;
        if (stat.id === 'test-500m') translatedName = t('test.geofence500m');
        else if (stat.id === 'test-1km') translatedName = t('test.geofence1km');
        else if (stat.id === 'test-5km') translatedName = t('test.geofence5km');
        else if (stat.id.startsWith('test-temp-')) translatedName = t('test.geofenceTemp');
        
        return `${translatedName}: ${t('test.geofenceEnter')} ${stat.enterCount}, ${t('test.geofenceExit')} ${stat.exitCount}`;
      })
      .join('\n');
    Alert.alert(t('test.geofenceStatus'), statsText, [{ text: t('common.ok') }]);
  };

  const testAlertScenarios = async (scenario) => {
    setIsLoading(true);
    try {
      const scenarioLevels = {
        'nearby-urgent-earthquake': ALERT_LEVELS.URGENT,
        'medium-high-fire': ALERT_LEVELS.HIGH,
        'far-medium-flood': ALERT_LEVELS.MEDIUM,
        'very-far-low': ALERT_LEVELS.LOW,
      };
      const level = scenarioLevels[scenario] || ALERT_LEVELS.LOW;
      // Duration no longer auto-resets to 0
      triggerAlert(level, 0);
      
      await DisasterService.testAlertScenario(scenario);
      await loadStatus();
    } catch (error) {
      Alert.alert('', error.message || 'Failed');
    } finally {
      setIsLoading(false);
    }
  };

  const viewServiceStatus = () => {
    if (!status) {
      Alert.alert('', 'No status data');
      return;
    }
    const yes = t('permissions.granted');
    const no = t('permissions.denied');
    const statusText = [
      `${t('test.initialized')}: ${status.initialized ? yes : no}`,
      `${t('test.foreground')}: ${status.location?.permissions?.foreground ? yes : no}`,
      `${t('test.background')}: ${status.location?.permissions?.background ? yes : no}`,
      `${t('test.geofences')}: ${status.geofences?.count || 0} (${status.geofences?.monitoring ? t('test.monitoring') : t('test.notMonitoring')})`,
      `${t('test.alertSources')}: ${status.alerts?.sources || 0} (${status.alerts?.monitoring ? t('test.monitoring') : t('test.notMonitoring')})`,
      `${t('test.notifications')}: ${status.notifications?.configured ? t('test.configured') : t('test.notConfigured')}`,
    ].join('\n');
    Alert.alert(t('test.serviceStatus'), statusText, [{ text: t('common.ok') }]);
  };

  // Actual reset logic (previously inside Alert onPress)
  const performResetAll = async () => {
    setIsLoading(true);
    setResetLogs([]); // Clear previous logs
    console.log('=== Starting full data reset ===');
    try {
      const logs = [];
      const addLog = (message, type = 'info') => {
        const logEntry = `[${new Date().toLocaleTimeString()}] ${message}`;
        logs.push({ message: logEntry, type });
        setResetLogs([...logs]);
        // Use different console methods based on type for easier debugging
        if (type === 'error') {
          console.error(logEntry);
        } else if (type === 'warn') {
          console.warn(logEntry);
        } else if (type === 'success') {
          console.log('%c' + logEntry, 'color: green; font-weight: bold');
        } else {
          console.log(logEntry);
        }
      };
      
      addLog('Starting full data reset...');

      // Clear service layer cache first
      TaskService.clearCache();
      GamificationService.clearCache();
      addLog('Service layer cache cleared');

      // Clear all related AsyncStorage keys with try-catch to ensure each key is processed
      const keysToRemove = [
        'tasks:v1',
        'gamification:v1',
        'emergency_kit_items',
        'emergency_kit_completion',
        'first_kit_started',
        'read_articles',
        'community:v1',
        'alerts:v1',
      ];

      for (const key of keysToRemove) {
        try {
          await AsyncStorage.removeItem(key);
          addLog(`已清除: ${key}`);
        } catch (error) {
          addLog(`Failed to clear ${key}: ${error.message}`, 'error');
        }
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      addLog('Resetting task system...');
      await TaskService.reset();
      addLog('Task system reset');

      addLog('Resetting gamification system...');
      await GamificationService.reset();
      addLog('Gamification system reset');

      // Wait for reset operations to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Clear geofence stats by removing all geofences
      try {
        const allGeofences = GeofenceService.getAllGeofences();
        const geofenceIds = allGeofences.map(g => g.id);
        geofenceIds.forEach(geofenceId => {
          GeofenceService.removeGeofence(geofenceId);
        });
        addLog(`Cleared ${geofenceIds.length} geofences`);
      } catch (error) {
        addLog(`Failed to clear geofences: ${error.message}`, 'error');
      }

      clearAlert();
      addLog('Alert state cleared');

      const verifyKitItems = await AsyncStorage.getItem('emergency_kit_items');
      const verifyKitCompletion = await AsyncStorage.getItem('emergency_kit_completion');
      const verifyFirstKit = await AsyncStorage.getItem('first_kit_started');
      const verifyReadArticles = await AsyncStorage.getItem('read_articles');

      if (verifyKitItems || verifyKitCompletion || verifyFirstKit) {
        addLog('Emergency kit data still exists, force clearing...', 'warn');
        await AsyncStorage.multiRemove([
          'emergency_kit_items',
          'emergency_kit_completion',
          'first_kit_started',
        ]);
        addLog('Emergency kit data force cleared');
      }

      if (verifyReadArticles) {
        addLog('Read articles data still exists, force clearing...', 'warn');
        await AsyncStorage.removeItem('read_articles');
        addLog('Read articles data force cleared');
      }

      const taskState = await TaskService.getActiveTasks();
      const gamificationState = await GamificationService.sync();

      addLog('Reset complete, verification results:');
      addLog(`- Emergency kit items: ${verifyKitItems ? 'still exists' : 'cleared'}`);
      addLog(`- Emergency kit completion: ${verifyKitCompletion ? 'still exists' : 'cleared'}`);
      addLog(`- First kit started flag: ${verifyFirstKit ? 'still exists' : 'cleared'}`);
      addLog(`- Read articles: ${verifyReadArticles ? 'still exists' : 'cleared'}`);
      addLog(`- Task count: ${taskState.length}`);
      addLog(`- Points: ${gamificationState.points}`);
      addLog(`- Badge count: ${gamificationState.badges?.length || 0}`);

      await GamificationService.sync();

      await new Promise(resolve => setTimeout(resolve, 100));

      await refreshGamification();
      await refreshTasks();
      await loadStatus();

      addLog('All contexts refreshed', 'success');

      const recentLogs = logs.slice(-5).map(l => l.message).join('\n');
      Alert.alert(
        t('test.resetAll.success'),
        `${t('test.resetAll.successMessage')}\n\n最近日志:\n${recentLogs}\n\n完整日志请查看下方日志区域。`,
        [{ text: t('common.ok') }]
      );
    } catch (error) {
      console.error('=== Reset failed ===', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      Alert.alert(
        t('common.error'),
        `${t('test.resetAll.error')}\n\nError: ${error.message}`,
        [{ text: t('common.ok') }]
      );
    } finally {
      setIsLoading(false);
      console.log('=== Reset operation complete ===');
    }
  };

  // Full reset functionality - platform-specific (Web vs Native)
  const handleResetAll = () => {
    // Web platform: Alert.alert buttons don't work on Web, so use window.confirm
    if (Platform.OS === 'web') {
      const confirmed =
        typeof window !== 'undefined'
          ? window.confirm(`${t('test.resetAll.title')}\n\n${t('test.resetAll.message')}`)
          : true;
      if (!confirmed) return;
      // Don't await - internally handles loading and logs
      performResetAll();
      return;
    }

    // Native platform - use Alert.alert confirm button
    Alert.alert(
      t('test.resetAll.title'),
      t('test.resetAll.message'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('test.resetAll.confirm'),
          style: 'destructive',
          onPress: performResetAll,
        },
      ]
    );
  };

  const getAlertBackgroundColor = () => {
    if (!activeAlert) return '#F5F5F5';
    const colors = {
      [ALERT_LEVELS.URGENT]: '#FFEBEE',  // Light red
      [ALERT_LEVELS.HIGH]: '#FFF3E0',     // Light orange
      [ALERT_LEVELS.MEDIUM]: '#FFFDE7',  // Light yellow
      [ALERT_LEVELS.LOW]: '#E3F2FD',     // Light blue
    };
    return colors[activeAlert] || '#F5F5F5';
  };

  const getAlertBannerStyle = () => {
    if (!activeAlert) return null;
    const colors = {
      [ALERT_LEVELS.URGENT]: '#F44336',
      [ALERT_LEVELS.HIGH]: '#FF9800',
      [ALERT_LEVELS.MEDIUM]: '#FFC107',
      [ALERT_LEVELS.LOW]: '#2196F3',
    };
    return { backgroundColor: colors[activeAlert] };
  };

  const getAlertLevelName = () => {
    if (!activeAlert) return '';
    const names = {
      [ALERT_LEVELS.URGENT]: t('alerts.urgent'),
      [ALERT_LEVELS.HIGH]: t('alerts.high'),
      [ALERT_LEVELS.MEDIUM]: t('alerts.medium'),
      [ALERT_LEVELS.LOW]: t('alerts.low'),
    };
    return names[activeAlert] || '';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: getAlertBackgroundColor() }]} edges={['top']}>
      {activeAlert && (
        <View style={[styles.alertBanner, getAlertBannerStyle()]}>
          <Text style={styles.alertBannerText}>
            {getAlertLevelName()} {t('alerts.notification')}
          </Text>
        </View>
      )}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={testLocationPermission}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>{t('test.requestPermission')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={testGetCurrentLocation}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>{t('test.getCurrentLocation')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={testLocationAccuracy}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>{t('test.validateAccuracy')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={testUpdateFrequency}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>{t('test.validateFrequency')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={testGeofenceEnter}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>{t('test.createTestGeofence')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={viewGeofenceStats}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>{t('test.viewGeofenceStats')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.button, styles.buttonUrgent, isLoading && styles.buttonDisabled]}
            onPress={() => testAlertScenarios('nearby-urgent-earthquake')}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>{t('test.scenario1')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonHigh, isLoading && styles.buttonDisabled]}
            onPress={() => testAlertScenarios('medium-high-fire')}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>{t('test.scenario2')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonMedium, isLoading && styles.buttonDisabled]}
            onPress={() => testAlertScenarios('far-medium-flood')}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>{t('test.scenario3')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonLow, isLoading && styles.buttonDisabled]}
            onPress={() => testAlertScenarios('very-far-low')}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>{t('test.scenario4')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonSafe, isLoading && styles.buttonDisabled]}
            onPress={() => clearAlert()}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>{t('test.scenarioReset')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={viewServiceStatus}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>{t('test.viewFullStatus')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.button, styles.buttonReset, isLoading && styles.buttonDisabled]}
            onPress={handleResetAll}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>{t('test.resetAll.button')}</Text>
          </TouchableOpacity>
          
          {resetLogs.length > 0 && (
            <View style={styles.logContainer}>
              <View style={styles.logHeader}>
                <Text style={styles.logTitle}>重置日志</Text>
                <TouchableOpacity
                  onPress={() => setResetLogs([])}
                  style={styles.clearLogButton}
                >
                  <Text style={styles.clearLogText}>清除</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.logScrollView} nestedScrollEnabled>
                {resetLogs.map((log, index) => (
                  <Text
                    key={index}
                    style={[
                      styles.logText,
                      log.type === 'error' && styles.logError,
                      log.type === 'warn' && styles.logWarn,
                      log.type === 'success' && styles.logSuccess,
                    ]}
                  >
                    {log.message}
                  </Text>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
  },
  alertBanner: {
    padding: 12,
    alignItems: 'center',
  },
  alertBannerText: {
    color: '#FAF7F2',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FAF7F2',
    margin: 20,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0D9CF',
  },
  button: {
    backgroundColor: '#7B9FC4',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#3F3A3A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FAF7F2',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonUrgent: {
    backgroundColor: '#C76D5B',
  },
  buttonHigh: {
    backgroundColor: '#D7A45A',
  },
  buttonMedium: {
    backgroundColor: '#D9BF77',
  },
  buttonLow: {
    backgroundColor: '#7B9FC4',
  },
  buttonSafe: {
    backgroundColor: '#88B498',
  },
  buttonReset: {
    backgroundColor: '#C76D5B',
  },
  logContainer: {
    marginTop: 16,
    backgroundColor: '#F4F1ED',
    borderRadius: 8,
    padding: 12,
    maxHeight: 300,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3F3A3A',
  },
  clearLogButton: {
    padding: 4,
    paddingHorizontal: 8,
  },
  clearLogText: {
    fontSize: 12,
    color: '#7B9FC4',
  },
  logScrollView: {
    maxHeight: 250,
  },
  logText: {
    fontSize: 11,
    color: '#7D7670',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  logError: {
    color: '#C76D5B',
  },
  logWarn: {
    color: '#D7A45A',
  },
  logSuccess: {
    color: '#88B498',
  },
});

