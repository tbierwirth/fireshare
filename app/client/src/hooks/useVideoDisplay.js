import { useState, useMemo, useCallback, useEffect } from 'react';
import { getSetting, setSetting } from '../common/utils';
import { useLoadingState, useOptimisticUI } from './index';
import { useVideoCache } from '../services/VideoQueryHooks';
import { logger } from '../common/logger';
import { SORT_OPTIONS } from '../common/constants';

/**
 * Custom hook for managing video display logic shared between Feed and Dashboard
 * 
 * @param {Object} options Configuration options
 * @param {Array} options.videos The videos array to display
 * @param {boolean} options.queryLoading Whether the query is loading
 * @param {boolean} options.isFetching Whether the query is fetching
 * @param {Error} options.error Error object if query failed
 * @param {Function} options.refetch Function to refetch videos
 * @param {boolean} options.authenticated Whether user is authenticated
 * @param {string} options.searchText Search text from parent component
 * @param {string} options.routeKey Session storage key for this route ('feed' or 'dashboard')
 * @param {string} options.gameParam Game parameter from URL query
 * @param {string} options.categoryParam Category parameter from URL query
 * @param {boolean} options.isFeedView Whether this is the feed view (public videos)
 * @param {number} options.cardSize Card size value
 * @returns {Object} Video display state and handlers
 */
