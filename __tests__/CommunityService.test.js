import CommunityService from '../services/CommunityService';

// Mock CommunityStorage PrivacyStorage and LocationService
jest.mock('../storage/community.storage', () => {
  let state = {
    posts: [],
    meta: { version: 1, updatedAt: Date.now() },
  };

  return {
    __esModule: true,
    DEFAULT_STATE: state,
    STORAGE_KEY: 'community:v1',
    load: jest.fn(async () => state),
    save: jest.fn(async (next) => {
      state = next;
      return state;
    }),
  };
});

jest.mock('../storage/privacy.storage', () => ({
  __esModule: true,
  DEFAULT_STATE: {
    shareLocationInCommunity: false,
    meta: { version: 1, updatedAt: Date.now() },
  },
  STORAGE_KEY: 'privacy:v1',
  load: jest.fn(async () => ({
    shareLocationInCommunity: true,
    meta: { version: 1, updatedAt: Date.now() },
  })),
  save: jest.fn(async (next) => next),
}));

jest.mock('../services/LocationService', () => ({
  __esModule: true,
  default: {
    getLocation: jest.fn(() => ({
      latitude: 35.0,
      longitude: 139.0,
      accuracy: 30,
    })),
  },
}));

describe('CommunityService', () => {
  beforeEach(() => {
    const communityStorage = require('../storage/community.storage');
    communityStorage.load.mockClear();
    communityStorage.save.mockClear();
  });

  it('addPost applies blurred location when sharing is enabled', async () => {
    const posts = await CommunityService.addPost({
      type: 'info',
      message: 'Test post',
    });

    const first = posts[0];
    expect(first.location).toBeTruthy();
    expect(typeof first.location.latitude).toBe('number');
    expect(typeof first.location.longitude).toBe('number');
  });

  it('findMatchesForRequest returns offer posts', async () => {
    const communityStorage = require('../storage/community.storage');
    // Seed storage with one offer post
    await communityStorage.save({
      posts: [
        {
          id: 'offer-1',
          type: 'offer',
          author: 'Helper',
          message: 'I can help',
          createdAt: Date.now(),
          location: null,
        },
      ],
      meta: { version: 1, updatedAt: Date.now() },
    });

    const matches = await CommunityService.findMatchesForRequest({
      id: 'request-1',
      type: 'request',
    });

    expect(matches.length).toBe(1);
    expect(matches[0].id).toBe('offer-1');
  });
});

