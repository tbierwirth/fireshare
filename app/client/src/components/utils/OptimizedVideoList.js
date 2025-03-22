import React from 'react';
import { Box, Typography } from '@mui/material';
import { useLoadingState, useOptimisticUI } from '../../hooks';
import { VideoListSkeleton } from './SkeletonLoader';
import VideoList from '../admin/VideoList';

const OptimizedVideoList = ({ 
  videos = [],
  isQueryLoading = false,
  isFetching = false,
  route = 'generic',
  listStyle = 'list'
}) => {
  
  const [isLoading, setIsLoading, isFirstLoad] = useLoadingState({
    minDuration: 800,
    initialState: true
  });
  
  
  const hadContent = useOptimisticUI({
    key: `route:${route}:hasVideos`,
    data: videos,
    
    condition: (data) => Array.isArray(data) && data.length > 0
  });
  
  
  React.useEffect(() => {
    setIsLoading(isQueryLoading);
  }, [isQueryLoading, setIsLoading]);
  
  
  return (
    <Box>
      {}
      {isLoading && (
        <VideoListSkeleton 
          count={6} 
          columns={listStyle === 'list' ? 1 : 3} 
        />
      )}
      
      {}
      {!isLoading && (
        <>
          {}
          {videos.length > 0 ? (
            <VideoList 
              videos={videos}
              loadingIcon={isFetching ? <Box>Refreshing...</Box> : null}
            />
          ) : (
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