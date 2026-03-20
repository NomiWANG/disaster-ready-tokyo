import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from '../languages';
import { useAlert } from '../context/AlertContext';
import { useTheme } from '../context/ThemeContext';
import { ALERT_LEVELS } from '../services/NotificationService';
import NewsService from '../services/NewsService';
import { useTasks } from '../context/TaskContext';
import EmergencyContactsService from '../services/EmergencyContactsService';
import GeofenceService from '../services/GeofenceService';
import WeatherAgencyApiService from '../services/WeatherAgencyApiService';
import SettingsMenu from '../components/SettingsMenu';
import ErrorBanner from '../components/ErrorBanner';

/**
 * ============================================
 * HomeScreen - 应用主屏幕
 * 
 * 功能布局：
 * 1. 顶部：灾害状态横幅（实时预警等级）
 * 2. 地震速报：来自气象厅的地震信息
 * 3. 紧急联系：常用紧急电话和自定义联系人
 * 4. 今日任务：推荐待完成的防灾任务
 * 5. 灾害新闻：最近的防灾相关新闻
 * 
 * 数据刷新策略：
 * - 地震数据：启动时加载，每30分钟自动刷新
 * - 新闻数据：启动时加载，每30分钟自动刷新
 * ============================================
 */
export default function HomeScreen({ onGoToProfile }) {
  const { t } = useTranslation();
  const { theme, fontScale } = useTheme();
  const { activeAlert } = useAlert();
  const { activeTasks } = useTasks();
  const [currentZone, setCurrentZone] = useState(null);
  const [earthquakeAlerts, setEarthquakeAlerts] = useState([]);
  const [loadingEarthquakes, setLoadingEarthquakes] = useState(true);
  const [earthquakeLoadError, setEarthquakeLoadError] = useState(false);

  // 动态样式，根据主题和字体缩放生成
  const styles = useMemo(() => createStyles(theme, fontScale), [theme, fontScale]);

  // 从气象厅API加载地震速报数据
  const loadEarthquakeData = useCallback(async () => {
    try {
      setLoadingEarthquakes(true);
      setEarthquakeLoadError(false);
      const alerts = await WeatherAgencyApiService.fetchAlerts({
        forceRefresh: false,
        useCache: true,
      });
      setEarthquakeAlerts(alerts || []);
    } catch (error) {
      console.error('[HomeScreen] 加载地震数据失败:', error);
      setEarthquakeAlerts([]);
      setEarthquakeLoadError(true);
    } finally {
      setLoadingEarthquakes(false);
    }
  }, []);

  // 组件挂载时加载数据，并设置定时刷新
  useEffect(() => {
    loadEarthquakeData();
    // 每30分钟自动刷新地震数据
    const interval = setInterval(loadEarthquakeData, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadEarthquakeData]);

  // 根据activeAlert状态计算灾害等级
  const getDisasterLevel = () => {
    if (!activeAlert) return 'safe';
    if (activeAlert === ALERT_LEVELS.URGENT) return 'urgent';
    if (activeAlert === ALERT_LEVELS.HIGH) return 'warning';
    return 'safe';
  };

  // 获取对应的国际化消息键
  const getMessageKey = () => {
    if (!activeAlert) return 'home.status.safe.message';
    if (activeAlert === ALERT_LEVELS.URGENT) return 'alerts.earthquake';
    if (activeAlert === ALERT_LEVELS.HIGH) return 'alerts.fire';
    if (activeAlert === ALERT_LEVELS.MEDIUM) return 'alerts.flood';
    return 'home.status.safe.message';
  };

  // 组装灾害状态对象
  const disasterStatus = {
    level: getDisasterLevel(),
    messageKey: getMessageKey(),
    area: t('map.subtitle'),
    time: new Date().toLocaleString(),
  };

  // 紧急状态下隐藏某些非必要功能
  const isEmergency = disasterStatus.level === 'urgent' || disasterStatus.level === 'warning';
  
  // 从地理围栏服务获取当前位置所在区域
  useEffect(() => {
    let isMounted = true;

    const updateZone = () => {
      try {
        const zone = GeofenceService.getCurrentZone();
        if (isMounted) {
          setCurrentZone(zone);
        }
      } catch (error) {
        console.error('[HomeScreen] 获取地理围栏区域失败:', error);
      }
    };

    updateZone();
    // 每15秒更新一次区域状态
    const interval = setInterval(updateZone, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // 根据半径大小返回区域标签
  const getZoneLabel = () => {
    if (!currentZone) {
      return null;
    }

    const radius = currentZone.radius || 0;

    // 600m以内：附近区域
    if (radius <= 600) {
      return t('home.zone.near');
    }

    // 6km以内：城市区域
    if (radius <= 6000) {
      return t('home.zone.city');
    }

    // 更大范围：区域
    return t('home.zone.region');
  };

  const zoneLabel = getZoneLabel();

  // 获取推荐任务，最多显示3个
  const recommendedTasks = useMemo(() => {
    return (activeTasks || []).slice(0, 3);
  }, [activeTasks]);

  // Emergency contacts
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [contactError, setContactError] = useState('');
  // 非紧急联系人折叠状态
  const [showNonEmergency, setShowNonEmergency] = useState(false);

  // Disaster news
  const [disasterNews, setDisasterNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);

  // 加载新闻和联系人数据
  useEffect(() => {
    const loadNews = async () => {
      try {
        const news = await NewsService.getAllNews({ limit: 6, timeRange: 'month' });
        // 如果API返回空数据，使用占位符新闻
        if (news.length > 0) {
          setDisasterNews(news);
        } else {
          setDisasterNews(NewsService.getPlaceholderNews());
        }
      } catch (error) {
        console.error('[HomeScreen] 加载新闻失败:', error);
        setDisasterNews(NewsService.getPlaceholderNews());
      } finally {
        setNewsLoading(false);
      }
    };

    loadNews();
    // 每30分钟刷新新闻
    const interval = setInterval(loadNews, 30 * 60 * 1000);

    // 加载紧急联系人列表
    const loadContacts = async () => {
      try {
        const list = await EmergencyContactsService.getContacts();
        setEmergencyContacts(list);
      } catch (error) {
        console.error('[HomeScreen] 加载紧急联系人失败:', error);
      }
    };

    loadContacts();

    return () => {
      clearInterval(interval);
    };
  }, []);

  // 根据预警级别获取对应的颜色
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
      case 'urgent':
        return '#C76D5B';
      case 'warning':
        return '#D7A45A';
      case 'safe':
        return '#8BA48F';
      default:
        return '#8BA48F';
    }
  };

  // 根据预警级别获取本地化文本
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

  const statusColor = getStatusColor(disasterStatus.level);
  const statusText = getStatusText(disasterStatus.level);
  
  // 表单验证：姓名和号码都不能为空
  const isContactValid =
    contactName.trim().length > 0 && contactNumber.trim().length > 0;

  // 地震警报等级对应的颜色
  const getAlertLevelColor = (level) => {
    const colorMap = {
      urgent: theme?.alertUrgent || '#D32F2F',
      high: theme?.alertHigh || '#F57C00',
      medium: theme?.alertMedium || '#FBC02D',
      low: theme?.alertLow || '#388E3C',
    };
    return colorMap[level] || theme?.textSecondary || '#999999';
  };

  // 添加自定义紧急联系人
  const handleAddContact = async () => {
    const trimmedName = contactName.trim();
    const trimmedNumber = contactNumber.trim();
    if (!trimmedName || !trimmedNumber) {
      setContactError(t('home.emergencyErrorRequired'));
      return;
    }
    try {
      const updated = await EmergencyContactsService.addContact({
        name: trimmedName,
        number: trimmedNumber,
      });
      setEmergencyContacts(updated);
      // 清空表单
      setContactName('');
      setContactNumber('');
      setContactError('');
      setContactModalVisible(false);
    } catch (error) {
      console.error('[HomeScreen] 添加联系人失败:', error);
    }
  };

  // 切换联系人固定状态
  const handleTogglePin = async (contactId) => {
    try {
      const updated = await EmergencyContactsService.togglePin(contactId);
      setEmergencyContacts(updated);
    } catch (error) {
      console.error('[HomeScreen] 切换固定状态失败:', error);
    }
  };

  // 统计已固定的联系人数量（最多固定2个）
  const pinnedCount = emergencyContacts.filter((c) => c.pinned === true).length;
  const maxPinned = 2;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 顶部导航栏 */}
      <View style={styles.headerContainer}>
        <View style={styles.headerSpacer} />
        <SettingsMenu variant="compact" />
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* ========== 灾害状态横幅 ========== */}
        {/* 根据当前预警等级显示不同颜色和文案 */}
        <View style={[styles.statusBanner, { backgroundColor: statusColor }]}>
          <View style={styles.statusHeader}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{statusText}</Text>
            </View>
            {/* 显示当前区域，如果有地理围栏数据 */}
            <Text style={styles.statusArea}>
              {zoneLabel
                ? `${disasterStatus.area} · ${zoneLabel}`
                : disasterStatus.area}
            </Text>
          </View>
          <Text style={styles.statusMessage}>{t(disasterStatus.messageKey)}</Text>
          <Text style={styles.statusTime}>{disasterStatus.time}</Text>
        </View>

        {/* ========== 地震速报（来自气象厅） ========== */}
        {/* 仅在加载失败时显示错误提示 */}
        {earthquakeLoadError && (
          <ErrorBanner type="api" onRetry={() => loadEarthquakeData()} />
        )}
        
        {/* 显示最新的地震警报，最多3条 */}
        {earthquakeAlerts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>{t('home.earthquakeAlerts')}</Text>
              <Text style={styles.alertCount}>{earthquakeAlerts.length} {t('home.alertsActive')}</Text>
            </View>
            {earthquakeAlerts.slice(0, 3).map((alert, index) => (
              <View key={alert.id || index} style={styles.earthquakeCard}>
                <View style={styles.earthquakeHeader}>
                  <Text style={styles.earthquakeTitle}>{alert.name}</Text>
                  <View style={[styles.earthquakeLevelBadge, { backgroundColor: getAlertLevelColor(alert.level) }]}>
                    <Text style={styles.earthquakeLevelText}>{t(`alerts.${alert.level}`)}</Text>
                  </View>
                </View>
                <Text style={styles.earthquakeDesc}>{alert.description}</Text>
                <Text style={styles.earthquakeTime}>
                  {new Date(alert.timestamp).toLocaleString('zh-CN', { 
                    month: 'short', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </Text>
              </View>
            ))}
            {earthquakeAlerts.length === 0 && !loadingEarthquakes && (
              <Text style={styles.sectionHint}>{t('home.noActiveEarthquakes')}</Text>
            )}
            {loadingEarthquakes && (
              <Text style={styles.sectionHint}>{t('home.loading')}</Text>
            )}
          </View>
        )}

        {/* ========== 紧急联系人 ========== */}
        <View style={styles.section}>
          <View className={undefined} style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('home.emergencyContacts')}</Text>
            {/* 添加自定义联系人按钮 */}
            <TouchableOpacity
              onPress={() => setContactModalVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={t('home.emergencyAddCustom')}
            >
              <Text style={styles.sectionLink}>{t('home.emergencyAddCustom')}</Text>
            </TouchableOpacity>
          </View>
          
          {/* 紧急电话（110、119等） */}
          <Text style={styles.emergencySubtitle}>{t('home.emergencyImmediate')}</Text>
          <View style={styles.contactsGrid}>
            {/* 内置紧急联系人 */}
            {emergencyContacts
              .filter((contact) => contact.isEmergency === true && contact.builtin === true)
              .map((contact) => (
                <TouchableOpacity key={contact.id} style={styles.contactCard}>
                  <Text style={styles.contactName}>
                    {contact.nameKey ? t(contact.nameKey) : contact.name || ''}
                  </Text>
                  <Text style={styles.contactNumber}>{contact.number}</Text>
                </TouchableOpacity>
              )            )}
            {/* 用户固定的自定义联系人 */}
            {emergencyContacts
              .filter((contact) => contact.pinned === true && contact.builtin === false)
              .map((contact) => (
                <TouchableOpacity key={contact.id} style={styles.contactCard}>
                  <Text style={styles.contactName}>
                    {contact.nameKey ? t(contact.nameKey) : contact.name || ''}
                  </Text>
                  <Text style={styles.contactNumber}>{contact.number}</Text>
                </TouchableOpacity>
              ))}
          </View>

          {/* 非紧急联系人折叠区域 */}
          <TouchableOpacity
            style={styles.nonEmergencyToggle}
            onPress={() => setShowNonEmergency(!showNonEmergency)}
          >
            <Text style={styles.nonEmergencyToggleText}>
              {t('home.emergencyNonEmergency')}
            </Text>
            <Text style={styles.nonEmergencyToggleIcon}>
              {showNonEmergency ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>

          {showNonEmergency && (
            <View style={styles.nonEmergencyList}>
              {/* 已固定的自定义联系人 */}
              {emergencyContacts.filter((contact) => contact.builtin === false && contact.pinned === true).length > 0 && (
                <>
                  <Text style={styles.nonEmergencySectionTitle}>{t('home.emergencyPinnedContacts')}</Text>
                  {emergencyContacts
                    .filter((contact) => contact.builtin === false && contact.pinned === true)
                    .map((contact) => (
                      <View key={contact.id} style={[styles.nonEmergencyCard, styles.pinnedCard]}>
                        <View style={styles.nonEmergencyCardHeader}>
                          <View style={styles.nonEmergencyCardTitleRow}>
                            <Text style={styles.nonEmergencyName}>
                              {contact.nameKey ? t(contact.nameKey) : contact.name || ''}
                            </Text>
                            <TouchableOpacity
                              style={styles.pinButton}
                              onPress={() => handleTogglePin(contact.id)}
                            >
                              <Text style={styles.pinButtonText}>
                                {t('home.emergencyUnpin')}
                              </Text>
                            </TouchableOpacity>
                          </View>
                          <Text style={styles.nonEmergencyNumber}>{contact.number}</Text>
                        </View>
                        <Text style={styles.pinHint}>{t('home.emergencyPinnedNote')}</Text>
                      </View>
                    ))}
                </>
              )}
              {/* 未固定的自定义联系人 */}
              {emergencyContacts
                .filter((contact) => contact.builtin === false && contact.pinned !== true)
                .map((contact) => (
                  <View key={contact.id} style={styles.nonEmergencyCard}>
                    <View style={styles.nonEmergencyCardHeader}>
                      <View style={styles.nonEmergencyCardTitleRow}>
                        <Text style={styles.nonEmergencyName}>
                          {contact.nameKey ? t(contact.nameKey) : contact.name || ''}
                        </Text>
                        <TouchableOpacity
                          style={styles.pinButton}
                          onPress={() => handleTogglePin(contact.id)}
                          disabled={pinnedCount >= maxPinned}
                        >
                          <Text style={[
                            styles.pinButtonText,
                            pinnedCount >= maxPinned && styles.pinButtonTextDisabled
                          ]}>
                            {t('home.emergencyPin')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.nonEmergencyNumber}>{contact.number}</Text>
                    </View>
                    {pinnedCount >= maxPinned && (
                      <Text style={styles.pinHint}>{t('home.emergencyPinLimit', { max: maxPinned })}</Text>
                    )}
                  </View>
                )              )}
              {/* 内置非紧急联系人 */}
              {emergencyContacts
                .filter((contact) => contact.isEmergency === false && contact.builtin === true)
                .map((contact) => (
                  <View key={contact.id} style={styles.nonEmergencyCard}>
                    <View style={styles.nonEmergencyCardHeader}>
                      <Text style={styles.nonEmergencyName}>
                        {contact.nameKey ? t(contact.nameKey) : contact.name || ''}
                      </Text>
                      <Text style={styles.nonEmergencyNumber}>{contact.number}</Text>
                    </View>
                    {contact.hours && (
                      <Text style={styles.nonEmergencyHours}>
                        {typeof contact.hours === 'string' && contact.hours.startsWith('home.emergency.')
                          ? t(contact.hours)
                          : contact.hours}
                      </Text>
                    )}
                    {contact.noteKey && (
                      <Text style={styles.nonEmergencyNote}>
                        {t(contact.noteKey)}
                      </Text>
                    )}
                  </View>
                ))}
            </View>
          )}
        </View>

        {/* ========== 今日任务（紧急状态下隐藏） ========== */}
        {!isEmergency && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>{t('home.todayTasks')}</Text>
              {recommendedTasks.length > 0 && (
                <TouchableOpacity onPress={onGoToProfile}>
                  <Text style={styles.sectionLink}>{t('home.todayTasksSeeAll')}</Text>
                </TouchableOpacity>
              )}
            </View>
            {recommendedTasks.length === 0 ? (
              <Text style={styles.sectionHint}>{t('home.todayTasksEmpty')}</Text>
            ) : (
              <View>
                {recommendedTasks.map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    style={styles.taskCard}
                    onPress={onGoToProfile}
                    accessibilityRole="button"
                    accessibilityLabel={t(`progress.${task.titleKey}`)}
                  >
                    <View style={styles.taskCardHeader}>
                      <Text style={styles.taskTitle}>
                        {t(`progress.${task.titleKey}`)}
                      </Text>
                      {!!task.rewards?.points && (
                        <Text style={styles.taskPoints}>
                          {t('progress.pointsLabel')} +{task.rewards.points}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.taskDesc} numberOfLines={2}>
                      {t(`progress.${task.descriptionKey}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ========== 灾害新闻 ========== */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.disasterNews')}</Text>
          {disasterNews.map((news) => {
            let tagKey = 'home.newsTag.general';
            if (news.isPlaceholder) {
              tagKey = 'home.newsTag.placeholder';
            } else if (news.category === 'disaster') {
              tagKey = 'home.newsTag.disaster';
            }

            return (
              <View key={news.id} style={styles.newsCard}>
                <View style={styles.newsHeader}>
                  <Text style={styles.newsTitle}>{news.title}</Text>
                </View>
                <View style={styles.newsMetaRow}>
                  <View style={styles.newsTag}>
                    <Text style={styles.newsTagText}>{t(tagKey)}</Text>
                  </View>
                  <Text style={styles.newsTime}>
                    {news.time} {news.unit === 'hours' ? t('home.hoursAgo') : t('home.daysAgo')}
                  </Text>
                </View>
                <Text style={styles.newsSummary}>{news.summary}</Text>
                <Text style={styles.newsSource}>{t('home.source')}: {news.source}</Text>
              </View>
            );
          })}
        {newsLoading && disasterNews.length === 0 && (
          <Text style={styles.newsSummary}>{t('home.loading')}</Text>
        )}
      </View>

        {/* ========== 添加联系人弹窗 ========== */}
        <Modal
          visible={contactModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setContactModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('home.emergencyAddCustom')}</Text>
              <Text style={styles.modalDescription}>
                {t('home.emergencyAddCustomDesc')}
              </Text>
              <Text style={styles.modalHint}>
                {t('home.emergencyCustomLocalNote')}
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder={t('home.emergencyNamePlaceholder')}
                value={contactName}
                onChangeText={(text) => {
                  setContactName(text);
                  if (contactError) setContactError('');
                }}
              />
              <TextInput
                style={styles.modalInput}
                placeholder={t('home.emergencyNumberPlaceholder')}
                value={contactNumber}
                onChangeText={(text) => {
                  setContactNumber(text);
                  if (contactError) setContactError('');
                }}
                keyboardType="phone-pad"
              />
              {!!contactError && (
                <Text style={styles.modalError}>{contactError}</Text>
              )}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSecondary]}
                  onPress={() => {
                    setContactModalVisible(false);
                    setContactName('');
                    setContactNumber('');
                  }}
                >
                  <Text style={styles.modalButtonSecondaryText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    isContactValid
                      ? styles.modalButtonPrimary
                      : styles.modalButtonPrimaryDisabled,
                  ]}
                  onPress={handleAddContact}
                >
                  <Text style={styles.modalButtonPrimaryText}>{t('common.save')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

// Dynamic style function
const createStyles = (theme, fontScale = 1.0) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme?.background || '#F4F1ED',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme?.border || '#E0D9CF',
  },
  headerSpacer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  // Status banner
  statusBanner: {
    padding: 20,
    marginBottom: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    backgroundColor: theme?.overlay || 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: theme?.textOnPrimary || '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusArea: {
    color: theme?.textOnPrimary || '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  statusMessage: {
    color: theme?.textOnPrimary || '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusTime: {
    color: theme?.textOnPrimary || '#FFFFFF',
    fontSize: 12,
  },
  // Section styles
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20 * fontScale,
    fontWeight: 'bold',
    color: theme?.text,
    marginBottom: 16,
  },
  alertCount: {
    fontSize: 13 * fontScale,
    color: theme?.textSecondary,
    fontWeight: '500',
  },
  earthquakeCard: {
    backgroundColor: theme?.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme?.borderSecondary || theme?.border,
    shadowColor: theme?.shadow || '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  earthquakeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  earthquakeTitle: {
    flex: 1,
    fontSize: 16 * fontScale,
    fontWeight: '600',
    color: theme?.text,
    marginRight: 8,
  },
  earthquakeLevelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  earthquakeLevelText: {
    color: theme?.textOnPrimary || '#FFFFFF',
    fontSize: 11 * fontScale,
    fontWeight: '600',
  },
  earthquakeDesc: {
    fontSize: 14 * fontScale,
    color: theme?.textSecondary,
    marginBottom: 8,
    lineHeight: 20 * fontScale,
  },
  earthquakeTime: {
    fontSize: 12 * fontScale,
    color: theme?.textTertiary,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionLink: {
    fontSize: 13,
    color: theme?.secondary,
    fontWeight: '500',
  },
  sectionHint: {
    fontSize: 14,
    color: theme?.textLight || theme?.textSecondary,
  },
  // Emergency contacts
  contactsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  contactCard: {
    width: '48%',
    backgroundColor: theme?.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme?.border,
    shadowColor: theme?.shadow || '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  contactName: {
    fontSize: 14,
    color: theme?.textSecondary,
    marginBottom: 4,
  },
  contactNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme?.error,
  },
  // Add contact modal
  modalOverlay: {
    flex: 1,
    backgroundColor: theme?.overlay || 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme?.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: theme?.shadow || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme?.text,
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: theme?.textSecondary || '#7D7670',
    marginBottom: 4,
  },
  modalHint: {
    fontSize: 12,
    color: theme?.textTertiary || '#9A9187',
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: theme?.border || '#E0D9CF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: theme?.surface || '#FAF7F2',
    fontSize: 14,
    color: theme?.text || '#3F3A3A',
  },
  modalError: {
    fontSize: 12,
    color: '#C76D5B',
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginLeft: 8,
  },
  modalButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E0D9CF',
  },
  modalButtonSecondaryText: {
    fontSize: 14,
    color: '#7D7670',
  },
  modalButtonPrimary: {
    backgroundColor: '#C76D5B',
  },
  modalButtonPrimaryDisabled: {
    backgroundColor: '#E0D9CF',
  },
  modalButtonPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emergencySubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7D7670',
    marginTop: 8,
    marginBottom: 12,
  },
  nonEmergencyToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: theme?.card || '#FAF7F2',
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme?.border || '#E0D9CF',
  },
  nonEmergencyToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme?.secondary || '#7B9FC4',
  },
  nonEmergencyToggleIcon: {
    fontSize: 12,
    color: theme?.secondary || '#7B9FC4',
  },
  nonEmergencyList: {
    marginTop: 8,
  },
  nonEmergencySectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme?.textSecondary || '#7D7670',
    marginTop: 8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  nonEmergencyCard: {
    backgroundColor: theme?.card || '#FAF7F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme?.border || '#E0D9CF',
  },
  nonEmergencyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nonEmergencyCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  nonEmergencyName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme?.text || '#3F3A3A',
    flex: 1,
  },
  pinButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#E7E2DC',
    marginLeft: 8,
  },
  pinButtonText: {
    fontSize: 11,
    color: '#7B9FC4',
    fontWeight: '500',
  },
  pinButtonTextDisabled: {
    color: '#9A9187',
  },
  pinHint: {
    fontSize: 11,
    color: '#9A9187',
    fontStyle: 'italic',
    marginTop: 4,
  },
  pinnedCard: {
    borderColor: '#7B9FC4',
    borderWidth: 2,
  },
  nonEmergencyNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7B9FC4',
  },
  nonEmergencyHours: {
    fontSize: 12,
    color: '#7D7670',
    marginBottom: 4,
  },
  nonEmergencyNote: {
    fontSize: 12,
    color: '#9A9187',
    lineHeight: 18,
  },
  // Disaster news
  newsCard: {
    backgroundColor: theme?.card || '#FAF7F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme?.border || '#E0D9CF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  newsMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme?.text || '#3F3A3A',
    flex: 1,
    marginRight: 12,
  },
  newsTime: {
    fontSize: 12,
    color: theme?.textTertiary || '#9A9187',
  },
  newsTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: theme?.surfaceSecondary || '#E7E2DC',
    marginRight: 8,
  },
  newsTagText: {
    fontSize: 11,
    color: theme?.textSecondary || '#7A6C5B',
    fontWeight: '500',
  },
  newsSummary: {
    fontSize: 14,
    color: theme?.textSecondary || '#7D7670',
    lineHeight: 20,
    marginBottom: 8,
  },
  newsSource: {
    fontSize: 12,
    color: theme?.textTertiary || '#9A9187',
    fontStyle: 'italic',
  },
  // Task card
  taskCard: {
    backgroundColor: theme?.card || '#FAF7F2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme?.border || '#E0D9CF',
  },
  taskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme?.text || '#3F3A3A',
    flex: 1,
    marginRight: 8,
  },
  taskPoints: {
    fontSize: 12,
    color: theme?.secondary || '#7B9FC4',
    fontWeight: '600',
  },
  taskDesc: {
    fontSize: 13,
    color: theme?.textSecondary || '#7D7670',
    lineHeight: 18,
  },
});