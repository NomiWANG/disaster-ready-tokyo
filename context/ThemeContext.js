// Theme Context Dark mode support
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import ThemeStorage from '../storage/theme.storage';
import { lightTheme, darkTheme, THEME_MODES, FONT_SIZES, FONT_SCALES } from '../config/themes';

const ThemeContext = createContext({
  theme: lightTheme,
  isDark: false,
  themeMode: THEME_MODES.LIGHT,
  setThemeMode: () => {},
  toggleTheme: () => {},
  fontSize: FONT_SIZES.MEDIUM,
  fontScale: 1.0,
  setFontSize: () => {},
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState(THEME_MODES.LIGHT);
  const [fontSize, setFontSizeState] = useState(FONT_SIZES.MEDIUM);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const loadTheme = async () => {
      try {
        const state = await ThemeStorage.load();
        if (mounted) {
          setThemeModeState(state.mode);
          setFontSizeState(state.fontSize || FONT_SIZES.MEDIUM);
        }
      } catch (error) {
        console.error('Failed to load theme:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadTheme();

    return () => {
      mounted = false;
    };
  }, []);

  const setThemeMode = async (mode) => {
    try {
      await ThemeStorage.setThemeMode(mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  const toggleTheme = () => {
    const newMode = themeMode === THEME_MODES.DARK ? THEME_MODES.LIGHT : THEME_MODES.DARK;
    setThemeMode(newMode);
  };

  const setFontSize = async (size) => {
    try {
      await ThemeStorage.setFontSize(size);
      setFontSizeState(size);
    } catch (error) {
      console.error('Failed to save font size:', error);
    }
  };

  const getActiveTheme = () => {
    if (themeMode === THEME_MODES.AUTO) {
      return systemColorScheme === 'dark' ? darkTheme : lightTheme;
    }
    return themeMode === THEME_MODES.DARK ? darkTheme : lightTheme;
  };

  const activeTheme = getActiveTheme();
  const isDark = themeMode === THEME_MODES.AUTO 
    ? systemColorScheme === 'dark'
    : themeMode === THEME_MODES.DARK;

  const fontScale = FONT_SCALES[fontSize] || 1.0;

  if (loading) {
    return null;
  }

  const value = {
    theme: activeTheme,
    isDark,
    themeMode,
    setThemeMode,
    toggleTheme,
    fontSize,
    fontScale,
    setFontSize,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
