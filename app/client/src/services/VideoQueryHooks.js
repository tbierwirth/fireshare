import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import VideoService from './VideoService';
import { logger } from '../common/utils';

// Shared cache keys
export const PUBLIC_VIDEOS_KEY = ['videos', 'public'];
export const MY_VIDEOS_KEY = ['videos', 'my'];
export const ALL_VIDEOS_KEY = ['videos'];
export const ALL_GAMES_KEY = ['games']; 
export const ALL_TAGS_KEY = ['tags'];
export const ALL_FOLDERS_KEY = ['folders'];

/**
 * Hook for retrieving public videos with caching and refresh handling
 */
export const usePublicVideos = (sort = 'newest', game = null) => {
    const queryClient = useQueryClient();
    const queryKey = game ? [...PUBLIC_VIDEOS_KEY, sort, game] : [...PUBLIC_VIDEOS_KEY, sort];
    
    // Detect if we're in a rapid navigation between routes
    const navEntries = window.performance?.getEntriesByType("navigation") || [];
    const isPageRefresh = navEntries.length > 0 && navEntries[0].type === 'reload';
    const isRouteSwitch = window.performance && 
                          navEntries.length > 0 && 
                          navEntries[0].duration < 500 &&
                          !isPageRefresh;
    
    // Check if we had videos before - used for optimistic UI
    const useOptimisticUI = (key) => {
        const [hadVideos, setHadVideos] = useState(() => {
            const hasContent = window.sessionStorage.getItem(key);
            return hasContent === 'true';
        });
        
        useEffect(() => {
            return () => {
                // Cleanup effect - no action needed
            };
        }, []);
        
        const updateHasContent = useCallback((hasContent) => {
            if (hasContent) {
                window.sessionStorage.setItem(key, 'true');
                window.localStorage.setItem(key, 'true'); // Store in localStorage too for persistence
                setHadVideos(true);
            }
        }, [key]);
        
        return { hadVideos, updateHasContent };
    };
    
    const { hadVideos: previouslyHadContent, updateHasContent } = useOptimisticUI('route:feed:hasVideos');
    
    // Check if slider is currently active - used to reduce re-renders during slider changes
    const isSliderActive = window.sessionStorage.getItem('slider:active') === 'true';
    
    // Get cached data
    const cachedData = queryClient.getQueryData(queryKey);
    
    // Use localStorage as a fallback if sessionStorage is empty (page refresh case)
    const hadContentInLocalStorage = window.localStorage.getItem('route:feed:hasVideos') === 'true';
    
    // Always use useQuery, but customize the behavior based on conditions
    return useQuery({
        queryKey,
        queryFn: () => VideoService.getPublicVideos(sort, game),
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: 1,
        // Always refetch on page refresh
        refetchOnMount: isPageRefresh ? true : "if-empty",
        onSuccess: (data) => {
            // Update optimistic UI flags if we have videos
            if (data?.videos?.length > 0) {
                updateHasContent(true);
            }
        },
        onError: (error) => {
            logger.error("VideoQueryHooks", "Error fetching public videos:", error);
        },
        // Don't use cached data for initialData on page refresh
        initialData: isPageRefresh ? undefined : cachedData,
        // If this is a fast route switch AND we previously had content, use cached data or empty response
        enabled: !((isRouteSwitch || isSliderActive) && (previouslyHadContent || hadContentInLocalStorage) && !isPageRefresh)
    });
};

/**
 * Hook for retrieving user's own videos with caching and refresh handling
 */
