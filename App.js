import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LanguageProvider } from './languages';
import { AlertProvider } from './context/AlertContext';
import { GamificationProvider } from './context/GamificationContext';
import { TaskProvider } from './context/TaskContext';
import { CommunityProvider } from './context/CommunityContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import HomeScreen from './screens/HomeScreen';
import MapScreen from './screens/MapScreen';
import ProfileScreen from './screens/ProfileScreen';
import TestScreen from './screens/TestScreen';
import KnowledgeScreen from './screens/KnowledgeScreen';
import QuizScreen from './screens/QuizScreen';
import EmergencyKitScreen from './screens/EmergencyKitScreen';
import FamilyMembersScreen from './screens/FamilyMembersScreen';
import NotificationPreferencesScreen from './screens/NotificationPreferencesScreen';
import CustomTabBar from './components/CustomTabBar';
import DisasterService from './services/DisasterService';
import GamificationService from './services/GamificationService';
import StreakService from './services/StreakService';
import CommunityScreen from './screens/CommunityScreen';

function AppContent() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('Home');
  const [currentScreen, setCurrentScreen] = useState(null);
  const [screenHistory, setScreenHistory] = useState([]);

  useEffect(() => {
    const initializeServices = async () => {
      try {
        if (DisasterService?.initialize) {
          await DisasterService.initialize();
          if (DisasterService?.startMonitoring) {
            DisasterService.startMonitoring();
          }
        }

        if (StreakService?.updateOnLaunch && GamificationService?.evaluateBadges) {
          try {
            const streakState = await StreakService.updateOnLaunch();
            await GamificationService.evaluateBadges({
              streakDays: streakState?.streakDays || 0,
            });
          } catch (streakError) {
            console.warn('Failed to update streak:', streakError);
          }
        }
      } catch (error) {
        console.warn('Failed to initialize services:', error);
      }
    };

    initializeServices();

    return () => {
      try {
        if (DisasterService?.stopMonitoring) {
          DisasterService.stopMonitoring();
        }
      } catch (cleanupError) {
        console.warn('Cleanup error:', cleanupError);
      }
    };
  }, []);

  // Navigation object for screen transitions
  const navigation = {
    navigate: (screenName, params = {}) => {
      setScreenHistory([...screenHistory, currentScreen]);
      setCurrentScreen({ name: screenName, params });
    },
    goBack: () => {
      if (screenHistory.length > 0) {
        const previousScreen = screenHistory[screenHistory.length - 1];
        setScreenHistory(screenHistory.slice(0, -1));
        setCurrentScreen(previousScreen);
      } else {
        setCurrentScreen(null);
      }
    },
  };

  const renderScreen = () => {
    // Show current screen if navigated from main tabs
    if (currentScreen) {
      switch (currentScreen.name) {
        case 'Knowledge':
          return <KnowledgeScreen navigation={navigation} />;
        case 'Quiz':
          return <QuizScreen navigation={navigation} />;
        case 'EmergencyKit':
          return <EmergencyKitScreen navigation={navigation} />;
        case 'FamilyMembers':
          return <FamilyMembersScreen navigation={navigation} />;
        case 'NotificationPreferences':
          return <NotificationPreferencesScreen navigation={navigation} />;
        default:
          setCurrentScreen(null);
          break;
      }
    }

    // Otherwise show main tabs
    switch (activeTab) {
      case 'Home':
        return <HomeScreen onGoToProfile={() => setActiveTab('Profile')} />;
      case 'Map':
        return <MapScreen />;
      case 'Profile':
        return <ProfileScreen navigation={navigation} />;
      case 'Community':
        return <CommunityScreen />;
      case 'Test':
        return <TestScreen />;
      default:
        return <HomeScreen />;
    }
  };

  const navigationState = {
    index:
      activeTab === 'Home'
        ? 0
        : activeTab === 'Map'
        ? 1
        : activeTab === 'Community'
        ? 2
        : activeTab === 'Profile'
        ? 3
        : 4,
    routes: [
      { key: 'Home', name: 'Home', params: {} },
      { key: 'Map', name: 'Map', params: {} },
      { key: 'Community', name: 'Community', params: {} },
      { key: 'Profile', name: 'Profile', params: {} },
      { key: 'Test', name: 'Test', params: {} },
    ],
  };

  const descriptors = {
    Home: {
      key: 'Home',
      options: {
        tabBarLabel: 'nav.home',
      },
    },
    Map: {
      key: 'Map',
      options: {
        tabBarLabel: 'nav.map',
      },
    },
    Community: {
      key: 'Community',
      options: {
        tabBarLabel: 'nav.community',
      },
    },
    Profile: {
      key: 'Profile',
      options: {
        tabBarLabel: 'nav.profile',
      },
    },
    Test: {
      key: 'Test',
      options: {
        tabBarLabel: 'nav.test',
      },
    },
  };


  return (
    <AlertProvider>
      <GamificationProvider>
        <TaskProvider>
          <CommunityProvider>
            <SafeAreaProvider style={[styles.container, { backgroundColor: theme.background }]}>
              <View style={styles.screenContainer}>
                {renderScreen()}
              </View>
              {!currentScreen && (
                <CustomTabBar
                  state={navigationState}
                  descriptors={descriptors}
                  navigation={{
                    navigate: (routeName) => {
                      setActiveTab(routeName);
                      setCurrentScreen(null);
                      setScreenHistory([]);
                    },
                    emit: () => ({}),
                  }}
                />
              )}
            </SafeAreaProvider>
          </CommunityProvider>
        </TaskProvider>
      </GamificationProvider>
    </AlertProvider>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
  },
});