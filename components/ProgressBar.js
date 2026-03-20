// Progress bar component accepts 0-1 progress value and label
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const ProgressBar = ({ label = 'Progress', progress = 0 }) => {
  const { theme } = useTheme();
  const clamped = Math.max(0, Math.min(progress, 1));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.value, { color: theme.success }]}>{Math.round(clamped * 100)}%</Text>
      </View>
      <View style={[styles.barBackground, { backgroundColor: theme.surfaceSecondary }]}>
        <View style={[
          styles.barFill,
          { 
            width: `${clamped * 100}%`,
            backgroundColor: theme.success
          }
        ]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
  },
  barBackground: {
    height: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 8,
  },
});

export default ProgressBar;

