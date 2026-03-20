import TaskService from '../services/TaskService';
import GamificationService from '../services/GamificationService';
import NotificationService from '../services/NotificationService';

// Mock task storage
jest.mock('../storage/task.storage', () => {
  let state = {
    tasks: [],
    meta: { version: 2, updatedAt: Date.now() },
  };

  let history = {
    completedTasks: [],
    meta: { version: 1, updatedAt: Date.now() },
  };

  let stats = {
    totalCompleted: 0,
    totalPoints: 0,
    tasksByCategory: {},
    tasksByTag: {},
    completionRate: 0,
    lastCompletedAt: null,
    meta: { version: 1, updatedAt: Date.now() },
  };

  const mockStorage = {
    load: jest.fn(async () => state),
    save: jest.fn(async (next) => {
      state = next;
      return state;
    }),
    loadHistory: jest.fn(async () => history),
    saveHistory: jest.fn(async (next) => {
      history = next;
      return history;
    }),
    addToHistory: jest.fn(async (task) => {
      history.completedTasks = [task, ...history.completedTasks].slice(0, 100);
      return history;
    }),
    loadStats: jest.fn(async () => stats),
    saveStats: jest.fn(async (next) => {
      stats = next;
      return stats;
    }),
    updateStats: jest.fn(async (task) => {
      const category = task.category || 'unknown';
      const tags = task.tags || [];
      const points = task.rewards?.points || 0;

      stats.totalCompleted += 1;
      stats.totalPoints += points;
      stats.tasksByCategory[category] = (stats.tasksByCategory[category] || 0) + 1;
      tags.forEach(tag => {
        stats.tasksByTag[tag] = (stats.tasksByTag[tag] || 0) + 1;
      });
      stats.lastCompletedAt = Date.now();
      return stats;
    }),
  };

  return {
    __esModule: true,
    default: mockStorage,
    STORAGE_KEY: 'task:v2',
    HISTORY_KEY: 'task:history:v1',
    STATS_KEY: 'task:stats:v1',
    DEFAULT_STATE: state,
    DEFAULT_HISTORY: history,
    DEFAULT_STATS: stats,
    ...mockStorage,
  };
});

// Mock gamification so tests focus on task logic
jest.mock('../services/GamificationService', () => ({
  __esModule: true,
  default: {
    addPoints: jest.fn(async () => ({})),
    evaluateBadges: jest.fn(async () => ({})),
    clearCache: jest.fn(),
  },
}));

// Mock notification service
jest.mock('../services/NotificationService', () => ({
  __esModule: true,
  default: {
    scheduleTaskReminder: jest.fn(async (task, delay) => ({
      success: true,
      notificationId: `notification-${task.id}`,
      taskId: task.id,
      scheduledAt: Date.now(),
      triggerAt: Date.now() + (delay * 1000),
    })),
    scheduleDailyTaskReminders: jest.fn(async (tasks, hour) => 
      tasks.map(task => ({
        success: true,
        notificationId: `notification-${task.id}`,
        taskId: task.id,
        scheduledAt: Date.now(),
      }))
    ),
    cancelTaskReminder: jest.fn(async () => true),
  },
}));

