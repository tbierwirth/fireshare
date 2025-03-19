import React, { useState, useMemo, useCallback } from 'react'
import { Box, Grid, Stack, Typography, Skeleton } from '@mui/material'
import VideoCards from '../components/admin/VideoCards'
import VideoList from '../components/admin/VideoList'
import LoadingSpinner from '../components/misc/LoadingSpinner'
import { getSetting, setSetting } from '../common/utils'
import Select from 'react-select'
import SnackbarAlert from '../components/alert/SnackbarAlert'
import { useVideos } from '../services/VideoQueryHooks'

import selectFolderTheme from '../common/reactSelectFolderTheme'
import selectSortTheme from '../common/reactSelectSortTheme'
import { SORT_OPTIONS } from '../common/constants'

// Converting folders for select input
const createSelectFolders = (folders) => {
  return folders.map((f) => ({ value: f, label: f }))
}

// Video list skeleton for loading state with fade-in animation
const VideoSkeletons = ({ count = 6, isCardStyle = true }) => {
  // Use state to control animation
  const [visible, setVisible] = React.useState(false);
  
  // Delay showing skeletons slightly to prevent flash on fast loads
  React.useEffect(() => {
    // Small delay before showing skeletons (50ms)
    const timer = setTimeout(() => {
      setVisible(true);
    }, 50);
    
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <Box
      sx={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 300ms ease-in-out',
        pt: 1
      }}
    >
      <Grid container spacing={2} sx={{ px: 2 }}>
        {Array.from(new Array(count)).map((_, index) => (
          <Grid item xs={12} md={isCardStyle ? 4 : 12} key={index}>
            <Skeleton 
              variant="rectangular" 
              width="100%" 
              height={isCardStyle ? 220 : 80} 
              animation="wave"
              sx={{ 
                bgcolor: 'rgba(255, 255, 255, 0.1)', 
                borderRadius: 1,
                mb: 1
              }} 
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}

const Dashboard = ({ authenticated, searchText, cardSize, listStyle }) => {
  // Local state
  const [selectedFolder, setSelectedFolder] = useState(
    getSetting('folder') || { value: 'All Videos', label: 'All Videos' },
  )
  const [selectedSort, setSelectedSort] = useState(getSetting('sortOption') || SORT_OPTIONS[0])
  const [alert, setAlert] = useState({ open: false })
  const [search, setSearch] = useState(searchText || '')
  
  // Add manual loading state for controlled loading experience
  // Always start in loading state for each page visit
  const [isManualLoading, setIsManualLoading] = React.useState(true);
  
  // Reset loading state on page mount
  React.useEffect(() => {
    // Set manual loading to true on component mount
    setIsManualLoading(true);
    // This ensures we always show loading state for at least 800ms on page reload/navigation
    
    // Cleanup when component unmounts
    return () => {
      setIsManualLoading(false);
    };
  }, []);
  
  // Use React Query for videos with placeholderData to prevent flash
  const { 
    data: videosResponse, 
    isLoading: queryLoading, 
    isFetching,
    isError, 
    error,
    refetch 
  } = useVideos({ 
    sortOrder: selectedSort.value,
    // This options object is passed to the React Query hook
    options: {
      // Keep previous data while fetching to prevent flashing
      keepPreviousData: true,
      // Show loading indicators only when fetching for the first time
      // This prevents loading flashes during refetches
      refetchOnWindowFocus: false
    }
  });
  
  // Ensure a minimum loading time to prevent flicker on refresh
  React.useEffect(() => {
    // If we're doing initial loading
    if (queryLoading) {
      // Ensure minimum loading duration of 800ms to prevent flashes
      const timer = setTimeout(() => {
        setIsManualLoading(false);
      }, 800);
      
      return () => clearTimeout(timer);
    } else {
      setIsManualLoading(false);
    }
  }, [queryLoading]);
  
  // Combine manual and query loading states
  const isLoading = queryLoading || isManualLoading;
  
  // Extract videos from response
  const videos = useMemo(() => {
    return videosResponse?.data?.videos || [];
  }, [videosResponse]);
  
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
    refetch();
  }, [refetch]);
  
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
            
            {/* Main content area */}
            <Box>
              {/* Always show skeletons during any loading state to prevent "No Videos" flash */}
              {(isLoading || isManualLoading) && (
                <VideoSkeletons count={6} isCardStyle={listStyle === 'card'} />
              )}
              
              {/* Error state - only show when not loading */}
              {!isLoading && !isManualLoading && isError && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10, flexDirection: 'column', alignItems: 'center' }}>
                  <Typography variant="h6" color="error" sx={{ mb: 2 }}>
                    Error loading videos
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {error?.message || 'Please try again later'}
                  </Typography>
                </Box>
              )}
              
              {/* Empty state - only show when definitely not loading and have no videos */}
              {!isLoading && !isManualLoading && !isError && videos.length === 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10, flexDirection: 'column', alignItems: 'center' }}>
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                    No videos found
                  </Typography>
                </Box>
              )}
              
              {/* Video display - list style */}
              {listStyle === 'list' && displayVideos.length > 0 && (
                <VideoList
                  authenticated={authenticated}
                  loadingIcon={isFetching ? <LoadingSpinner size={20} /> : null}
                  videos={displayVideos}
                />
              )}
              
              {/* Video display - card style */}
              {listStyle === 'card' && displayVideos.length > 0 && (
                <VideoCards
                  authenticated={authenticated}
                  loadingIcon={isFetching ? <LoadingSpinner size={20} /> : null}
                  size={cardSize}
                  showUploadCard={selectedFolder.value === 'All Videos'}
                  fetchVideos={fetchVideos}
                  videos={displayVideos}
                />
              )}
            </Box>
          </Grid>
        </Grid>
      </Box>
    </>
  );
};

export default React.memo(Dashboard)
