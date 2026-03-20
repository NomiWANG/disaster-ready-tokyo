// 家庭成员服务 - 管理家庭成员信息和紧急联系方式

import FamilyMembersStorage, { AGE_GROUPS, RELATIONSHIP_TYPES } from '../storage/familyMembers.storage';

const FamilyMembersService = {
  // 获取所有家庭成员
  async getAllMembers() {
    const state = await FamilyMembersStorage.load();
    return state.members;
  },

  // 添加新成员
  async addMember(memberData) {
    const { name, relationship, ageGroup, hasSpecialNeeds, specialNeedsNote, emergencyContact } = memberData;

    if (!name || !name.trim()) {
      throw new Error('姓名不能为空');
    }

    const member = {
      name: name.trim(),
      relationship: relationship || RELATIONSHIP_TYPES.OTHER,
      ageGroup: ageGroup || AGE_GROUPS.ADULT,
      hasSpecialNeeds: hasSpecialNeeds || false,
      specialNeedsNote: specialNeedsNote || '',
      emergencyContact: emergencyContact || '',
    };

    const result = await FamilyMembersStorage.addMember(member);
    return result.members[result.members.length - 1];
  },

  // 更新成员信息
  async updateMember(id, updates) {
    if (!id) {
      throw new Error('成员ID不能为空');
    }
    const result = await FamilyMembersStorage.updateMember(id, updates);
    return result.members.find(m => m.id === id);
  },

  // 删除成员
  async deleteMember(id) {
    if (!id) {
      throw new Error('成员ID不能为空');
    }
    await FamilyMembersStorage.deleteMember(id);
    return true;
  },

  // 统计家庭成员信息
  async getStats() {
    const members = await this.getAllMembers();
    
    const stats = {
      total: members.length,
      byAgeGroup: {},
      byRelationship: {},
      withSpecialNeeds: members.filter(m => m.hasSpecialNeeds).length,
    };

    Object.values(AGE_GROUPS).forEach(ageGroup => {
      stats.byAgeGroup[ageGroup] = members.filter(m => m.ageGroup === ageGroup).length;
    });

    Object.values(RELATIONSHIP_TYPES).forEach(relationship => {
      stats.byRelationship[relationship] = members.filter(m => m.relationship === relationship).length;
    });

    return stats;
  },

  // 清空所有成员
  async clearAll() {
    await FamilyMembersStorage.clear();
    return true;
  },
};

export default FamilyMembersService;
export { AGE_GROUPS, RELATIONSHIP_TYPES };