describe('TaskService', () => {
  beforeEach(() => {
    const storage = require('../storage/task.storage');
    storage.load.mockClear();
    storage.save.mockClear();
    storage.loadHistory.mockClear();
    storage.saveHistory.mockClear();
    storage.addToHistory.mockClear();
    storage.loadStats.mockClear();
    storage.saveStats.mockClear();
    storage.updateStats.mockClear();
    
    // clear internal cache if method exists
    if (TaskService.clearCache) {
      TaskService.clearCache();
    }

    // Clear gamification and notification mocks
    GamificationService.addPoints.mockClear();
    GamificationService.evaluateBadges.mockClear();

    NotificationService.scheduleTaskReminder.mockClear();
    NotificationService.scheduleDailyTaskReminders.mockClear();
    NotificationService.cancelTaskReminder.mockClear();
  });

  describe('Basic Task Operations', () => {
    it('initializes tasks from config when storage is empty', async () => {
      const tasks = await TaskService.getActiveTasks();
      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks[0]).toHaveProperty('status');
      expect(tasks[0]).toHaveProperty('category');
      expect(tasks[0]).toHaveProperty('tags');
      expect(tasks[0]).toHaveProperty('priority');
    });

    it('completes a task and calls GamificationService', async () => {
      const tasks = await TaskService.getActiveTasks();
      const target = tasks[0];

      const completed = await TaskService.completeTask(target.id);
      expect(completed.status).toBe('completed');
      expect(completed.current).toBe(completed.target);

      expect(GamificationService.addPoints).toHaveBeenCalled();
      expect(GamificationService.evaluateBadges).toHaveBeenCalled();
    });

    it('updates history and stats when completing a task', async () => {
      const storage = require('../storage/task.storage');
      const tasks = await TaskService.getActiveTasks();
      const target = tasks[0];

      await TaskService.completeTask(target.id);

      expect(storage.addToHistory).toHaveBeenCalled();
      expect(storage.updateStats).toHaveBeenCalled();
    });

    it('expires a task', async () => {
      const tasks = await TaskService.getActiveTasks();
      const target = tasks[0];

      const expired = await TaskService.expireTask(target.id);
      expect(expired.status).toBe('expired');
    });

    it('resets a task to active state', async () => {
      const tasks = await TaskService.getActiveTasks();
      const target = tasks[0];

      // Complete the task first
      await TaskService.completeTask(target.id);
      
      // Reset it
      const reset = await TaskService.resetTask(target.id);
      expect(reset.status).toBe('active');
      expect(reset.current).toBe(0);
    });
  });

  describe('Search and Filter', () => {
    it('searches tasks by keyword', async () => {
      const results = await TaskService.searchAndFilterTasks({ query: 'daily' });
      expect(Array.isArray(results)).toBe(true);
    });

    it('filters tasks by category', async () => {
      const results = await TaskService.searchAndFilterTasks({ category: 'daily' });
      expect(Array.isArray(results)).toBe(true);
      results.forEach(task => {
        if (task.category) {
          expect(task.category).toBe('daily');
        }
      });
    });

    it('filters tasks by tag', async () => {
      const results = await TaskService.searchAndFilterTasks({ tag: 'practice' });
      expect(Array.isArray(results)).toBe(true);
      results.forEach(task => {
        if (task.tags && task.tags.length > 0) {
          expect(task.tags).toContain('practice');
        }
      });
    });

    it('filters tasks by status', async () => {
      const results = await TaskService.searchAndFilterTasks({ status: 'active' });
      expect(Array.isArray(results)).toBe(true);
      results.forEach(task => {
        expect(task.status).toBe('active');
      });
    });

    it('filters tasks by priority', async () => {
      const results = await TaskService.searchAndFilterTasks({ priority: 'high' });
      expect(Array.isArray(results)).toBe(true);
      results.forEach(task => {
        if (task.priority) {
          expect(task.priority).toBe('high');
        }
      });
    });

    it('sorts tasks by newest first', async () => {
      const results = await TaskService.searchAndFilterTasks({ sortBy: 'newest' });
      expect(Array.isArray(results)).toBe(true);
      if (results.length > 1) {
        expect(results[0].createdAt).toBeGreaterThanOrEqual(results[1].createdAt);
      }
    });

    it('sorts tasks by priority', async () => {
      const results = await TaskService.searchAndFilterTasks({ sortBy: 'priority' });
      expect(Array.isArray(results)).toBe(true);
    });

    it('combines search and filter options', async () => {
      const results = await TaskService.searchAndFilterTasks({
        query: 'task',
        category: 'daily',
        status: 'active',
        sortBy: 'priority'
      });
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('History and Statistics', () => {
    it('retrieves task history', async () => {
      const history = await TaskService.getTaskHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('retrieves task statistics', async () => {
      const stats = await TaskService.getTaskStats();
      expect(stats).toHaveProperty('totalCompleted');
      expect(stats).toHaveProperty('totalPoints');
      expect(stats).toHaveProperty('completionRate');
      expect(stats).toHaveProperty('activeTasks');
      expect(stats).toHaveProperty('completedTasks');
      expect(stats).toHaveProperty('totalTasks');
    });

    it('limits history results', async () => {
      const limit = 5;
      const history = await TaskService.getTaskHistory(limit);
      expect(history.length).toBeLessThanOrEqual(limit);
    });
  });

  describe('Task Notifications', () => {
    it('schedules a task reminder', async () => {
      const tasks = await TaskService.getActiveTasks();
      const target = tasks[0];

      const result = await TaskService.scheduleTaskReminder(target.id, 3600);
      
      expect(result.success).toBe(true);
      expect(result.notificationId).toBeDefined();
      expect(result.taskId).toBe(target.id);

      expect(NotificationService.scheduleTaskReminder).toHaveBeenCalled();
    });

    it('schedules daily reminders for all active tasks', async () => {
      const results = await TaskService.scheduleDailyReminders(9);
      
      expect(Array.isArray(results)).toBe(true);

      expect(NotificationService.scheduleDailyTaskReminders).toHaveBeenCalled();
    });

    it('cancels a task reminder', async () => {
      const notificationId = 'test-notification-id';
      const result = await TaskService.cancelTaskReminder(notificationId);
      
      expect(result).toBe(true);

      expect(NotificationService.cancelTaskReminder).toHaveBeenCalledWith(notificationId);
    });

    it('does not schedule reminder for inactive task', async () => {
      const tasks = await TaskService.getActiveTasks();
      const target = tasks[0];

      // Expire the task first
      await TaskService.expireTask(target.id);

      const result = await TaskService.scheduleTaskReminder(target.id, 3600);
      
      expect(result.success).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('handles completing non-existent task', async () => {
      const result = await TaskService.completeTask('non-existent-id');
      expect(result).toBeNull();
    });

    it('handles resetting non-existent task', async () => {
      const result = await TaskService.resetTask('non-existent-id');
      expect(result).toBeNull();
    });

    it('returns empty array for search with no matches', async () => {
      const results = await TaskService.searchAndFilterTasks({ query: 'xxxxxxxxx' });
      expect(results).toEqual([]);
    });
  });
});

