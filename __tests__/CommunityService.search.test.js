import CommunityService from '../services/CommunityService';
import CommunityStorage from '../storage/community.storage';

// Mock storage
jest.mock('../storage/community.storage');

describe('CommunityService - Search, Sort, and Filter', () => {
  const mockPosts = [
    {
      id: 'post_1',
      type: 'info',
      author: 'Alice',
      message: 'Earthquake drill tomorrow',
      createdAt: 1000,
    },
    {
      id: 'post_2',
      type: 'request',
      author: 'Bob',
      message: 'Need help with emergency kit',
      createdAt: 2000,
    },
    {
      id: 'post_3',
      type: 'offer',
      author: 'Charlie',
      message: 'Can provide transportation',
      createdAt: 3000,
    },
    {
      id: 'post_4',
      type: 'info',
      author: 'David',
      message: 'Safety tips for foreigners',
      createdAt: 4000,
    },
    {
      id: 'post_5',
      type: 'request',
      author: 'Eve',
      message: 'Looking for language help',
      createdAt: 5000,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    CommunityStorage.load.mockResolvedValue({
      posts: mockPosts,
    });
  });

  describe('searchAndFilterPosts', () => {
    test('should return all posts with no filters', async () => {
      const result = await CommunityService.searchAndFilterPosts({});
      expect(result).toHaveLength(5);
    });

    test('should filter by type - info', async () => {
      const result = await CommunityService.searchAndFilterPosts({
        filterType: 'info',
      });
      expect(result).toHaveLength(2);
      expect(result.every(p => p.type === 'info')).toBe(true);
    });

    test('should filter by type - request', async () => {
      const result = await CommunityService.searchAndFilterPosts({
        filterType: 'request',
      });
      expect(result).toHaveLength(2);
      expect(result.every(p => p.type === 'request')).toBe(true);
    });

    test('should filter by type - offer', async () => {
      const result = await CommunityService.searchAndFilterPosts({
        filterType: 'offer',
      });
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('offer');
    });

    test('should search in message content', async () => {
      const result = await CommunityService.searchAndFilterPosts({
        searchQuery: 'help',
      });
      expect(result).toHaveLength(2);
      expect(result.some(p => p.message.includes('help'))).toBe(true);
    });

    test('should search in author name', async () => {
      const result = await CommunityService.searchAndFilterPosts({
        searchQuery: 'Charlie',
      });
      expect(result).toHaveLength(1);
      expect(result[0].author).toBe('Charlie');
    });

    test('should search case-insensitively', async () => {
      const result = await CommunityService.searchAndFilterPosts({
        searchQuery: 'EARTHQUAKE',
      });
      expect(result).toHaveLength(1);
      expect(result[0].message.toLowerCase()).toContain('earthquake');
    });

    test('should sort by newest first (default)', async () => {
      const result = await CommunityService.searchAndFilterPosts({
        sortBy: 'newest',
      });
      expect(result[0].id).toBe('post_5');
      expect(result[4].id).toBe('post_1');
      // Verify descending order
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].createdAt).toBeGreaterThanOrEqual(result[i + 1].createdAt);
      }
    });

    test('should sort by oldest first', async () => {
      const result = await CommunityService.searchAndFilterPosts({
        sortBy: 'oldest',
      });
      expect(result[0].id).toBe('post_1');
      expect(result[4].id).toBe('post_5');
      // Verify ascending order
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].createdAt).toBeLessThanOrEqual(result[i + 1].createdAt);
      }
    });

    test('should combine filter and search', async () => {
      const result = await CommunityService.searchAndFilterPosts({
        filterType: 'request',
        searchQuery: 'help',
      });
      expect(result).toHaveLength(2);
      expect(result.every(p => p.type === 'request')).toBe(true);
      expect(result.every(p => p.message.toLowerCase().includes('help'))).toBe(true);
    });

    test('should combine filter, search, and sort', async () => {
      const result = await CommunityService.searchAndFilterPosts({
        filterType: 'request',
        searchQuery: 'help',
        sortBy: 'oldest',
      });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('post_2');
      expect(result[1].id).toBe('post_5');
    });

    test('should return empty array if no matches', async () => {
      const result = await CommunityService.searchAndFilterPosts({
        searchQuery: 'nonexistent keyword xyz',
      });
      expect(result).toHaveLength(0);
    });

    test('should handle empty posts array', async () => {
      CommunityStorage.load.mockResolvedValue({
        posts: [],
      });
      const result = await CommunityService.searchAndFilterPosts({
        searchQuery: 'test',
      });
      expect(result).toHaveLength(0);
    });

    test('should trim whitespace in search query', async () => {
      const result = await CommunityService.searchAndFilterPosts({
        searchQuery: '  help  ',
      });
      expect(result).toHaveLength(2);
    });

    test('should ignore empty search query', async () => {
      const result = await CommunityService.searchAndFilterPosts({
        searchQuery: '   ',
      });
      expect(result).toHaveLength(5);
    });
  });
});
