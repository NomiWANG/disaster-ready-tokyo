// Mutual aid match list component shows request-offer simple matching
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const MutualAidMatchList = ({ matches = [] }) => {
  const { theme } = useTheme();
  
  if (!matches.length) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No mutual aid matches yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {matches.map((match) => (
        <View key={`${match.requestId}-${match.offerId}`} style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: theme.border
          }
        ]}>
          <Text style={[styles.line, { color: theme.text }]}>请求: {match.requestId}</Text>
          <Text style={[styles.line, { color: theme.text }]}>提供: {match.offerId}</Text>
          <Text style={[styles.score, { color: theme.success }]}>匹配分：{match.score}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  line: {
    fontSize: 13,
  },
  score: {
    fontSize: 13,
    marginTop: 4,
  },
  empty: {
    padding: 16,
  },
  emptyText: {
    fontSize: 13,
  },
});

export default MutualAidMatchList;


