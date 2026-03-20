import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from '../languages';
import { useGamification } from '../context/GamificationContext';
import { useTasks } from '../context/TaskContext';
import { useTheme } from '../context/ThemeContext';

const EMERGENCY_KIT_STORAGE_KEY = 'emergency_kit_items';
const EMERGENCY_KIT_COMPLETION_KEY = 'emergency_kit_completion';

const ITEM_STATUS = {
  NONE: 'none',
  OWNED: 'owned',
  EXPIRED: 'expired',
};

const FILTER_OPTIONS = {
  ALL: 'all',
  NONE: 'none',
  OWNED: 'owned',
  EXPIRED: 'expired',
};

const FIRST_KIT_STARTED_KEY = 'first_kit_started';

export default function EmergencyKitScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme, fontScale } = useTheme();
  const { addPoints, refresh } = useGamification();
  const { completeTask, refresh: refreshTasks } = useTasks();
  const [selectedCategory, setSelectedCategory] = useState('essential');
  const [statusFilter, setStatusFilter] = useState(FILTER_OPTIONS.ALL);
  const [items, setItems] = useState({});
  const [completionRewards, setCompletionRewards] = useState({});
  const [showItemDetail, setShowItemDetail] = useState(null);
  const [firstKitStarted, setFirstKitStarted] = useState(false);

  // Dynamic styles
  const styles = useMemo(() => createStyles(theme, fontScale), [theme, fontScale]);

  const kitCategories = {
    essential: {
      id: 'essential',
      titleKey: 'emergencyKit.categories.essential',
      icon: '必',
      items: [
        { id: 'water', nameKey: 'emergencyKit.items.water.name', descKey: 'emergencyKit.items.water.desc', quantityKey: 'emergencyKit.items.water.quantity', expiresInDays: 730 },
        { id: 'food', nameKey: 'emergencyKit.items.food.name', descKey: 'emergencyKit.items.food.desc', quantityKey: 'emergencyKit.items.food.quantity', expiresInDays: 365 },
        { id: 'flashlight', nameKey: 'emergencyKit.items.flashlight.name', descKey: 'emergencyKit.items.flashlight.desc', quantityKey: 'emergencyKit.items.flashlight.quantity', expiresInDays: null },
        { id: 'batteries', nameKey: 'emergencyKit.items.batteries.name', descKey: 'emergencyKit.items.batteries.desc', quantityKey: 'emergencyKit.items.batteries.quantity', expiresInDays: 730 },
        { id: 'firstAid', nameKey: 'emergencyKit.items.firstAid.name', descKey: 'emergencyKit.items.firstAid.desc', quantityKey: 'emergencyKit.items.firstAid.quantity', expiresInDays: 365 },
        { id: 'mask', nameKey: 'emergencyKit.items.mask.name', descKey: 'emergencyKit.items.mask.desc', quantityKey: 'emergencyKit.items.mask.quantity', expiresInDays: 1095 },
        { id: 'portableToilet', nameKey: 'emergencyKit.items.portableToilet.name', descKey: 'emergencyKit.items.portableToilet.desc', quantityKey: 'emergencyKit.items.portableToilet.quantity', expiresInDays: null },
        { id: 'plasticBags', nameKey: 'emergencyKit.items.plasticBags.name', descKey: 'emergencyKit.items.plasticBags.desc', quantityKey: 'emergencyKit.items.plasticBags.quantity', expiresInDays: null },
      ],
    },
    important: {
      id: 'important',
      titleKey: 'emergencyKit.categories.important',
      icon: '重',
      items: [
        { id: 'documents', nameKey: 'emergencyKit.items.documents.name', descKey: 'emergencyKit.items.documents.desc', quantityKey: 'emergencyKit.items.documents.quantity', expiresInDays: null },
        { id: 'cash', nameKey: 'emergencyKit.items.cash.name', descKey: 'emergencyKit.items.cash.desc', quantityKey: 'emergencyKit.items.cash.quantity', expiresInDays: null },
        { id: 'powerBank', nameKey: 'emergencyKit.items.powerBank.name', descKey: 'emergencyKit.items.powerBank.desc', quantityKey: 'emergencyKit.items.powerBank.quantity', expiresInDays: 1095 },
        { id: 'radio', nameKey: 'emergencyKit.items.radio.name', descKey: 'emergencyKit.items.radio.desc', quantityKey: 'emergencyKit.items.radio.quantity', expiresInDays: null },
        { id: 'whistle', nameKey: 'emergencyKit.items.whistle.name', descKey: 'emergencyKit.items.whistle.desc', quantityKey: 'emergencyKit.items.whistle.quantity', expiresInDays: null },
        { id: 'raincoat', nameKey: 'emergencyKit.items.raincoat.name', descKey: 'emergencyKit.items.raincoat.desc', quantityKey: 'emergencyKit.items.raincoat.quantity', expiresInDays: null },
        { id: 'towel', nameKey: 'emergencyKit.items.towel.name', descKey: 'emergencyKit.items.towel.desc', quantityKey: 'emergencyKit.items.towel.quantity', expiresInDays: null },
        { id: 'lighter', nameKey: 'emergencyKit.items.lighter.name', descKey: 'emergencyKit.items.lighter.desc', quantityKey: 'emergencyKit.items.lighter.quantity', expiresInDays: null },
        { id: 'rope', nameKey: 'emergencyKit.items.rope.name', descKey: 'emergencyKit.items.rope.desc', quantityKey: 'emergencyKit.items.rope.quantity', expiresInDays: null },
        { id: 'helmet', nameKey: 'emergencyKit.items.helmet.name', descKey: 'emergencyKit.items.helmet.desc', quantityKey: 'emergencyKit.items.helmet.quantity', expiresInDays: null },
      ],
    },
    hygiene: {
      id: 'hygiene',
      titleKey: 'emergencyKit.categories.hygiene',
      icon: '卫',
      items: [
        { id: 'toiletPaper', nameKey: 'emergencyKit.items.toiletPaper.name', descKey: 'emergencyKit.items.toiletPaper.desc', quantityKey: 'emergencyKit.items.toiletPaper.quantity', expiresInDays: null },
        { id: 'wetWipes', nameKey: 'emergencyKit.items.wetWipes.name', descKey: 'emergencyKit.items.wetWipes.desc', quantityKey: 'emergencyKit.items.wetWipes.quantity', expiresInDays: 730 },
        { id: 'toothbrush', nameKey: 'emergencyKit.items.toothbrush.name', descKey: 'emergencyKit.items.toothbrush.desc', quantityKey: 'emergencyKit.items.toothbrush.quantity', expiresInDays: 365 },
        { id: 'feminineProducts', nameKey: 'emergencyKit.items.feminineProducts.name', descKey: 'emergencyKit.items.feminineProducts.desc', quantityKey: 'emergencyKit.items.feminineProducts.quantity', expiresInDays: null },
        { id: 'soap', nameKey: 'emergencyKit.items.soap.name', descKey: 'emergencyKit.items.soap.desc', quantityKey: 'emergencyKit.items.soap.quantity', expiresInDays: 730 },
      ],
    },
    optional: {
      id: 'optional',
      titleKey: 'emergencyKit.categories.optional',
      icon: '选',
      items: [
        { id: 'glasses', nameKey: 'emergencyKit.items.glasses.name', descKey: 'emergencyKit.items.glasses.desc', quantityKey: 'emergencyKit.items.glasses.quantity', expiresInDays: null },
        { id: 'medications', nameKey: 'emergencyKit.items.medications.name', descKey: 'emergencyKit.items.medications.desc', quantityKey: 'emergencyKit.items.medications.quantity', expiresInDays: null },
        { id: 'blanket', nameKey: 'emergencyKit.items.blanket.name', descKey: 'emergencyKit.items.blanket.desc', quantityKey: 'emergencyKit.items.blanket.quantity', expiresInDays: null },
        { id: 'tools', nameKey: 'emergencyKit.items.tools.name', descKey: 'emergencyKit.items.tools.desc', quantityKey: 'emergencyKit.items.tools.quantity', expiresInDays: null },
        { id: 'clothes', nameKey: 'emergencyKit.items.clothes.name', descKey: 'emergencyKit.items.clothes.desc', quantityKey: 'emergencyKit.items.clothes.quantity', expiresInDays: null },
        { id: 'emergencyBlanket', nameKey: 'emergencyKit.items.emergencyBlanket.name', descKey: 'emergencyKit.items.emergencyBlanket.desc', quantityKey: 'emergencyKit.items.emergencyBlanket.quantity', expiresInDays: null },
      ],
    },
    special: {
      id: 'special',
      titleKey: 'emergencyKit.categories.special',
      icon: '特',
      items: [
        { id: 'babySupplies', nameKey: 'emergencyKit.items.babySupplies.name', descKey: 'emergencyKit.items.babySupplies.desc', quantityKey: 'emergencyKit.items.babySupplies.quantity', expiresInDays: 365 },
        { id: 'elderSupplies', nameKey: 'emergencyKit.items.elderSupplies.name', descKey: 'emergencyKit.items.elderSupplies.desc', quantityKey: 'emergencyKit.items.elderSupplies.quantity', expiresInDays: null },
        { id: 'petSupplies', nameKey: 'emergencyKit.items.petSupplies.name', descKey: 'emergencyKit.items.petSupplies.desc', quantityKey: 'emergencyKit.items.petSupplies.quantity', expiresInDays: 365 },
        { id: 'hearingAidBatteries', nameKey: 'emergencyKit.items.hearingAidBatteries.name', descKey: 'emergencyKit.items.hearingAidBatteries.desc', quantityKey: 'emergencyKit.items.hearingAidBatteries.quantity', expiresInDays: 730 },
      ],
    },
  };

  useEffect(() => {
    const loadItems = async () => {
      try {
        const saved = await AsyncStorage.getItem(EMERGENCY_KIT_STORAGE_KEY);
        const savedCompletion = await AsyncStorage.getItem(EMERGENCY_KIT_COMPLETION_KEY);
        const firstStarted = await AsyncStorage.getItem(FIRST_KIT_STARTED_KEY);
        
        if (saved) {
          setItems(JSON.parse(saved));
        }
        if (savedCompletion) {
          setCompletionRewards(JSON.parse(savedCompletion));
        }
        if (firstStarted === 'true') {
          setFirstKitStarted(true);
        }
      } catch (error) {
        console.error('Failed to load emergency kit items:', error);
      }
    };
    loadItems();
  }, []);

  const getItemStatus = (itemId) => {
    const item = items[itemId];
    if (!item) return ITEM_STATUS.NONE;
    
    if (item.status === ITEM_STATUS.OWNED && item.expiresAt) {
      const now = Date.now();
      if (now > item.expiresAt) {
        return ITEM_STATUS.EXPIRED;
      }
    }
    
    return item.status || ITEM_STATUS.NONE;
  };

  const updateItemStatus = async (itemId, status) => {
    const newItems = { ...items };
    const now = Date.now();
    const category = Object.values(kitCategories).find(cat =>
      cat.items.some(item => item.id === itemId)
    );
    const itemConfig = category?.items.find(item => item.id === itemId);

    // First time: when firstKitStarted is false, current is not OWNED, new is OWNED
    const currentStatus = getItemStatus(itemId);
    const isFirstTime = !firstKitStarted && currentStatus !== ITEM_STATUS.OWNED && status === ITEM_STATUS.OWNED;
    
    if (status === ITEM_STATUS.OWNED) {
      const expiresAt = itemConfig?.expiresInDays 
        ? now + (itemConfig.expiresInDays * 24 * 60 * 60 * 1000)
        : null;
      newItems[itemId] = {
        status: ITEM_STATUS.OWNED,
        updatedAt: now,
        expiresAt,
      };
    } else {
      newItems[itemId] = {
        status,
        updatedAt: now,
      };
    }

    setItems(newItems);
    await AsyncStorage.setItem(EMERGENCY_KIT_STORAGE_KEY, JSON.stringify(newItems));

    // First time starting preparation - complete task
    if (isFirstTime) {
      await handleFirstKitStart();
    }

    if (category) {
      await checkCategoryCompletion(category.id);
    }
  };

  const handleFirstKitStart = async () => {
    try {
      setFirstKitStarted(true);
      await AsyncStorage.setItem(FIRST_KIT_STARTED_KEY, 'true');

      await completeTask('first-emergency-kit', { timestamp: Date.now() });

      await refreshTasks();
      await refresh();
      
      Alert.alert(
        t('emergencyKit.firstStartTitle'),
        t('emergencyKit.firstStartMessage'),
        [{ text: t('common.ok') }]
      );
    } catch (error) {
      console.error('Failed to complete first kit task:', error);
      Alert.alert(
        t('common.error'),
        `Task failed: ${error.message}`,
        [{ text: t('common.ok') }]
      );
    }
  };

  const checkCategoryCompletion = async (categoryId) => {
    if (completionRewards[categoryId]) return;

    const category = kitCategories[categoryId];
    const allOwned = category.items.every(item => {
      const status = getItemStatus(item.id);
      return status === ITEM_STATUS.OWNED;
    });

    if (allOwned) {
      const points = categoryId === 'essential' ? 30 : categoryId === 'important' ? 20 : 10;
      await addPoints('emergency_kit_category', points, { categoryId });
      
      const newRewards = { ...completionRewards, [categoryId]: true };
      setCompletionRewards(newRewards);
      await AsyncStorage.setItem(EMERGENCY_KIT_COMPLETION_KEY, JSON.stringify(newRewards));
      
      Alert.alert(
        t('emergencyKit.categoryComplete'),
        t('emergencyKit.categoryCompleteMessage').replace('{category}', t(category.titleKey)).replace('{points}', points),
        [{ text: t('common.ok') }]
      );

      // Check if all categories complete
      await checkFullCompletion();
    }
  };

  const checkFullCompletion = async () => {
    if (completionRewards.full) return;

    const countedCategories = Object.keys(kitCategories).filter(id => id !== 'optional' && id !== 'special');
    const allCategoriesComplete = countedCategories.every(categoryId => {
      const category = kitCategories[categoryId];
      return category.items.every(item => {
        const status = getItemStatus(item.id);
        return status === ITEM_STATUS.OWNED;
      });
    });

    if (allCategoriesComplete && !completionRewards.full) {
      await addPoints('emergency_kit_complete', 100, {});
      const newRewards = { ...completionRewards, full: true };
      setCompletionRewards(newRewards);
      await AsyncStorage.setItem(EMERGENCY_KIT_COMPLETION_KEY, JSON.stringify(newRewards));
      
      Alert.alert(
        t('emergencyKit.fullComplete'),
        t('emergencyKit.fullCompleteMessage').replace('{points}', '100'),
        [{ text: t('common.ok') }]
      );
      
      await refresh();
    }
  };

  const calculateProgress = () => {
    const countedCategories = Object.values(kitCategories).filter(cat => 
      cat.id !== 'optional' && cat.id !== 'special'
    );
    const allItems = countedCategories.flatMap(cat => cat.items);
    const ownedCount = allItems.filter(item => getItemStatus(item.id) === ITEM_STATUS.OWNED).length;
    const percentage = allItems.length === 0 ? 0 : Math.round((ownedCount / allItems.length) * 100);
    return {
      current: ownedCount,
      total: allItems.length,
      percentage,
    };
  };

  const getFilteredItems = () => {
    const category = kitCategories[selectedCategory];
    if (!category) return [];

    let filtered = category.items;

    if (statusFilter !== FILTER_OPTIONS.ALL) {
      filtered = filtered.filter(item => {
        const status = getItemStatus(item.id);
        return status === statusFilter;
      });
    }

    return filtered;
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case ITEM_STATUS.OWNED:
        return { backgroundColor: theme.success, color: theme.textOnPrimary || '#fff' };
      case ITEM_STATUS.EXPIRED:
        return { backgroundColor: theme.warning, color: theme.textOnPrimary || '#fff' };
      default:
        return { backgroundColor: theme.textSecondary || '#9E9E9E', color: theme.textOnPrimary || '#fff' };
    }
  };

  const progress = calculateProgress();
  const filteredItems = getFilteredItems();

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
          {/* Title and progress */}
          <Text style={styles.title}>{t('emergencyKit.title')}</Text>
          <Text style={styles.subtitle}>{t('emergencyKit.subtitle')}</Text>

          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress.percentage}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {progress.current} / {progress.total} {t('emergencyKit.itemsCompleted')} ({progress.percentage}%)
            </Text>
          </View>

          {/* Category selection */}
          <View style={styles.categoryContainer}>
            {Object.values(kitCategories).map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  selectedCategory === category.id && styles.categoryButtonActive,
                ]}
                onPress={() => setSelectedCategory(category.id)}
                accessibilityRole="button"
                accessibilityLabel={t(category.titleKey)}
                accessibilityState={{ selected: selectedCategory === category.id }}
              >
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <Text style={[
                  styles.categoryText,
                  selectedCategory === category.id && styles.categoryTextActive,
                ]}>
                  {t(category.titleKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Status filter */}
          <View style={styles.filterContainer}>
            <Text style={styles.filterLabel}>{t('emergencyKit.filterByStatus')}:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {Object.values(FILTER_OPTIONS).map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterButton,
                    statusFilter === filter && styles.filterButtonActive,
                  ]}
                  onPress={() => setStatusFilter(filter)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    statusFilter === filter && styles.filterButtonTextActive,
                  ]}>
                    {t(`emergencyKit.filter.${filter}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Items list */}
          <View style={styles.itemsContainer}>
            {filteredItems.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t('emergencyKit.noItemsFound')}</Text>
              </View>
            ) : (
              filteredItems.map((item) => {
                const status = getItemStatus(item.id);
                const statusStyle = getStatusStyle(status);
                const isExpired = status === ITEM_STATUS.EXPIRED;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.itemCard}
                    onPress={() => setShowItemDetail(item)}
                  >
                    <View style={styles.itemHeader}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{t(item.nameKey)}</Text>
                        <Text style={styles.itemQuantity}>{t(item.quantityKey)}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
                        <Text style={[styles.statusBadgeText, { color: statusStyle.color }]}>
                          {t(`emergencyKit.status.${status}`)}
                        </Text>
                      </View>
                    </View>
                    {isExpired && (
                      <Text style={styles.expiredWarning}>
                        【注意】{t('emergencyKit.expiredWarning')}
                      </Text>
                    )}
                    <View style={styles.itemActions}>
                      <TouchableOpacity
                        style={[styles.statusButton, status === ITEM_STATUS.NONE && styles.statusButtonActive]}
                        onPress={() => updateItemStatus(item.id, ITEM_STATUS.NONE)}
                      >
                        <Text style={styles.statusButtonText}>{t('emergencyKit.setNone')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.statusButton, status === ITEM_STATUS.OWNED && styles.statusButtonActive]}
                        onPress={() => updateItemStatus(item.id, ITEM_STATUS.OWNED)}
                      >
                        <Text style={styles.statusButtonText}>{t('emergencyKit.setOwned')}</Text>
                      </TouchableOpacity>
                      {status === ITEM_STATUS.OWNED && (
                        <TouchableOpacity
                          style={[styles.statusButton, styles.statusButtonExpired]}
                          onPress={() => updateItemStatus(item.id, ITEM_STATUS.EXPIRED)}
                        >
                          <Text style={styles.statusButtonText}>{t('emergencyKit.setExpired')}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      {/* Item detail modal */}
      <Modal
        visible={showItemDetail !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowItemDetail(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {showItemDetail && (
              <>
                <Text style={styles.modalTitle}>{t(showItemDetail.nameKey)}</Text>
                <Text style={styles.modalDesc}>{t(showItemDetail.descKey)}</Text>
                <Text style={styles.modalQuantity}>
                  {t('emergencyKit.recommendedQuantity')}: {t(showItemDetail.quantityKey)}
                </Text>
                {showItemDetail.expiresInDays && (
                  <Text style={styles.modalExpiry}>
                    {t('emergencyKit.expiresIn')}: {showItemDetail.expiresInDays} {t('emergencyKit.days')}
                  </Text>
                )}
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowItemDetail(null)}
                >
                  <Text style={styles.modalCloseButtonText}>{t('common.ok')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (theme, fontScale = 1.0) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme?.background || '#F5F5F5',
  },
  header: {
    backgroundColor: theme?.card || '#fff',
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
    marginBottom: 20,
  },
  progressContainer: {
    backgroundColor: theme?.card || '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme?.surfaceSecondary || '#E5E5EA',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme?.success || '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14 * fontScale,
    color: theme?.textSecondary || '#666',
    textAlign: 'center',
  },
  categoryContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  categoryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme?.card || '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 2,
    borderColor: theme?.border || '#E5E5EA',
  },
  categoryButtonActive: {
    borderColor: theme?.primary || '#1976D2',
    backgroundColor: theme?.primaryLight || '#E3F2FD',
  },
  categoryIcon: {
    fontSize: 16 * fontScale,
    marginRight: 4,
  },
  categoryText: {
    fontSize: 12 * fontScale,
    color: theme?.textSecondary || '#666',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: theme?.primary || '#1976D2',
    fontWeight: '600',
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14 * fontScale,
    fontWeight: '600',
    color: theme?.text || '#000',
    marginBottom: 8,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: theme?.surface || '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme?.border || '#E5E5EA',
  },
  filterButtonActive: {
    backgroundColor: theme?.primary || '#1976D2',
    borderColor: theme?.primary || '#1976D2',
  },
  filterButtonText: {
    fontSize: 14 * fontScale,
    color: theme?.textSecondary || '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  itemsContainer: {
    gap: 12,
  },
  itemCard: {
    backgroundColor: theme?.card || '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: theme?.border || '#E5E5EA',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16 * fontScale,
    fontWeight: '600',
    color: theme?.text || '#000',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 14 * fontScale,
    color: theme?.textSecondary || '#666',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusBadgeText: {
    fontSize: 12 * fontScale,
    fontWeight: '600',
  },
  expiredWarning: {
    fontSize: 12 * fontScale,
    color: theme?.warning || '#FF9800',
    marginBottom: 8,
    fontWeight: '500',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: theme?.surface || '#F5F5F5',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme?.border || '#E5E5EA',
  },
  statusButtonActive: {
    backgroundColor: theme?.success || '#4CAF50',
    borderColor: theme?.success || '#4CAF50',
  },
  statusButtonExpired: {
    backgroundColor: theme?.warning || '#FF9800',
    borderColor: theme?.warning || '#FF9800',
  },
  statusButtonText: {
    fontSize: 12 * fontScale,
    color: theme?.textSecondary || '#666',
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16 * fontScale,
    color: theme?.textTertiary || '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme?.overlay || 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme?.card || '#fff',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: theme?.border || '#E5E5EA',
  },
  modalTitle: {
    fontSize: 20 * fontScale,
    fontWeight: 'bold',
    color: theme?.text || '#000',
    marginBottom: 12,
  },
  modalDesc: {
    fontSize: 14 * fontScale,
    color: theme?.textSecondary || '#666',
    lineHeight: 20 * fontScale,
    marginBottom: 12,
  },
  modalQuantity: {
    fontSize: 14 * fontScale,
    color: theme?.primary || '#1976D2',
    fontWeight: '500',
    marginBottom: 8,
  },
  modalExpiry: {
    fontSize: 14 * fontScale,
    color: theme?.warning || '#FF9800',
    fontWeight: '500',
    marginBottom: 20,
  },
  modalCloseButton: {
    backgroundColor: theme?.primary || '#1976D2',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 16 * fontScale,
    fontWeight: '600',
  },
});

