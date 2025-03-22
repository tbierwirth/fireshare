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


const VideoContext = createContext();


export const useVideos = () => {
  const context = useContext(VideoContext);
  if (!context) {
    throw new Error('useVideos must be used within a VideoProvider');
  }
  return context;
};


export const VideoProvider = ({ children }) => {
  const queryClient = useQueryClient();
  
  
  const [videos, setVideos] = useState([]);
  const [publicVideos, setPublicVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [games, setGames] = useState([]);
  const [tags, setTags] = useState([]);
  const [folders, setFolders] = useState([]);
  
  
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const [hasInitiallyLoadedPublic, setHasInitiallyLoadedPublic] = useState(false);
  
  
  const SESSION_KEY_VIDEOS = 'route:videos:hasVideos';
  const SESSION_KEY_PUBLIC_VIDEOS = 'route:publicVideos:hasVideos';
  
  
  const videosQuery = useVideosQuery({
    sortOrder: 'updated_at desc',
    options: {
      
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
      
      retry: 3,
      retryDelay: 1000,
      
      keepPreviousData: true,
      
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 60000 
    }
  });
  
  
  const publicVideosQuery = usePublicVideos({
    sortOrder: 'updated_at desc',
    options: {
      
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
      
      retry: 3,
      retryDelay: 1000,
      
      keepPreviousData: true,
      
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 60000 
    }
  });
  
  
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
    
    const result = await queryClient.fetchQuery({
      queryKey: ['videos', sort],
      queryFn: () => VideoService.getVideos(sort),
      staleTime: 5 * 60 * 1000,
      
      ...(!useCache ? { cacheTime: 0 } : {})
    });
    
    const newVideos = result?.data?.videos || [];
    setVideos(newVideos);
    
    
    setHasInitiallyLoaded(true);
    
    
    if (newVideos.length > 0) {
      sessionStorage.setItem(SESSION_KEY_VIDEOS, 'true');
    }
    
    return newVideos;
  }, [queryClient]);
  
  
  const getPublicVideos = useCallback(async (sort = 'updated_at desc', useCache = true) => {
    
    const result = await queryClient.fetchQuery({
      queryKey: ['publicVideos', sort],
      queryFn: () => VideoService.getPublicVideos(sort),
      staleTime: 5 * 60 * 1000,
      
      ...(!useCache ? { cacheTime: 0 } : {})
    });
    
    const newVideos = result?.data?.videos || [];
    setPublicVideos(newVideos);
    
    
    setHasInitiallyLoadedPublic(true);
    
    
    if (newVideos.length > 0) {
      sessionStorage.setItem(SESSION_KEY_PUBLIC_VIDEOS, 'true');
    }
    
    return newVideos;
  }, [queryClient]);
  
  
  const getGames = useCallback(async (useCache = true) => {
    
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
      
      ...(!useCache ? { cacheTime: 0 } : {})
    });
    
    const newFolders = result?.data || [];
    setFolders(newFolders);
    return newFolders;
  }, [queryClient]);
  
  
  const { refreshVideos } = useVideoCache();
  
  
  const invalidateVideoCache = useCallback(() => {
    console.log("Invalidating video cache in VideoContext (using refreshVideos hook)");
    
    
    refreshVideos();
    
    
    videosQuery.refetch();
    publicVideosQuery.refetch();
    gamesQuery.refetch();
    tagsQuery.refetch();
    foldersQuery.refetch();
  }, [refreshVideos, videosQuery, publicVideosQuery, gamesQuery, tagsQuery, foldersQuery]);
  
  
  const addVideoView = useCallback(async (videoId) => {
    try {
      await VideoService.addView(videoId);
    } catch (err) {
      console.error('Error adding video view:', err);
    }
  }, []);
  
  
  const videoContextValue = {
    
    videos,
    publicVideos,
    isLoading,
    error,
    games,
    tags,
    folders,
    
    
    isVideosRefetching: videosQuery.isFetching,
    isPublicVideosRefetching: publicVideosQuery.isFetching,
    hasInitiallyLoaded,
    hasInitiallyLoadedPublic,
    
    
    hasPreviouslyLoadedVideos: () => sessionStorage.getItem(SESSION_KEY_VIDEOS) === 'true',
    hasPreviouslyLoadedPublicVideos: () => sessionStorage.getItem(SESSION_KEY_PUBLIC_VIDEOS) === 'true',
    
    
    getVideos,
    getPublicVideos,
    getGames,
    getTags,
    getFolders,
    invalidateVideoCache,
    addVideoView,
    
    
    queryClient,
    videosQuery,
    publicVideosQuery,
    gamesQuery,
    tagsQuery,
    foldersQuery
  };
  
  
  useEffect(() => {
    
    queryClient.setQueryData(['videos', 'updated_at desc'], { data: { videos: [] } });
    queryClient.setQueryData(['publicVideos', 'updated_at desc'], { data: { videos: [] } });
    queryClient.setQueryData(['games', ''], { data: { games: [] } });
    queryClient.setQueryData(['tags', ''], { data: { tags: [] } });
    queryClient.setQueryData(['folders'], { data: { folders: [] } });
    
    
    const previouslyHadVideos = sessionStorage.getItem(SESSION_KEY_VIDEOS) === 'true';
    const previouslyHadPublicVideos = sessionStorage.getItem(SESSION_KEY_PUBLIC_VIDEOS) === 'true';
    
    
    setHasInitiallyLoaded(previouslyHadVideos);
    setHasInitiallyLoadedPublic(previouslyHadPublicVideos);
    
    
    queryClient.setDefaultOptions({
      queries: {
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        staleTime: 30000, 
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