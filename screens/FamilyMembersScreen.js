import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from '../languages';
import { useTheme } from '../context/ThemeContext';
import FamilyMembersService, { AGE_GROUPS, RELATIONSHIP_TYPES } from '../services/FamilyMembersService';

export default function FamilyMembersScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    relationship: RELATIONSHIP_TYPES.OTHER,
    ageGroup: AGE_GROUPS.ADULT,
    hasSpecialNeeds: false,
    specialNeedsNote: '',
    emergencyContact: '',
  });

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const membersList = await FamilyMembersService.getAllMembers();
      const statsData = await FamilyMembersService.getStats();
      setMembers(membersList);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load family members:', error);
    }
  };

  const handleAddMember = async () => {
    try {
      if (!formData.name.trim()) {
        Alert.alert(t('common.error'), t('familyMembers.nameRequired'));
        return;
      }

      if (editingMember) {
        await FamilyMembersService.updateMember(editingMember.id, formData);
      } else {
        await FamilyMembersService.addMember(formData);
      }

      await loadMembers();
      resetForm();
      setShowAddModal(false);
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  const handleDeleteMember = (member) => {
    Alert.alert(
      t('familyMembers.confirmDelete'),
      t('familyMembers.confirmDeleteMessage').replace('{name}', member.name),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await FamilyMembersService.deleteMember(member.id);
              await loadMembers();
            } catch (error) {
              Alert.alert(t('common.error'), error.message);
            }
          },
        },
      ]
    );
  };

  const handleEditMember = (member) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      relationship: member.relationship,
      ageGroup: member.ageGroup,
      hasSpecialNeeds: member.hasSpecialNeeds,
      specialNeedsNote: member.specialNeedsNote || '',
      emergencyContact: member.emergencyContact || '',
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      relationship: RELATIONSHIP_TYPES.OTHER,
      ageGroup: AGE_GROUPS.ADULT,
      hasSpecialNeeds: false,
      specialNeedsNote: '',
      emergencyContact: '',
    });
    setEditingMember(null);
  };

  const getAgeGroupIcon = (ageGroup) => {
    const icons = {
      [AGE_GROUPS.INFANT]: 'INF',
      [AGE_GROUPS.CHILD]: 'CHD',
      [AGE_GROUPS.TEEN]: 'TEN',
      [AGE_GROUPS.ADULT]: 'ADT',
      [AGE_GROUPS.SENIOR]: 'SEN',
    };
    return icons[ageGroup] || 'ADT';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
        >
          <Text style={styles.backButtonText}>{t('common.back')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>{t('familyMembers.title')}</Text>
          <Text style={styles.subtitle}>{t('familyMembers.subtitle')}</Text>

          {/* Stats info */}
          {stats && (
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.total}</Text>
                <Text style={styles.statLabel}>{t('familyMembers.totalMembers')}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.withSpecialNeeds}</Text>
                <Text style={styles.statLabel}>{t('familyMembers.specialNeeds')}</Text>
              </View>
            </View>
          )}

          {/* Add member button */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              resetForm();
              setShowAddModal(true);
            }}
          >
            <Text style={styles.addButtonText}>+ {t('familyMembers.addMember')}</Text>
          </TouchableOpacity>

          {/* Members list */}
          <View style={styles.membersContainer}>
            {members.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t('familyMembers.noMembers')}</Text>
              </View>
            ) : (
              members.map((member) => (
                <View key={member.id} style={styles.memberCard}>
                  <View style={styles.memberHeader}>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberIcon}>{getAgeGroupIcon(member.ageGroup)}</Text>
                      <View>
                        <Text style={styles.memberName}>{member.name}</Text>
                        <Text style={styles.memberDetail}>
                          {t(`familyMembers.relationship.${member.relationship}`)} · {t(`familyMembers.ageGroup.${member.ageGroup}`)}
                        </Text>
                      </View>
                    </View>
                    {member.hasSpecialNeeds && (
                      <View style={styles.specialNeedsBadge}>
                        <Text style={styles.specialNeedsText}>【注意】</Text>
                      </View>
                    )}
                  </View>

                  {member.specialNeedsNote && (
                    <Text style={styles.specialNeedsNote}>{member.specialNeedsNote}</Text>
                  )}

                  {member.emergencyContact && (
                    <Text style={styles.emergencyContact}>
                      TEL: {member.emergencyContact}
                    </Text>
                  )}

                  <View style={styles.memberActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleEditMember(member)}
                    >
                      <Text style={styles.editButtonText}>{t('common.edit')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteMember(member)}
                    >
                      <Text style={styles.deleteButtonText}>{t('common.delete')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Add/Edit member modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingMember ? t('familyMembers.editMember') : t('familyMembers.addMember')}
              </Text>

              <Text style={styles.label}>{t('familyMembers.name')}</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder={t('familyMembers.namePlaceholder')}
              />

              <Text style={styles.label}>{t('familyMembers.relationship.label')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
                {Object.values(RELATIONSHIP_TYPES).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.optionButton,
                      formData.relationship === type && styles.optionButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, relationship: type })}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      formData.relationship === type && styles.optionButtonTextActive,
                    ]}>
                      {t(`familyMembers.relationship.${type}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>{t('familyMembers.ageGroup.label')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
                {Object.values(AGE_GROUPS).map((group) => (
                  <TouchableOpacity
                    key={group}
                    style={[
                      styles.optionButton,
                      formData.ageGroup === group && styles.optionButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, ageGroup: group })}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      formData.ageGroup === group && styles.optionButtonTextActive,
                    ]}>
                      {getAgeGroupIcon(group)} {t(`familyMembers.ageGroup.${group}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setFormData({ ...formData, hasSpecialNeeds: !formData.hasSpecialNeeds })}
              >
                <View style={[styles.checkbox, formData.hasSpecialNeeds && styles.checkboxChecked]}>
                  {formData.hasSpecialNeeds && <Text style={styles.checkmark}>[x]</Text>}
                </View>
                <Text style={styles.checkboxLabel}>{t('familyMembers.hasSpecialNeeds')}</Text>
              </TouchableOpacity>

              {formData.hasSpecialNeeds && (
                <>
                  <Text style={styles.label}>{t('familyMembers.specialNeedsNote')}</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.specialNeedsNote}
                    onChangeText={(text) => setFormData({ ...formData, specialNeedsNote: text })}
                    placeholder={t('familyMembers.specialNeedsPlaceholder')}
                    multiline
                    numberOfLines={3}
                  />
                </>
              )}

              <Text style={styles.label}>{t('familyMembers.emergencyContact')}</Text>
              <TextInput
                style={styles.input}
                value={formData.emergencyContact}
                onChangeText={(text) => setFormData({ ...formData, emergencyContact: text })}
                placeholder={t('familyMembers.emergencyContactPlaceholder')}
                keyboardType="phone-pad"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    resetForm();
                    setShowAddModal(false);
                  }}
                >
                  <Text style={styles.modalCancelButtonText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSaveButton}
                  onPress={handleAddMember}
                >
                  <Text style={styles.modalSaveButtonText}>{t('common.save')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (theme) => StyleSheet.create({
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
    fontSize: 16,
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
    fontSize: 28,
    fontWeight: 'bold',
    color: theme?.text || '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme?.textSecondary || '#666',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    backgroundColor: theme?.card || '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme?.primary || '#1976D2',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme?.textSecondary || '#666',
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: theme?.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  addButtonText: {
    color: theme?.textOnPrimary || '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  membersContainer: {
    gap: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: theme?.textTertiary || '#999',
    textAlign: 'center',
  },
  memberCard: {
    backgroundColor: theme?.card || '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  memberName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme?.text || '#000',
    marginBottom: 4,
  },
  memberDetail: {
    fontSize: 14,
    color: theme?.textSecondary || '#666',
  },
  specialNeedsBadge: {
    backgroundColor: theme?.warning ? `${theme.warning}22` : '#FFF4E3',
    borderRadius: 8,
    padding: 6,
  },
  specialNeedsText: {
    fontSize: 16,
  },
  specialNeedsNote: {
    fontSize: 14,
    color: theme?.warning || '#FF9800',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  emergencyContact: {
    fontSize: 14,
    color: theme?.primary || '#1976D2',
    marginBottom: 12,
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    flex: 1,
    backgroundColor: theme?.primaryLight || '#E3F2FD',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  editButtonText: {
    color: theme?.primary || '#1976D2',
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: theme?.error ? `${theme.error}22` : '#FFEBEE',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: theme?.error || '#F44336',
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme?.overlay || 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme?.card || '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme?.text || '#000',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme?.text || '#000',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: theme?.backgroundSecondary || '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme?.border || '#E5E5EA',
    color: theme?.text || '#000',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  optionsScroll: {
    marginBottom: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: theme?.surface || '#F5F5F5',
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme?.border || '#E5E5EA',
  },
  optionButtonActive: {
    backgroundColor: theme?.primary || '#1976D2',
    borderColor: theme?.primary || '#1976D2',
  },
  optionButtonText: {
    fontSize: 14,
    color: theme?.textSecondary || '#666',
  },
  optionButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme?.border || '#E5E5EA',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme?.primary || '#1976D2',
    borderColor: theme?.primary || '#1976D2',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    color: theme?.text || '#000',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: theme?.surface || '#F5F5F5',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: theme?.textSecondary || '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: theme?.primary || '#1976D2',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
