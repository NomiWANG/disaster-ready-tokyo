import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useTranslation, availableLanguages } from '../languages';
import { useTheme } from '../context/ThemeContext';

export default function LanguageSelector({ variant = 'default' }) {
  const { language, setLanguage, t } = useTranslation();
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = React.useState(false);
  const isCompact = variant === 'compact';
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
        accessibilityLabel={t('common.selectLanguage')}
      >
        <Text style={[styles.selectorIcon, isCompact && styles.selectorIconCompact]}>语</Text>
        <Text
          style={[
            styles.selectorText,
            isCompact && styles.selectorTextCompact,
            { color: theme.secondary }
          ]}
          numberOfLines={1}
        >
          {currentLanguageName}
        </Text>
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
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t('common.selectLanguage')}</Text>
            {availableLanguages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageOption,
                  {
                    backgroundColor: language === lang.code ? theme.primaryLight : theme.surface,
                    borderColor: language === lang.code ? theme.primary : theme.border
                  }
                ]}
                onPress={() => {
                  setLanguage(lang.code);
                  setModalVisible(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: language === lang.code }}
              >
                <Text
                  style={[
                    styles.languageOptionText,
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
            <TouchableOpacity
              style={[styles.closeButton, { borderTopColor: theme.border }]}
              onPress={() => setModalVisible(false)}
              accessibilityRole="button"
            >
              <Text style={[styles.closeButtonText, { color: theme.textSecondary }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    maxWidth: 140,
  },
  selectorIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  selectorIconCompact: {
    fontSize: 13,
    marginRight: 5,
  },
  selectorText: {
    fontSize: 13,
    fontWeight: '600',
  },
  selectorTextCompact: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 300,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
  },
  languageOptionText: {
    fontSize: 16,
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
    fontWeight: '500',
  },
});

