import AsyncStorage from '@react-native-async-storage/async-storage';
import badgesConfig from '../config/badges';
import GamificationStorage, { DEFAULT_STATE, STORAGE_KEY } from '../storage/gamification.storage';

/**
 * ============================================
 * GamificationService - 游戏化积分与成就服务
 * 
 * 功能说明：
 * - 管理用户积分和等级系统
 * - 评估并解锁成就徽章
 * - 提供进度查询和状态同步
 * - 支持重置用户游戏数据
 * 
 * 等级规则：
 * - 每200积分升一级
 * - 进度百分比 = (当前积分 - 本级起始积分) / (下一级起始积分 - 本级起始积分)
 * 
 * 使用示例：
 * await GamificationService.addPoints('task_complete', 50);
 * await GamificationService.evaluateBadges({ tasksCompleted: 5 });
 * ============================================
 */

// 内存缓存，避免频繁读取Storage
let cache = null;

/**
 * 计算等级和进度
 * @param {number} points - 当前积分
 * @returns {{level: number, percent: number}} 等级和进度百分比
 */
const levelCurve = (points) => {
  const level = Math.floor(points / 200) + 1;
  const currentLevelMin = (level - 1) * 200;
  const nextLevelMin = level * 200;
  const percent = Math.min(1, (points - currentLevelMin) / (nextLevelMin - currentLevelMin));
  return { level, percent };
};

/**
 * 游戏化服务 - 使用对象字面量+async方法风格
 */
const GamificationService = {
  // 内部方法：获取状态（带缓存）
  async _state() {
    if (cache) return cache;
    cache = await GamificationStorage.load();
    return cache;
  },

  async addPoints(event, amount, meta = {}) {
    if (!amount || amount <= 0) return this._state();
    const state = await this._state();
    const nextPoints = (state.points || 0) + amount;
    const progress = levelCurve(nextPoints);
    const nextState = {
      ...state,
      points: nextPoints,
      progress,
      lastEvent: { event, amount, meta, at: Date.now() },
    };
    cache = await GamificationStorage.save(nextState);
    return cache;
  },

  async evaluateBadges(userState = {}) {
    const state = await this._state();
    const tasksCompleted = userState.tasksCompleted || 0;
    const streakDays = userState.streakDays || 0;
    const unlocked = new Set(state.badges || []);

    badgesConfig.forEach((badge) => {
      const cond = badge.condition || {};
      if (cond.type === 'count' && tasksCompleted >= (cond.taskCompletedGte || 0)) {
        unlocked.add(badge.id);
      }
      if (cond.type === 'streak' && streakDays >= (cond.days || 0)) {
        unlocked.add(badge.id);
      }
      if (cond.type === 'points' && state.points >= (cond.gte || 0)) {
        unlocked.add(badge.id);
      }
    });

    const nextState = { ...state, badges: Array.from(unlocked) };
    cache = await GamificationStorage.save(nextState);
    return cache;
  },

  async getProgress() {
    const state = await this._state();
    if (!state.progress) {
      const progress = levelCurve(state.points || 0);
      const nextState = { ...state, progress };
      cache = await GamificationStorage.save(nextState);
      return cache.progress;
    }
    return state.progress;
  },

  async sync() {
    cache = await GamificationStorage.load();
    return cache;
  },

  async reset() {
    cache = null;
    await AsyncStorage.removeItem(STORAGE_KEY);
    cache = DEFAULT_STATE;
    await GamificationStorage.save(cache);
    return cache;
  },
  
  clearCache() {
    cache = null;
  },
};

export default GamificationService;
