const badges = [
  {
    id: 'first-task',
    titleKey: 'badge.firstTask.title',
    descriptionKey: 'badge.firstTask.desc',
    condition: { type: 'count', taskCompletedGte: 1 },
    visibility: 'public',
  },
  {
    id: 'streak-3',
    titleKey: 'badge.streak3.title',
    descriptionKey: 'badge.streak3.desc',
    condition: { type: 'streak', days: 3 },
    visibility: 'public',
  },
  {
    id: 'points-500',
    titleKey: 'badge.points500.title',
    descriptionKey: 'badge.points500.desc',
    condition: { type: 'points', gte: 500 },
    visibility: 'public',
  },
];

export default badges;
