import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { Box, Grid, Stack, Typography, Button } from '@mui/material'
import { useLocation } from 'react-router-dom'
import Select from 'react-select'
import VideoCards from '../components/admin/VideoCards'
import VideoList from '../components/admin/VideoList'
import LoadingSpinner from '../components/misc/LoadingSpinner'
import UploadButton from '../components/misc/UploadButton'
import SnackbarAlert from '../components/alert/SnackbarAlert'
import { getSetting, setSetting } from '../common/utils'
import { usePublicVideos, useVideoCache } from '../services/VideoQueryHooks'
import { useLoadingState, useOptimisticUI } from '../hooks'
import selectFolderTheme from '../common/reactSelectFolderTheme'
import selectSortTheme from '../common/reactSelectSortTheme'
import { SORT_OPTIONS } from '../common/constants'

// Converting folders for select input
const createSelectFolders = (folders) => {
  return folders.map((f) => ({ value: f, label: f }))
}

// Parse URL query parameters
function useQuery() {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search), [search])
}

// Session key for tracking if this route has shown videos before
const SESSION_KEY_FEED = 'route:feed:hasVideos'

// Feed component - ONLY shows public videos (for all users)
const Feed = ({ authenticated, searchText, cardSize, listStyle, user }) => {
  // DEBUG: Log when Feed receives new props
  React.useEffect(() => {
    console.log(`[FEED DEBUG] Feed component received props: cardSize=${cardSize}, listStyle=${listStyle}`);
    
    // Update CSS variable in document root - this is critical for slider to work
    if (cardSize) {
      document.documentElement.style.setProperty('--card-size', `${cardSize}px`);
    }
  }, [cardSize, listStyle]);
  // Feed component is for public videos only
  
  // Parse query parameters
  const query = useQuery()
  const category = query.get('category')
  const gameParam = query.get('game')
  
  // Direct React Query hook usage (VideoContext removed)
  const { refreshVideos } = useVideoCache();
  
  // No need to track card size internally - use prop directly
  
  // Local state
  const [selectedFolder, setSelectedFolder] = useState(
    category
      ? { value: category, label: category }
      : gameParam 
        ? { value: gameParam, label: gameParam }
        : getSetting('folder') || { value: 'All Videos', label: 'All Videos' },
  );
  const [selectedSort, setSelectedSort] = useState(getSetting('sortOption') || SORT_OPTIONS[0]);
  const [alert, setAlert] = useState({ open: false });
  const [search, setSearch] = useState(searchText || '');
  
  // This is now handled by the useOptimisticUI hook
  
  // Use our custom loading state hook for consistent loading behavior with debouncing
  // eslint-disable-next-line no-unused-vars
  const [isLoading, setIsLoading] = useLoadingState({
    minDuration: 800,
    initialState: true,
    debounceToggles: true
  });
  
  // Feed always uses public videos endpoint
  const { 
    data: videosResponse, 
    // eslint-disable-next-line no-unused-vars
    isLoading: queryLoading, 
    isFetching,
    isError, 
    error,
    refetch 
  } = usePublicVideos({ 
    sortOrder: selectedSort.value, 
    game: gameParam,
    // This options object is passed to the React Query hook
    options: {
      // Keep previous data while fetching to prevent flashing
      keepPreviousData: true,
      // Enable refetches on window focus to automatically update content
      refetchOnWindowFocus: true,
      // Also refresh when tab becomes visible
      refetchOnMount: true,
      // Add a shorter stale time to ensure data refreshes frequently
      staleTime: 60000, // 1 minute
      // CRITICAL: Prevent refetches when only cardSize changes
      // This prevents unnecessary API calls during slider adjustments
      onlyRefetchOnMountIfStale: true,
      // Handle success and errors properly
      onSuccess: (data) => {
        // We now rely on React Query to manage data state correctly
        const videos = data?.data?.videos || [];
        if (videos.length > 0) {
          // Store success in session for optimistic UI
          sessionStorage.setItem(SESSION_KEY_FEED, 'true');
        }
      },
      onError: (err) => {
        setAlert({
          open: true,
          type: 'error',
          message: err?.message || 'Failed to load videos'
        });
      }
    }
  });
  
  // Extract videos from response
  const publicVideos = useMemo(() => {
    return videosResponse?.data?.videos || [];
  }, [videosResponse]);
  
  // CRITICAL FIX: More aggressive approach to loading state
  useEffect(() => {
    // If we have a videosResponse or publicVideos, force loading to false
    if (videosResponse || publicVideos.length > 0) {
      setIsLoading(false);
    }
    
    // Also set a timer to ensure loading is forced to false even if something else sets it
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [setIsLoading, videosResponse, publicVideos]);
  
  // Use optimistic UI hook to track previous content state
  const hadPreviousContent = useOptimisticUI({
    key: SESSION_KEY_FEED,
    data: publicVideos,
    condition: (data) => Array.isArray(data) && data.length > 0
  });
  
  // Process folders from videos
  const folders = useMemo(() => {
    if (!publicVideos || publicVideos.length === 0) {
      return ['All Videos'];
    }
    
    const tfolders = [];
    const gameSet = new Set();
    
    // Extract folder info from videos
    publicVideos.forEach((v) => {
      // Path folders
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
    
    // Add games section
    if (gameSet.size > 0) {
      tfolders.push('--- Games ---');
      const gameArray = Array.from(gameSet);
      gameArray.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
      gameArray.forEach(game => {
        tfolders.push(`🎮 ${game}`);
      });
    }
    
    return tfolders;
  }, [publicVideos]);
  
  // Update search when prop changes
  React.useEffect(() => {
    if (searchText !== search) {
      setSearch(searchText);
    }
  }, [searchText, search]);
  
  // Handle error alerts
  React.useEffect(() => {
    if (isError && error) {
      setAlert({
        open: true,
        type: 'error',
        message: error.message || 'Failed to load videos'
      });
    }
  }, [isError, error]);
  
  // Handle folder selection
  const handleFolderSelection = (folder) => {
    if (folder.value === '--- Games ---') {
      return;
    }
    
    setSetting('folder', folder);
    setSelectedFolder(folder);
    
    if ('URLSearchParams' in window) {
      const searchParams = new URLSearchParams('');
      
      if (folder.value.startsWith('🎮 ')) {
        const gameName = folder.value.substring(3);
        searchParams.set('game', gameName);
        window.history.replaceState(
          { game: gameName }, 
          '', 
          `/#/feed?${searchParams.toString()}`
        );
      } else if (folder.value !== '--- Games ---') {
        searchParams.set('category', folder.value);
        window.history.replaceState(
          { category: folder.value }, 
          '', 
          `/#/feed?${searchParams.toString()}`
        );
      }
    }
  };
  
  // Handle sort selection
  const handleSortSelection = (sortOption) => {
    setSetting('sortOption', sortOption);
    setSelectedSort(sortOption);
    // Refetch with new sort order
    refetch();
  };
  
  // Refresh videos with React Query directly
  const fetchVideos = useCallback(() => {
    // Use our refreshVideos function that handles all caching
    refreshVideos();
    
    // Also directly refetch the specific query for public videos
    refetch();
    
    // Force isLoading to false after a short delay 
    setTimeout(() => {
      setIsLoading(false);
    }, 800);
  }, [refreshVideos, refetch, setIsLoading]);
  
  // Filter videos by search text
  const filteredVideos = useMemo(() => {
    if (!publicVideos || publicVideos.length === 0) {
      return [];
    }
    
    if (!search) {
      return publicVideos;
    }
    
    return publicVideos.filter((v) => {
      return v.info && v.info.title && v.info.title.search(new RegExp(search, 'i')) >= 0;
    });
  }, [publicVideos, search]);
  
  // Filter videos by folder
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
      // Path-based filtering
      return filteredVideos.filter((v) => {
        return v.path
          .split('/')
          .slice(0, -1)
          .filter((f) => f !== '')[0] === selectedFolder.value;
      });
    }
  }, [selectedFolder, filteredVideos, gameParam]);
  
  return (
    <>
      <SnackbarAlert severity={alert.type} open={alert.open} setOpen={(open) => setAlert({ ...alert, open })}>
        {alert.message}
      </SnackbarAlert>
      
      <Box sx={{ height: '100%' }}>
        <Grid container item justifyContent="center">
          <Grid item xs={12}>
            <Grid container justifyContent="center">
              <Grid item xs={11} sm={9} md={7} lg={5} sx={{ mb: 3 }}>
                <Stack direction="row" spacing={1}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Select
                      value={selectedFolder}
                      options={createSelectFolders(folders)}
                      onChange={handleFolderSelection}
                      styles={selectFolderTheme}
                      blurInputOnSelect
                      isSearchable={false}
                      isDisabled={false} // Force to always be enabled
                    />
                  </Box>
                  <Select
                    value={selectedSort}
                    options={SORT_OPTIONS}
                    onChange={handleSortSelection}
                    styles={selectSortTheme}
                    blurInputOnSelect
                    isSearchable={false}
                    isDisabled={false} // Force to always be enabled
                  />
                </Stack>
              </Grid>
            </Grid>
            
            {/* Main content area with improved loading states */}
            <Box>
              {/* Error state - only show when not loading */}
              {!false && isError && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10, flexDirection: 'column', alignItems: 'center' }}>
                  <Typography variant="h6" color="error" sx={{ mb: 2 }}>
                    Error loading videos
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {error?.message || 'Please try again later'}
                  </Typography>
                </Box>
              )}
              
              {/* Upload and refresh buttons */}
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center', gap: 2 }}>
                <Button 
                  variant="outlined"
                  onClick={fetchVideos}
                  disabled={isFetching}
                  color="primary"
                >
                  {isFetching ? "Refreshing..." : "Refresh Videos"}
                </Button>
                
                {/* Only show upload button if user is authenticated */}
                {authenticated && (
                  <UploadButton onSuccess={(result) => {
                    if (result) {
                      setAlert({
                        type: result.type,
                        message: result.message,
                        open: true
                      });
                      // Refresh videos after successful upload
                      if (result.type === 'success') {
                        // Force invalidate the cache and refetch all videos
                        fetchVideos();
                        // Also directly call refreshVideos to ensure all caches are updated
                        refreshVideos();
                      }
                    }
                  }} />
                )}
              </Box>
              
              {/* No skeletons are used now */}
              
              {/* Main content will render below */}
              
              {/* Main content container with consistent height to prevent layout shifts */}
              <Box sx={{ 
                minHeight: '400px', 
                position: 'relative', 
                transition: 'opacity 0.3s ease'
              }}>
                {/* Always render videos if they exist, regardless of loading state */}
                {(displayVideos && displayVideos.length > 0) ? (
                  <Box sx={{ 
                    animation: 'fadeIn 0.5s ease-in-out',
                    '@keyframes fadeIn': {
                      '0%': { opacity: 0 },
                      '100%': { opacity: 1 }
                    }
                  }}>
                    {listStyle === 'list' ? (
                      <VideoList
                        authenticated={authenticated}
                        loadingIcon={isFetching ? <LoadingSpinner size={20} /> : null}
                        feedView
                        videos={displayVideos}
                      />
                    ) : (
                      <VideoCards
                        authenticated={authenticated}
                        loadingIcon={isFetching ? <LoadingSpinner size={20} /> : null}
                        feedView={true}
                        size={cardSize}
                        fetchVideos={fetchVideos}
                        videos={displayVideos}
                        // Only change key when videos length changes, not on card size change
                        key={`videocards-${displayVideos.length}`}
                      />
                    )}
                  </Box>
                ) : (
                  /* Show loading spinner while fetching initial data */
                  isFetching && !hadPreviousContent ? (
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      height: '400px'
                    }}>
                      <LoadingSpinner size={40} />
                    </Box>
                  ) : (
                    /* Only show empty state if we're sure there are no videos */
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      mt: 10, 
                      flexDirection: 'column', 
                      alignItems: 'center',
                      opacity: 1,
                      animation: 'fadeIn 0.5s ease-in-out',
                      '@keyframes fadeIn': {
                        '0%': { opacity: 0 },
                        '100%': { opacity: 1 }
                      }
                    }}>
                      <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                        No videos found
                      </Typography>
                      <Button 
                        variant="contained" 
                        color="primary"
                        onClick={fetchVideos}
                        sx={{ mt: 2 }}
                      >
                        Refresh Videos
                      </Button>
                    </Box>
                  )
                )}
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </>
  );
}

// Custom comparison function for React.memo 
// Only re-render when props we care about have changed
function feedPropsAreEqual(prevProps, nextProps) {
  // Always re-render when these change
  if (prevProps.authenticated !== nextProps.authenticated) return false;
  if (prevProps.searchText !== nextProps.searchText) return false;
  if (prevProps.listStyle !== nextProps.listStyle) return false;
  
  // Card size changes are handled via direct DOM manipulation
  // so we don't need to re-render the whole component
  // return true;
  
  return true;
}

export default React.memo(Feed, feedPropsAreEqual);