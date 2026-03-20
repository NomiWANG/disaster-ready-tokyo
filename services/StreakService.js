import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * ============================================
 * StreakService - 连续活跃天数追踪服务
 * 
 * 功能说明：
 * - 记录用户每日的活跃状态
 * - 计算连续活跃天数（streak）
 * - 自动检测连续天数是否中断
 * 
 * 规则：
 * - 每天打开App即视为活跃
 * - 连续打开则为streak+1
 * - 超过1天未打开则streak重置为1
 * 
 * 使用示例：
 * await StreakService.updateOnLaunch();  // 每次启动时调用
 * const { streakDays } = await StreakService.getStreak();
 * ============================================
 */

const STORAGE_KEY = 'streak:v1';

const DEFAULT_STATE = {
  lastActiveDate: null,  // 上次活跃日期
  streakDays: 0,        // 连续天数
};

// 获取今日日期键，格式：YYYY-MM-DD
const getTodayKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Streak服务 - 使用对象字面量风格
 * 纯函数风格，简洁高效
 */
const StreakService = {
  // 从存储加载状态
  async _load() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_STATE };
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_STATE, ...parsed };
    } catch (err) {
      console.warn('StreakService.load failed', err);
      return { ...DEFAULT_STATE };
    }
  },

  async _save(payload) {
    const merged = {
      ...DEFAULT_STATE,
      ...payload,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  },

  // call on app launch
  async updateOnLaunch() {
    const state = await this._load();
    const today = getTodayKey();

    // first time
    if (!state.lastActiveDate) {
      const next = await this._save({ lastActiveDate: today, streakDays: 1 });
      return next;
    }

    // same day - no change
    if (state.lastActiveDate === today) {
      return state;
    }

    // calc days since last active
    const last = new Date(state.lastActiveDate + 'T00:00:00');
    const current = new Date(today + 'T00:00:00');
    const diffMs = current.getTime() - last.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    let nextStreak = 1;
    if (diffDays === 1) {
      // consecutive
      nextStreak = (state.streakDays || 0) + 1;
    } else if (diffDays > 1) {
      // broken streak
      nextStreak = 1;
    }

    const next = await this._save({
      lastActiveDate: today,
      streakDays: nextStreak,
    });
    return next;
  },

  // read only
  async getStreak() {
    const state = await this._load();
    return state;
  },
};

export default StreakService;
