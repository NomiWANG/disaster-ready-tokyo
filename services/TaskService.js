import AsyncStorage from '@react-native-async-storage/async-storage';
import tasksConfig from '../config/tasks';
import TaskStorage, { DEFAULT_STATE, STORAGE_KEY } from '../storage/task.storage';
import GamificationService from './GamificationService';
import NotificationService from './NotificationService';

/**
 * ============================================
 * TaskService - 任务系统服务
 * 
 * 功能说明：
 * - 管理灾害准备任务的生命周期
 * - 支持任务搜索、筛选、排序
 * - 完成任务自动发放积分和徽章
 * - 支持任务提醒通知的调度
 * 
 * 任务状态：
 * - active: 进行中
 * - completed: 已完成
 * - expired: 已过期
 * 
 * 使用示例：
 * const tasks = await TaskService.getActiveTasks();
 * await TaskService.completeTask('task-id');
 * await TaskService.searchAndFilterTasks({ category: 'earthquake', status: 'active' });
 * ============================================
 */

// 内存缓存
let cache = null;

/**
 * 将任务模板转换为实例
 */
const toInstance = (template) => ({
  id: template.id,
  titleKey: template.titleKey,
  descriptionKey: template.descriptionKey,
  type: template.type,
  category: template.category,
  tags: template.tags || [],
  priority: template.priority || 'medium',
  current: 0,
  target: template.target || 1,
  status: 'active',
  rewards: template.rewards || { points: 0, badges: [] },
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

/**
 * 任务服务 - 使用对象字面量+async方法风格
 */
const TaskService = {
  clearCache() {
    cache = null;
  },

  async _state() {
    if (cache) return cache;
    const stored = await TaskStorage.load();
    if (!stored.tasks || stored.tasks.length === 0) {
      const seeded = tasksConfig.map(toInstance);
      cache = await TaskStorage.save({ ...DEFAULT_STATE, tasks: seeded });
      return cache;
    }
    cache = stored;
    return cache;
  },

  async getTaskStats() {
    const state = await this._state();
    const tasks = state.tasks || [];
    const activeTasks = tasks.filter(t => t.status === 'active');
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const totalTasks = tasks.length;

    let totalPoints = 0;
    completedTasks.forEach(task => {
      totalPoints += task.rewards?.points || 0;
    });

    return {
      totalCompleted: completedTasks.length,
      totalPoints,
      activeTasks: activeTasks.length,
      completedTasks: completedTasks.length,
      totalTasks,
      completionRate: totalTasks > 0 ? completedTasks.length / totalTasks : 0,
    };
  },

  async getTaskHistory(limit = 20) {
    const history = await TaskStorage.loadHistory();
    return (history.completedTasks || []).slice(0, limit);
  },

  async expireTask(taskId) {
    const state = await this._state();
    const taskIdx = state.tasks.findIndex((t) => t.id === taskId);
    if (taskIdx === -1) {
      return null;
    }

    const task = state.tasks[taskIdx];
    state.tasks[taskIdx] = {
      ...task,
      status: 'expired',
      updatedAt: Date.now(),
    };

    cache = await TaskStorage.save(state);
    return cache.tasks[taskIdx];
  },

  async scheduleTaskReminder(taskId, delay = 3600) {
    const state = await this._state();
    const task = state.tasks.find((t) => t.id === taskId);

    if (!task || task.status !== 'active') {
      return { success: false, reason: 'Task not found or inactive' };
    }

    return await NotificationService.scheduleTaskReminder(task, delay);
  },

  async scheduleDailyReminders(hour = 9) {
    const state = await this._state();
    const activeTasks = state.tasks.filter((t) => t.status === 'active');
    return await NotificationService.scheduleDailyTaskReminders(activeTasks, hour);
  },

  async cancelTaskReminder(notificationId) {
    return await NotificationService.cancelTaskReminder(notificationId);
  },

  listTemplates() {
    return tasksConfig;
  },

  async getActiveTasks() {
    const state = await this._state();
    return state.tasks.filter((t) => t.status !== 'expired');
  },

  async getAllTasks() {
    const state = await this._state();
    return state.tasks;
  },

  async searchAndFilterTasks(options = {}) {
    const { query, category, tag, status, priority, sortBy = 'newest' } = options;
    const state = await this._state();
    let tasks = [...state.tasks];

    if (query && query.trim()) {
      const searchTerm = query.toLowerCase().trim();
      tasks = tasks.filter(task => {
        const titleMatch = task.titleKey?.toLowerCase().includes(searchTerm);
        const descMatch = task.descriptionKey?.toLowerCase().includes(searchTerm);
        const idMatch = task.id?.toLowerCase().includes(searchTerm);
        return titleMatch || descMatch || idMatch;
      });
    }

    if (category && category !== 'all') {
      tasks = tasks.filter(task => task.category === category);
    }

    if (tag) {
      tasks = tasks.filter(task => task.tags?.includes(tag));
    }

    if (status) {
      tasks = tasks.filter(task => task.status === status);
    }

    if (priority) {
      tasks = tasks.filter(task => task.priority === priority);
    }

    if (sortBy === 'newest') {
      tasks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } else if (sortBy === 'oldest') {
      tasks.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    } else if (sortBy === 'priority') {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      tasks.sort((a, b) => (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1));
    } else if (sortBy === 'progress') {
      tasks.sort((a, b) => {
        const aProgress = a.target > 0 ? a.current / a.target : 0;
        const bProgress = b.target > 0 ? b.current / b.target : 0;
        return bProgress - aProgress;
      });
    }

    return tasks;
  },

  async completeTask(taskId) {
    const state = await this._state();
    const taskIdx = state.tasks.findIndex((t) => t.id === taskId);
    if (taskIdx === -1) {
      return null;
    }

    const task = state.tasks[taskIdx];

    if (task.status === 'completed') {
      return state.tasks;
    }

    state.tasks[taskIdx] = {
      ...task,
      current: task.target,
      status: 'completed',
      completedAt: Date.now(),
      updatedAt: Date.now(),
    };

    cache = await TaskStorage.save(state);

    if (task.rewards?.points) {
      await GamificationService.addPoints('task_complete', task.rewards.points, { taskId });
    }

    if (task.rewards?.badges?.length) {
      const userState = {
        tasksCompleted: state.tasks.filter((t) => t.status === 'completed').length,
      };
      await GamificationService.evaluateBadges(userState);
    }

    return cache.tasks;
  },

  async resetTask(taskId) {
    const state = await this._state();
    const taskIdx = state.tasks.findIndex((t) => t.id === taskId);
    if (taskIdx === -1) {
      return null;
    }

    const task = state.tasks[taskIdx];

    state.tasks[taskIdx] = {
      ...task,
      current: 0,
      status: 'active',
      completedAt: undefined,
      updatedAt: Date.now(),
    };

    cache = await TaskStorage.save(state);
    return cache.tasks;
  },

  async resetAll() {
    cache = null;
    const stored = await TaskStorage.load();
    const templates = stored.tasks?.length ? stored.tasks : tasksConfig.map(toInstance);
    const reset = templates.map((task) => ({
      ...task,
      current: 0,
      status: 'active',
      completedAt: undefined,
      updatedAt: Date.now(),
    }));
    cache = await TaskStorage.save({ ...DEFAULT_STATE, tasks: reset });
    return cache.tasks;
  },

  async sync() {
    cache = await TaskStorage.load();
    return cache;
  },
};

export default TaskService;