export const useVideos = (sort = 'newest', game = null) => {
    const queryClient = useQueryClient();
    const queryKey = game ? [...MY_VIDEOS_KEY, sort, game] : [...MY_VIDEOS_KEY, sort];
    const emptyResponse = { videos: [] };
    const initialFetchRef = useRef(false);
    
    // Detect if we're in a rapid navigation between routes
    const navEntries = window.performance?.getEntriesByType("navigation") || [];
    const isPageRefresh = navEntries.length > 0 && navEntries[0].type === 'reload';
    const isRouteSwitch = window.performance && 
                          navEntries.length > 0 && 
                          navEntries[0].duration < 500 &&
                          !isPageRefresh;
    
    // Check if we had videos before - used for optimistic UI
    const useOptimisticUI = (key) => {
        const [hadVideos, setHadVideos] = useState(() => {
            const hasContent = window.sessionStorage.getItem(key);
            return hasContent === 'true';
        });
        
        useEffect(() => {
            return () => {
                // Cleanup effect - no action needed
            };
        }, []);
        
        const updateHasContent = useCallback((hasContent) => {
            if (hasContent) {
                window.sessionStorage.setItem(key, 'true');
                window.localStorage.setItem(key, 'true'); // Store in localStorage too for persistence
                setHadVideos(true);
            }
        }, [key]);
        
        return { hadVideos, updateHasContent };
    };
    
    const { hadVideos: previouslyHadContent, updateHasContent } = useOptimisticUI('route:dashboard:hasVideos');
    
    // Check if slider is currently active - used to reduce re-renders during slider changes
    const isSliderActive = window.sessionStorage.getItem('slider:active') === 'true';
    
    // Get cached data
    const cachedData = queryClient.getQueryData(queryKey);
    
    // Use localStorage as a fallback if sessionStorage is empty (page refresh case)
    const hadContentInLocalStorage = window.localStorage.getItem('route:dashboard:hasVideos') === 'true';
    
    // Ensure we aren't in the initial mount - this must be called unconditionally
    useEffect(() => {
        initialFetchRef.current = true;
    }, []);
    
    // If this is a fast route switch AND we previously had content, use cached data or empty response
    const shouldSkipFetch = (isRouteSwitch || isSliderActive) && 
                           (previouslyHadContent || hadContentInLocalStorage) && 
                           !isPageRefresh;
                           
    // Always call useQuery, but use the enabled option to conditionally fetch
    const queryResult = useQuery({
        queryKey,
        queryFn: () => VideoService.getVideos(sort, game),
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: 1,
        // Always refetch on page refresh
        refetchOnMount: isPageRefresh ? true : "if-empty",
        onSuccess: (data) => {
            // Update optimistic UI flags if we have videos
            if (data?.videos?.length > 0) {
                updateHasContent(true);
            }
        },
        onError: (error) => {
            logger.error("VideoQueryHooks", "Error fetching videos:", error);
        },
        // Don't use cached data for initialData on page refresh
        initialData: isPageRefresh ? undefined : cachedData,
        // Skip the fetch entirely if we're doing a route switch with cached data
        enabled: !shouldSkipFetch
    });
    
    // If we should skip fetch, return a mock result with cached data
    if (shouldSkipFetch) {
        logger.debug("VideoQueryHooks", "Using cached/empty data during navigation");
        return {
            data: cachedData || emptyResponse,
            isLoading: false,
            isFetching: false,
            isSuccess: true,
            isError: false,
            error: null
        };
    }
    
    // Otherwise return the actual query result
    return queryResult;
};

/**
 * Hook for retrieving video details
 */
export const useVideoDetails = (videoId) => {
    return useQuery({
        queryKey: ['video', 'details', videoId],
        queryFn: () => videoId ? VideoService.getDetails(videoId) : Promise.resolve(null),
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        enabled: !!videoId,
        retry: 1
    });
};

/**
 * Hook for retrieving video game
 */
export const useVideoGame = (videoId) => {
    return useQuery({
        queryKey: ['video', 'game', videoId],
        queryFn: () => videoId ? VideoService.getVideoGame(videoId) : Promise.resolve(null),
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        enabled: !!videoId,
        retry: 1
    });
};

/**
 * Hook for retrieving video tags
 */
export const useVideoTags = (videoId) => {
    return useQuery({
        queryKey: ['video', 'tags', videoId],
        queryFn: () => videoId ? VideoService.getVideoTags(videoId) : Promise.resolve(null),
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        enabled: !!videoId,
        retry: 1
    });
};

/**
 * Hook for retrieving game list
 */
export const useGames = () => {
    return useQuery({
        queryKey: ALL_GAMES_KEY,
        queryFn: () => VideoService.getGames(),
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        retry: 1
    });
};

