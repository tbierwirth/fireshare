import React from 'react';
import { Box, Typography } from '@mui/material';
import { useLoadingState, useOptimisticUI } from '../../hooks';
import { VideoListSkeleton } from './SkeletonLoader';
import VideoList from '../admin/VideoList';

/**
 * Optimized video list component that uses custom hooks for
 * loading states and optimistic UI rendering.
 * 
 * This is a demonstration component showing how to implement
 * the hooks for a smoother UI experience.
 */
const OptimizedVideoList = ({ 
  videos = [],
  isQueryLoading = false,
  isFetching = false,
  route = 'generic',
  listStyle = 'list'
}) => {
  // Use loading state hook to manage loading with minimum duration
  const [isLoading, setIsLoading, isFirstLoad] = useLoadingState({
    minDuration: 800,
    initialState: true
  });
  
  // Use optimistic UI hook to track if this route has shown videos before
  const hadContent = useOptimisticUI({
    key: `route:${route}:hasVideos`,
    data: videos,
    // Optional custom condition for what "has content" means
    condition: (data) => Array.isArray(data) && data.length > 0
  });
  
  // Update loading state when query loading state changes
  React.useEffect(() => {
    setIsLoading(isQueryLoading);
  }, [isQueryLoading, setIsLoading]);
  
  // Decide what to show based on loading state
  return (
    <Box>
      {/* Loading state - show skeletons if loading or during first load */}
      {isLoading && (
        <VideoListSkeleton 
          count={6} 
          columns={listStyle === 'list' ? 1 : 3} 
        />
      )}
      
      {/* Content state - only show when not loading */}
      {!isLoading && (
        <>
          {/* Show content if available */}
          {videos.length > 0 ? (
            <VideoList 
              videos={videos}
              loadingIcon={isFetching ? <Box>Refreshing...</Box> : null}
            />
          ) : (
            /* Show empty state if no videos - but don't show it immediately 
               during first load if we've previously had content */
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                {isFirstLoad && hadContent 
                  ? "Loading..." 
                  : "No videos found"}
              </Typography>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default OptimizedVideoList;