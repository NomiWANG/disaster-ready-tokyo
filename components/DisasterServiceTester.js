import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import DisasterService from '../services/DisasterService';
import LocationService from '../services/LocationService';
import GeofenceService from '../services/GeofenceService';
import AlertService, { AlertSource } from '../services/AlertService';
import NotificationService, { ALERT_LEVELS } from '../services/NotificationService';

/**
 * 灾害服务测试组件
 * 用于测试和验证所有核心功能
 */
export default function DisasterServiceTester() {
  const [status, setStatus] = useState(null);
  const [location, setLocation] = useState(null);
  const [geofenceStats, setGeofenceStats] = useState([]);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    const currentStatus = await DisasterService.getStatus();
    setStatus(currentStatus);
    setLocation(currentStatus?.location?.current);
    setGeofenceStats(currentStatus?.geofences?.stats || []);
  };

  const testLocationPermission = async () => {
    const result = await LocationService.requestPermissions();
    Alert.alert(
      '位置权限',
      `前台: ${result.foreground ? '已授予' : '未授予'}\n后台: ${result.background ? '已授予' : '未授予'}`
    );
    loadStatus();
  };

  const testGetCurrentLocation = async () => {
    const result = await LocationService.getCurrentLocation();
    if (result.success) {
      Alert.alert(
        '当前位置',
        `纬度: ${result.location.latitude.toFixed(6)}\n经度: ${result.location.longitude.toFixed(6)}\n精度: ${result.location.accuracy?.toFixed(0) || 'N/A'}米`
      );
      loadStatus();
    } else {
      Alert.alert('错误', result.error || '无法获取位置');
    }
  };

  const testLocationAccuracy = () => {
    const accuracy = LocationService.validateLocationAccuracy();
    Alert.alert(
      '位置精度验证',
      `平均精度: ${accuracy.average || 'N/A'}米\n最小精度: ${accuracy.min || 'N/A'}米\n最大精度: ${accuracy.max || 'N/A'}米\n样本数: ${accuracy.count}`
    );
  };

  const testUpdateFrequency = () => {
    const frequency = LocationService.validateUpdateFrequency();
    Alert.alert(
      '更新频率验证',
      `平均间隔: ${frequency.averageInterval || 'N/A'}ms\n期望间隔: ${frequency.expectedInterval}ms\n偏差: ${frequency.deviation || 'N/A'}ms\n样本数: ${frequency.count}`
    );
  };

  const testNotification = async (level) => {
    const levelNames = {
      [ALERT_LEVELS.URGENT]: '紧急',
      [ALERT_LEVELS.HIGH]: '高级',
      [ALERT_LEVELS.MEDIUM]: '中级',
      [ALERT_LEVELS.LOW]: '低级',
    };

    const result = await NotificationService.sendLocalNotification(
      `测试${levelNames[level]}警报`,
      `这是一个${levelNames[level]}级别的测试通知`,
      level,
      { test: true }
    );

    if (result.success) {
      Alert.alert('成功', `已发送${levelNames[level]}级别通知`);
    } else {
      Alert.alert('错误', result.error || '发送通知失败');
    }
  };

  const testGeofenceEnter = () => {
    if (!location) {
      Alert.alert('错误', '请先获取当前位置');
      return;
    }

    // Create temporary test geofence
    GeofenceService.addGeofence({
      id: 'test-temp',
      name: '临时测试围栏',
      latitude: location.latitude + 0.001, // ~100 meters
      longitude: location.longitude + 0.001,
      radius: 200, // 200 meter radius
      type: 'test',
    });

    Alert.alert('提示', '已创建临时测试围栏，请移动到围栏范围内测试进入事件');
    loadStatus();
  };

  const testAlertScenarios = async (scenario) => {
    await DisasterService.testAlertScenario(scenario);
    Alert.alert('成功', '已执行模拟场景，请查看通知');
    loadStatus();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>位置服务测试</Text>
        
        <TouchableOpacity style={styles.button} onPress={testLocationPermission}>
          <Text style={styles.buttonText}>1. 请求位置权限</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={testGetCurrentLocation}>
          <Text style={styles.buttonText}>2. 获取当前位置</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={testLocationAccuracy}>
          <Text style={styles.buttonText}>3. 验证位置精度</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={testUpdateFrequency}>
          <Text style={styles.buttonText}>4. 验证更新频率</Text>
        </TouchableOpacity>

        {location && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>当前位置:</Text>
            <Text style={styles.infoText}>
              {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            </Text>
            <Text style={styles.infoText}>精度: {location.accuracy?.toFixed(0) || 'N/A'}米</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>推送通知测试</Text>
        
        <TouchableOpacity
          style={[styles.button, styles.buttonUrgent]}
          onPress={() => testNotification(ALERT_LEVELS.URGENT)}
        >
          <Text style={styles.buttonText}>紧急警报</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonHigh]}
          onPress={() => testNotification(ALERT_LEVELS.HIGH)}
        >
          <Text style={styles.buttonText}>高级警报</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonMedium]}
          onPress={() => testNotification(ALERT_LEVELS.MEDIUM)}
        >
          <Text style={styles.buttonText}>中级警报</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonLow]}
          onPress={() => testNotification(ALERT_LEVELS.LOW)}
        >
          <Text style={styles.buttonText}>低级警报</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>地理围栏测试</Text>
        
        <TouchableOpacity style={styles.button} onPress={testGeofenceEnter}>
          <Text style={styles.buttonText}>创建测试围栏</Text>
        </TouchableOpacity>

        {geofenceStats.length > 0 && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>围栏统计:</Text>
            {geofenceStats.map((stat, index) => (
              <Text key={index} style={styles.infoText}>
                {stat.name}: 进入{stat.enterCount}次, 离开{stat.exitCount}次
                {stat.isInside ? ' (当前在围栏内)' : ''}
              </Text>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>警报场景模拟</Text>
        
        <TouchableOpacity
          style={styles.button}
          onPress={() => testAlertScenarios('nearby-urgent-earthquake')}
        >
          <Text style={styles.buttonText}>场景1: 近距离紧急地震</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => testAlertScenarios('medium-high-fire')}
        >
          <Text style={styles.buttonText}>场景2: 中距离高级火灾</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => testAlertScenarios('far-medium-flood')}
        >
          <Text style={styles.buttonText}>场景3: 远距离中级洪水</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => testAlertScenarios('very-far-low')}
        >
          <Text style={styles.buttonText}>场景4: 超远距离低级(不应触发)</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>服务状态</Text>
        {status && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              初始化: {status.initialized ? '[x]' : '[ ]'}
            </Text>
            <Text style={styles.infoText}>
              位置权限: {status.location?.permissions?.foreground ? '前台[x]' : '前台[ ]'}{' '}
              {status.location?.permissions?.background ? '后台[x]' : '后台[ ]'}
            </Text>
            <Text style={styles.infoText}>
              地理围栏: {status.geofences?.count || 0}个,{' '}
              {status.geofences?.monitoring ? '监控中' : '未监控'}
            </Text>
            <Text style={styles.infoText}>
              警报源: {status.alerts?.sources || 0}个,{' '}
              {status.alerts?.monitoring ? '监控中' : '未监控'}
            </Text>
            <Text style={styles.infoText}>
              通知: {status.notifications?.configured ? '已配置' : '未配置'}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme?.background || '#F5F5F5',
      padding: 20,
    },
    section: {
      marginBottom: 24,
      backgroundColor: theme?.card || '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme?.border || '#E5E5EA',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme?.text || '#000',
      marginBottom: 12,
    },
    button: {
      backgroundColor: theme?.primary || '#007AFF',
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
      alignItems: 'center',
    },
    buttonText: {
      color: theme?.textOnPrimary || '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    buttonUrgent: {
      backgroundColor: theme?.error || '#F44336',
    },
    buttonHigh: {
      backgroundColor: theme?.warning || '#FF9800',
    },
    buttonMedium: {
      backgroundColor: theme?.info || '#FFC107',
    },
    buttonLow: {
      backgroundColor: theme?.info || '#2196F3',
    },
    infoBox: {
      backgroundColor: theme?.surfaceSecondary || '#F5F5F5',
      borderRadius: 8,
      padding: 12,
      marginTop: 12,
    },
    infoText: {
      fontSize: 12,
      color: theme?.textSecondary || '#666',
      marginBottom: 4,
    },
  });

















