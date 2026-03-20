import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from '../languages';
import { useTheme } from '../context/ThemeContext';
import NotificationPreferencesStorage, { NOTIFICATION_TYPES } from '../storage/notificationPreferences.storage';

export default function NotificationPreferencesScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await NotificationPreferencesStorage.load();
      setPreferences(prefs);
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
      Alert.alert(t('common.error'), error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGlobal = async () => {
    try {
      const newValue = !preferences.enabled;
      const updated = await NotificationPreferencesStorage.updateGlobalEnabled(newValue);
      setPreferences(updated);
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  const handleToggleType = async (type) => {
    try {
      const newValue = !preferences.types[type];
      const updated = await NotificationPreferencesStorage.updateTypeEnabled(type, newValue);
      setPreferences(updated);
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  const handleToggleQuietHours = async () => {
    try {
      const newValue = !preferences.quietHours.enabled;
      const updated = await NotificationPreferencesStorage.updateQuietHours({ enabled: newValue });
      setPreferences(updated);
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  const handleToggleAllowHighPriority = async () => {
    try {
      const newValue = !preferences.quietHours.allowHighPriority;
      const updated = await NotificationPreferencesStorage.updateQuietHours({ allowHighPriority: newValue });
      setPreferences(updated);
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  const handleToggleSound = async () => {
    try {
      const newValue = !preferences.sound;
      const updated = await NotificationPreferencesStorage.updateSound(newValue);
      setPreferences(updated);
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  const handleToggleVibration = async () => {
    try {
      const newValue = !preferences.vibration;
      const updated = await NotificationPreferencesStorage.updateVibration(newValue);
      setPreferences(updated);
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  const getNotificationTypeIcon = (type) => {
    const icons = {
      [NOTIFICATION_TYPES.ALERT]: '警',
      [NOTIFICATION_TYPES.TASK_REMINDER]: '任',
      [NOTIFICATION_TYPES.DAILY_CHECKIN]: '日',
      [NOTIFICATION_TYPES.COMMUNITY]: '社',
      [NOTIFICATION_TYPES.EMERGENCY_KIT]: '包',
      [NOTIFICATION_TYPES.WEATHER]: '天',
    };
    return icons[type] || '通';
  };

  if (loading || !preferences) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
        >
          <Text style={styles.backButtonText}>{t('common.back')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>{t('notificationPreferences.title')}</Text>
          <Text style={styles.subtitle}>{t('notificationPreferences.subtitle')}</Text>

          {/* 总开关 */}
          <View style={styles.section}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>通</Text>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>{t('notificationPreferences.enableNotifications')}</Text>
                  <Text style={styles.settingDesc}>{t('notificationPreferences.enableNotificationsDesc')}</Text>
                </View>
              </View>
              <Switch
                value={preferences.enabled}
                onValueChange={handleToggleGlobal}
                trackColor={{ false: theme.border || '#E5E5EA', true: theme.success || '#4CAF50' }}
                thumbColor={preferences.enabled ? (theme.card || '#fff') : (theme.surfaceSecondary || '#f4f3f4')}
              />
            </View>
          </View>

          {/* 通知类型 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('notificationPreferences.notificationTypes')}</Text>
            {Object.values(NOTIFICATION_TYPES).map((type) => (
              <View key={type} style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingIcon}>{getNotificationTypeIcon(type)}</Text>
                  <View style={styles.settingText}>
                    <Text style={styles.settingLabel}>
                      {t(`notificationPreferences.types.${type}`)}
                    </Text>
                    <Text style={styles.settingDesc}>
                      {t(`notificationPreferences.typesDesc.${type}`)}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={preferences.enabled && preferences.types[type]}
                  onValueChange={() => handleToggleType(type)}
                  disabled={!preferences.enabled}
                  trackColor={{ false: theme.border || '#E5E5EA', true: theme.primary || '#1976D2' }}
                  thumbColor={preferences.enabled && preferences.types[type] ? (theme.card || '#fff') : (theme.surfaceSecondary || '#f4f3f4')}
                />
              </View>
            ))}
          </View>

          {/* 勿扰模式 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('notificationPreferences.quietHours')}</Text>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>夜</Text>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>{t('notificationPreferences.enableQuietHours')}</Text>
                  <Text style={styles.settingDesc}>{t('notificationPreferences.quietHoursDesc')}</Text>
                </View>
              </View>
              <Switch
                value={preferences.quietHours.enabled}
                onValueChange={handleToggleQuietHours}
                disabled={!preferences.enabled}
                trackColor={{ false: theme.border || '#E5E5EA', true: '#9C27B0' }}
                thumbColor={preferences.quietHours.enabled ? (theme.card || '#fff') : (theme.surfaceSecondary || '#f4f3f4')}
              />
            </View>

            {preferences.quietHours.enabled && (
              <>
                <View style={styles.quietHoursTime}>
                  <Text style={styles.quietHoursTimeText}>
                    {preferences.quietHours.startTime} - {preferences.quietHours.endTime}
                  </Text>
                </View>
                <View style={styles.settingRow}>
                  <View style={styles.settingLeft}>
                    <Text style={styles.settingIcon}>!</Text>
                    <View style={styles.settingText}>
                      <Text style={styles.settingLabel}>{t('notificationPreferences.allowHighPriority')}</Text>
                      <Text style={styles.settingDesc}>{t('notificationPreferences.allowHighPriorityDesc')}</Text>
                    </View>
                  </View>
                  <Switch
                    value={preferences.quietHours.allowHighPriority}
                    onValueChange={handleToggleAllowHighPriority}
                    trackColor={{ false: theme.border || '#E5E5EA', true: '#FF5722' }}
                    thumbColor={preferences.quietHours.allowHighPriority ? (theme.card || '#fff') : (theme.surfaceSecondary || '#f4f3f4')}
                  />
                </View>
              </>
            )}
          </View>

          {/* 声音和振动 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('notificationPreferences.soundAndVibration')}</Text>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>声</Text>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>{t('notificationPreferences.sound')}</Text>
                  <Text style={styles.settingDesc}>{t('notificationPreferences.soundDesc')}</Text>
                </View>
              </View>
              <Switch
                value={preferences.sound}
                onValueChange={handleToggleSound}
                disabled={!preferences.enabled}
                trackColor={{ false: theme.border || '#E5E5EA', true: theme.warning || '#FF9800' }}
                thumbColor={preferences.sound ? (theme.card || '#fff') : (theme.surfaceSecondary || '#f4f3f4')}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>振</Text>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>{t('notificationPreferences.vibration')}</Text>
                  <Text style={styles.settingDesc}>{t('notificationPreferences.vibrationDesc')}</Text>
                </View>
              </View>
              <Switch
                value={preferences.vibration}
                onValueChange={handleToggleVibration}
                disabled={!preferences.enabled}
                trackColor={{ false: theme.border || '#E5E5EA', true: theme.warning || '#FF9800' }}
                thumbColor={preferences.vibration ? (theme.card || '#fff') : (theme.surfaceSecondary || '#f4f3f4')}
              />
            </View>
          </View>

          {/* 说明 */}
          <View style={styles.infoBox}>
            <Text style={styles.infoIcon}>i</Text>
            <Text style={styles.infoText}>{t('notificationPreferences.info')}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme?.background || '#F5F5F5',
  },
  header: {
    backgroundColor: theme?.card || '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme?.border || '#E5E5EA',
    paddingBottom: 10,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: theme?.primary || '#1976D2',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: theme?.textSecondary || '#666',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme?.text || '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme?.textSecondary || '#666',
    marginBottom: 24,
  },
  section: {
    backgroundColor: theme?.card || '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme?.text || '#000',
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme?.border || '#F5F5F5',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  settingIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme?.text || '#000',
    marginBottom: 4,
  },
  settingDesc: {
    fontSize: 13,
    color: theme?.textSecondary || '#666',
  },
  quietHoursTime: {
    backgroundColor: theme?.surface || '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
    alignItems: 'center',
  },
  quietHoursTimeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9C27B0',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: theme?.primaryLight || '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: theme?.primary || '#1976D2',
    lineHeight: 20,
  },
});
