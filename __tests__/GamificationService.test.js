import GamificationService from '../services/GamificationService';

// Mock storage to avoid touching real AsyncStorage
jest.mock('../storage/gamification.storage', () => {
  let state = {
    points: 0,
    badges: [],
    progress: { level: 1, percent: 0 },
    meta: { version: 1, updatedAt: Date.now() },
  };

  return {
    __esModule: true,
    STORAGE_KEY: 'gamification:v1',
    DEFAULT_STATE: state,
    load: jest.fn(async () => state),
    save: jest.fn(async (next) => {
      state = next;
      return state;
    }),
  };
});

describe('GamificationService', () => {
  beforeEach(async () => {
    // reset internal cache and storage
    if (GamificationService.clearCache) {
      GamificationService.clearCache();
    }
    const storage = require('../storage/gamification.storage');
    storage.load.mockClear();
    storage.save.mockClear();
  });

  it('adds points and updates level progress', async () => {
    const state1 = await GamificationService.addPoints('test_event', 50);
    expect(state1.points).toBe(50);
    expect(state1.progress.level).toBe(1);

    const state2 = await GamificationService.addPoints('test_event', 200);
    expect(state2.points).toBe(250);
    expect(state2.progress.level).toBeGreaterThanOrEqual(2);
  });

  it('evaluateBadges does not throw and returns state', async () => {
    await GamificationService.addPoints('task_complete', 500);
    const result = await GamificationService.evaluateBadges({
      tasksCompleted: 3,
      streakDays: 3,
    });
    expect(result).toHaveProperty('badges');
    expect(Array.isArray(result.badges)).toBe(true);
  });
});

