import React, { useEffect, memo } from 'react';
import { Box, Typography, Button } from '@mui/material';
import VideoCards from './VideoCards';
import VideoList from './VideoList';
import ProcessingVideoCard from './ProcessingVideoCard';
import LoadingSpinner from '../misc/LoadingSpinner';
import { VideoListSkeleton, StableHeightContainer } from './SkeletonLoader';
import { logger } from '../../common/logger';

const VideoGrid = ({
  videos = [],
  processingVideos = [],
  authenticated = false,
  isFetching = false,
  isLoading = false,
  isEmpty = false,
  error = null,
  cardSize = 300,
  listStyle = 'grid',
  feedView = false,
  fetchVideos,
  onProcessingComplete
}) => {
  // Always define all hooks at the top level, never conditionally
  const loadingTimeoutRef = React.useRef(null);
  
  // Check session storage for previously loaded videos on this route
  const hadPreviousVideos = React.useMemo(() => {
    return !!(
      sessionStorage.getItem('route:feed:hasVideos') || 
      sessionStorage.getItem('route:dashboard:hasVideos')
    );
  }, []);
  
  // Initialize stableLoading state based on current loading state and session history
  // If we previously had videos, start with loading=false to avoid flashing
  const [stableLoading, setStableLoading] = React.useState(isLoading && !hadPreviousVideos);
  
  // Determine content state for optimized rendering
  const hasNoVideos = (!videos || videos.length === 0) && 
                      (!processingVideos || processingVideos.length === 0);
  const isEmptyState = hasNoVideos && !isLoading && !isFetching;
  const shouldShowLoadingState = isLoading && hasNoVideos;
  const hasContent = videos.length > 0 || processingVideos.length > 0;
  
  // Set card size CSS variable for consistent sizing - only when cardSize changes
  useEffect(() => {
    if (cardSize) {
      document.documentElement.style.setProperty('--card-size', `${cardSize}px`);
    }
  }, [cardSize]);
  
  // Removed unused isFirstRender ref
  
  // Implement fast loading transitions when navigating between pages
  React.useEffect(() => {
    // Skip loading state entirely if we've seen videos before
    if (hadPreviousVideos) {
      setStableLoading(false);
      return;
    }
    
    // For first app load, implement normal loading state behavior
    if (shouldShowLoadingState) {
      setStableLoading(true);
    } else if (stableLoading) {
      // Use much shorter timeout (100ms) when turning off loading state
      loadingTimeoutRef.current = setTimeout(() => {
        setStableLoading(false);
      }, 100);
    }
    
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [shouldShowLoadingState, stableLoading, hadPreviousVideos]);
  
  // Log component state for debugging
  useEffect(() => {
    logger.debug('VideoGrid', {
      state: {
        hasNoVideos,
        isEmptyState,
        shouldShowLoadingState,
        stableLoading,
        hasContent,
        videosLength: videos.length,
        processingVideosLength: processingVideos.length,
        isLoading,
        isFetching,
        isEmpty,
        hadPreviousVideos
      }
    });
    
    // Explicitly log transitions for easier debugging
    if (shouldShowLoadingState !== stableLoading) {
      logger.info('VideoGrid', `Loading state transition: shouldShowLoadingState=${shouldShowLoadingState}, stableLoading=${stableLoading}`);
    }
    
    // Mark session storage when we have videos
    if (videos.length > 0) {
      // Set both keys to ensure we don't show empty state or loading skeletons
      // when switching between routes
      sessionStorage.setItem('route:feed:hasVideos', 'true');
      sessionStorage.setItem('route:dashboard:hasVideos', 'true');
    }
  }, [videos, processingVideos, isLoading, isFetching, isEmpty, hasNoVideos, isEmptyState, shouldShowLoadingState, stableLoading, hasContent, hadPreviousVideos]);

  // Error display
  if (error) {
    return (
      <StableHeightContainer minHeight="300px">
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          mt: 10, 
          flexDirection: 'column', 
          alignItems: 'center',
          animation: 'fadeIn 0.5s ease-in-out',
          '@keyframes fadeIn': {
            '0%': { opacity: 0 },
            '100%': { opacity: 1 }
          }
        }}>
          <Typography variant="h6" color="error" sx={{ mb: 2 }}>
            Error loading videos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {error.message || 'Please try again later'}
          </Typography>
          <Button 
            variant="contained" 
            color="primary"
            onClick={fetchVideos}
            sx={{ mt: 2 }}
          >
            Try Again
          </Button>
        </Box>
      </StableHeightContainer>
    );
  }
  
  // Loading display - show skeleton ONLY for first page load
  // When navigating between Feed and Dashboard, immediately show content
  const isFirstLoad = !sessionStorage.getItem('route:feed:hasVideos') && 
                      !sessionStorage.getItem('route:dashboard:hasVideos');
  
  if (isLoading && hasNoVideos && isFirstLoad) {
    return (
      <StableHeightContainer 
        minHeight="300px" 
        isLoading={true}
        loadingFallback={<VideoListSkeleton count={6} columns={3} staggered={true} />}
      >
        <div />
      </StableHeightContainer>
    );
  }

  // Check if we should prevent empty state - show content even when empty if we previously had videos
  // This improved version handles both session storage and current content
  const preventEmptyState = hadPreviousVideos || videos.length > 0 || processingVideos.length > 0;
  
  // Force disable loading state if we have content to show
  if (hasContent && stableLoading) {
    // Immediately clear loading state when we have content, don't wait for timeout
    setStableLoading(false);
  }
  
  // Empty state - ONLY show when ALL of these conditions are true:
  // 1. We're definitely not loading (stable loading false)
  // 2. We have no videos to display
  // 3. We're not fetching any data currently
  // 4. We don't have a record of previously having videos (session storage)
  if (!stableLoading && !isFetching && hasNoVideos && !preventEmptyState) {
    return (
      <StableHeightContainer minHeight="300px">
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          mt: 10, 
          flexDirection: 'column', 
          alignItems: 'center',
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
      </StableHeightContainer>
    );
  }

  // Determine which display mode to use
  if (listStyle === 'list') {
    return (
      <StableHeightContainer 
        minHeight={videos.length ? "500px" : "200px"}
        isLoading={false}
      >
        <Box
          sx={{
            animation: 'fadeIn 0.5s ease-in-out',
            '@keyframes fadeIn': {
              '0%': { opacity: 0 },
              '100%': { opacity: 1 }
            }
          }}
        >
          <VideoList
            authenticated={authenticated}
            loadingIcon={isFetching ? <LoadingSpinner size={20} /> : null}
            feedView={feedView}
            videos={videos}
          />
        </Box>
      </StableHeightContainer>
    );
  }

  // Simple deduplication to prevent showing both processing and completed versions
  const videoIds = new Set(videos.map(v => v.video_id || v.id));
  
  // Only show processing videos that don't already have a completed version
  const activeProcessingVideos = processingVideos.filter(pv => !videoIds.has(pv.videoId));
  
  // Create combined list for display
  const combinedVideos = [
    // Processing videos first
    ...activeProcessingVideos.map(pv => ({
      video_id: pv.videoId,
      info: { title: pv.title || 'Processing Video' },
      isProcessing: true,
      jobId: pv.jobId
    })),
    // Then regular videos
    ...videos
  ];

  return (
    <StableHeightContainer 
      minHeight={combinedVideos.length ? "500px" : "200px"}
      isLoading={false}
    >
      <Box
        sx={{
          animation: 'fadeIn 0.5s ease-in-out',
          '@keyframes fadeIn': {
            '0%': { opacity: 0 },
            '100%': { opacity: 1 }
          }
        }}
      >
        {/* Display grid with both regular and processing videos */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'flex-start',
            width: '100%',
            maxWidth: '100%',
            overflowX: 'hidden' // Prevent horizontal scrolling
          }}
        >
          {combinedVideos.map((video, index) => (
            <Box 
              key={video.isProcessing ? `processing-${video.video_id}` : `video-${video.video_id}`}
              className={`video-card-container ${video.isProcessing ? 'processing-card' : ''}`}
              sx={{
                position: 'relative',
                width: 'var(--card-size)',
                height: 'calc(var(--card-size) * 0.5625)',
                opacity: 0,
                animation: `fadeInCard 0.4s ease-out forwards ${index * 0.05}s`,
                '@keyframes fadeInCard': {
                  '0%': { opacity: 0, transform: 'translateY(8px)' },
                  '100%': { opacity: 1, transform: 'translateY(0)' }
                },
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '8px',
                overflow: 'hidden',
                marginRight: '16px',
                marginBottom: '16px',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 6px 12px rgba(0,0,0,0.15)'
                }
              }}
            >
              {video.isProcessing ? (
                <ProcessingVideoCard
                  jobId={video.jobId}
                  videoId={video.video_id}
                  title={video.info?.title || 'Processing Video'}
                  onProcessingComplete={onProcessingComplete}
                />
              ) : (
                <VideoCards
                  authenticated={authenticated}
                  loadingIcon={isFetching ? <LoadingSpinner size={20} /> : null}
                  feedView={feedView}
                  size={cardSize}
                  fetchVideos={fetchVideos}
                  videos={[video]} // Pass single video as array
                  key={`videocard-${video.video_id}`}
                  inGrid={true} // Indicate card is part of grid for styling
                />
              )}
            </Box>
          ))}
        </Box>
      </Box>
    </StableHeightContainer>
  );
};

