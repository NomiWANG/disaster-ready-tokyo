import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import GamificationService from '../services/GamificationService';

const GamificationContext = createContext(null);

export const GamificationProvider = ({ children }) => {
  const [state, setState] = useState({
    points: 0,
    badges: [],
    progress: { level: 1, percent: 0 },
  });

  const load = useCallback(async () => {
    const data = await GamificationService.sync();
    setState({
      points: data.points || 0,
      badges: data.badges || [],
      progress: data.progress || { level: 1, percent: 0 },
    });
  }, []);

  const addPoints = useCallback(async (event, amount, meta) => {
    const data = await GamificationService.addPoints(event, amount, meta);
    setState({
      points: data.points || 0,
      badges: data.badges || [],
      progress: data.progress || { level: 1, percent: 0 },
    });
  }, []);

  const evaluateBadges = useCallback(async (userState) => {
    const data = await GamificationService.evaluateBadges(userState);
    setState({
      points: data.points || 0,
      badges: data.badges || [],
      progress: data.progress || { level: 1, percent: 0 },
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const value = {
    ...state,
    addPoints,
    evaluateBadges,
    refresh: load,
  };

  return (
    <GamificationContext.Provider value={value}>
      {children}
    </GamificationContext.Provider>
  );
};

export const useGamification = () => useContext(GamificationContext);


