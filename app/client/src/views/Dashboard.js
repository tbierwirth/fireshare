import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { Box, Grid, Stack, Typography, Button } from '@mui/material'
import VideoCards from '../components/admin/VideoCards'
import VideoList from '../components/admin/VideoList'
import LoadingSpinner from '../components/misc/LoadingSpinner'
import UploadButton from '../components/misc/UploadButton'
import { getSetting, setSetting } from '../common/utils'
import Select from 'react-select'
import SnackbarAlert from '../components/alert/SnackbarAlert'
import { useVideos as useVideosQuery, useVideoCache } from '../services/VideoQueryHooks'
// VideoContext removed - using direct React Query hooks
// eslint-disable-next-line no-unused-vars
import { VideoListSkeleton } from '../components/utils/SkeletonLoader'
import { useOptimisticUI } from '../hooks'
import { logger } from '../common/logger'

import selectFolderTheme from '../common/reactSelectFolderTheme'
import selectSortTheme from '../common/reactSelectSortTheme'
import { SORT_OPTIONS } from '../common/constants'

// Converting folders for select input
const createSelectFolders = (folders) => {
  return folders.map((f) => ({ value: f, label: f }))
}

// Session key for tracking if dashboard has shown videos before
const SESSION_KEY_DASHBOARD = 'route:dashboard:hasVideos'

