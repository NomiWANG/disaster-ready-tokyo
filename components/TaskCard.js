import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from '../languages';
import { useTheme } from '../context/ThemeContext';

const TaskCard = ({
  title,
  description,
  current = 0,
  target = 1,
  points = 0,
  priority = 'medium',
  tags = [],
  category,
  status = 'active',
  onComplete,
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const progress = Math.min(current / target, 1);
  const progressPercentage = Math.round(progress * 100);
  const isCompleted = status === 'completed' || progress >= 1;

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return '#E85D75';
      case 'medium':
        return '#D7A45A';
      case 'low':
        return '#7D7670';
      default:
        return '#7D7670';
    }
  };

  const getPriorityBgColor = (priority) => {
    switch (priority) {
      case 'high':
        return '#FFE4E8';
      case 'medium':
        return '#FFF4E3';
      case 'low':
        return '#F0EBE6';
      default:
        return '#F0EBE6';
    }
  };

  return (
    <View style={[
      styles.card, 
      { 
        backgroundColor: isCompleted ? theme.success + '20' : theme.taskCardBg,
        borderColor: isCompleted ? theme.success : theme.taskCardBorder,
      }
    ]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[
            styles.title,
            { color: isCompleted ? theme.success : theme.text }
          ]} numberOfLines={2}>
            {title}
          </Text>
          {priority && (
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityBgColor(priority) }]}>
              <Text style={[styles.priorityText, { color: getPriorityColor(priority) }]}>
                {t(`tasks.priority.${priority}`)}
              </Text>
            </View>
          )}
        </View>
        {isCompleted && (
          <View style={[styles.completedBadge, { backgroundColor: theme.success + '30' }]}>
            <Text style={[styles.completedText, { color: theme.success }]}>[x] {t('tasks.completed')}</Text>
          </View>
        )}
      </View>

      {/* Description */}
      <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={2}>{description}</Text>

      {/* Tags and category */}
      {(tags.length > 0 || category) && (
        <View style={styles.tagsRow}>
          {category && (
            <View style={[styles.categoryBadge, { backgroundColor: theme.surfaceSecondary }]}>
              <Text style={[styles.categoryText, { color: theme.textSecondary }]}>{t(`tasks.category.${category}`)}</Text>
            </View>
          )}
          {tags.slice(0, 3).map((tag, index) => (
            <View key={index} style={[
              styles.tagBadge,
              { backgroundColor: theme.surface, borderColor: theme.border }
            ]}>
              <Text style={[styles.tagText, { color: theme.textSecondary }]}>{t(`tasks.tag.${tag}`)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Progress bar */}
      <View style={styles.progressRow}>
        <View style={[styles.progressBackground, { backgroundColor: theme.surfaceSecondary }]}>
          <View style={[
            styles.progressFill,
            { width: `${progressPercentage}%`, backgroundColor: theme.success }
          ]} />
        </View>
        <Text style={[styles.progressText, { color: theme.textSecondary }]}>
          {progressPercentage}%
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.reward, { color: theme.warning }]}>
          +{points} {t('progress.pointsUnit')}
        </Text>
        {!isCompleted && (
          <TouchableOpacity 
            style={[styles.cta, { backgroundColor: theme.success }]}
            onPress={onComplete}
            accessibilityLabel={t('tasks.completeTask')}
            accessibilityHint={t('tasks.completeTaskHint')}
          >
            <Text style={[styles.ctaText, { color: theme.backgroundSecondary }]}>{t('progress.completeCta')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    minWidth: 45,
    alignItems: 'center',
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  completedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 18,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
    gap: 6,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '500',
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 10,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBackground: {
    flex: 1,
    height: 10,
    borderRadius: 8,
    marginRight: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 8,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reward: {
    fontSize: 14,
    fontWeight: '600',
  },
  cta: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default TaskCard;

