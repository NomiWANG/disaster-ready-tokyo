import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'tasks:v2';
const HISTORY_KEY = 'tasks:history:v1';
const STATS_KEY = 'tasks:stats:v1';

const DEFAULT_STATE = {
  tasks: [],
  meta: { version: 2, updatedAt: Date.now() },
};

const DEFAULT_HISTORY = {
  completedTasks: [],
  meta: { version: 1, updatedAt: Date.now() },
};

const DEFAULT_STATS = {
  totalCompleted: 0,
  totalPoints: 0,
  tasksByCategory: {},
  tasksByTag: {},
  completionRate: 0,
  streakDays: 0,
  lastCompletedAt: null,
  meta: { version: 1, updatedAt: Date.now() },
};

const TaskStorage = {
  async load() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_STATE;
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_STATE, ...parsed };
    } catch (err) {
      console.warn('TaskStorage.load failed, fallback default', err);
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
        version: 2,
      },
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  },

  async loadHistory() {
    try {
      const raw = await AsyncStorage.getItem(HISTORY_KEY);
      if (!raw) return DEFAULT_HISTORY;
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_HISTORY, ...parsed };
    } catch (err) {
      console.warn('TaskStorage.loadHistory failed, fallback default', err);
      return DEFAULT_HISTORY;
    }
  },

  async saveHistory(payload) {
    const merged = {
      ...DEFAULT_HISTORY,
      ...payload,
      meta: {
        ...DEFAULT_HISTORY.meta,
        ...(payload?.meta || {}),
        updatedAt: Date.now(),
      },
    };
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(merged));
    return merged;
  },

  async addToHistory(task) {
    const history = await this.loadHistory();
    const completedTask = {
      ...task,
      completedAt: Date.now(),
    };
    // Keep last 100 history records
    const updatedHistory = [completedTask, ...history.completedTasks].slice(0, 100);
    return this.saveHistory({
      ...history,
      completedTasks: updatedHistory,
    });
  },

  async loadStats() {
    try {
      const raw = await AsyncStorage.getItem(STATS_KEY);
      if (!raw) return DEFAULT_STATS;
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_STATS, ...parsed };
    } catch (err) {
      console.warn('TaskStorage.loadStats failed, fallback default', err);
      return DEFAULT_STATS;
    }
  },

  async saveStats(payload) {
    const merged = {
      ...DEFAULT_STATS,
      ...payload,
      meta: {
        ...DEFAULT_STATS.meta,
        ...(payload?.meta || {}),
        updatedAt: Date.now(),
      },
    };
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(merged));
    return merged;
  },

  async updateStats(task) {
    const stats = await this.loadStats();
    const category = task.category || 'unknown';
    const tags = task.tags || [];
    const points = task.rewards?.points || 0;

    const tasksByCategory = { ...stats.tasksByCategory };
    tasksByCategory[category] = (tasksByCategory[category] || 0) + 1;

    const tasksByTag = { ...stats.tasksByTag };
    tags.forEach(tag => {
      tasksByTag[tag] = (tasksByTag[tag] || 0) + 1;
    });

    return this.saveStats({
      ...stats,
      totalCompleted: stats.totalCompleted + 1,
      totalPoints: stats.totalPoints + points,
      tasksByCategory,
      tasksByTag,
      lastCompletedAt: Date.now(),
    });
  },

  async migrate() {
    // Migrate from v1 to v2
    try {
      const oldData = await AsyncStorage.getItem('tasks:v1');
      if (oldData) {
        const parsed = JSON.parse(oldData);
        const newData = {
          ...DEFAULT_STATE,
          tasks: parsed.tasks || [],
        };
        await this.save(newData);
        console.log('Migrated from tasks:v1 to tasks:v2');
      }
    } catch (err) {
      console.warn('Migration failed', err);
    }
    return this.load();
  },
};

export { STORAGE_KEY, HISTORY_KEY, STATS_KEY, DEFAULT_STATE, DEFAULT_HISTORY, DEFAULT_STATS };
export default TaskStorage;

