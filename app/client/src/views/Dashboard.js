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


import { VideoListSkeleton } from '../components/utils/SkeletonLoader'
import { useOptimisticUI } from '../hooks'
import { logger } from '../common/logger'

import selectFolderTheme from '../common/reactSelectFolderTheme'
import selectSortTheme from '../common/reactSelectSortTheme'
import { SORT_OPTIONS } from '../common/constants'


const createSelectFolders = (folders) => {
  return folders.map((f) => ({ value: f, label: f }))
}


const SESSION_KEY_DASHBOARD = 'route:dashboard:hasVideos'


const Dashboard = ({ authenticated = false, searchText, cardSize, listStyle, user }) => {
  
  
  
  
  useEffect(() => {
    logger.info('Dashboard', `Dashboard received props: cardSize=${cardSize}, listStyle=${listStyle}`);
    
    
    if (cardSize) {
      document.documentElement.style.setProperty('--card-size', `${cardSize}px`);
      logger.info('Dashboard', `Updated CSS variable --card-size to ${cardSize}px`);
    }
  }, [cardSize, listStyle]);
  
  
  const { refreshVideos } = useVideoCache();
  
  
  
  
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
    
    isAuthenticated: authenticated,
    
    options: {
      
      keepPreviousData: true,
      
      refetchOnWindowFocus: false,
      
      refetchInterval: false,
      
      refetchOnMount: "if-empty",
      
      staleTime: 60000, 
      
      retry: 1,
      retryDelay: 1000, 
      onSuccess: (data) => {
        
        const videos = data?.data?.videos || [];
        if (videos.length > 0) {
          
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
  
  
  useEffect(() => {
    
    setIsLoading(false);
  }, [queryLoading, isFetching, videosResponse, setIsLoading]);
  
  
  const initialFetchRef = React.useRef(false);
  
  
  useEffect(() => {
    
    
    if (!initialFetchRef.current) {
      initialFetchRef.current = true;
      
      
            
      
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
  
  
  useEffect(() => {
    
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 200);
    
    return () => clearTimeout(timer);
  }, [setIsLoading]);
  
  
  const videos = useMemo(() => {
    
    if (videosResponse?.data?.videos) {
      return videosResponse.data.videos;
    } else if (Array.isArray(videosResponse?.data)) {
      return videosResponse.data;
    } else if (Array.isArray(videosResponse)) {
      return videosResponse;
    }
    
    
    return [];
  }, [videosResponse]);
  
  
  
  const hadVideos = useOptimisticUI({
    key: SESSION_KEY_DASHBOARD,
    data: videos,
    condition: (data) => Array.isArray(data) && data.length > 0
  });
  
  
  React.useEffect(() => {
    if (searchText !== search) {
      setSearch(searchText);
    }
  }, [searchText, search]);
  
  
  React.useEffect(() => {
    if (isError && error) {
      setAlert({
        open: true,
        type: 'error',
        message: error.message || 'Failed to load videos'
      });
    }
  }, [isError, error]);
  
  
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
  
  
  const fetchVideos = useCallback(() => {
    
    if (process.env.NODE_ENV === 'development') {
      console.log("Manual refresh of user videos triggered");
    }
    
    
    refreshVideos();
    
    
    refetch();
  }, [refreshVideos, refetch]);
  
  
  const handleFolderSelection = useCallback((folder) => {
    
    if (folder.value === '--- Games ---') {
      return;
    }
    
    setSetting('folder', folder)
    setSelectedFolder(folder)
  }, []);
  
  
  const handleSortSelection = useCallback((sortOption) => {
    setSetting('sortOption', sortOption)
    setSelectedSort(sortOption)
    
  }, []);
  
  
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
  
  
  const displayVideos = useMemo(() => {
    if (!filteredVideos || filteredVideos.length === 0) {
      return [];
    }
    
    if (selectedFolder.value === 'All Videos') {
      return filteredVideos;
    } else if (selectedFolder.value.startsWith('🎮 ')) {
      return filteredVideos.filter((v) => v.game === selectedFolder.value.substring(3));
    } else {
      
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
              
              {}
              <UploadButton onSuccess={(result) => {
                if (result) {
                  setAlert({
                    type: result.type,
                    message: result.message,
                    open: true
                  });
                  
                  if (result.type === 'success') {
                    
                    refreshVideos();
                    
                    fetchVideos();
                  }
                }
              }} />
            </Box>
            
            {}
            <Box>
              {}
              
              {}
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
              
              {}
              
              {}
              {!isError && (
                <>
                  {}
                  {displayVideos && displayVideos.length > 0 ? (
                    <>
                      {}
                      {listStyle === 'list' ? (
                        <VideoList
                          authenticated={authenticated}
                          loadingIcon={isFetching ? <LoadingSpinner size={20} /> : null}
                          videos={displayVideos}
                        />
                      ) : (
                        
                        <VideoCards
                          authenticated={authenticated}
                          loadingIcon={isFetching ? <LoadingSpinner size={20} /> : null}
                          size={cardSize} 
                          fetchVideos={fetchVideos}
                          videos={displayVideos}
                          
                          key={`videocards-${displayVideos.length}`}
                        />
                      )}
                    </>
                  ) : (
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


const dashboardPropsAreEqual = (prevProps, nextProps) => {
  
  if (prevProps.authenticated !== nextProps.authenticated) return false;
  if (prevProps.searchText !== nextProps.searchText) return false;
  if (prevProps.listStyle !== nextProps.listStyle) return false;
  
  
  
  return true;
};

export default React.memo(Dashboard, dashboardPropsAreEqual);
