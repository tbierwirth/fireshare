import React, { useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { usePublicVideos } from '../services/VideoQueryHooks';
import { useVideoDisplay } from '../hooks';
import { logger } from '../common/logger';
import { VideoLayout } from '../components/utils';

// URL query parameter hook
function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const Feed = ({ authenticated, searchText, cardSize, listStyle, user }) => {
  // Get URL query parameters
  const query = useQuery();
  const category = query.get('category');
  const gameParam = query.get('game');
  
  // Log props received for debugging
  useEffect(() => {
    logger.debug('Feed', `Feed component received props: cardSize=${cardSize}, listStyle=${listStyle}`);
  }, [cardSize, listStyle]);

  // Fetch public videos using React Query
  const { 
    data: videosResponse, 
    isLoading: queryLoading, 
    isFetching,
    isError, 
    error,
    refetch 
  } = usePublicVideos({ 
    sortOrder: 'newest', 
    game: gameParam,
    options: {
      keepPreviousData: true,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 60000,
      onlyRefetchOnMountIfStale: true,
      onSuccess: (data) => {
        const videos = data?.data?.videos || [];
        if (videos.length > 0) {
          sessionStorage.setItem('route:feed:hasVideos', 'true');
        }
      }
    }
  });
  
  // Extract videos from response
  const publicVideos = useMemo(() => {
    return videosResponse?.data?.videos || [];
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
    videos: publicVideos,
    queryLoading,
    isFetching,
    error: isError ? error : null,
    refetch,
    authenticated,
    searchText,
    routeKey: 'feed',
    gameParam,
    categoryParam: category,
    isFeedView: true,
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
      feedView={true}
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

function feedPropsAreEqual(prevProps, nextProps) {
  if (prevProps.authenticated !== nextProps.authenticated) return false;
  if (prevProps.searchText !== nextProps.searchText) return false;
  if (prevProps.listStyle !== nextProps.listStyle) return false;
  return true;
}

export default React.memo(Feed, feedPropsAreEqual);