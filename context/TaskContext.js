import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import TaskService from '../services/TaskService';

const TaskContext = createContext(null);

export const TaskProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const list = await TaskService.getAllTasks();
      setTasks(list);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async (limit = 20) => {
    try {
      const historyList = await TaskService.getTaskHistory(limit);
      setHistory(historyList);
    } catch (error) {
      console.error('Failed to load task history:', error);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const statsData = await TaskService.getTaskStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load task stats:', error);
    }
  }, []);

  const completeTask = useCallback(async (id, payload) => {
    try {
      await TaskService.completeTask(id, payload);
      await load();
      await loadHistory();
      await loadStats();
    } catch (error) {
      console.error('Failed to complete task:', error);
      throw error;
    }
  }, [load, loadHistory, loadStats]);

  const expireTask = useCallback(async (id) => {
    try {
      await TaskService.expireTask(id);
      await load();
    } catch (error) {
      console.error('Failed to expire task:', error);
      throw error;
    }
  }, [load]);

  const searchAndFilterTasks = useCallback(async (options) => {
    try {
      const filtered = await TaskService.searchAndFilterTasks(options);
      return filtered;
    } catch (error) {
      console.error('Failed to search and filter tasks:', error);
      return [];
    }
  }, []);

  useEffect(() => {
    load();
    loadHistory();
    loadStats();
  }, [load, loadHistory, loadStats]);

  const value = {
    tasks,
    activeTasks: tasks.filter((t) => t.status === 'active'),
    completedTasks: tasks.filter((t) => t.status === 'completed'),
    history,
    stats,
    loading,
    refresh: load,
    completeTask,
    expireTask,
    searchAndFilterTasks,
    loadHistory,
    loadStats,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};

export const useTasks = () => useContext(TaskContext);


