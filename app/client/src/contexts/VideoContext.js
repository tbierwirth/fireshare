import React, { createContext, useContext, useState, useCallback } from 'react';
import { VideoService } from '../services';
import { cache } from '../common/utils';

// Create video context
const VideoContext = createContext();

// Custom hook to use the video context
export const useVideos = () => {
  const context = useContext(VideoContext);
  if (!context) {
    throw new Error('useVideos must be used within a VideoProvider');
  }
  return context;
};

// Provider component that wraps the app and makes video data available
export const VideoProvider = ({ children }) => {
  const [videos, setVideos] = useState([]);
  const [publicVideos, setPublicVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [games, setGames] = useState([]);
  const [tags, setTags] = useState([]);
  const [folders, setFolders] = useState([]);
  
  // Get all videos (for admin/authenticated users)
  const getVideos = useCallback(async (sort = 'updated_at desc', useCache = true) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check cache first if allowed
      if (useCache) {
        const cacheKey = `videos_${sort}`;
        const cachedVideos = cache.get(cacheKey);
        if (cachedVideos) {
          console.log(`Using cached videos with sort: ${sort}`);
          setVideos(cachedVideos);
          setIsLoading(false);
          return cachedVideos;
        }
      }
      
      // Fetch fresh data
      console.log(`Fetching fresh videos with sort: ${sort}`);
      const res = await VideoService.getVideos(sort);
      const newVideos = res.data.videos;
      
      // Update state and cache
      setVideos(newVideos);
      cache.set(`videos_${sort}`, newVideos, 5 * 60 * 1000); // 5 minute TTL
      return newVideos;
    } catch (err) {
      console.error('Error fetching videos:', err);
      setError(err.response?.data || 'Failed to fetch videos');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Get public videos
  const getPublicVideos = useCallback(async (sort = 'updated_at desc', useCache = true) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check cache first if allowed
      if (useCache) {
        const cacheKey = `public_videos_${sort}`;
        const cachedVideos = cache.get(cacheKey);
        if (cachedVideos) {
          console.log(`Using cached public videos with sort: ${sort}`);
          setPublicVideos(cachedVideos);
          setIsLoading(false);
          return cachedVideos;
        }
      }
      
      // Fetch fresh data
      console.log(`Fetching fresh public videos with sort: ${sort}`);
      const res = await VideoService.getPublicVideos(sort);
      const newVideos = res.data.videos;
      
      // Update state and cache
      setPublicVideos(newVideos);
      cache.set(`public_videos_${sort}`, newVideos, 5 * 60 * 1000); // 5 minute TTL
      return newVideos;
    } catch (err) {
      console.error('Error fetching public videos:', err);
      setError(err.response?.data || 'Failed to fetch public videos');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Get games with caching
  const getGames = useCallback(async (useCache = true) => {
    try {
      // Check cache first if allowed
      if (useCache) {
        const cachedGames = cache.get('games_list');
        if (cachedGames) {
          console.log('Using cached games list');
          setGames(cachedGames);
          return cachedGames;
        }
      }
      
      // Fetch fresh data
      console.log('Fetching fresh games list');
      const res = await VideoService.getGames();
      const newGames = res.data;
      
      // Update state and cache
      setGames(newGames);
      cache.set('games_list', newGames, 15 * 60 * 1000); // 15 minute TTL
      return newGames;
    } catch (err) {
      console.error('Error fetching games:', err);
      return [];
    }
  }, []);
  
  // Get tags with caching
  const getTags = useCallback(async (useCache = true) => {
    try {
      // Check cache first if allowed
      if (useCache) {
        const cachedTags = cache.get('tags_list');
        if (cachedTags) {
          console.log('Using cached tags list');
          setTags(cachedTags);
          return cachedTags;
        }
      }
      
      // Fetch fresh data
      console.log('Fetching fresh tags list');
      const res = await VideoService.getTags();
      const newTags = res.data;
      
      // Update state and cache
      setTags(newTags);
      cache.set('tags_list', newTags, 15 * 60 * 1000); // 15 minute TTL
      return newTags;
    } catch (err) {
      console.error('Error fetching tags:', err);
      return [];
    }
  }, []);
  
  // Get folders with caching
  const getFolders = useCallback(async (useCache = true) => {
    try {
      // Check cache first if allowed
      if (useCache) {
        const cachedFolders = cache.get('folders_list');
        if (cachedFolders) {
          console.log('Using cached folders list');
          setFolders(cachedFolders);
          return cachedFolders;
        }
      }
      
      // Fetch fresh data
      console.log('Fetching fresh folders list');
      const res = await VideoService.getFolders();
      const newFolders = res.data;
      
      // Update state and cache
      setFolders(newFolders);
      cache.set('folders_list', newFolders, 15 * 60 * 1000); // 15 minute TTL
      return newFolders;
    } catch (err) {
      console.error('Error fetching folders:', err);
      return [];
    }
  }, []);
  
  // Clear cache for a specific video (used after updates)
  const invalidateVideoCache = useCallback(() => {
    // Remove all videos-related cache entries
    localStorage.removeItem('videos_updated_at desc');
    localStorage.removeItem('public_videos_updated_at desc');
    
    // Remove other sort variations as needed
    // Force refresh on next fetch
  }, []);
  
  // Add video view
  const addVideoView = useCallback(async (videoId) => {
    try {
      await VideoService.addView(videoId);
    } catch (err) {
      console.error('Error adding video view:', err);
    }
  }, []);
  
  // Create the video context value
  const videoContextValue = {
    videos,
    publicVideos,
    isLoading,
    error,
    games,
    tags,
    folders,
    getVideos,
    getPublicVideos,
    getGames,
    getTags,
    getFolders,
    invalidateVideoCache,
    addVideoView
  };
  
  return (
    <VideoContext.Provider value={videoContextValue}>
      {children}
    </VideoContext.Provider>
  );
};

export default VideoContext;