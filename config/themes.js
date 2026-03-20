export const lightTheme = {
  background: '#F5F5F5',
  backgroundSecondary: '#FFFFFF',
  backgroundTertiary: '#FAF7F2',

  text: '#000000',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textLight: '#7D7670',
  textOnPrimary: '#FFFFFF',

  primary: '#1976D2',
  primaryLight: '#E3F2FD',
  secondary: '#7B9FC4',

  border: '#E5E5EA',
  borderSecondary: '#E0D9CF',
  borderLight: '#F5F5F5',

  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',

  card: '#FFFFFF',
  cardSecondary: '#FAF7F2',
  surface: '#F4F1ED',
  surfaceSecondary: '#E7E2DC',

  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowDark: 'rgba(0, 0, 0, 0.2)',

  overlay: 'rgba(63, 58, 58, 0.6)',

  taskCardBg: '#FAF7F2',
  taskCardBorder: '#E0D9CF',
  languageSelectorBg: '#E7E2DC',
  languageSelectorBorder: '#D4C9BC',

  alertUrgent: '#D32F2F',
  alertHigh: '#F57C00',
  alertMedium: '#FBC02D',
  alertLow: '#388E3C',

  tabBarBg: '#FFFFFF',
  tabBarActive: '#1976D2',
  tabBarInactive: '#999999',
};

export const darkTheme = {
  background: '#121212',
  backgroundSecondary: '#1E1E1E',
  backgroundTertiary: '#2C2C2C',

  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  textTertiary: '#808080',
  textLight: '#999999',
  textOnPrimary: '#FFFFFF',

  primary: '#64B5F6',
  primaryLight: '#1E3A5F',
  secondary: '#90CAF9',

  border: '#333333',
  borderSecondary: '#404040',
  borderLight: '#2C2C2C',

  success: '#66BB6A',
  warning: '#FFA726',
  error: '#EF5350',
  info: '#42A5F5',

  card: '#1E1E1E',
  cardSecondary: '#2C2C2C',
  surface: '#252525',
  surfaceSecondary: '#333333',

  shadow: 'rgba(0, 0, 0, 0.3)',
  shadowDark: 'rgba(0, 0, 0, 0.5)',

  overlay: 'rgba(0, 0, 0, 0.7)',

  taskCardBg: '#2C2C2C',
  taskCardBorder: '#404040',
  languageSelectorBg: '#333333',
  languageSelectorBorder: '#4D4D4D',

  alertUrgent: '#EF5350',
  alertHigh: '#FF9800',
  alertMedium: '#FFEB3B',
  alertLow: '#66BB6A',

  tabBarBg: '#1E1E1E',
  tabBarActive: '#64B5F6',
  tabBarInactive: '#666666',
};

export const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto',
};

export const FONT_SIZES = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
};

export const FONT_SCALES = {
  [FONT_SIZES.SMALL]: 0.9,
  [FONT_SIZES.MEDIUM]: 1.0,
  [FONT_SIZES.LARGE]: 1.15,
};

export default {
  light: lightTheme,
  dark: darkTheme,
  modes: THEME_MODES,
  fontSizes: FONT_SIZES,
  fontScales: FONT_SCALES,
};
