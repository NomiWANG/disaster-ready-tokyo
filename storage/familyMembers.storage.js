import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'family_members:v1';

const DEFAULT_STATE = {
  members: [],
  meta: { version: 1, updatedAt: Date.now() },
};

// Relationship types
export const RELATIONSHIP_TYPES = {
  SPOUSE: 'spouse',
  PARENT: 'parent',
  CHILD: 'child',
  SIBLING: 'sibling',
  GRANDPARENT: 'grandparent',
  GRANDCHILD: 'grandchild',
  OTHER: 'other',
};

// Age groups for emergency preparedness
export const AGE_GROUPS = {
  INFANT: 'infant',
  CHILD: 'child',
  TEEN: 'teen',
  ADULT: 'adult',
  SENIOR: 'senior',
};

const FamilyMembersStorage = {
  async load() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_STATE;
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_STATE, ...parsed };
    } catch (err) {
      console.warn('FamilyMembersStorage.load failed, fallback default', err);
      return DEFAULT_STATE;
    }
  },

  async save(payload) {
    const merged = {
      ...DEFAULT_STATE,
      ...payload,
      meta: {
        ...DEFAULT_STATE.meta,
        ...(payload?.meta || {}),
        updatedAt: Date.now(),
      },
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  },

  async addMember(member) {
    const state = await this.load();
    const newMember = {
      id: Date.now().toString(),
      ...member,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const members = [...state.members, newMember];
    return this.save({ ...state, members });
  },

  async updateMember(id, updates) {
    const state = await this.load();
    const members = state.members.map(member => 
      member.id === id 
        ? { ...member, ...updates, updatedAt: Date.now() }
        : member
    );
    return this.save({ ...state, members });
  },

  async deleteMember(id) {
    const state = await this.load();
    const members = state.members.filter(member => member.id !== id);
    return this.save({ ...state, members });
  },

  async clear() {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return DEFAULT_STATE;
  },
};

export { STORAGE_KEY, DEFAULT_STATE };
export default FamilyMembersStorage;