/**
 * Hook for retrieving tag list
 */
export const useTags = () => {
    return useQuery({
        queryKey: ALL_TAGS_KEY,
        queryFn: () => VideoService.getTags(),
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        retry: 1
    });
};

/**
 * Hook for retrieving folder list
 */
export const useFolders = () => {
    return useQuery({
        queryKey: ALL_FOLDERS_KEY,
        queryFn: () => VideoService.getFolders(),
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        retry: 1
    });
};

/**
 * Hook to update video details
 */
export const useUpdateVideoDetails = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: ({ videoId, updateData }) => VideoService.updateDetails(videoId, updateData),
        onSuccess: (data, variables) => {
            // Invalidate and refetch affected queries
            queryClient.invalidateQueries({queryKey: ['video', 'details', variables.videoId]});
            queryClient.invalidateQueries({queryKey: PUBLIC_VIDEOS_KEY});
            queryClient.invalidateQueries({queryKey: MY_VIDEOS_KEY});
        }
    });
};

/**
 * Hook to update video game
 */
export const useUpdateVideoGame = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: ({ videoId, gameName }) => VideoService.setVideoGame(videoId, gameName),
        onSuccess: (data, variables) => {
            // Invalidate and refetch affected queries
            queryClient.invalidateQueries({queryKey: ['video', 'game', variables.videoId]});
            queryClient.invalidateQueries({queryKey: PUBLIC_VIDEOS_KEY});
            queryClient.invalidateQueries({queryKey: MY_VIDEOS_KEY});
            queryClient.invalidateQueries({queryKey: ALL_GAMES_KEY});
            queryClient.invalidateQueries({queryKey: ALL_FOLDERS_KEY});
        }
    });
};

/**
 * Hook to update video tags
 */
export const useUpdateVideoTags = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: ({ videoId, tags }) => VideoService.addVideoTags(videoId, tags),
        onSuccess: (data, variables) => {
            // Invalidate and refetch affected queries
            queryClient.invalidateQueries({queryKey: ['video', 'tags', variables.videoId]});
            queryClient.invalidateQueries({queryKey: PUBLIC_VIDEOS_KEY});
            queryClient.invalidateQueries({queryKey: MY_VIDEOS_KEY});
            queryClient.invalidateQueries({queryKey: ALL_TAGS_KEY});
            queryClient.invalidateQueries({queryKey: ALL_FOLDERS_KEY});
        }
    });
};

/**
 * Central hook for loading state management
 */
