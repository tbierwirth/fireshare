// VideoQueryHooks.js
import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import VideoService from './VideoService';
import { logger } from '../common/logger';

// For linting - indicate that some variables are used
/* eslint-disable no-unused-vars */

/**
 * Hook to fetch public videos with React Query
 * @param {Object} params - Query parameters
 * @param {string} params.sortOrder - Sort order for videos
 * @param {string} params.game - Optional game filter
 * @param {Object} params.options - Additional React Query options
 * @returns {Object} Query result with data, isLoading, error, etc.
 */
export function usePublicVideos({ sortOrder = 'updated_at desc', game = null, options = {} } = {}) {
  const queryClient = useQueryClient();
  
  // Add a caching layer to prevent unnecessary API calls during UI operations like slider adjustments
  const cachedData = React.useMemo(() => {
    // Try to get data from cache
    return queryClient.getQueryData(['publicVideos', sortOrder, game]);
  }, [queryClient, sortOrder, game]);
  
  return useQuery({
    // Query key changes when sortOrder or game changes, causing automatic refetch
    queryKey: ['publicVideos', sortOrder, game],
    queryFn: () => {
      // Check if we're in a slider operation by checking body classes
      const isSliderActive = typeof document !== 'undefined' && 
                            (document.body.classList.contains('resizing-cards') ||
                             document.body.classList.contains('slider-commit'));
      
      // If slider is active and we have cached data, use it instead of making a new request
      if (isSliderActive && cachedData) {
        logger.debug('VideoQueryHooks', 'Using cached data during slider operation');
        return Promise.resolve(cachedData);
      }
      
      // Otherwise, fetch fresh data
      logger.debug('VideoQueryHooks', 'Fetching public videos', { sortOrder, game });
      return VideoService.getPublicVideos(sortOrder);
    },
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes (shorter time)
    // Default values to prevent UI flashes
    placeholderData: { data: { videos: [] } },
    keepPreviousData: true,
    // CRITICAL: Prevent new API calls when resize is happening
    // This allows already-cached data to be used without refetching
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    // Transform the response if we have a game filter
    select: (data) => {
      // If no game filter, return all videos
      if (!game) return data;
      
      logger.debug('VideoQueryHooks', `Filtering videos by game: ${game}`, { 
        beforeCount: data?.data?.videos?.length || 0 
      });
      
      // Filter videos by game client-side
      const filteredVideos = data?.data?.videos?.filter(video => 
        video.game && video.game.toLowerCase() === game.toLowerCase()
      ) || [];
      
      logger.debug('VideoQueryHooks', `Game filtering complete`, { 
        game,
        matchCount: filteredVideos.length 
      });
      
      // Return transformed data with filtered videos
      return {
        ...data,
        data: {
          ...data?.data,
          videos: filteredVideos
        }
      };
    },
    // Allow components to override defaults with their own options
    ...options,
  });
}

/**
 * Hook to fetch user's videos with React Query
 * @param {Object} params - Query parameters
 * @param {string} params.sortOrder - Sort order for videos
 * @param {string} params.game - Optional game filter
 * @param {boolean} params.isAuthenticated - Whether the user is authenticated
 * @param {Object} params.options - Additional React Query options
 * @returns {Object} Query result with data, isLoading, error, etc.
 */
export function useVideos({ 
  sortOrder = 'updated_at desc', 
  game = null, 
  isAuthenticated = false, 
  options = {} 
} = {}) {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: ['videos', sortOrder, game, isAuthenticated],
    queryFn: async () => {
      try {
        // CRITICAL FIX: Always make the API call and let the backend handle authentication
        // This allows proper error handling for unauthenticated requests
        logger.debug('VideoQueryHooks', 'Fetching videos, authentication status:', { isAuthenticated });
        
        // Make the API call with error handling - server will return 401 if not authenticated
        const response = await VideoService.getVideos(sortOrder);
        
        // Log response details for debugging without full content
        logger.debug('VideoQueryHooks', 'Videos API response received', {
          hasData: !!response?.data,
          hasVideosArray: !!response?.data?.videos,
          videoCount: Array.isArray(response?.data?.videos) ? response.data.videos.length : 'unknown'
        });
        
        // Handle different response formats
        if (response?.data?.videos) {
          return response;
        } 
        
        // If we got data but not in the expected format, transform it
        if (Array.isArray(response?.data)) {
          return { data: { videos: response.data } };
        }
        
        // Handle case where response itself might be an array
        if (Array.isArray(response)) {
          return { data: { videos: response } };
        }
        
        // Default case
        return { data: { videos: [] } };
      } catch (error) {
        logger.error('VideoQueryHooks', 'Error fetching videos', error);
        throw error;
      }
    },
    // Always run the query - without any conditional
    // Critical: Don't check authentication status here as it causes issues
    enabled: true,
    staleTime: 1 * 60 * 1000, // Consider data fresh for only 1 minute to get fresher data
    // Default values to prevent UI flashes
    placeholderData: { data: { videos: [] } },
    keepPreviousData: true,
    refetchOnWindowFocus: isAuthenticated, // Only auto-refresh when authenticated
    refetchOnMount: isAuthenticated,      // Only refetch when authenticated
    retry: isAuthenticated ? 2 : 0,       // Only retry if authenticated
    // Allow components to override defaults with their own options
    ...options,
  });
}

