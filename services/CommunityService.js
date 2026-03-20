// 社区互助服务 - 管理用户发布的互助信息和匹配

import CommunityStorage from '../storage/community.storage';
import LocationService from './LocationService';
import PrivacyStorage from '../storage/privacy.storage';

const CommunityService = {
  // 获取所有帖子
  async getPosts() {
    const state = await CommunityStorage.load();
    return state.posts || [];
  },

  // 位置模糊化 - 精度500米，保护隐私
  blurLocation(latitude, longitude) {
    const gridSize = 0.0045;
    
    const blurredLat = Math.round(latitude / gridSize) * gridSize;
    const blurredLng = Math.round(longitude / gridSize) * gridSize;
    
    return {
      latitude: blurredLat,
      longitude: blurredLng,
    };
  },

  // 发布新帖子
  async addPost(post) {
    const state = await CommunityStorage.load();

    // 根据隐私设置决定是否分享位置
    const privacyState = await PrivacyStorage.load();
    let location = null;
    
    if (privacyState.shareLocationInCommunity) {
      const currentLocation = LocationService.getLocation();
      if (currentLocation && currentLocation.latitude && currentLocation.longitude) {
        location = this.blurLocation(currentLocation.latitude, currentLocation.longitude);
      }
    }
    
    if (post.location && privacyState.shareLocationInCommunity) {
      location = this.blurLocation(post.location.latitude, post.location.longitude);
    }
    
    const nextPosts = [
      {
        id: post.id || `post_${Date.now()}`,
        type: post.type || 'info',
        author: post.author || 'anonymous',
        message: post.message || '',
        createdAt: Date.now(),
        location: location,
      },
      ...(state.posts || []),
    ];
    await CommunityStorage.save({ ...state, posts: nextPosts });
    return nextPosts;
  },

  // 查找与求助请求匹配的援助信息
  async findMatchesForRequest(request) {
    const state = await CommunityStorage.load();
    const posts = state.posts || [];

    // 匹配援助帖子
    const matches = posts.filter((p) => p.type === 'offer' && p.id !== request.id);
    
    return matches.map((p) => ({
      id: p.id,
      author: p.author || 'anonymous',
      message: p.message || '',
      createdAt: p.createdAt || Date.now(),
      location: p.location || null,
    }));
  },

  // 搜索过滤帖子
  async searchAndFilterPosts(options = {}) {
    const { searchQuery = '', sortBy = 'newest', filterType = 'all' } = options;
    
    let posts = await this.getPosts();
    
    if (filterType && filterType !== 'all') {
      posts = posts.filter((post) => post.type === filterType);
    }
    
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      posts = posts.filter((post) => {
        const message = (post.message || '').toLowerCase();
        const author = (post.author || '').toLowerCase();
        return message.includes(query) || author.includes(query);
      });
    }
    
    if (sortBy === 'newest') {
      posts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } else if (sortBy === 'oldest') {
      posts.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    }
    
    return posts;
  },
};

export default CommunityService;
