import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from '../languages';
import { useGamification } from '../context/GamificationContext';
import { useTheme } from '../context/ThemeContext';
import DisasterGuidelinesService from '../services/DisasterGuidelinesService';

const READ_ARTICLES_KEY = 'read_articles';

export default function KnowledgeScreen({ navigation }) {
  const { t, language } = useTranslation();
  const { theme, fontScale } = useTheme();
  const { addPoints } = useGamification();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [readArticles, setReadArticles] = useState(new Set());

  // Dynamic styles
  const styles = useMemo(() => createStyles(theme, fontScale), [theme, fontScale]);

  useEffect(() => {
    const loadReadArticles = async () => {
      try {
        const saved = await AsyncStorage.getItem(READ_ARTICLES_KEY);
        if (saved) {
          setReadArticles(new Set(JSON.parse(saved)));
        }
      } catch (error) {
        console.error('Failed to load read articles:', error);
      }
    };
    loadReadArticles();
  }, []);

  // Official guidelines
  const [officialGuidelines, setOfficialGuidelines] = useState([]);

  useEffect(() => {
    const loadGuidelines = async () => {
      try {
        await DisasterGuidelinesService.initialize();
        const guidelines = DisasterGuidelinesService.getAllGuidelines();
        console.log('Loaded guidelines:', guidelines.length);
        
        const guidelineArticles = guidelines.map(guideline => ({
          id: guideline.id,
          titleKey: null,
          title: guideline.title,
          titleEn: guideline.titleEn || guideline.title,
          contentKey: null,
          content: formatGuidelineContent(guideline.content),
          isOfficial: true,
          source: guideline.source,
          category: guideline.category,
        }));
        
        setOfficialGuidelines(guidelineArticles);
      } catch (error) {
        console.error('Failed to load official guidelines:', error);
      }
    };
    loadGuidelines();
  }, []);

  const formatGuidelineContent = (content) => {
    if (!content) return '暂无内容';

    let formatted = '';

    if (content.steps) {
      content.steps.forEach(step => {
        formatted += `\n【${step.phase}】\n`;
        step.actions.forEach((action, index) => {
          formatted += `${index + 1}. ${action}\n`;
        });
      });
    }

    if (content.checklist) {
      content.checklist.forEach(category => {
        formatted += `\n【${category.category}】\n`;
        category.items.forEach((item) => {
          formatted += `[ ] ${item}\n`;
        });
      });
    }

    if (content.warningTexts) {
      content.warningTexts.forEach((text) => {
        formatted += `【注意】${text}\n\n`;
      });
      if (content.steps) {
        content.steps.forEach(step => {
          formatted += `\n【${step.phase}】\n`;
          step.actions.forEach((action, index) => {
            formatted += `${index + 1}. ${action}\n`;
          });
        });
      }
    }

    if (content.sections) {
      content.sections.forEach(section => {
        formatted += `\n【${section.title}】\n`;
        section.fields.forEach((field, index) => {
          formatted += `• ${field}\n`;
        });
      });
    }

    return formatted || '暂无详细内容';
  };

  const categories = [
    {
      id: 'official',
      titleKey: 'knowledge.categories.official',
      icon: '官',
      articles: officialGuidelines,
    },
    {
      id: 'earthquake',
      titleKey: 'knowledge.categories.earthquake',
      icon: '震',
      articles: [
        {
          id: 'earthquake1',
          titleKey: 'knowledge.articles.earthquake1.title',
          contentKey: 'knowledge.articles.earthquake1.content',
        },
        {
          id: 'earthquake2',
          titleKey: 'knowledge.articles.earthquake2.title',
          contentKey: 'knowledge.articles.earthquake2.content',
        },
        {
          id: 'earthquake3',
          titleKey: 'knowledge.articles.earthquake3.title',
          contentKey: 'knowledge.articles.earthquake3.content',
        },
      ],
    },
    {
      id: 'typhoon',
      titleKey: 'knowledge.categories.typhoon',
      icon: '风',
      articles: [
        {
          id: 'typhoon1',
          titleKey: 'knowledge.articles.typhoon1.title',
          contentKey: 'knowledge.articles.typhoon1.content',
        },
        {
          id: 'typhoon2',
          titleKey: 'knowledge.articles.typhoon2.title',
          contentKey: 'knowledge.articles.typhoon2.content',
        },
      ],
    },
    {
      id: 'preparation',
      titleKey: 'knowledge.categories.preparation',
      icon: '备',
      articles: [
        {
          id: 'preparation1',
          titleKey: 'knowledge.articles.preparation1.title',
          contentKey: 'knowledge.articles.preparation1.content',
        },
        {
          id: 'preparation2',
          titleKey: 'knowledge.articles.preparation2.title',
          contentKey: 'knowledge.articles.preparation2.content',
        },
      ],
    },
  ];

  const handleMarkAsRead = async (articleId) => {
    if (readArticles.has(articleId)) {
      return;
    }

    try {
      const newReadArticles = new Set([...readArticles, articleId]);
      setReadArticles(newReadArticles);
      await AsyncStorage.setItem(READ_ARTICLES_KEY, JSON.stringify([...newReadArticles]));

      await addPoints('article_read', 10, { articleId });
      
      Alert.alert(
        t('knowledge.readSuccess'),
        t('knowledge.pointsEarned').replace('{points}', '10'),
        [{ text: t('common.ok') }]
      );
    } catch (error) {
      console.error('Failed to mark article as read:', error);
      Alert.alert(t('common.error'), t('knowledge.readError'));
    }
  };

  const renderCategory = (category) => (
    <TouchableOpacity
      key={category.id}
      style={styles.categoryCard}
      onPress={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
      accessibilityRole="button"
      accessibilityLabel={t(category.titleKey)}
      accessibilityState={{ expanded: selectedCategory === category.id }}
    >
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryIcon}>{category.icon}</Text>
        <Text style={styles.categoryTitle}>{t(category.titleKey)}</Text>
        <Text style={styles.expandIcon}>{selectedCategory === category.id ? '▼' : '▶'}</Text>
      </View>
      {selectedCategory === category.id && (
        <View style={styles.articlesContainer}>
          {category.articles.map((article) => {
            const isRead = readArticles.has(article.id);
            const articleTitle = (article.isOfficial && language === 'en' && article.titleEn)
              ? article.titleEn
              : (article.title || t(article.titleKey));
            const articleContent = article.content || t(article.contentKey);
            
            return (
              <View key={article.id} style={styles.articleCard}>
                <View style={styles.articleHeader}>
                  <Text style={styles.articleTitle}>{articleTitle}</Text>
                  {isRead && (
                    <View style={styles.readBadge}>
                      <Text style={styles.readBadgeText}>{t('knowledge.read')}</Text>
                    </View>
                  )}
                </View>
                {article.source && (
                  <Text style={styles.articleSource}>{t('home.source')}: {article.source}</Text>
                )}
                <Text style={styles.articleContent}>{articleContent}</Text>
                {!isRead && (
                  <TouchableOpacity
                    style={styles.markReadButton}
                    onPress={() => handleMarkAsRead(article.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${t('knowledge.markAsRead')} ${articleTitle}`}
                  >
                    <Text style={styles.markReadButtonText}>
                      {t('knowledge.markAsRead')} (+10 {t('progress.points')})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Text style={styles.backButtonText}>{t('common.back')}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>{t('knowledge.title')}</Text>
          <Text style={styles.subtitle}>{t('knowledge.subtitle')}</Text>
          
          {/* Data source info */}
          <View style={styles.dataSourceBanner}>
            <Text style={styles.dataSourceTitle}>{t('knowledge.dataSourceTitle')}</Text>
            <Text style={styles.dataSourceText}>
              {t('knowledge.dataSourceDesc')}
            </Text>
            <View style={styles.dataSourceList}>
              <Text style={styles.dataSourceItem}>- {t('knowledge.sourceJMA')}</Text>
              <Text style={styles.dataSourceItem}>- {t('knowledge.sourceTokyo')}</Text>
              <Text style={styles.dataSourceItem}>- {t('knowledge.sourceCabinet')}</Text>
            </View>
          </View>
          
          {categories.map(renderCategory)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Style function
const createStyles = (theme, fontScale = 1.0) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme?.background || '#F5F5F5',
  },
  header: {
    backgroundColor: theme?.backgroundSecondary || '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme?.border || '#E5E5EA',
    paddingBottom: 10,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButtonText: {
    fontSize: 16 * fontScale,
    color: theme?.primary || '#1976D2',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28 * fontScale,
    fontWeight: 'bold',
    color: theme?.text || '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16 * fontScale,
    color: theme?.textSecondary || '#666',
    marginBottom: 24,
  },
  dataSourceBanner: {
    backgroundColor: theme?.primaryLight || '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme?.primary || '#1976D2',
  },
  dataSourceTitle: {
    fontSize: 16 * fontScale,
    fontWeight: '600',
    color: theme?.text || '#000',
    marginBottom: 8,
  },
  dataSourceText: {
    fontSize: 14 * fontScale,
    color: theme?.textSecondary || '#666',
    marginBottom: 12,
    lineHeight: 20 * fontScale,
  },
  dataSourceList: {
    marginTop: 8,
  },
  dataSourceItem: {
    fontSize: 13 * fontScale,
    color: theme?.textSecondary || '#666',
    marginBottom: 4,
  },
  categoryCard: {
    backgroundColor: theme?.card || '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 24 * fontScale,
    marginRight: 12,
  },
  categoryTitle: {
    flex: 1,
    fontSize: 18 * fontScale,
    fontWeight: '600',
    color: theme?.text || '#000',
  },
  expandIcon: {
    fontSize: 12 * fontScale,
    color: theme?.textSecondary || '#666',
  },
  articlesContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme?.border || '#E5E5EA',
  },
  articleCard: {
    marginBottom: 16,
  },
  articleTitle: {
    fontSize: 16 * fontScale,
    fontWeight: '600',
    color: theme?.primary || '#1976D2',
    marginBottom: 8,
  },
  articleSource: {
    fontSize: 12 * fontScale,
    color: theme?.textSecondary || '#666',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  articleContent: {
    fontSize: 14 * fontScale,
    color: theme?.text || '#333',
    lineHeight: 20 * fontScale,
    marginBottom: 12,
  },
  articleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  readBadge: {
    backgroundColor: theme?.success,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  readBadgeText: {
    color: theme?.textOnPrimary || '#FFFFFF',
    fontSize: 12 * fontScale,
    fontWeight: '600',
  },
  markReadButton: {
    backgroundColor: theme?.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  markReadButtonText: {
    color: theme?.textOnPrimary || '#FFFFFF',
    fontSize: 14 * fontScale,
    fontWeight: '600',
  },
});

