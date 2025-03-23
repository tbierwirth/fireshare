import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { Box, Grid, Stack, Typography, Button } from '@mui/material'
import { useLocation } from 'react-router-dom'
import Select from 'react-select'
import { useQueryClient } from '@tanstack/react-query'
import VideoCards from '../components/admin/VideoCards'
import VideoList from '../components/admin/VideoList'
import LoadingSpinner from '../components/misc/LoadingSpinner'
import UploadButton from '../components/misc/UploadButton'
import ProcessingVideoCard from '../components/admin/ProcessingVideoCard'
import SnackbarAlert from '../components/alert/SnackbarAlert'
import { getSetting, setSetting } from '../common/utils'
import { usePublicVideos, useVideoCache } from '../services/VideoQueryHooks'
import { useLoadingState, useOptimisticUI } from '../hooks'
import selectFolderTheme from '../common/reactSelectFolderTheme'
import selectSortTheme from '../common/reactSelectSortTheme'
import { SORT_OPTIONS } from '../common/constants'


const createSelectFolders = (folders) => {
  return folders.map((f) => ({ value: f, label: f }))
}


function useQuery() {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search), [search])
}


const SESSION_KEY_FEED = 'route:feed:hasVideos'


const Feed = ({ authenticated, searchText, cardSize, listStyle, user }) => {
  const queryClient = useQueryClient();
  
  React.useEffect(() => {
    console.log(`[FEED DEBUG] Feed component received props: cardSize=${cardSize}, listStyle=${listStyle}`);
    
    
    if (cardSize) {
      document.documentElement.style.setProperty('--card-size', `${cardSize}px`);
    }
  }, [cardSize, listStyle]);
  
  
  
  const query = useQuery()
  const category = query.get('category')
  const gameParam = query.get('game')
  
  
  const { refreshVideos } = useVideoCache();
  
  
  
  
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
  
  // State for videos that are currently being processed
  const [processingVideos, setProcessingVideos] = useState([]);
  
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
  
  // Handler for when processing is complete
  const handleProcessingComplete = useCallback((videoId) => {
    // Remove the video from processing videos
    setProcessingVideos(prev => prev.filter(v => v.videoId !== videoId));
    
    // Refetch videos to get the processed video
    queryClient.refetchQueries({ queryKey: ['publicVideos'] });
  }, [queryClient]);
  
  const publicVideos = useMemo(() => {
    return videosResponse?.data?.videos || [];
  }, [videosResponse]);
  
  
  useEffect(() => {
    
    if (videosResponse || publicVideos.length > 0) {
      setIsLoading(false);
    }
    
    
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [setIsLoading, videosResponse, publicVideos]);
  
  
  const hadPreviousContent = useOptimisticUI({
    key: SESSION_KEY_FEED,
    data: publicVideos,
    condition: (data) => Array.isArray(data) && data.length > 0
  });
  
  
  const folders = useMemo(() => {
    if (!publicVideos || publicVideos.length === 0) {
      return ['All Videos'];
    }
    
    const tfolders = [];
    const gameSet = new Set();
    
    
    publicVideos.forEach((v) => {
      
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
  }, [publicVideos]);
  
  
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
    
    refetch();
  };
  
  
  const fetchVideos = useCallback(() => {
    
    refreshVideos();
    
    
    refetch();
    
    
    setTimeout(() => {
      setIsLoading(false);
    }, 800);
  }, [refreshVideos, refetch, setIsLoading]);
  
  
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
              
              {}
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
                {authenticated && (
                  <UploadButton onSuccess={(result) => {
                    if (result) {
                      setAlert({
                        type: result.type,
                        message: result.message,
                        open: true
                      });
                      
                      if (result.type === 'success') {
                        // Always refresh the video list when successful
                        refreshVideos();
                        
                        // If a video has started processing, add it to the state for a placeholder card
                        if (result.processingStarted && result.jobId && result.videoId) {
                          // Add a processing video to the local state
                          // This will show immediately while the video is being processed
                          setProcessingVideos(prev => [
                            ...prev, 
                            {
                              jobId: result.jobId,
                              videoId: result.videoId,
                              title: result.videoTitle || 'New Video',
                              timestamp: new Date().getTime()
                            }
                          ]);
                        } else {
                          // Traditional full refresh if not a processing video
                          fetchVideos();
                        }
                      }
                    }
                  }} />
                )}
              </Box>
              
              {}
              
              {}
              
              {}
              <Box sx={{ 
                minHeight: '400px', 
                position: 'relative', 
                transition: 'opacity 0.3s ease'
              }}>
                {}
                {(displayVideos && displayVideos.length > 0) || processingVideos.length > 0 ? (
                  <Box sx={{ 
                    animation: 'fadeIn 0.5s ease-in-out',
                    '@keyframes fadeIn': {
                      '0%': { opacity: 0 },
                      '100%': { opacity: 1 }
                    }
                  }}>
                    {listStyle === 'list' ? (
                      <>
                        <VideoList
                          authenticated={authenticated}
                          loadingIcon={isFetching ? <LoadingSpinner size={20} /> : null}
                          feedView
                          videos={displayVideos}
                        />
                        {/* Processing videos not shown in list view */}
                      </>
                    ) : (
                      <>
                        {/* Display actual videos */}
                        <VideoCards
                          authenticated={authenticated}
                          loadingIcon={isFetching ? <LoadingSpinner size={20} /> : null}
                          feedView={true}
                          size={cardSize}
                          fetchVideos={fetchVideos}
                          videos={displayVideos}
                          key={`videocards-${displayVideos.length}`}
                        />
                        
                        {/* Display processing videos grid */}
                        {processingVideos.length > 0 && (
                          <Box 
                            className="video-grid"
                            sx={{ 
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                              gap: 2,
                              mt: 2
                            }}
                          >
                            {processingVideos.map(processingVideo => (
                              <Box 
                                key={`processing-${processingVideo.videoId}`} 
                                className="video-card-container"
                                sx={{
                                  width: '100%',
                                  animation: 'fadeInCard 0.4s ease-out forwards',
                                  '@keyframes fadeInCard': {
                                    '0%': { opacity: 0, transform: 'translateY(8px)' },
                                    '100%': { opacity: 1, transform: 'translateY(0)' }
                                  },
                                  outline: '1px solid rgba(255,255,255,0.1)',
                                }}
                              >
                                <ProcessingVideoCard
                                  jobId={processingVideo.jobId}
                                  videoId={processingVideo.videoId}
                                  title={processingVideo.title}
                                  onProcessingComplete={handleProcessingComplete}
                                />
                              </Box>
                            ))}
                          </Box>
                        )}
                      </>
                    )}
                  </Box>
                ) : (
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



function feedPropsAreEqual(prevProps, nextProps) {
  
  if (prevProps.authenticated !== nextProps.authenticated) return false;
  if (prevProps.searchText !== nextProps.searchText) return false;
  if (prevProps.listStyle !== nextProps.listStyle) return false;
  
  
  
  
  
  return true;
}

export default React.memo(Feed, feedPropsAreEqual);