// Dashboard component - will be memoized using React.memo at export
const Dashboard = ({ authenticated = false, searchText, cardSize, listStyle, user }) => {
  // This component is explicitly for showing user's own videos (aka "My Videos")
  // Default authenticate to false to prevent API calls when not set
  
  // CRITICAL: Log props received by Dashboard - this helps us debug prop passing
  useEffect(() => {
    logger.info('Dashboard', `Dashboard received props: cardSize=${cardSize}, listStyle=${listStyle}`);
    
    // Update CSS variable in document root - this is critical for slider to work
    if (cardSize) {
      document.documentElement.style.setProperty('--card-size', `${cardSize}px`);
      logger.info('Dashboard', `Updated CSS variable --card-size to ${cardSize}px`);
    }
  }, [cardSize, listStyle]);
  
  // Direct React Query hook usage (VideoContext removed)
  const { refreshVideos } = useVideoCache();
  
  // Direct use of props is simpler and more maintainable
  
  // Local state
  const [selectedFolder, setSelectedFolder] = useState(
    getSetting('folder') || { value: 'All Videos', label: 'All Videos' },
  )
  const [selectedSort, setSelectedSort] = useState(getSetting('sortOption') || SORT_OPTIONS[0])
  const [alert, setAlert] = useState({ open: false })
  const [search, setSearch] = useState(searchText || '')
  
  // CRITICAL FIX: Force loading to false to ensure content always shows
  const [isLoading, setIsLoading] = useState(false);
  
  // Use React Query for my videos with enhanced debugging
  const { 
    data: videosResponse, 
    isLoading: queryLoading, 
    isFetching,
    isError, 
    error,
    refetch 
  } = useVideosQuery({ // This uses the /api/videos/my endpoint for authenticated user's videos
    sortOrder: selectedSort.value,
    // CRITICAL FIX: Pass authentication status to prevent API calls when not authenticated
    isAuthenticated: authenticated,
    // This options object is passed to the React Query hook
    options: {
      // Keep previous data while fetching to prevent flashing
      keepPreviousData: true,
      // Don't refetch on window focus to reduce API calls
      refetchOnWindowFocus: false,
      // Don't auto-refetch periodically
      refetchInterval: false,
      // Only refetch on mount if query cache is empty
      refetchOnMount: "if-empty",
      // Keep data fresh longer to reduce fetches
      staleTime: 60000, // 1 minute
      // Reduce retries
      retry: 1,
      retryDelay: 1000, // 1 second between retries
      onSuccess: (data) => {
        // We now rely on React Query to manage data state correctly
        const videos = data?.data?.videos || [];
        if (videos.length > 0) {
          // Store success in session for optimistic UI
          sessionStorage.setItem(SESSION_KEY_DASHBOARD, 'true');
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
  
  // CRITICAL FIX: Never set loading to true to ensure content is always rendered
  useEffect(() => {
    // Force loading to false regardless of query state
    setIsLoading(false);
  }, [queryLoading, isFetching, videosResponse, setIsLoading]);
  
  // Initial fetch reference to prevent duplicate fetches
  const initialFetchRef = React.useRef(false);
  
  // Perform a single fetch when the component mounts
  useEffect(() => {
    // Force fetch regardless of authenticated state - the API handles auth check
    // This addresses issues with auth state not being properly detected
    if (!initialFetchRef.current) {
      initialFetchRef.current = true;
      
      // DISABLED: Fetch logging
      /*
      if (process.env.NODE_ENV === 'development') {
        console.log('Dashboard performing fetch of user videos, auth status:', authenticated);
      }
      */
      
      // Always attempt to fetch videos - the API will return empty if not authenticated
      refetch().catch(err => {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching videos:', err);
        }
        setAlert({
          open: true,
          type: 'error',
          message: 'Failed to load videos'
        });
      });
    }
  }, [refetch, authenticated, setAlert]);
  
  // CRITICAL: Always ensure isLoading is false
  useEffect(() => {
    // Force loading state to false no matter what
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 200);
    
    return () => clearTimeout(timer);
  }, [setIsLoading]);
  
  // Extract videos from response
  const videos = useMemo(() => {
    // Handle different response formats
    if (videosResponse?.data?.videos) {
      return videosResponse.data.videos;
    } else if (Array.isArray(videosResponse?.data)) {
      return videosResponse.data;
    } else if (Array.isArray(videosResponse)) {
      return videosResponse;
    }
    
    // Default case - return empty array
    return [];
  }, [videosResponse]);
  
  // Use optimistic UI hook to track if videos have been shown before
  // eslint-disable-next-line no-unused-vars
  const hadVideos = useOptimisticUI({
    key: SESSION_KEY_DASHBOARD,
    data: videos,
    condition: (data) => Array.isArray(data) && data.length > 0
  });
  
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
  
  // Process folders from videos
  const folders = useMemo(() => {
    if (!videos || videos.length === 0) {
      return ['All Videos'];
    }
    
    const tfolders = [];
    const gameSet = new Set();
    
    // Extract folder info from videos
    videos.forEach((v) => {
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
  }, [videos]);
  
  // Function to refresh videos
  const fetchVideos = useCallback(() => {
    // Log only in development
    if (process.env.NODE_ENV === 'development') {
      console.log("Manual refresh of user videos triggered");
    }
    
    // Use our refreshVideos function that handles all caching
    refreshVideos();
    
    // Also directly refetch the specific query
    refetch();
  }, [refreshVideos, refetch]);
  
  // Handle folder selection
  const handleFolderSelection = useCallback((folder) => {
    // Skip if separator is clicked
    if (folder.value === '--- Games ---') {
      return;
    }
    
    setSetting('folder', folder)
    setSelectedFolder(folder)
  }, []);
  
  // Handle sort selection
  const handleSortSelection = useCallback((sortOption) => {
    setSetting('sortOption', sortOption)
    setSelectedSort(sortOption)
    // The query will automatically refetch with the new sort parameter
  }, []);
  
  // Filter videos by search text
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
  
  // Filter videos by folder
  const displayVideos = useMemo(() => {
    if (!filteredVideos || filteredVideos.length === 0) {
      return [];
    }
    
    if (selectedFolder.value === 'All Videos') {
      return filteredVideos;
    } else if (selectedFolder.value.startsWith('🎮 ')) {
      return filteredVideos.filter((v) => v.game === selectedFolder.value.substring(3));
    } else {
      // Path-based filtering
      return filteredVideos.filter((v) => {
        return v.path
          .split('/')
          .slice(0, -1)
          .filter((f) => f !== '')[0] === selectedFolder.value;
      });
    }
  }, [selectedFolder, filteredVideos]);
  
  return (
    <>
      <SnackbarAlert severity={alert.type} open={alert.open} setOpen={(open) => setAlert({ ...alert, open })}>
        {alert.message}
      </SnackbarAlert>
      
      <Box sx={{ height: '100%' }}>
        <Grid container item justifyContent="center">
          <Grid item xs={12}>
            {/* Always show the filters/sort options - just disable them when loading */}
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
                      isDisabled={isLoading}
                    />
                  </Box>
                  <Select
                    value={selectedSort}
                    options={SORT_OPTIONS}
                    onChange={handleSortSelection}
                    styles={selectSortTheme}
                    blurInputOnSelect
                    isSearchable={false}
                    isDisabled={isLoading}
                  />
                </Stack>
              </Grid>
            </Grid>
            
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
              
              {/* Always show upload button on My Videos page */}
              <UploadButton onSuccess={(result) => {
                if (result) {
                  setAlert({
                    type: result.type,
                    message: result.message,
                    open: true
                  });
                  // Refresh videos after successful upload
                  if (result.type === 'success') {
                    // Make sure to refresh all video caches
                    refreshVideos();
                    // Also refresh the current component
                    fetchVideos();
                  }
                }
              }} />
            </Box>
            
            {/* Main content area with improved loading states */}
            <Box>
              {/* CRITICAL FIX: Always render videos regardless of loading state */}
              
              {/* Error state */}
              {isError && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10, flexDirection: 'column', alignItems: 'center' }}>
                  <Typography variant="h6" color="error" sx={{ mb: 2 }}>
                    Error loading videos
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {error?.message || 'Please try again later'}
                  </Typography>
                </Box>
              )}
              
              {/* Never show skeletons - this prevents the placeholder issue */}
              
              {/* ALWAYS try to show videos if we have them */}
              {!isError && (
                <>
                  {/* Always try to show videos if available */}
                  {displayVideos && displayVideos.length > 0 ? (
                    <>
                      {/* Video display - list style */}
                      {listStyle === 'list' ? (
                        <VideoList
                          authenticated={authenticated}
                          loadingIcon={isFetching ? <LoadingSpinner size={20} /> : null}
                          videos={displayVideos}
                        />
                      ) : (
                        // Video display - card style
                        <VideoCards
                          authenticated={authenticated}
                          loadingIcon={isFetching ? <LoadingSpinner size={20} /> : null}
                          size={cardSize} 
                          fetchVideos={fetchVideos}
                          videos={displayVideos}
                          // Only change key when videos change, not when cardSize changes
                          key={`videocards-${displayVideos.length}`}
                        />
                      )}
                    </>
                  ) : (
                    /* Show empty state if no videos */
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10, flexDirection: 'column', alignItems: 'center' }}>
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
                  )}
                </>
              )}
            </Box>
          </Grid>
        </Grid>
      </Box>
    </>
  );
}

// Custom comparison function for React.memo 
const dashboardPropsAreEqual = (prevProps, nextProps) => {
  // Always re-render when these change
  if (prevProps.authenticated !== nextProps.authenticated) return false;
  if (prevProps.searchText !== nextProps.searchText) return false;
  if (prevProps.listStyle !== nextProps.listStyle) return false;
  
  // Card size changes are handled via direct DOM manipulation
  // so we don't need to re-render the whole component
  return true;
};

export default React.memo(Dashboard, dashboardPropsAreEqual);
