import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from '../../languages';
import { useAlert } from '../../context/AlertContext';
import { useTheme } from '../../context/ThemeContext';
import { ALERT_LEVELS } from '../../services/NotificationService';

/**
 * 警报横幅组件
 * 显示当前活跃警报状态
 */
export default function AlertBanner({ currentZone }) {
  const { t } = useTranslation();
  const { theme, fontScale } = useTheme();
  const { activeAlert } = useAlert();

  const getDisasterLevel = () => {
    if (!activeAlert) return 'safe';
    if (activeAlert === ALERT_LEVELS.URGENT) return 'urgent';
    if (activeAlert === ALERT_LEVELS.HIGH) return 'warning';
    return 'safe';
  };

  const getMessageKey = () => {
    if (!activeAlert) return 'home.status.safe.message';
    if (activeAlert === ALERT_LEVELS.URGENT) return 'alerts.earthquake';
    if (activeAlert === ALERT_LEVELS.HIGH) return 'alerts.fire';
    if (activeAlert === ALERT_LEVELS.MEDIUM) return 'alerts.flood';
    return 'home.status.safe.message';
  };

  const getZoneLabel = () => {
    if (!currentZone) return null;
    const radius = currentZone.radius || 0;
    if (radius <= 600) return t('home.zone.near');
    if (radius <= 6000) return t('home.zone.city');
    return t('home.zone.region');
  };

  const getStatusColor = (level) => {
    if (activeAlert) {
      const alertColors = {
        [ALERT_LEVELS.URGENT]: '#C76D5B',
        [ALERT_LEVELS.HIGH]: '#D7A45A',
        [ALERT_LEVELS.MEDIUM]: '#D9BF77',
        [ALERT_LEVELS.LOW]: '#8799B3',
      };
      return alertColors[activeAlert] || '#8BA48F';
    }
    
    switch (level) {
      case 'urgent': return '#C76D5B';
      case 'warning': return '#D7A45A';
      case 'safe': return '#8BA48F';
      default: return '#8BA48F';
    }
  };

  const getStatusText = (level) => {
    if (activeAlert) {
      const alertNames = {
        [ALERT_LEVELS.URGENT]: t('alerts.urgent'),
        [ALERT_LEVELS.HIGH]: t('alerts.high'),
        [ALERT_LEVELS.MEDIUM]: t('alerts.medium'),
        [ALERT_LEVELS.LOW]: t('alerts.low'),
      };
      return alertNames[activeAlert] || t(`home.status.${level}`);
    }
    return t(`home.status.${level}`);
  };

  const disasterStatus = {
    level: getDisasterLevel(),
    messageKey: getMessageKey(),
    area: t('map.subtitle'),
    time: new Date().toLocaleString(),
  };

  const isEmergency = disasterStatus.level === 'urgent' || disasterStatus.level === 'warning';
  const statusColor = getStatusColor(disasterStatus.level);
  const statusText = getStatusText(disasterStatus.level);
  const zoneLabel = getZoneLabel();

  const styles = createStyles(theme, fontScale, statusColor, isEmergency);

  return (
    <View style={styles.statusCard}>
      <View style={styles.statusHeader}>
        <View style={styles.statusIndicator} />
        <Text style={styles.statusText}>{statusText}</Text>
        {zoneLabel && (
          <View style={styles.zoneIndicator}>
            <Text style={styles.zoneText}>{zoneLabel}</Text>
          </View>
        )}
      </View>
      <Text style={styles.statusMessage}>{t(disasterStatus.messageKey)}</Text>
      <View style={styles.statusFooter}>
        <Text style={styles.statusArea}>{disasterStatus.area}</Text>
        <Text style={styles.statusTime}>{disasterStatus.time}</Text>
      </View>
    </View>
  );
}

const createStyles = (theme, fontScale, statusColor, isEmergency) =>
  StyleSheet.create({
    statusCard: {
      backgroundColor: theme?.card || '#fff',
      borderRadius: 12,
      padding: 16 * fontScale,
      marginBottom: 16 * fontScale,
      borderLeftWidth: 4,
      borderLeftColor: statusColor,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    statusHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8 * fontScale,
    },
    statusIndicator: {
      width: 12 * fontScale,
      height: 12 * fontScale,
      borderRadius: 6 * fontScale,
      backgroundColor: statusColor,
      marginRight: 8 * fontScale,
    },
    statusText: {
      fontSize: 18 * fontScale,
      fontWeight: 'bold',
      color: theme?.text || '#000',
      flex: 1,
    },
    zoneIndicator: {
      backgroundColor: theme?.primaryLight || '#E3F2FD',
      paddingHorizontal: 8 * fontScale,
      paddingVertical: 4 * fontScale,
      borderRadius: 4,
    },
    zoneText: {
      fontSize: 12 * fontScale,
      color: theme?.primary || '#2196F3',
      fontWeight: '500',
    },
    statusMessage: {
      fontSize: 14 * fontScale,
      color: theme?.textSecondary || '#666',
      marginBottom: 12 * fontScale,
      lineHeight: 20 * fontScale,
    },
    statusFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: theme?.border || '#E5E5EA',
      paddingTop: 8 * fontScale,
    },
    statusArea: {
      fontSize: 12 * fontScale,
      color: theme?.textSecondary || '#666',
    },
    statusTime: {
      fontSize: 12 * fontScale,
      color: theme?.textSecondary || '#999',
    },
  });
