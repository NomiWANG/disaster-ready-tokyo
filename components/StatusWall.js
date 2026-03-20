// Community status wall component displays posts list
import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useTranslation, useDateFormatter } from '../languages';
import { useTheme } from '../context/ThemeContext';

const StatusWall = ({ posts = [] }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { formatRelative } = useDateFormatter();

  const renderItem = ({ item }) => {
    const typeKey = item.type && ['info', 'request', 'offer'].includes(item.type)
      ? `community.type.${item.type}`
      : 'community.type.info';

    return (
      <View style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border
        }
      ]}>
        <Text style={[styles.type, { color: theme.textSecondary }]}>{t(typeKey)}</Text>
        <Text style={[styles.message, { color: theme.text }]}>{item.message}</Text>
        <Text style={[styles.meta, { color: theme.textTertiary }]}>
          {item.author} · {formatRelative(item.createdAt)}
        </Text>
      </View>
    );
  };

  if (!posts.length) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t('community.empty')}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  type: {
    fontSize: 12,
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    marginBottom: 6,
  },
  meta: {
    fontSize: 12,
  },
  empty: {
    padding: 16,
  },
  emptyText: {
    fontSize: 13,
  },
});

export default StatusWall;


