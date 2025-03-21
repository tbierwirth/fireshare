import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { VideoService } from '../services';
import { useQueryClient } from '@tanstack/react-query';
import { 
  usePublicVideos, 
  useVideos as useVideosQuery,
  useGames as useGamesQuery,
  useTags as useTagsQuery,
  useFolders as useFoldersQuery,
  useVideoCache
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
        console.log('Videos loaded:', newVideos.length);
        setVideos(newVideos);
        setHasInitiallyLoaded(true);
        if (newVideos.length > 0) {
          sessionStorage.setItem(SESSION_KEY_VIDEOS, 'true');
        }
      },
      onError: (err) => {
        console.error('Failed to fetch videos:', err);
        setError(err?.response?.data || 'Failed to fetch videos');
        setHasInitiallyLoaded(true);
      },
      // Retry more times for data fetching
      retry: 3,
      retryDelay: 1000,
      // Keep previous data during refetches
      keepPreviousData: true,
      // Ensure consistent loading behavior
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 60000 // 1 minute
    }
  });
  
  // Use React Query for public videos with default sort
  const publicVideosQuery = usePublicVideos({
    sortOrder: 'updated_at desc',
    options: {
      // When public videos are successfully loaded, update our state and session tracking
      onSuccess: (res) => {
        const newVideos = res?.data?.videos || [];
        console.log('Public videos loaded:', newVideos.length, res);
        setPublicVideos(newVideos);
        setHasInitiallyLoadedPublic(true);
        if (newVideos.length > 0) {
          sessionStorage.setItem(SESSION_KEY_PUBLIC_VIDEOS, 'true');
        }
      },
      onError: (err) => {
        console.error('Failed to fetch public videos:', err);
        setError(err?.response?.data || 'Failed to fetch public videos');
        setHasInitiallyLoadedPublic(true);
      },
      // Retry more times for data fetching
      retry: 3,
      retryDelay: 1000,
      // Keep previous data during refetches
      keepPreviousData: true,
      // Ensure consistent loading behavior 
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 60000 // 1 minute
    }
  });
  
  // Use React Query for games with proper array keys
  const gamesQuery = useGamesQuery('');
  
  // Use React Query for tags with proper array keys
  const tagsQuery = useTagsQuery('');
  
  // Use React Query for folders with proper array keys
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
  
  // Use our new hook for cache invalidation
  const { refreshVideos } = useVideoCache();
  
  // Enhanced cache invalidation using the new hook
  const invalidateVideoCache = useCallback(() => {
    console.log("Invalidating video cache in VideoContext (using refreshVideos hook)");
    
    // Use our shared refreshVideos function
    refreshVideos();
    
    // Additional force refetch for this context's queries for backward compatibility
    videosQuery.refetch();
    publicVideosQuery.refetch();
    gamesQuery.refetch();
    tagsQuery.refetch();
    foldersQuery.refetch();
  }, [refreshVideos, videosQuery, publicVideosQuery, gamesQuery, tagsQuery, foldersQuery]);
  
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
    queryClient.setQueryData(['games', ''], { data: { games: [] } });
    queryClient.setQueryData(['tags', ''], { data: { tags: [] } });
    queryClient.setQueryData(['folders'], { data: { folders: [] } });
    
    // Check if we've previously loaded videos on any route
    const previouslyHadVideos = sessionStorage.getItem(SESSION_KEY_VIDEOS) === 'true';
    const previouslyHadPublicVideos = sessionStorage.getItem(SESSION_KEY_PUBLIC_VIDEOS) === 'true';
    
    // Use this knowledge to inform our initial loading state
    setHasInitiallyLoaded(previouslyHadVideos);
    setHasInitiallyLoadedPublic(previouslyHadPublicVideos);
    
    // Enable automatic refetch on window focus for main queries
    queryClient.setDefaultOptions({
      queries: {
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        staleTime: 30000, // Consider data stale after 30 seconds
      },
    });
  }, [queryClient]);
  
  return (
    <VideoContext.Provider value={videoContextValue}>
      {children}
    </VideoContext.Provider>
  );
};

export default VideoContext;