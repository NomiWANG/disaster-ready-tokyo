// 排行榜服务 - 虚拟用户排行榜，用于激励用户

const VIRTUAL_USERS = [
  { id: 'virtual-1', name: 'user1', points: 1250, avatar: 'A1', isCurrentUser: false },
  { id: 'virtual-2', name: 'user2', points: 980, avatar: 'A2', isCurrentUser: false },
  { id: 'virtual-3', name: 'user3', points: 750, avatar: 'A3', isCurrentUser: false },
  { id: 'virtual-4', name: 'user4', points: 520, avatar: 'A4', isCurrentUser: false },
  { id: 'virtual-5', name: 'user5', points: 380, avatar: 'A5', isCurrentUser: false },
  { id: 'virtual-6', name: 'user6', points: 250, avatar: 'A6', isCurrentUser: false },
];

const LeaderboardService = {
  // 获取排行榜
  getLeaderboard(currentUserPoints = 0) {
    const currentUser = {
      id: 'current-user',
      name: 'You',
      points: currentUserPoints,
      avatar: 'ME',
      isCurrentUser: true,
    };

    const allUsers = [...VIRTUAL_USERS, currentUser];
    const sorted = allUsers.sort((a, b) => b.points - a.points);

    return sorted.map((user, index) => ({
      ...user,
      rank: index + 1,
    }));
  },

  // 获取当前用户排名及相邻用户
  getCurrentUserRank(currentUserPoints = 0) {
    const leaderboard = this.getLeaderboard(currentUserPoints);
    const currentUser = leaderboard.find((u) => u.isCurrentUser);
    
    if (!currentUser) {
      return { rank: leaderboard.length + 1, user: null, above: null, below: null };
    }

    const currentIndex = leaderboard.indexOf(currentUser);
    return {
      rank: currentUser.rank,
      user: currentUser,
      above: currentIndex > 0 ? leaderboard[currentIndex - 1] : null,
      below: currentIndex < leaderboard.length - 1 ? leaderboard[currentIndex + 1] : null,
    };
  },
};

export default LeaderboardService;
