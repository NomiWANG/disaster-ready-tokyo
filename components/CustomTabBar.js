import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '../languages';
import { useTheme } from '../context/ThemeContext';

export default function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <View style={[
      styles.tabBar, 
      { 
        paddingBottom: Math.max(insets.bottom, 8),
        backgroundColor: theme.tabBarBg,
        borderTopColor: theme.border,
      }
    ]}>
      {state.routes.map((route, index) => {
        const descriptor = descriptors[route.key] || descriptors[route.name] || {};
        const options = descriptor.options || {};
        
        const labelKey = options.tabBarLabel || route.name;
        const label = t(labelKey);

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key || route.name,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key || route.name,
          });
        };

        return (
          <TouchableOpacity
            key={route.key || route.name}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel || label}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={[
              styles.tabItem, 
              isFocused && { borderTopWidth: 2, borderTopColor: theme.tabBarActive }
            ]}
          >
            <Text style={[
              styles.label,
              { color: isFocused ? theme.tabBarActive : theme.tabBarInactive }
            ]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    height: 60,
    borderTopWidth: 1,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
});