export const useLoadingState = (data, isLoading, isFetching, hadVideos) => {
    const [showLoading, setShowLoading] = useState(true);
    const [minLoadingTimeElapsed, setMinLoadingTimeElapsed] = useState(false);
    const timeoutRef = useRef(null);
    
    // Set a minimum loading time to prevent flashing
    useEffect(() => {
        timeoutRef.current = setTimeout(() => {
            setMinLoadingTimeElapsed(true);
        }, 800); // Minimum loading time
        
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);
    
    // Determine if we should show loading state
    useEffect(() => {
        // If we previously had videos, don't show loading state
        if (hadVideos && !isLoading) {
            setShowLoading(false);
            return;
        }
        
        // Always show loading during first load until minimum time elapsed
        if (isLoading || isFetching) {
            setShowLoading(true);
        } else if (minLoadingTimeElapsed) {
            setShowLoading(false);
        }
    }, [isLoading, isFetching, minLoadingTimeElapsed, hadVideos]);
    
    return { showLoading };
};

/**
 * Display logic hook for video data
 */
export const useVideoDisplay = (queryResult, optKey) => {
    const { data, isLoading, isFetching, isSuccess, isError, error } = queryResult;
    const [showLoading, setShowLoading] = useState(true);
    const [minimumLoadingTimeElapsed, setMinimumLoadingTimeElapsed] = useState(false);
    const timeoutRef = useRef(null);
    
    // Check if we had videos before from session or localStorage
    const hadVideos = useRef(
        window.sessionStorage.getItem(optKey) === 'true' || 
        window.localStorage.getItem(optKey) === 'true'
    ).current;
    
    // Get navigation type to detect if this is a page refresh
    const navEntries = window.performance?.getEntriesByType("navigation") || [];
    const isPageRefresh = navEntries.length > 0 && navEntries[0].type === 'reload';
    
    // Set a minimum loading time to prevent flashing
    useEffect(() => {
        timeoutRef.current = setTimeout(() => {
            setMinimumLoadingTimeElapsed(true);
        }, 800); // Minimum loading time of 800ms
        
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);
    
    // Determine if we should show loading state
    useEffect(() => {
        // For page refreshes with localStorage data, don't show loading state
        if (isPageRefresh && hadVideos && !isLoading) {
            setShowLoading(false);
            return;
        }
        
        // For normal navigation with previous videos, don't show loading
        if (hadVideos && (!isLoading || data?.videos?.length > 0)) {
            setShowLoading(false);
        } else if (isLoading || isFetching) {
            // Always show loading during first load (if we didn't have videos before)
            setShowLoading(true);
        } else if (minimumLoadingTimeElapsed) {
            // After min loading time, hide loading
            setShowLoading(false);
        }
    }, [isLoading, isFetching, minimumLoadingTimeElapsed, hadVideos, data, isPageRefresh]);
    
    // Store that we have videos when data arrives
    useEffect(() => {
        if (isSuccess && data?.videos?.length > 0) {
            window.sessionStorage.setItem(optKey, 'true');
            window.localStorage.setItem(optKey, 'true');
        }
    }, [isSuccess, data, optKey]);
    
    return { 
        videos: data?.videos || [], 
        showLoading,
        isError,
        error,
        hadVideos
    };
};

/**
 * Central hook for video cache management
 */
export const useVideoCache = () => {
    const queryClient = useQueryClient();
    
    const refreshVideos = useCallback(() => {
        // Store the session flags for optimistic UI
        const feedHasVideos = window.sessionStorage.getItem('route:feed:hasVideos');
        const dashboardHasVideos = window.sessionStorage.getItem('route:dashboard:hasVideos');
        
        // First invalidate all video-related queries to ensure fresh data
        logger.debug("VideoCache", "Invalidating all video caches");
        queryClient.invalidateQueries({queryKey: PUBLIC_VIDEOS_KEY});
        queryClient.invalidateQueries({queryKey: MY_VIDEOS_KEY});
        queryClient.invalidateQueries({queryKey: ALL_VIDEOS_KEY});
        queryClient.invalidateQueries({queryKey: ALL_GAMES_KEY});
        queryClient.invalidateQueries({queryKey: ALL_TAGS_KEY}); 
        queryClient.invalidateQueries({queryKey: ALL_FOLDERS_KEY});
        
        // Restore the session flags after invalidation
        if (feedHasVideos === 'true') {
            window.sessionStorage.setItem('route:feed:hasVideos', 'true');
            window.localStorage.setItem('route:feed:hasVideos', 'true');
        }
        
        if (dashboardHasVideos === 'true') {
            window.sessionStorage.setItem('route:dashboard:hasVideos', 'true');
            window.localStorage.setItem('route:dashboard:hasVideos', 'true');
        }
        
        logger.debug("VideoCache", "Cache invalidation complete");
        
        // Return the refetch promises
        return Promise.all([
            queryClient.refetchQueries({queryKey: PUBLIC_VIDEOS_KEY}),
            queryClient.refetchQueries({queryKey: MY_VIDEOS_KEY})
        ]);
    }, [queryClient]);
    
    return { refreshVideos };
};

// Create a named variable for the default export to fix the eslint warning
const VideoQueryHooks = {
    usePublicVideos,
    useVideos,
    useVideoDetails,
    useVideoGame,
    useVideoTags,
    useGames,
    useTags,
    useFolders,
    useUpdateVideoDetails,
    useUpdateVideoGame,
    useUpdateVideoTags,
    useLoadingState,
    useVideoDisplay,
    useVideoCache
};

// Export as default
export default VideoQueryHooks;