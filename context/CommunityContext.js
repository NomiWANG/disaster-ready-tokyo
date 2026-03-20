import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import CommunityService from '../services/CommunityService';

const CommunityContext = createContext(null);

export const CommunityProvider = ({ children }) => {
  const [posts, setPosts] = useState([]);

  const refresh = useCallback(async () => {
    const list = await CommunityService.getPosts();
    setPosts(list);
  }, []);

  const addPost = useCallback(
    async (post) => {
      await CommunityService.addPost(post);
      await refresh();
    },
    [refresh]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = {
    posts,
    refresh,
    addPost,
  };

  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>;
};

export const useCommunity = () => useContext(CommunityContext);


