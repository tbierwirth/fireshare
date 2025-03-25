import React, { useMemo, useEffect, useRef } from 'react';
import { useVideos as useVideosQuery } from '../services/VideoQueryHooks';
import { useVideoDisplay } from '../hooks';
import { logger } from '../common/logger';
import { VideoLayout } from '../components/utils';

const Dashboard = ({ authenticated = false, searchText, cardSize, listStyle, user }) => {
  // Reference to track initial fetch
  const initialFetchRef = useRef(false);
  
  // Log props received for debugging
  useEffect(() => {
    logger.info('Dashboard', `Dashboard received props: cardSize=${cardSize}, listStyle=${listStyle}`);
  }, [cardSize, listStyle]);

  // Fetch videos for the authenticated user (their videos)
  const { 
    data: videosResponse, 
    isLoading: queryLoading, 
    isFetching,
    isError, 
    error,
    refetch 
  } = useVideosQuery({
    sortOrder: 'newest',  // Use the user-friendly term that will be mapped on the server
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
          sessionStorage.setItem('route:dashboard:hasVideos', 'true');
        }
      }
    }
  });
  
  // Initial fetch on component mount
  useEffect(() => {
    if (!initialFetchRef.current) {
      initialFetchRef.current = true;
      refetch().catch(err => {
        logger.error('Error fetching videos:', err);
      });
    }
  }, [refetch]);
  
  // Extract videos data from response
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
  
  // Use shared video display hook for common functionality
  const {
    displayVideos,
    isLoading,
    isFetching: isDisplayFetching,
    error: displayError,
    folders,
    selectedFolder,
    selectedSort,
    isEmpty,
    onFolderSelection,
    onSortSelection,
    refreshVideos
  } = useVideoDisplay({
    videos,
    queryLoading,
    isFetching,
    error: isError ? error : null,
    refetch,
    authenticated,
    searchText,
    routeKey: 'dashboard',
    isFeedView: false,
    cardSize
  });

  // Render the VideoLayout with current state
  return (
    <VideoLayout
      videos={displayVideos}
      isLoading={isLoading}
      isFetching={isDisplayFetching || isFetching}
      error={displayError}
      authenticated={authenticated}
      cardSize={cardSize}
      listStyle={listStyle}
      feedView={false}
      isEmpty={isEmpty}
      folders={folders}
      selectedFolder={selectedFolder}
      selectedSort={selectedSort}
      onFolderSelection={onFolderSelection}
      onSortSelection={onSortSelection}
      refreshVideos={refreshVideos}
    />
  );
};

const dashboardPropsAreEqual = (prevProps, nextProps) => {
  if (prevProps.authenticated !== nextProps.authenticated) return false;
  if (prevProps.searchText !== nextProps.searchText) return false;
  if (prevProps.listStyle !== nextProps.listStyle) return false;
  return true;
};

export default React.memo(Dashboard, dashboardPropsAreEqual);
