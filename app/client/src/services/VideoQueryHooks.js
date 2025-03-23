import React from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import VideoService from "./VideoService";

import { logger } from "../common/logger";

export function usePublicVideos({sortOrder: sortOrder = "updated_at desc", game: game = null, options: options = {}} = {}) {
  const queryClient = useQueryClient();
  const cachedData = React.useMemo((() => queryClient.getQueryData([ "publicVideos", sortOrder, game ])), [ queryClient, sortOrder, game ]);
  return useQuery({
    queryKey: [ "publicVideos", sortOrder, game ],
    queryFn: () => {
      const isSliderActive = typeof document !== "undefined" && (document.body.classList.contains("resizing-cards") || document.body.classList.contains("slider-commit"));
      if (isSliderActive && cachedData) {
        logger.debug("VideoQueryHooks", "Using cached data during slider operation");
        return Promise.resolve(cachedData);
      }
      logger.debug("VideoQueryHooks", "Fetching public videos", {
        sortOrder: sortOrder,
        game: game
      });
      return VideoService.getPublicVideos(sortOrder);
    },
    staleTime: 2 * 60 * 1e3,
    placeholderData: {
      data: {
        videos: []
      }
    },
    keepPreviousData: true,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    select: data => {
      if (!game) return data;
      logger.debug("VideoQueryHooks", `Filtering videos by game: ${game}`, {
        beforeCount: data?.data?.videos?.length || 0
      });
      const filteredVideos = data?.data?.videos?.filter((video => video.game && video.game.toLowerCase() === game.toLowerCase())) || [];
      logger.debug("VideoQueryHooks", `Game filtering complete`, {
        game: game,
        matchCount: filteredVideos.length
      });
      return {
        ...data,
        data: {
          ...data?.data,
          videos: filteredVideos
        }
      };
    },
    ...options
  });
}

export function useVideos({sortOrder: sortOrder = "updated_at desc", game: game = null, isAuthenticated: isAuthenticated = false, options: options = {}} = {}) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [ "videos", sortOrder, game, isAuthenticated ],
    queryFn: async () => {
      try {
        logger.debug("VideoQueryHooks", "Fetching videos, authentication status:", {
          isAuthenticated: isAuthenticated
        });
        const response = await VideoService.getVideos(sortOrder);
        logger.debug("VideoQueryHooks", "Videos API response received", {
          hasData: !!response?.data,
          hasVideosArray: !!response?.data?.videos,
          videoCount: Array.isArray(response?.data?.videos) ? response.data.videos.length : "unknown"
        });
        if (response?.data?.videos) {
          return response;
        }
        if (Array.isArray(response?.data)) {
          return {
            data: {
              videos: response.data
            }
          };
        }
        if (Array.isArray(response)) {
          return {
            data: {
              videos: response
            }
          };
        }
        return {
          data: {
            videos: []
          }
        };
      } catch (error) {
        logger.error("VideoQueryHooks", "Error fetching videos", error);
        throw error;
      }
    },
    enabled: true,
    staleTime: 1 * 60 * 1e3,
    placeholderData: {
      data: {
        videos: []
      }
    },
    keepPreviousData: true,
    refetchOnWindowFocus: isAuthenticated,
    refetchOnMount: isAuthenticated,
    retry: isAuthenticated ? 2 : 0,
    ...options
  });
}

export function useGames(search = "") {
  const queryClient = useQueryClient();
  React.useEffect((() => {
    queryClient.prefetchQuery([ "games", "" ], (() => VideoService.getGames()));
  }), [ queryClient ]);
  return useQuery({
    queryKey: [ "games", search ],
    queryFn: () => search ? VideoService.searchGames(search) : VideoService.getGames(),
    staleTime: search ? 30 * 1e3 : 5 * 60 * 1e3,
    placeholderData: prevData => {
      if (prevData) return prevData;
      if (!search) return undefined;
      const allGamesData = queryClient.getQueryData([ "games", "" ]);
      if (allGamesData && allGamesData.games) {
        const filtered = {
          ...allGamesData,
          games: allGamesData.games.filter((game => game.name.toLowerCase().includes(search.toLowerCase())))
        };
        return filtered;
      }
      return undefined;
    },
    keepPreviousData: true
  });
}

export function useVideoDetails(videoId, isAuthenticated = true) {
  return useQuery({
    queryKey: [ "videoDetails", videoId ],
    queryFn: () => VideoService.getDetails(videoId),
    enabled: !!videoId && isAuthenticated,
    staleTime: 2 * 60 * 1e3
  });
}

export function useVideoTags(videoId, isAuthenticated = true) {
  return useQuery({
    queryKey: [ "videoTags", videoId ],
    queryFn: () => VideoService.getVideoTags(videoId),
    enabled: !!videoId && isAuthenticated,
    staleTime: 2 * 60 * 1e3
  });
}

export function useVideoGame(videoId, isAuthenticated = true) {
  return useQuery({
    queryKey: [ "videoGame", videoId ],
    queryFn: () => VideoService.getVideoGame(videoId),
    enabled: !!videoId && isAuthenticated,
    staleTime: 2 * 60 * 1e3
  });
}

export function useTags(search = "") {
  return useQuery({
    queryKey: [ "tags", search ],
    queryFn: () => search ? VideoService.searchTags(search) : VideoService.getTags(),
    staleTime: search ? 30 * 1e3 : 5 * 60 * 1e3
  });
}

export function useFolders() {
  return useQuery({
    queryKey: [ "folders" ],
    queryFn: () => VideoService.getFolders(),
    staleTime: 10 * 60 * 1e3
  });
}

export function useVideoCache() {
  const queryClient = useQueryClient();
  
  // Standard refresh - invalidates all caches and triggers immediate refetching
  const refreshVideos = React.useCallback((() => {
    // Just invalidate the queries but don't force an immediate refetch
    // This is more efficient and prevents UI jank
    queryClient.invalidateQueries({
      queryKey: [ "videos" ]
    });
    queryClient.invalidateQueries({
      queryKey: [ "publicVideos" ]
    });
    queryClient.invalidateQueries({
      queryKey: [ "games", "" ]
    });
    queryClient.invalidateQueries({
      queryKey: [ "tags", "" ]
    });
    queryClient.invalidateQueries({
      queryKey: [ "folders" ]
    });
    
    // Clear legacy localStorage cache
    localStorage.removeItem("videos_updated_at desc");
    localStorage.removeItem("public_videos_updated_at desc");
    
    // Preserve optimistic UI flags in sessionStorage
    const sessionKeys = [ "route:feed:hasVideos", "route:videos:hasVideos", "route:publicVideos:hasVideos", "route:dashboard:hasVideos" ];
    sessionKeys.forEach((key => {
      if (sessionStorage.getItem(key) === "true") {
        sessionStorage.setItem(key, "true");
      }
    }));
    
    return true;
  }), [ queryClient ]);
  
  return {
    refreshVideos: refreshVideos
  };
}