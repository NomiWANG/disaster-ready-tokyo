import { useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './locales/en';
import ja from './locales/ja';
import zh from './locales/zh';
import { formatDateTime } from './dateFormatter';
import { useDateFormatter } from './useDateFormatter';
import { LanguageContext } from './LanguageContext';

const translations = {
  en,
  ja,
  zh,
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within LanguageProvider');
  }
  return context;
};

const getNestedTranslation = (obj, path) => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : path;
  }, obj);
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState('en');

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem('app_language');
        if (savedLanguage && translations[savedLanguage]) {
          setLanguageState(savedLanguage);
        }
      } catch (error) {
        console.error('Failed to load language preference:', error);
      }
    };

    loadLanguage();
  }, []);

  const setLanguage = async (lang) => {
    if (translations[lang]) {
      setLanguageState(lang);
      try {
        await AsyncStorage.setItem('app_language', lang);
      } catch (error) {
        console.error('Failed to save language preference:', error);
      }
    }
  };

  const t = (key, params = {}) => {
    const translation = translations[language];
    let text = getNestedTranslation(translation, key);
    // Supports parameter substitution e.g. max in params
    if (typeof text === 'string' && Object.keys(params).length > 0) {
      Object.keys(params).forEach((paramKey) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), params[paramKey]);
      });
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const availableLanguages = [
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
  { code: 'zh', name: '中文' },
];

export {
  formatDateTime,
  useDateFormatter,
};








