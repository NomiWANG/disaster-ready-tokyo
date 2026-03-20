/**
 * 统一错误提示条：网络错误 / 定位拒绝 / API 不可用
 * 样式一致，支持重试按钮与无障碍
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../languages';

const ERROR_TYPES = {
  network: { icon: '网络', messageKey: 'errorBanner.network' },
  location: { icon: '定位', messageKey: 'errorBanner.location' },
  api: { icon: '提示', messageKey: 'errorBanner.api' },
};

export default function ErrorBanner({ type = 'api', message, onRetry, accessible = true }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const config = ERROR_TYPES[type] || ERROR_TYPES.api;
  const displayMessage = message || t(config.messageKey);
  const retryLabel = t('common.retry');

  return (
    <View
      style={[styles.banner, { backgroundColor: theme.card, borderColor: theme.border }]}
      accessibilityRole="alert"
      accessibilityLabel={accessible ? displayMessage : undefined}
    >
      <Text style={styles.icon}>{config.icon}</Text>
      <Text style={[styles.text, { color: theme.textSecondary }]}>{displayMessage}</Text>
      {onRetry && (
        <TouchableOpacity
          style={[styles.retry, { backgroundColor: theme.primary || '#2196F3' }]}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
          accessibilityHint={t('errorBanner.retryHint')}
        >
          <Text style={[styles.retryText, { color: theme.textOnPrimary || '#fff' }]}>
            {retryLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  icon: {
    fontSize: 20,
  },
  text: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    minWidth: 0,
  },
  retry: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export { ERROR_TYPES };