/**
 * Hook to fetch games with React Query
 * @param {string} search - Search query for games
 * @returns {Object} Query result with data, isLoading, error, etc.
 */
export function useGames(search = '') {
  // Prefetch all games on component mount
  const queryClient = useQueryClient();
  
  React.useEffect(() => {
    // Prefetch all games without search
    queryClient.prefetchQuery(['games', ''], () => VideoService.getGames());
  }, [queryClient]);
  
  return useQuery({
    queryKey: ['games', search],
    queryFn: () => search ? VideoService.searchGames(search) : VideoService.getGames(),
    staleTime: search ? 30 * 1000 : 5 * 60 * 1000, // Search results stale faster
    placeholderData: (prevData) => {
      // Use previous data while loading
      if (prevData) return prevData;
      
      // Or try to use data from the 'all games' query
      if (!search) return undefined;
      
      // For searches, filter the all games query client-side while loading
      const allGamesData = queryClient.getQueryData(['games', '']);
      if (allGamesData && allGamesData.games) {
        const filtered = {
          ...allGamesData,
          games: allGamesData.games.filter(game => 
            game.name.toLowerCase().includes(search.toLowerCase())
          )
        };
        return filtered;
      }
      
      return undefined;
    },
    keepPreviousData: true,
  });
}

/**
 * Hook to fetch video details with React Query
 * @param {string} videoId - Video ID to fetch details for
 * @param {boolean} isAuthenticated - Whether the user is authenticated
 * @returns {Object} Query result with data, isLoading, error, etc.
 */
export function useVideoDetails(videoId, isAuthenticated = true) {
  return useQuery({
    queryKey: ['videoDetails', videoId],
    queryFn: () => VideoService.getDetails(videoId),
    enabled: !!videoId && isAuthenticated, // Only fetch if videoId exists and user is authenticated
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
  });
}

/**
 * Hook to fetch video tags with React Query
 * @param {string} videoId - Video ID to fetch tags for
 * @param {boolean} isAuthenticated - Whether the user is authenticated
 * @returns {Object} Query result with data, isLoading, error, etc.
 */
export function useVideoTags(videoId, isAuthenticated = true) {
  return useQuery({
    queryKey: ['videoTags', videoId],
    queryFn: () => VideoService.getVideoTags(videoId),
    enabled: !!videoId && isAuthenticated, // Only fetch if videoId exists and user is authenticated
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
  });
}

/**
 * Hook to fetch video game with React Query
 * @param {string} videoId - Video ID to fetch game for
 * @param {boolean} isAuthenticated - Whether the user is authenticated
 * @returns {Object} Query result with data, isLoading, error, etc.
 */
export function useVideoGame(videoId, isAuthenticated = true) {
  return useQuery({
    queryKey: ['videoGame', videoId],
    queryFn: () => VideoService.getVideoGame(videoId),
    enabled: !!videoId && isAuthenticated, // Only fetch if videoId exists and user is authenticated
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
  });
}

/**
 * Hook to fetch tags with React Query
 * @param {string} search - Search query for tags
 * @returns {Object} Query result with data, isLoading, error, etc.
 */
export function useTags(search = '') {
  return useQuery({
    queryKey: ['tags', search],
    queryFn: () => search ? VideoService.searchTags(search) : VideoService.getTags(),
    staleTime: search ? 30 * 1000 : 5 * 60 * 1000, // Search results stale faster
  });
}

/**
 * Hook to fetch folders with React Query
 * @returns {Object} Query result with data, isLoading, error, etc.
 */
export function useFolders() {
  return useQuery({
    queryKey: ['folders'],
    queryFn: () => VideoService.getFolders(),
    staleTime: 10 * 60 * 1000, // Folders change infrequently
  });
}

/**
 * Hook that provides functions to manage video cache
 * @returns {Object} Object containing refreshVideos function to invalidate and refetch all video-related data
 */
export function useVideoCache() {
  const queryClient = useQueryClient();
  
  // Function to refresh all video-related data
  const refreshVideos = React.useCallback(() => {
    // Invalidate all video-related queries
    queryClient.invalidateQueries({ queryKey: ['videos'] });
    queryClient.invalidateQueries({ queryKey: ['publicVideos'] });
    queryClient.invalidateQueries({ queryKey: ['games', ''] });
    queryClient.invalidateQueries({ queryKey: ['tags', ''] });
    queryClient.invalidateQueries({ queryKey: ['folders'] });
    
    // Force refetch to ensure fresh data
    queryClient.refetchQueries({ queryKey: ['videos'] });
    queryClient.refetchQueries({ queryKey: ['publicVideos'] });
    
    // For backward compatibility, also clear localStorage cache
    localStorage.removeItem('videos_updated_at desc');
    localStorage.removeItem('public_videos_updated_at desc');
    
    // Track in session storage that we have videos (for optimistic UI)
    const sessionKeys = [
      'route:feed:hasVideos',
      'route:videos:hasVideos',
      'route:publicVideos:hasVideos',
      'route:dashboard:hasVideos'
    ];
    
    // Try to preserve session storage state for optimistic UI
    sessionKeys.forEach(key => {
      if (sessionStorage.getItem(key) === 'true') {
        sessionStorage.setItem(key, 'true');
      }
    });
    
    return true;
  }, [queryClient]);
  
  return { refreshVideos };
}