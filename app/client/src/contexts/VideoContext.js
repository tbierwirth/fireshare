import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { VideoService } from '../services';
import { cache } from '../common/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  usePublicVideos, 
  useVideos as useVideosQuery,
  useGames as useGamesQuery,
  useTags as useTagsQuery,
  useFolders as useFoldersQuery
} from '../services/VideoQueryHooks';

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
  const queryClient = useQueryClient();
  
  // State for backward compatibility
  const [videos, setVideos] = useState([]);
  const [publicVideos, setPublicVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [games, setGames] = useState([]);
  const [tags, setTags] = useState([]);
  const [folders, setFolders] = useState([]);
  
  // Track if videos have been loaded at least once (for UI stability)
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const [hasInitiallyLoadedPublic, setHasInitiallyLoadedPublic] = useState(false);
  
  // Session storage keys for tracking routes with videos
  const SESSION_KEY_VIDEOS = 'route:videos:hasVideos';
  const SESSION_KEY_PUBLIC_VIDEOS = 'route:publicVideos:hasVideos';
  
  // Use React Query for videos data with default sort
  const videosQuery = useVideosQuery({
    sortOrder: 'updated_at desc',
    options: {
      // When videos are successfully loaded, update our state and session tracking
      onSuccess: (res) => {
        const newVideos = res?.data?.videos || [];
        setVideos(newVideos);
        setHasInitiallyLoaded(true);
        if (newVideos.length > 0) {
          sessionStorage.setItem(SESSION_KEY_VIDEOS, 'true');
        }
      },
      onError: (err) => {
        setError(err?.response?.data || 'Failed to fetch videos');
        setHasInitiallyLoaded(true);
      }
    }
  });
  
  // Use React Query for public videos with default sort
  const publicVideosQuery = usePublicVideos({
    sortOrder: 'updated_at desc',
    options: {
      // When public videos are successfully loaded, update our state and session tracking
      onSuccess: (res) => {
        const newVideos = res?.data?.videos || [];
        setPublicVideos(newVideos);
        setHasInitiallyLoadedPublic(true);
        if (newVideos.length > 0) {
          sessionStorage.setItem(SESSION_KEY_PUBLIC_VIDEOS, 'true');
        }
      },
      onError: (err) => {
        setError(err?.response?.data || 'Failed to fetch public videos');
        setHasInitiallyLoadedPublic(true);
      }
    }
  });
  
  // Use React Query for games
  const gamesQuery = useGamesQuery();
  
  // Use React Query for tags
  const tagsQuery = useTagsQuery();
  
  // Use React Query for folders
  const foldersQuery = useFoldersQuery();
  
  // Update state with data from queries for backward compatibility
  useEffect(() => {
    if (gamesQuery.data?.data) {
      setGames(gamesQuery.data.data);
    }
  }, [gamesQuery.data]);
  
  useEffect(() => {
    if (tagsQuery.data?.data) {
      setTags(tagsQuery.data.data);
    }
  }, [tagsQuery.data]);
  
  useEffect(() => {
    if (foldersQuery.data?.data) {
      setFolders(foldersQuery.data.data);
    }
  }, [foldersQuery.data]);
  
  // Update loading state based on all active queries
  useEffect(() => {
    const isAnyQueryLoading = 
      videosQuery.isLoading || 
      publicVideosQuery.isLoading || 
      gamesQuery.isLoading || 
      tagsQuery.isLoading || 
      foldersQuery.isLoading;
    
    setIsLoading(isAnyQueryLoading);
  }, [
    videosQuery.isLoading,
    publicVideosQuery.isLoading,
    gamesQuery.isLoading,
    tagsQuery.isLoading,
    foldersQuery.isLoading
  ]);
  
  // Legacy method with React Query integration
  const getVideos = useCallback(async (sort = 'updated_at desc', useCache = true) => {
    // If sort order is different from default, fetch with that specific key
    const result = await queryClient.fetchQuery({
      queryKey: ['videos', sort],
      queryFn: () => VideoService.getVideos(sort),
      staleTime: 5 * 60 * 1000,
      // Use cached data if available and allowed
      ...(!useCache ? { cacheTime: 0 } : {})
    });
    
    const newVideos = result?.data?.videos || [];
    setVideos(newVideos);
    
    // Track that we've loaded videos at least once
    setHasInitiallyLoaded(true);
    
    // If videos were found, update session storage
    if (newVideos.length > 0) {
      sessionStorage.setItem(SESSION_KEY_VIDEOS, 'true');
    }
    
    return newVideos;
  }, [queryClient]);
  
  // Legacy method with React Query integration
  const getPublicVideos = useCallback(async (sort = 'updated_at desc', useCache = true) => {
    // If sort order is different from default, fetch with that specific key
    const result = await queryClient.fetchQuery({
      queryKey: ['publicVideos', sort],
      queryFn: () => VideoService.getPublicVideos(sort),
      staleTime: 5 * 60 * 1000,
      // Use cached data if available and allowed
      ...(!useCache ? { cacheTime: 0 } : {})
    });
    
    const newVideos = result?.data?.videos || [];
    setPublicVideos(newVideos);
    
    // Track that we've loaded public videos at least once
    setHasInitiallyLoadedPublic(true);
    
    // If videos were found, update session storage
    if (newVideos.length > 0) {
      sessionStorage.setItem(SESSION_KEY_PUBLIC_VIDEOS, 'true');
    }
    
    return newVideos;
  }, [queryClient]);
  
  // Legacy method with React Query integration
  const getGames = useCallback(async (useCache = true) => {
    // Fetch games using React Query
    const result = await queryClient.fetchQuery({
      queryKey: ['games', ''],
      queryFn: () => VideoService.getGames(),
      staleTime: 15 * 60 * 1000,
      // Use cached data if available and allowed
      ...(!useCache ? { cacheTime: 0 } : {})
    });
    
    const newGames = result?.data || [];
    setGames(newGames);
    return newGames;
  }, [queryClient]);
  
  // Legacy method with React Query integration
  const getTags = useCallback(async (useCache = true) => {
    // Fetch tags using React Query
    const result = await queryClient.fetchQuery({
      queryKey: ['tags', ''],
      queryFn: () => VideoService.getTags(),
      staleTime: 15 * 60 * 1000,
      // Use cached data if available and allowed
      ...(!useCache ? { cacheTime: 0 } : {})
    });
    
    const newTags = result?.data || [];
    setTags(newTags);
    return newTags;
  }, [queryClient]);
  
  // Legacy method with React Query integration
  const getFolders = useCallback(async (useCache = true) => {
    // Fetch folders using React Query
    const result = await queryClient.fetchQuery({
      queryKey: ['folders'],
      queryFn: () => VideoService.getFolders(),
      staleTime: 15 * 60 * 1000,
      // Use cached data if available and allowed
      ...(!useCache ? { cacheTime: 0 } : {})
    });
    
    const newFolders = result?.data || [];
    setFolders(newFolders);
    return newFolders;
  }, [queryClient]);
  
  // Enhanced cache invalidation using React Query
  const invalidateVideoCache = useCallback(() => {
    // Invalidate all video-related queries
    queryClient.invalidateQueries({ queryKey: ['videos'] });
    queryClient.invalidateQueries({ queryKey: ['publicVideos'] });
    
    // For backward compatibility, also clear localStorage cache
    localStorage.removeItem('videos_updated_at desc');
    localStorage.removeItem('public_videos_updated_at desc');
  }, [queryClient]);
  
  // Add video view with React Query mutation support
  const addVideoView = useCallback(async (videoId) => {
    try {
      await VideoService.addView(videoId);
    } catch (err) {
      console.error('Error adding video view:', err);
    }
  }, []);
  
  // Create enhanced context value that combines React Query with backward compatibility
  const videoContextValue = {
    // State values
    videos,
    publicVideos,
    isLoading,
    error,
    games,
    tags,
    folders,
    
    // Extra query state for enhanced components
    isVideosRefetching: videosQuery.isFetching,
    isPublicVideosRefetching: publicVideosQuery.isFetching,
    hasInitiallyLoaded,
    hasInitiallyLoadedPublic,
    
    // Route history helpers for optimistic UI
    hasPreviouslyLoadedVideos: () => sessionStorage.getItem(SESSION_KEY_VIDEOS) === 'true',
    hasPreviouslyLoadedPublicVideos: () => sessionStorage.getItem(SESSION_KEY_PUBLIC_VIDEOS) === 'true',
    
    // Methods
    getVideos,
    getPublicVideos,
    getGames,
    getTags,
    getFolders,
    invalidateVideoCache,
    addVideoView,
    
    // Allow direct access to React Query for components that want it
    queryClient,
    videosQuery,
    publicVideosQuery,
    gamesQuery,
    tagsQuery,
    foldersQuery
  };
  
  // Prefetch important data on context initialization
  useEffect(() => {
    // Pre-populate query cache with empty arrays to prevent null states
    queryClient.setQueryData(['videos', 'updated_at desc'], { data: { videos: [] } });
    queryClient.setQueryData(['publicVideos', 'updated_at desc'], { data: { videos: [] } });
    
    // Check if we've previously loaded videos on any route
    const previouslyHadVideos = sessionStorage.getItem(SESSION_KEY_VIDEOS) === 'true';
    const previouslyHadPublicVideos = sessionStorage.getItem(SESSION_KEY_PUBLIC_VIDEOS) === 'true';
    
    // Use this knowledge to inform our initial loading state
    setHasInitiallyLoaded(previouslyHadVideos);
    setHasInitiallyLoadedPublic(previouslyHadPublicVideos);
  }, [queryClient]);
  
  return (
    <VideoContext.Provider value={videoContextValue}>
      {children}
    </VideoContext.Provider>
  );
};

export default VideoContext;