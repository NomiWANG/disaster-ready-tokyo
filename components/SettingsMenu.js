import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { useTranslation, availableLanguages } from '../languages';
import { useTheme } from '../context/ThemeContext';
import { THEME_MODES, FONT_SIZES } from '../config/themes';

export default function SettingsMenu({ variant = 'default' }) {
  const { language, setLanguage, t } = useTranslation();
  const { theme, themeMode, setThemeMode, fontSize, setFontSize } = useTheme();
  const [modalVisible, setModalVisible] = React.useState(false);
  const isCompact = variant === 'compact';

  const getThemeModeName = (mode) => {
    switch (mode) {
      case THEME_MODES.LIGHT:
        return t('settings.themeLight');
      case THEME_MODES.DARK:
        return t('settings.themeDark');
      case THEME_MODES.AUTO:
        return t('settings.themeAuto');
      default:
        return t('settings.themeAuto');
    }
  };

  const getFontSizeName = (size) => {
    switch (size) {
      case FONT_SIZES.SMALL:
        return t('settings.fontSmall');
      case FONT_SIZES.MEDIUM:
        return t('settings.fontMedium');
      case FONT_SIZES.LARGE:
        return t('settings.fontLarge');
      default:
        return t('settings.fontMedium');
    }
  };

  const currentLanguageName =
    availableLanguages.find((lang) => lang.code === language)?.name || 'Language';

  return (
    <>
      <TouchableOpacity
        style={[
          styles.selector,
          isCompact && styles.selectorCompact,
          {
            backgroundColor: theme.languageSelectorBg,
            borderColor: theme.languageSelectorBorder
          }
        ]}
        onPress={() => setModalVisible(true)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel={t('settings.openSettings')}
      >
        <Text style={[styles.selectorIcon, isCompact && styles.selectorIconCompact]}>[=]</Text>
        {!isCompact && (
          <Text
            style={[
              styles.selectorText,
              { color: theme.secondary }
            ]}
            numberOfLines={1}
          >
            {t('settings.settings')}
          </Text>
        )}
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[
            styles.modalContent,
            {
              backgroundColor: theme.card,
              borderColor: theme.border
            }
          ]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{t('settings.settings')}</Text>

              {/* Language settings */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('settings.language')}</Text>
                {availableLanguages.map((lang) => (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.option,
                      {
                        backgroundColor: language === lang.code ? theme.primaryLight : theme.surface,
                        borderColor: language === lang.code ? theme.primary : theme.border
                      }
                    ]}
                    onPress={() => {
                      setLanguage(lang.code);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: language === lang.code }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color: language === lang.code ? theme.primary : theme.text,
                          fontWeight: language === lang.code ? '600' : 'normal'
                        }
                      ]}
                    >
                      {lang.name}
                    </Text>
                    {language === lang.code && (
                      <Text style={[styles.checkmark, { color: theme.primary }]}>[x]</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Theme settings */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('settings.theme')}</Text>
                {Object.values(THEME_MODES).map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.option,
                      {
                        backgroundColor: themeMode === mode ? theme.primaryLight : theme.surface,
                        borderColor: themeMode === mode ? theme.primary : theme.border
                      }
                    ]}
                    onPress={() => {
                      setThemeMode(mode);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: themeMode === mode }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color: themeMode === mode ? theme.primary : theme.text,
                          fontWeight: themeMode === mode ? '600' : 'normal'
                        }
                      ]}
                    >
                      {getThemeModeName(mode)}
                    </Text>
                    {themeMode === mode && (
                      <Text style={[styles.checkmark, { color: theme.primary }]}>[x]</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Font size settings */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('settings.fontSize')}</Text>
                {Object.values(FONT_SIZES).map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.option,
                      {
                        backgroundColor: fontSize === size ? theme.primaryLight : theme.surface,
                        borderColor: fontSize === size ? theme.primary : theme.border
                      }
                    ]}
                    onPress={() => {
                      setFontSize(size);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: fontSize === size }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color: fontSize === size ? theme.primary : theme.text,
                          fontWeight: fontSize === size ? '600' : 'normal'
                        }
                      ]}
                    >
                      {getFontSizeName(size)}
                    </Text>
                    {fontSize === size && (
                      <Text style={[styles.checkmark, { color: theme.primary }]}>[x]</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.closeButton, { borderTopColor: theme.border }]}
                onPress={() => setModalVisible(false)}
                accessibilityRole="button"
              >
                <Text style={[styles.closeButtonText, { color: theme.primary }]}>{t('common.close')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 180,
  },
  selectorCompact: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    maxWidth: 44,
    justifyContent: 'center',
  },
  selectorIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  selectorIconCompact: {
    fontSize: 16,
    marginRight: 0,
  },
  selectorText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 15,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