// Memoize the component to reduce re-renders
const arePropsEqual = (prevProps, nextProps) => {
  // Key props that should always trigger re-render if they change
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  if (prevProps.isFetching !== nextProps.isFetching) return false;
  if (prevProps.error !== nextProps.error) return false;
  if (prevProps.isEmpty !== nextProps.isEmpty) return false;
  if (prevProps.listStyle !== nextProps.listStyle) return false;
  if (prevProps.cardSize !== nextProps.cardSize) return false;
  if (prevProps.feedView !== nextProps.feedView) return false;
  
  // Videos content checks (more important than just length)
  // Only do deep comparison if references changed
  if (prevProps.videos !== nextProps.videos) {
    // Length check
    if (prevProps.videos?.length !== nextProps.videos?.length) return false;
    
    // If we have videos, do a basic content check
    if (prevProps.videos?.length > 0 && nextProps.videos?.length > 0) {
      // Sampling approach - check first and last for efficiency
      // This is just a heuristic - full deep equal would be too expensive
      const firstPrevVideo = prevProps.videos[0];
      const firstNextVideo = nextProps.videos[0];
      const lastPrevVideo = prevProps.videos[prevProps.videos.length-1];
      const lastNextVideo = nextProps.videos[nextProps.videos.length-1];
      
      // Compare video IDs which should be unique
      if (firstPrevVideo?.video_id !== firstNextVideo?.video_id ||
          lastPrevVideo?.video_id !== lastNextVideo?.video_id) {
        return false;
      }
      
      // Optionally check titles to catch content updates
      if (firstPrevVideo?.info?.title !== firstNextVideo?.info?.title ||
          lastPrevVideo?.info?.title !== lastNextVideo?.info?.title) {
        return false;
      }
    }
  }
  
  // Processing videos checks
  if (prevProps.processingVideos !== nextProps.processingVideos) {
    if (prevProps.processingVideos?.length !== nextProps.processingVideos?.length) return false;
    
    // Check processing state which is important for UI updates
    if (prevProps.processingVideos?.length > 0 && nextProps.processingVideos?.length > 0) {
      // Sample check - just the first processing video
      if (prevProps.processingVideos[0]?.jobId !== nextProps.processingVideos[0]?.jobId) {
        return false;
      }
    }
  }
  
  return true;
};

export default memo(VideoGrid, arePropsEqual);