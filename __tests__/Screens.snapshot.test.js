import React from 'react';
import renderer from 'react-test-renderer';

// Mock translation hook to avoid loading real i18n
jest.mock('../languages', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock contexts used by screens
jest.mock('../context/AlertContext', () => ({
  useAlert: () => ({ activeAlert: null }),
}));

jest.mock('../context/TaskContext', () => ({
  useTasks: () => ({ activeTasks: [], tasks: [], completeTask: jest.fn(), refresh: jest.fn() }),
}));

jest.mock('../context/GamificationContext', () => ({
  useGamification: () => ({
    points: 0,
    badges: [],
    progress: { level: 1, percent: 0 },
    refresh: jest.fn(),
  }),
}));

jest.mock('../context/CommunityContext', () => ({
  useCommunity: () => ({
    posts: [],
    refresh: jest.fn(),
    addPost: jest.fn(),
  }),
}));

// Mock components used inside screens that are not critical for snapshots
jest.mock('../components/LanguageSelector', () => () => null);
jest.mock('../components/PointsPill', () => () => null);
jest.mock('../components/ProgressBar', () => () => null);
jest.mock('../components/BadgeList', () => () => null);
jest.mock('../components/TaskList', () => () => null);
jest.mock('../components/StatusWall', () => () => null);

// Mock services with side effects
jest.mock('../services/NewsService', () => ({
  __esModule: true,
  default: {
    getAllNews: jest.fn(async () => []),
    getPlaceholderNews: jest.fn(() => []),
  },
}));

jest.mock('../services/EmergencyContactsService', () => ({
  __esModule: true,
  default: {
    getContacts: jest.fn(async () => []),
  },
}));

jest.mock('../services/GeofenceService', () => ({
  __esModule: true,
  default: {
    getCurrentZone: jest.fn(() => null),
  },
}));

jest.mock('../services/MapService', () => ({
  __esModule: true,
  default: {
    getInitialRegion: () => ({
      latitude: 0,
      longitude: 0,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    }),
    getShelterMarkers: () => [],
    getHelpRequestMarkers: () => [],
  },
}));

jest.mock('../storage/map.storage', () => ({
  __esModule: true,
  default: {
    load: jest.fn(async () => ({ shelters: [], helpRequests: [], meta: {} })),
    save: jest.fn(async (payload) => payload),
  },
}));

jest.mock('../services/LocationService', () => ({
  __esModule: true,
  default: {
    getCurrentPosition: jest.fn(async () => ({
      coords: { latitude: 0, longitude: 0 },
    })),
  },
}));

// Import screens after mocks
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MapScreen from '../screens/MapScreen';
import CommunityScreen from '../screens/CommunityScreen';

describe('Key screens snapshots', () => {
  it('HomeScreen renders consistently', () => {
    const tree = renderer.create(<HomeScreen onGoToProfile={jest.fn()} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('ProfileScreen renders consistently', () => {
    const tree = renderer.create(<ProfileScreen navigation={{ navigate: jest.fn() }} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('MapScreen renders consistently', () => {
    const tree = renderer.create(<MapScreen />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('CommunityScreen renders consistently', () => {
    const tree = renderer.create(<CommunityScreen />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});

