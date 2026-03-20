import React from 'react';
import renderer from 'react-test-renderer';
import { act } from 'react-test-renderer';

jest.mock('../languages', () => ({
  useTranslation: () => ({ t: (key) => key, language: 'zh' }),
}));

jest.mock('../context/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      background: '#F5F5F5',
      card: '#fff',
      border: '#E5E5EA',
      text: '#000',
      textSecondary: '#666',
      primary: '#1976D2',
      primaryLight: '#E3F2FD',
      secondary: '#7B9FC4',
      surface: '#F5F5F5',
      surfaceSecondary: '#E5E5EA',
      success: '#4CAF50',
      error: '#F44336',
      warning: '#FF9800',
      overlay: 'rgba(0,0,0,0.5)',
    },
    fontScale: 1,
  }),
}));

import ErrorBanner, { ERROR_TYPES } from '../components/ErrorBanner';

/** 从 test instance 收集可读文本（accessibilityLabel + 子节点中的字符串） */
function collectTextFromInstance(instance, out = []) {
  if (!instance) return out;
  const props = instance.props || {};
  if (props.accessibilityLabel) out.push(props.accessibilityLabel);
  const children = instance.children || [];
  for (const c of children) {
    if (typeof c === 'string') out.push(c);
    else if (c && typeof c === 'object' && (c.props || c.children)) collectTextFromInstance(c, out);
  }
  return out;
}

describe('Integration: key flows', () => {
  it('ErrorBanner renders for location/network/api and shows retry when onRetry provided', () => {
    const onRetry = jest.fn();
    let root;
    act(() => {
      root = renderer.create(
        <ErrorBanner type="location" message="Custom message" onRetry={onRetry} />
      );
    });
    expect(root).toBeTruthy();
    const alertViews = root.root.findAllByProps({ accessibilityRole: 'alert' });
    expect(alertViews.length).toBeGreaterThanOrEqual(1);
    const allText = collectTextFromInstance(root.root);
    const str = allText.join(' ');
    expect(str).toMatch(/errorBanner\.location|Custom message/);
    expect(str).toMatch(/common\.retry/);

    const buttons = root.root.findAllByProps({ accessibilityRole: 'button' });
    const retryButton = buttons.find((n) => n.props.accessibilityLabel === 'common.retry');
    expect(retryButton).toBeTruthy();
    act(() => {
      retryButton.props.onPress();
    });
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('ErrorBanner renders api type without retry when onRetry not provided', () => {
    let root;
    act(() => {
      root = renderer.create(<ErrorBanner type="api" />);
    });
    expect(root).toBeTruthy();
    const allText = collectTextFromInstance(root.root);
    expect(allText.join(' ')).toMatch(/errorBanner\.api/);
    const buttons = root.root.findAllByProps({ accessibilityRole: 'button' });
    expect(buttons.length).toBe(0);
  });

  it('ErrorBanner has alert role and correct types', () => {
    expect(ERROR_TYPES.network).toBeDefined();
    expect(ERROR_TYPES.location).toBeDefined();
    expect(ERROR_TYPES.api).toBeDefined();
    let root;
    act(() => {
      root = renderer.create(<ErrorBanner type="network" />);
    });
    expect(root).toBeTruthy();
    const alertViews = root.root.findAllByProps({ accessibilityRole: 'alert' });
    expect(alertViews.length).toBeGreaterThanOrEqual(1);
  });
});
