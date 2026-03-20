import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from '../languages';
import { useTheme } from '../context/ThemeContext';
import SettingsMenu from '../components/SettingsMenu';
import PointsPill from '../components/PointsPill';
import ProgressBar from '../components/ProgressBar';
import BadgeList from '../components/BadgeList';
import TaskList from '../components/TaskList';
import { useGamification } from '../context/GamificationContext';
import { useTasks } from '../context/TaskContext';
import badgesConfig from '../config/badges';
import StreakService from '../services/StreakService';
import LeaderboardService from '../services/LeaderboardService';
import tasksConfig from '../config/tasks';
import TaskService from '../services/TaskService';
import PrivacyStorage from '../storage/privacy.storage';

export default function ProfileScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme, fontScale } = useTheme();
  const { points, badges, progress, refresh: refreshGamification } = useGamification();
  const { tasks, completeTask, refresh: refreshTasks } = useTasks();
  const [streakDays, setStreakDays] = useState(0);
  const [shareLocationInCommunity, setShareLocationInCommunity] = useState(false);

  // Dynamic styles
  const styles = React.useMemo(() => createStyles(theme, fontScale), [theme, fontScale]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const state = await StreakService.getStreak();
        if (mounted) {
          setStreakDays(state.streakDays || 0);
        }
      } catch (error) {
        console.error('Failed to load streak state:', error);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const state = await PrivacyStorage.load();
        if (mounted) {
          setShareLocationInCommunity(state.shareLocationInCommunity || false);
        }
      } catch (error) {
        console.error('Failed to load privacy settings:', error);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleToggleLocationSharing = async () => {
    try {
      const newValue = !shareLocationInCommunity;
      await PrivacyStorage.save({ shareLocationInCommunity: newValue });
      setShareLocationInCommunity(newValue);
    } catch (error) {
      console.error('Failed to save privacy settings:', error);
    }
  };

  const displayTasks = useMemo(() => {
    return tasks.map((task) => ({
      ...task,
      title: t(`progress.${task.titleKey}`),
      description: t(`progress.${task.descriptionKey}`),
      points: task.rewards?.points || 0,
    }));
  }, [tasks, t]);

  const displayBadges = useMemo(() => {
    const earnedSet = new Set(badges);
    return badgesConfig.map((badge) => ({
      id: badge.id,
      title: t(badge.titleKey),
      description: t(badge.descriptionKey),
      achieved: earnedSet.has(badge.id),
    }));
  }, [badges, t]);

  const leaderboardData = useMemo(() => {
    const allUsers = LeaderboardService.getLeaderboard(points);
    const top5 = allUsers.slice(0, 5);
    const currentUser = allUsers.find((u) => u.isCurrentUser);
    
    // If current user is in top5, return top5
    if (top5.find((u) => u.isCurrentUser)) {
      return top5;
    }
    
    // If current user not in top5, show top4 + current user
    if (currentUser) {
      return [...top5.slice(0, 4), currentUser];
    }
    
    return top5;
  }, [points]);

  // Get daily checkin task
  const dailyCheckinTask = useMemo(() => {
    return tasks.find((task) => task.id === 'daily-checkin');
  }, [tasks]);

  const dailyCheckinConfig = useMemo(() => {
    return tasksConfig.find((config) => config.id === 'daily-checkin');
  }, []);

  const getNextCheckinTime = useMemo(() => {
    if (!dailyCheckinTask || !dailyCheckinConfig) return null;

    if (dailyCheckinTask.status !== 'completed') {
      return null;
    }

    const cooldownHours = dailyCheckinConfig.cooldownHours || 24;
    const lastCheckinTime = dailyCheckinTask.updatedAt || 0;
    const cooldownMs = cooldownHours * 60 * 60 * 1000;
    const nextCheckinTime = lastCheckinTime + cooldownMs;
    const now = Date.now();

    if (now >= nextCheckinTime) {
      return null;
    }

    return nextCheckinTime;
  }, [dailyCheckinTask, dailyCheckinConfig]);

  const formatNextCheckinTime = (timestamp) => {
    if (!timestamp) return '';
    
    const now = Date.now();
    const diff = timestamp - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return t('progress.checkinNextInHours', { hours, minutes });
    } else if (minutes > 0) {
      return t('progress.checkinNextInMinutes', { minutes });
    } else {
      return t('progress.checkinAvailable');
    }
  };

  const canCheckin = useMemo(() => {
    if (!dailyCheckinTask) return false;
    if (dailyCheckinTask.status !== 'completed') return true;
    return getNextCheckinTime === null;
  }, [dailyCheckinTask, getNextCheckinTime]);

  const handleCheckin = async () => {
    if (!canCheckin || !dailyCheckinTask) return;
    
    try {
      // If task completed and cooldown passed, reset task state first
      if (dailyCheckinTask.status === 'completed' && getNextCheckinTime === null) {
        await TaskService.resetTask('daily-checkin');
        await refreshTasks();
      }
      
      // Complete task
      await completeTask('daily-checkin', { checkinTime: Date.now() });
      await refreshGamification();
      await refreshTasks();
    } catch (error) {
      console.error('Failed to complete checkin:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* User profile */}
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <View style={styles.profileLeft}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatar} accessibilityLabel={t('progress.nicknamePlaceholder')}>
                  DR
                </Text>
              </View>
              <View style={styles.userTextBlock}>
                <Text style={styles.nickname} numberOfLines={1}>
                  {t('progress.nicknamePlaceholder')}
                </Text>
                <View style={styles.pointsRow}>
                  <PointsPill points={points} label={t('progress.pointsLabel')} />
                </View>
                <View style={styles.streakRow}>
                  <Text style={styles.streakIcon}>[x]</Text>
                  <Text style={styles.streakText}>
                    {t('progress.streakLabel', { days: streakDays })}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.profileRight}>
              <SettingsMenu variant="compact" />
              <TouchableOpacity
                style={styles.emergencyKitButton}
                onPress={() => navigation?.navigate('EmergencyKit')}
                accessibilityRole="button"
                accessibilityLabel={t('emergencyKit.title')}
              >
                <Text style={styles.emergencyKitIcon}>备</Text>
                <Text style={styles.emergencyKitText}>
                  {t('nav.emergencyKit')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Daily checkin */}
        {dailyCheckinTask && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('progress.dailyCheckin')}</Text>
            <View style={styles.checkinContainer}>
              <View style={styles.checkinInfo}>
                <Text style={styles.checkinTitle}>
                  {t(`progress.${dailyCheckinTask.titleKey}`)}
                </Text>
                <Text style={styles.checkinDescription}>
                  {t(`progress.${dailyCheckinTask.descriptionKey}`)}
                </Text>
                {dailyCheckinTask.rewards?.points && (
                  <Text style={styles.checkinReward}>
                    {t('progress.checkinReward', { points: dailyCheckinTask.rewards.points })}
                  </Text>
                )}
                {getNextCheckinTime && (
                  <Text style={styles.checkinNextTime}>
                    {formatNextCheckinTime(getNextCheckinTime)}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.checkinButton,
                  !canCheckin && styles.checkinButtonDisabled,
                ]}
                onPress={handleCheckin}
                disabled={!canCheckin}
              >
                <Text style={[
                  styles.checkinButtonText,
                  !canCheckin && styles.checkinButtonTextDisabled,
                ]}>
                  {canCheckin ? t('progress.checkinNow') : t('progress.checkinCompleted')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Gamification overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('progress.gamificationOverview')}</Text>
          <ProgressBar label={t('progress.levelProgress')} progress={progress?.percent || 0} />
          <BadgeList badges={displayBadges} />
        </View>

        {/* Tasks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('progress.tasks')}</Text>
          <TaskList
            tasks={displayTasks}
            onComplete={async (task) => {
              await completeTask(task.id);
              await refreshGamification();
            }}
          />
        </View>

        {/* Leaderboard */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('progress.leaderboard')}</Text>
          <View style={styles.leaderboardContainer}>
                  {leaderboardData.map((user, index) => (
              <View
                key={user.id}
                style={[
                  styles.leaderboardItem,
                  user.isCurrentUser && styles.leaderboardItemCurrent,
                ]}
              >
                <View style={styles.leaderboardRank}>
                  {user.rank <= 3 ? (
                    <Text style={styles.leaderboardRankIcon}>
                      {user.rank === 1 ? 'No.1' : user.rank === 2 ? 'No.2' : 'No.3'}
                    </Text>
                  ) : (
                    <Text style={styles.leaderboardRankNumber}>{user.rank}</Text>
                  )}
                </View>
                <View style={styles.leaderboardAvatar}>
                  <Text style={styles.leaderboardAvatarText}>{user.avatar}</Text>
                </View>
                <View style={styles.leaderboardInfo}>
                  <Text
                    style={[
                      styles.leaderboardName,
                      user.isCurrentUser && styles.leaderboardNameCurrent,
                    ]}
                  >
                    {user.isCurrentUser ? t('progress.you') : user.name}
                  </Text>
                  <Text style={styles.leaderboardPoints}>
                    {user.points} {t('progress.pointsUnit')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Knowledge section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('progress.knowledgeSection')}</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation?.navigate('Knowledge')}
            >
              <Text style={styles.actionButtonIcon}>知</Text>
              <Text style={styles.actionButtonText}>{t('progress.learnKnowledge')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation?.navigate('Quiz')}
            >
              <Text style={styles.actionButtonIcon}>测</Text>
              <Text style={styles.actionButtonText}>{t('progress.takeQuiz')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Family members */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('familyMembers.title')}</Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation?.navigate('FamilyMembers')}
          >
            <Text style={styles.actionButtonIcon}>家</Text>
            <Text style={styles.actionButtonText}>{t('familyMembers.subtitle')}</Text>
          </TouchableOpacity>
        </View>

        {/* Notification preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('notificationPreferences.title')}</Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation?.navigate('NotificationPreferences')}
          >
            <Text style={styles.actionButtonIcon}>通</Text>
            <Text style={styles.actionButtonText}>{t('notificationPreferences.subtitle')}</Text>
          </TouchableOpacity>
        </View>

        {/* About / Help / Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.aboutTitle')}</Text>
          <Text style={styles.bodyText}>{t('profile.aboutBody')}</Text>

          <View style={styles.sectionSpacer} />

          <Text style={styles.sectionTitle}>{t('profile.helpTitle')}</Text>
          <Text style={styles.bodyText}>{t('profile.helpBody')}</Text>

          <View style={styles.sectionSpacer} />

          <Text style={styles.sectionTitle}>{t('profile.privacyTitle')}</Text>
          <Text style={styles.bodyText}>{t('profile.privacyBody')}</Text>

          {/* Location sharing toggle */}
          <View style={styles.privacySetting}>
            <View style={styles.privacySettingLeft}>
              <Text style={styles.privacySettingLabel}>
                {t('profile.shareLocationInCommunity')}
              </Text>
              <Text style={styles.privacySettingDesc}>
                {t('profile.shareLocationInCommunityDesc')}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.privacySwitch,
                shareLocationInCommunity && styles.privacySwitchActive
              ]}
              onPress={handleToggleLocationSharing}
            >
              <View style={[
                styles.privacySwitchThumb,
                shareLocationInCommunity && styles.privacySwitchThumbActive
              ]} />
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Style function based on theme and fontScale
const createStyles = (theme, fontScale = 1.0) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme?.background || '#F4F1ED',
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: theme?.card || '#FAF7F2',
    paddingVertical: 30,
    paddingHorizontal: 20,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme?.borderSecondary || '#E0D9CF',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },
  profileRight: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    gap: 8,
  },
  emergencyKitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: theme?.surfaceSecondary || '#E7E2DC',
    borderWidth: 1,
    borderColor: theme?.languageSelectorBorder || '#D4C9BC',
    maxWidth: 140,
  },
  emergencyKitIcon: {
    fontSize: 13 * fontScale,
    marginRight: 5,
  },
  emergencyKitText: {
    fontSize: 12 * fontScale,
    color: theme?.secondary || '#7B9FC4',
    fontWeight: '600',
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme?.surfaceSecondary || '#D4DEDF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    fontSize: 34 * fontScale,
  },
  userTextBlock: {
    marginLeft: 12,
    flex: 1,
    minWidth: 0,
  },
  nickname: {
    fontSize: 20 * fontScale,
    fontWeight: 'bold',
    color: theme?.text || '#3F3A3A',
    marginTop: 2,
  },
  pointsRow: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  streakRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakIcon: {
    fontSize: 14 * fontScale,
    marginRight: 4,
  },
  streakText: {
    fontSize: 13 * fontScale,
    color: theme?.textLight || '#7D7670',
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18 * fontScale,
    fontWeight: '600',
    color: theme?.text || '#3F3A3A',
    marginBottom: 10,
  },
  sectionSpacer: {
    height: 12,
  },
  bodyText: {
    fontSize: 14 * fontScale,
    lineHeight: 20 * fontScale,
    color: theme?.textSecondary || '#7D7670',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: theme?.card || '#FAF7F2',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme?.secondary || '#7B9FC4',
    shadowColor: theme?.text || '#3F3A3A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonIcon: {
    fontSize: 32 * fontScale,
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 16 * fontScale,
    fontWeight: '600',
    color: theme?.secondary || '#7B9FC4',
    textAlign: 'center',
  },
  leaderboardContainer: {
    backgroundColor: theme?.card || '#FAF7F2',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: theme?.borderSecondary || '#E0D9CF',
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: theme?.backgroundSecondary || '#FFFFFF',
  },
  leaderboardItemCurrent: {
    backgroundColor: theme?.surface || '#F0E8E0',
    borderWidth: 2,
    borderColor: theme?.secondary || '#7B9FC4',
  },
  leaderboardRank: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderboardRankIcon: {
    fontSize: 20 * fontScale,
  },
  leaderboardRankNumber: {
    fontSize: 16 * fontScale,
    fontWeight: 'bold',
    color: theme?.textSecondary || '#7D7670',
  },
  leaderboardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme?.surfaceSecondary || '#E7E2DC',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginRight: 12,
  },
  leaderboardAvatarText: {
    fontSize: 20 * fontScale,
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: 15 * fontScale,
    fontWeight: '600',
    color: theme?.text || '#3F3A3A',
    marginBottom: 2,
  },
  leaderboardNameCurrent: {
    color: theme?.secondary || '#7B9FC4',
    fontWeight: '700',
  },
  leaderboardPoints: {
    fontSize: 13 * fontScale,
    color: theme?.textSecondary || '#7D7670',
  },
  checkinContainer: {
    backgroundColor: theme?.card || '#FAF7F2',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme?.borderSecondary || '#E0D9CF',
  },
  checkinInfo: {
    marginBottom: 12,
  },
  checkinTitle: {
    fontSize: 16 * fontScale,
    fontWeight: '600',
    color: theme?.text || '#3F3A3A',
    marginBottom: 4,
  },
  checkinDescription: {
    fontSize: 14 * fontScale,
    color: theme?.textSecondary || '#7D7670',
    marginBottom: 8,
    lineHeight: 20 * fontScale,
  },
  checkinReward: {
    fontSize: 13 * fontScale,
    color: theme?.secondary || '#7B9FC4',
    fontWeight: '500',
    marginBottom: 4,
  },
  checkinNextTime: {
    fontSize: 12 * fontScale,
    color: theme?.textTertiary || '#9A9187',
    fontStyle: 'italic',
    marginTop: 4,
  },
  checkinButton: {
    backgroundColor: theme?.secondary || '#7B9FC4',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  checkinButtonDisabled: {
    backgroundColor: theme?.borderSecondary || '#E0D9CF',
  },
  checkinButtonText: {
    fontSize: 15 * fontScale,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  checkinButtonTextDisabled: {
    color: theme?.textTertiary || '#9A9187',
  },
  privacySetting: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: theme?.card || '#FAF7F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme?.borderSecondary || '#E0D9CF',
  },
  privacySettingLeft: {
    flex: 1,
    marginRight: 12,
  },
  privacySettingLabel: {
    fontSize: 15 * fontScale,
    fontWeight: '600',
    color: theme?.text || '#3F3A3A',
    marginBottom: 4,
  },
  privacySettingDesc: {
    fontSize: 12 * fontScale,
    color: theme?.textSecondary || '#7D7670',
    lineHeight: 16 * fontScale,
  },
  privacySwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme?.borderSecondary || '#E0D9CF',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  privacySwitchActive: {
    backgroundColor: theme?.secondary || '#7B9FC4',
  },
  privacySwitchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    marginLeft: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  privacySwitchThumbActive: {
    marginLeft: 20,
  },
});
