import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { Box, Grid, Stack, Typography } from '@mui/material'
import VideoCards from '../components/admin/VideoCards'
import VideoList from '../components/admin/VideoList'
import LoadingSpinner from '../components/misc/LoadingSpinner'
import { getSetting, setSetting } from '../common/utils'
import Select from 'react-select'
import SnackbarAlert from '../components/alert/SnackbarAlert'
import { useVideos as useVideosQuery } from '../services/VideoQueryHooks'
import { useVideos as useVideosContext } from '../contexts/VideoContext'
import { VideoListSkeleton } from '../components/utils/SkeletonLoader'
import { useLoadingState, useOptimisticUI } from '../hooks'

import selectFolderTheme from '../common/reactSelectFolderTheme'
import selectSortTheme from '../common/reactSelectSortTheme'
import { SORT_OPTIONS } from '../common/constants'

// Converting folders for select input
const createSelectFolders = (folders) => {
  return folders.map((f) => ({ value: f, label: f }))
}

// Session key for tracking if dashboard has shown videos before
const SESSION_KEY_DASHBOARD = 'route:dashboard:hasVideos'

const Dashboard = ({ authenticated, searchText, cardSize, listStyle }) => {
  // Get enhanced context with session tracking capabilities
  const videoContext = useVideosContext();
  
  // Local state
  const [selectedFolder, setSelectedFolder] = useState(
    getSetting('folder') || { value: 'All Videos', label: 'All Videos' },
  )
  const [selectedSort, setSelectedSort] = useState(getSetting('sortOption') || SORT_OPTIONS[0])
  const [alert, setAlert] = useState({ open: false })
  const [search, setSearch] = useState(searchText || '')
  
  // Use our custom loading state hook for consistent loading behavior with debouncing
  const [isLoading, setIsLoading, isFirstLoad] = useLoadingState({
    minDuration: 800,
    initialState: true,
    debounceToggles: true
  });
  
  // Use React Query for videos with placeholderData to prevent flash
  const { 
    data: videosResponse, 
    isLoading: queryLoading, 
    isFetching,
    isError, 
    error,
    refetch 
  } = useVideosQuery({ 
    sortOrder: selectedSort.value,
    // This options object is passed to the React Query hook
    options: {
      // Keep previous data while fetching to prevent flashing
      keepPreviousData: true,
      // No refetching on window focus to prevent flashes
      refetchOnWindowFocus: false
    }
  });
  
  // Update loading state when query state changes
  useEffect(() => {
    setIsLoading(queryLoading);
  }, [queryLoading, setIsLoading]);
  
  // Extract videos from response
  const videos = useMemo(() => {
    return videosResponse?.data?.videos || [];
  }, [videosResponse]);
  
  // Use optimistic UI hook to track if videos have been shown before
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
            
            {/* Main content area with improved loading states */}
            <Box>
              {/* Error state - only show when not loading */}
              {!isLoading && isError && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10, flexDirection: 'column', alignItems: 'center' }}>
                  <Typography variant="h6" color="error" sx={{ mb: 2 }}>
                    Error loading videos
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {error?.message || 'Please try again later'}
                  </Typography>
                </Box>
              )}
              
              {/* Always show skeletons during loading */}
              {isLoading && (
                <VideoListSkeleton 
                  count={6} 
                  columns={listStyle === 'card' ? 3 : 1} 
                />
              )}
              
              {/* After loading is complete, show appropriate content */}
              {!isLoading && !isError && (
                <>
                  {/* If we have videos, show them */}
                  {displayVideos.length > 0 ? (
                    <>
                      {/* Video display - list style */}
                      {listStyle === 'list' ? (
                        <VideoList
                          authenticated={authenticated}
                          loadingIcon={isFetching ? <LoadingSpinner size={20} /> : null}
                          videos={displayVideos}
                        />
                      ) : (
                        /* Video display - card style */
                        <VideoCards
                          authenticated={authenticated}
                          loadingIcon={isFetching ? <LoadingSpinner size={20} /> : null}
                          size={cardSize}
                          showUploadCard={selectedFolder.value === 'All Videos'}
                          fetchVideos={fetchVideos}
                          videos={displayVideos}
                        />
                      )}
                    </>
                  ) : (
                    /* Show empty state if no videos */
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10, flexDirection: 'column', alignItems: 'center' }}>
                      <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                        No videos found
                      </Typography>
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
};

export default React.memo(Dashboard)
