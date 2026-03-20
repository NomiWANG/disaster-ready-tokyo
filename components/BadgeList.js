import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from '../languages';
import { useTheme } from '../context/ThemeContext';

const BadgeList = ({ badges = [] }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();

  if (!badges.length) {
    return (
      <View style={[
        styles.empty,
        { 
          backgroundColor: theme.surface,
          borderColor: theme.border
        }
      ]}>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t('progress.noBadges')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {badges.map((badge) => (
        <View
          key={badge.id}
          style={[
            styles.badgeCard,
            {
              backgroundColor: badge.achieved ? theme.success + '20' : theme.taskCardBg,
              borderColor: badge.achieved ? theme.success : theme.border
            }
          ]}
        >
          <Text style={[styles.badgeTitle, { color: theme.text }]}>{badge.title}</Text>
          <Text style={[styles.badgeDesc, { color: theme.textSecondary }]}>{badge.description}</Text>
          <Text style={[styles.badgeStatus, { color: theme.success }]}>
            {badge.achieved ? t('progress.badgeUnlocked') : t('progress.badgeLocked')}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  badgeCard: {
    width: '48%',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  badgeTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  badgeDesc: {
    fontSize: 13,
    marginBottom: 8,
  },
  badgeStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  empty: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  emptyText: {
    fontSize: 13,
  },
});

export default BadgeList;

