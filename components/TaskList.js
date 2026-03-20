import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import TaskCard from './TaskCard';
import { useTranslation } from '../languages';
import { useTheme } from '../context/ThemeContext';

const TaskList = ({ tasks = [], onComplete, emptyMessage }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();

  if (tasks.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          {emptyMessage || t('tasks.emptyList')}
        </Text>
      </View>
    );
  }

  return (
    <View>
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          title={task.title}
          description={task.description}
          current={task.current}
          target={task.target}
          points={task.rewards?.points || 0}
          priority={task.priority}
          tags={task.tags}
          category={task.category}
          status={task.status}
          onComplete={() => onComplete?.(task)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default TaskList;

