// Points pill component displays current points
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const PointsPill = ({ points = 0, label = 'Points' }) => {
  const { theme } = useTheme();
  
  return (
    <View style={[
      styles.container,
      {
        backgroundColor: theme.warning + '20',
        borderColor: theme.warning
      }
    ]}>
      <Text style={[styles.points, { color: theme.warning }]}>{points.toLocaleString()}</Text>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
  },
  points: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 6,
  },
  label: {
    fontSize: 14,
  },
});

export default PointsPill;

