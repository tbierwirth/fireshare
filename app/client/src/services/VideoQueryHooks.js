// VideoQueryHooks.js
import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import VideoService from './VideoService';

/**
 * Hook to fetch public videos with React Query
 * @param {Object} params - Query parameters
 * @param {string} params.sortOrder - Sort order for videos
 * @param {string} params.game - Optional game filter
 * @param {Object} params.options - Additional React Query options
 * @returns {Object} Query result with data, isLoading, error, etc.
 */
export function usePublicVideos({ sortOrder = 'updated_at desc', game = null, options = {} } = {}) {
  return useQuery({
    // Query key changes when sortOrder or game changes, causing automatic refetch
    queryKey: ['publicVideos', sortOrder, game],
    queryFn: () => VideoService.getPublicVideos(sortOrder),
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    // Default values to prevent UI flashes
    placeholderData: { data: { videos: [] } },
    keepPreviousData: true,
    // Allow components to override defaults with their own options
    ...options,
  });
}

/**
 * Hook to fetch user's videos with React Query
 * @param {Object} params - Query parameters
 * @param {string} params.sortOrder - Sort order for videos
 * @param {string} params.game - Optional game filter
 * @param {Object} params.options - Additional React Query options
 * @returns {Object} Query result with data, isLoading, error, etc.
 */
export function useVideos({ sortOrder = 'updated_at desc', game = null, options = {} } = {}) {
  return useQuery({
    queryKey: ['videos', sortOrder, game],
    queryFn: () => VideoService.getVideos(sortOrder),
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    // Default values to prevent UI flashes
    placeholderData: { data: { videos: [] } },
    keepPreviousData: true,
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
 * @returns {Object} Query result with data, isLoading, error, etc.
 */
export function useVideoDetails(videoId) {
  return useQuery({
    queryKey: ['videoDetails', videoId],
    queryFn: () => VideoService.getDetails(videoId),
    enabled: !!videoId, // Only fetch if videoId exists
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
  });
}

/**
 * Hook to fetch video tags with React Query
 * @param {string} videoId - Video ID to fetch tags for
 * @returns {Object} Query result with data, isLoading, error, etc.
 */
export function useVideoTags(videoId) {
  return useQuery({
    queryKey: ['videoTags', videoId],
    queryFn: () => VideoService.getVideoTags(videoId),
    enabled: !!videoId, // Only fetch if videoId exists
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
  });
}

/**
 * Hook to fetch video game with React Query
 * @param {string} videoId - Video ID to fetch game for
 * @returns {Object} Query result with data, isLoading, error, etc.
 */
export function useVideoGame(videoId) {
  return useQuery({
    queryKey: ['videoGame', videoId],
    queryFn: () => VideoService.getVideoGame(videoId),
    enabled: !!videoId, // Only fetch if videoId exists
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