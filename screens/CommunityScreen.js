import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useTranslation, useDateFormatter } from '../languages';
import { useCommunity } from '../context/CommunityContext';
import { useTheme } from '../context/ThemeContext';
import StatusWall from '../components/StatusWall';
import CommunityService from '../services/CommunityService';
import SettingsMenu from '../components/SettingsMenu';

export default function CommunityScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { formatShort } = useDateFormatter();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { posts, refresh, addPost } = useCommunity();
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  const [matchModalVisible, setMatchModalVisible] = useState(false);
  const [matchedOffers, setMatchedOffers] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredPosts = useMemo(() => {
    let result = [...posts];

    if (filterType && filterType !== 'all') {
      result = result.filter((post) => post.type === filterType);
    }

    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter((post) => {
        const postMessage = (post.message || '').toLowerCase();
        const postAuthor = (post.author || '').toLowerCase();
        return postMessage.includes(query) || postAuthor.includes(query);
      });
    }

    if (sortBy === 'newest') {
      result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    }

    return result;
  }, [posts, searchQuery, sortBy, filterType]);

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;

    const newPost = {
      message: trimmed,
      type,
      id: `post_${Date.now()}`,
    };

    await addPost(newPost);
    setMessage('');

    if (type === 'request') {
      try {
        const matches = await CommunityService.findMatchesForRequest(newPost);
        if (matches && matches.length > 0) {
          setMatchedOffers(matches);
          setMatchModalVisible(true);
        }
      } catch (error) {
        console.error('Failed to find matches:', error);
      }
    }
  };

  const typeLabel = (value) => t(`community.type.${value}`);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerTop}>
        <View style={styles.headerSpacer} />
        <SettingsMenu variant="compact" />
      </View>
      
      <Text style={styles.title}>{t('community.title')}</Text>
      <Text style={styles.subtitle}>{t('community.subtitle')}</Text>

      <View style={styles.composer}>
        <View style={styles.typeSwitcher}>
          {['info', 'request', 'offer'].map((value) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.typeChip,
                type === value && styles.typeChipActive
              ]}
              onPress={() => setType(value)}
            >
              <Text style={[
                styles.typeChipText,
                type === value && styles.typeChipTextActive
              ]}>
                {typeLabel(value)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.input}
          placeholder={t('community.inputPlaceholder')}
          placeholderTextColor={theme.textTertiary}
          value={message}
          onChangeText={setMessage}
          multiline
        />
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>{t('community.submit')}</Text>
        </TouchableOpacity>
      </View>

      {/* Search box */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('community.searchPlaceholder')}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={theme.textTertiary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
          >
            <Text style={styles.clearButtonText}>x</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter and sort controls */}
      <View style={styles.controlsContainer}>
        {/* Type filter */}
        <View style={styles.filterSection}>
          <Text style={styles.controlLabel}>{t('community.filterBy')}:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {['all', 'info', 'request', 'offer'].map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.filterChip,
                  filterType === value && styles.filterChipActive
                ]}
                onPress={() => setFilterType(value)}
              >
                <Text style={[
                  styles.filterChipText,
                  filterType === value && styles.filterChipTextActive
                ]}>
                  {value === 'all' ? t('community.filterAll') : typeLabel(value)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Sort */}
        <View style={styles.sortSection}>
          <Text style={styles.controlLabel}>{t('community.sortBy')}:</Text>
          <View style={styles.sortButtons}>
            <TouchableOpacity
              style={[styles.sortButton, sortBy === 'newest' && styles.sortButtonActive]}
              onPress={() => setSortBy('newest')}
            >
              <Text style={[
                styles.sortButtonText,
                sortBy === 'newest' && styles.sortButtonTextActive
              ]}>
                {t('community.sortNewest')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortButton, sortBy === 'oldest' && styles.sortButtonActive]}
              onPress={() => setSortBy('oldest')}
            >
              <Text style={[
                styles.sortButtonText,
                sortBy === 'oldest' && styles.sortButtonTextActive
              ]}>
                {t('community.sortOldest')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Results count */}
      {(searchQuery || filterType !== 'all') && (
        <View style={styles.resultsInfo}>
          <Text style={styles.resultsText}>
            {filteredPosts.length === 0 
              ? t('community.noResults')
              : t('community.showingResults').replace('{count}', filteredPosts.length)
            }
          </Text>
        </View>
      )}

      <View style={styles.wallContainer}>
        <StatusWall posts={filteredPosts} />
      </View>

      {/* Match found modal */}
      <Modal
        visible={matchModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMatchModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('community.matchFound')}</Text>
            <Text style={styles.modalDesc}>{t('community.matchFoundDesc')}</Text>
            
            {matchedOffers.length > 0 ? (
              <ScrollView style={styles.matchList} showsVerticalScrollIndicator={false}>
                {matchedOffers.map((offer) => (
                  <View key={offer.id} style={styles.matchItem}>
                    <Text style={styles.matchItemAuthor}>
                      {t('community.matchAuthor')}: {offer.author}
                    </Text>
                    <Text style={styles.matchItemMessage} numberOfLines={2}>
                      {offer.message}
                    </Text>
                    <Text style={styles.matchItemTime}>
                      {t('community.matchTime')}: {formatShort(offer.createdAt)}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.noMatchesText}>{t('community.noMatches')}</Text>
            )}
            
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setMatchModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>{t('community.matchClose')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme?.background || '#F5F5F5',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme?.border || '#E5E5EA',
  },
  headerSpacer: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme?.text || '#000',
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  subtitle: {
    fontSize: 14,
    color: theme?.textSecondary || '#666',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  composer: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme?.border || '#E0D9CF',
    backgroundColor: theme?.card || '#fff',
  },
  typeSwitcher: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 8,
    backgroundColor: theme?.surface || '#F5F5F5',
    borderColor: theme?.border || '#E5E5EA',
  },
  typeChipActive: {
    backgroundColor: theme?.secondary || '#7B9FC4',
    borderColor: theme?.secondary || '#7B9FC4',
  },
  typeChipText: {
    fontSize: 12,
    color: theme?.textSecondary || '#666',
  },
  typeChipTextActive: {
    color: theme?.backgroundSecondary || '#fff',
  },
  input: {
    minHeight: 60,
    maxHeight: 120,
    paddingVertical: 8,
    fontSize: 14,
    color: theme?.text || '#000',
    backgroundColor: theme?.backgroundSecondary || '#fff',
  },
  submitButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: theme?.secondary || '#7B9FC4',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme?.backgroundSecondary || '#fff',
  },
  wallContainer: {
    flex: 1,
  },
  searchContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme?.border || '#E0D9CF',
    paddingHorizontal: 12,
    backgroundColor: theme?.card || '#fff',
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    paddingVertical: 8,
    color: theme?.text || '#000',
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme?.textSecondary || '#666',
  },
  controlsContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme?.border || '#E0D9CF',
    padding: 12,
    backgroundColor: theme?.card || '#fff',
  },
  filterSection: {
    marginBottom: 12,
  },
  sortSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    color: theme?.text || '#000',
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
    backgroundColor: theme?.surface || '#F5F5F5',
    borderColor: theme?.border || '#E5E5EA',
  },
  filterChipActive: {
    backgroundColor: theme?.secondary || '#7B9FC4',
    borderColor: theme?.secondary || '#7B9FC4',
  },
  filterChipText: {
    fontSize: 12,
    color: theme?.textSecondary || '#666',
  },
  filterChipTextActive: {
    color: theme?.backgroundSecondary || '#fff',
  },
  sortButtons: {
    flexDirection: 'row',
    flex: 1,
    gap: 8,
  },
  sortButton: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    backgroundColor: theme?.surface || '#F5F5F5',
    borderColor: theme?.border || '#E5E5EA',
  },
  sortButtonActive: {
    backgroundColor: theme?.secondary || '#7B9FC4',
    borderColor: theme?.secondary || '#7B9FC4',
  },
  sortButtonText: {
    fontSize: 12,
    color: theme?.textSecondary || '#666',
  },
  sortButtonTextActive: {
    color: theme?.backgroundSecondary || '#fff',
  },
  resultsInfo: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: theme?.primaryLight || '#E3F2FD',
  },
  resultsText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme?.primary || '#1976D2',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: theme?.overlay || 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    backgroundColor: theme?.card || '#fff',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    color: theme?.text || '#000',
  },
  modalDesc: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
    color: theme?.textSecondary || '#666',
  },
  matchList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  matchItem: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    backgroundColor: theme?.backgroundSecondary || '#f5f5f5',
    borderColor: theme?.border || '#E5E5EA',
  },
  matchItemAuthor: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: theme?.text || '#000',
  },
  matchItemMessage: {
    fontSize: 13,
    marginBottom: 6,
    lineHeight: 18,
    color: theme?.textSecondary || '#666',
  },
  matchItemTime: {
    fontSize: 11,
    color: theme?.textTertiary || '#999',
  },
  noMatchesText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
    color: theme?.textSecondary || '#666',
  },
  modalCloseButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: theme?.secondary || '#7B9FC4',
  },
  modalCloseButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme?.backgroundSecondary || '#fff',
  },
});