const useVideoDisplay = ({
  videos = [],
  queryLoading = false,
  isFetching = false,
  error = null,
  refetch,
  authenticated = false,
  searchText = '',
  routeKey = 'generic',
  gameParam = null,
  categoryParam = null,
  isFeedView = false,
  cardSize = 300
}) => {
  // Create session storage key
  const sessionKey = `route:${routeKey}:hasVideos`;
  
  // Initialize state based on URL params or saved settings
  const [selectedFolder, setSelectedFolder] = useState(
    categoryParam
      ? { value: categoryParam, label: categoryParam }
      : gameParam 
        ? { value: `🎮 ${gameParam}`, label: `🎮 ${gameParam}` }
        : getSetting('folder') || { value: 'All Videos', label: 'All Videos' }
  );
  
  const [selectedSort, setSelectedSort] = useState(getSetting('sortOption') || SORT_OPTIONS[0]);
  const [search, setSearch] = useState(searchText || '');
  
  // Get video cache management functions
  const { refreshVideos } = useVideoCache();
  
  // Get previous content state from session
  const hadVideosInSession = !!sessionStorage.getItem(sessionKey);
  
  // Use consistent loading state hook with 800ms minimum duration
  const [isLoading, setIsLoading] = useLoadingState({
    minDuration: 800,
    initialState: !hadVideosInSession,
    debounceToggles: true
  });
  
  // Apply card size CSS variable
  useEffect(() => {
    if (cardSize) {
      document.documentElement.style.setProperty('--card-size', `${cardSize}px`);
    }
  }, [cardSize]);
  
  // Reset loading state when data arrives
  useEffect(() => {
    if (videos.length > 0 || !queryLoading) {
      setIsLoading(false);
    }
  }, [videos, queryLoading, setIsLoading]);
  
  // Track if we previously had videos (optimistic UI)
  const hadVideos = useOptimisticUI({
    key: sessionKey,
    data: videos,
    initialValue: false,
    condition: (data) => Array.isArray(data) && data.length > 0
  });
  
  // Update search when prop changes
  useEffect(() => {
    if (searchText !== search) {
      setSearch(searchText);
    }
  }, [searchText, search]);
  
  // Extract folders from videos
  const folders = useMemo(() => {
    if (!videos || videos.length === 0) {
      return ['All Videos'];
    }
    
    const tfolders = [];
    const gameSet = new Set();
    
    videos.forEach((v) => {
      const split = v.path
        .split('/')
        .slice(0, -1)
        .filter((f) => f !== '');
      
      if (split.length > 0 && !tfolders.includes(split[0])) {
        tfolders.push(split[0]);
      }
      
      // Game folders
      if (v.game && !gameSet.has(v.game)) {
        gameSet.add(v.game);
      }
    });
    
    // Process folder display
    tfolders.sort((a, b) => (a.toLowerCase() > b.toLowerCase() ? 1 : -1));
    tfolders.unshift('All Videos');
    
    if (gameSet.size > 0) {
      tfolders.push('--- Games ---');
      const gameArray = Array.from(gameSet);
      gameArray.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
      gameArray.forEach(game => {
        tfolders.push(`🎮 ${game}`);
      });
    }
    
    return tfolders;
  }, [videos]);
  
  // Folder selection handler that also updates URL if in Feed view
  const handleFolderSelection = useCallback((folder) => {
    if (folder.value === '--- Games ---') {
      return;
    }
    
    setSetting('folder', folder);
    setSelectedFolder(folder);
    
    // Only update URL in feed view
    if (isFeedView && 'URLSearchParams' in window) {
      const searchParams = new URLSearchParams('');
      
      if (folder.value.startsWith('🎮 ')) {
        const gameName = folder.value.substring(3);
        searchParams.set('game', gameName);
        window.history.replaceState(
          { game: gameName }, 
          '', 
          `${window.location.pathname}?${searchParams.toString()}`
        );
      } else if (folder.value !== '--- Games ---' && folder.value !== 'All Videos') {
        searchParams.set('category', folder.value);
        window.history.replaceState(
          { category: folder.value }, 
          '', 
          `${window.location.pathname}?${searchParams.toString()}`
        );
      } else {
        // Clear parameters for All Videos
        window.history.replaceState(
          {}, 
          '', 
          window.location.pathname
        );
      }
    }
  }, [isFeedView]);
  
  // Sort selection handler
  const handleSortSelection = useCallback((sortOption) => {
    setSetting('sortOption', sortOption);
    setSelectedSort(sortOption);
    refetch && refetch();
  }, [refetch]);
  
  // Refresh videos handler
  const fetchVideos = useCallback(() => {
    logger.debug(routeKey, `Manual refresh of videos triggered in ${routeKey}`);
    refreshVideos();
    refetch && refetch();
  }, [refreshVideos, refetch, routeKey]);
  
  // Filter videos by search term
  const filteredVideos = useMemo(() => {
    if (!videos || videos.length === 0) {
      return [];
    }
    
    if (!search) {
      return videos;
    }
    
    return videos.filter((v) => {
      return v.info && v.info.title && v.info.title.search(new RegExp(search, 'i')) >= 0;
    });
  }, [videos, search]);
  
  // Filter videos by selected folder
  const displayVideos = useMemo(() => {
    if (!filteredVideos || filteredVideos.length === 0) {
      return [];
    }
    
    if (selectedFolder.value === 'All Videos') {
      return filteredVideos;
    } else if (selectedFolder.value.startsWith('🎮 ')) {
      return filteredVideos.filter((v) => v.game === selectedFolder.value.substring(3));
    } else if (gameParam) {
      return filteredVideos.filter((v) => v.game === selectedFolder.value);
    } else {
      return filteredVideos.filter((v) => {
        return v.path
          .split('/')
          .slice(0, -1)
          .filter((f) => f !== '')[0] === selectedFolder.value;
      });
    }
  }, [selectedFolder, filteredVideos, gameParam]);
  
  // Determine if loading state should be suppressed (prevents flash during navigation)
  const suppressLoadingState = hadVideos;
  
  return {
    // State
    displayVideos,
    isLoading: suppressLoadingState ? false : (isLoading || queryLoading),
    isFetching,
    error: error,
    folders,
    selectedFolder,
    selectedSort,
    isEmpty: displayVideos.length === 0 && !hadVideos,
    
    // Handlers
    onFolderSelection: handleFolderSelection,
    onSortSelection: handleSortSelection,
    refreshVideos: fetchVideos
  };
};

export default useVideoDisplay;