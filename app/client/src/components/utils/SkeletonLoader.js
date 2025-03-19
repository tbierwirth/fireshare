import React from 'react';
import { Box, Skeleton, useTheme } from '@mui/material';

/**
 * VideoSkeleton - A skeleton loader for video cards
 * @param {Object} props Component props
 * @param {number} props.width Width of the skeleton (default: 300)
 * @param {number} props.height Height of the skeleton (default: 200)
 * @param {boolean} props.showTitle Show title skeleton (default: true)
 * @param {boolean} props.showDescription Show description skeleton (default: true)
 * @param {boolean} props.showActions Show actions bar skeleton (default: true)
 * @returns {JSX.Element} Video card skeleton
 */
export const VideoSkeleton = ({ 
  width = 300, 
  height = 200, 
  showTitle = true, 
  showDescription = true,
  showActions = true 
}) => {
  const theme = useTheme();
  
  return (
    <Box sx={{ 
      width, 
      bgcolor: 'background.paper',
      borderRadius: 1,
      overflow: 'hidden',
      boxShadow: 1,
      transition: 'all 0.3s ease-in-out'
    }}>
      {/* Video thumbnail skeleton */}
      <Skeleton 
        variant="rectangular" 
        width="100%" 
        height={height} 
        animation="wave"
        sx={{ bgcolor: 'rgba(255, 255, 255, 0.11)' }} 
      />

      {/* Content area */}
      <Box sx={{ p: 1.5 }}>
        {/* Title skeleton */}
        {showTitle && (
          <Skeleton
            variant="text"
            width="70%"
            height={28}
            animation="wave"
            sx={{ mb: 1, bgcolor: 'rgba(255, 255, 255, 0.11)' }}
          />
        )}

        {/* Description skeleton - two lines */}
        {showDescription && (
          <>
            <Skeleton 
              variant="text" 
              width="90%" 
              height={20} 
              animation="wave"
              sx={{ mb: 0.5, bgcolor: 'rgba(255, 255, 255, 0.08)' }} 
            />
            <Skeleton 
              variant="text" 
              width="60%" 
              height={20} 
              animation="wave"
              sx={{ mb: 1, bgcolor: 'rgba(255, 255, 255, 0.08)' }} 
            />
          </>
        )}

        {/* Action bar */}
        {showActions && (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            mt: showDescription ? 2 : 1
          }}>
            <Skeleton 
              variant="rectangular" 
              width={80} 
              height={32} 
              animation="wave"
              sx={{ borderRadius: 1, bgcolor: 'rgba(255, 255, 255, 0.05)' }} 
            />
            <Skeleton 
              variant="circular" 
              width={32} 
              height={32} 
              animation="wave"
              sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)' }} 
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

/**
 * VideoListSkeleton - Renders multiple video skeletons in a grid layout with staggered animation
 * @param {Object} props Component props
 * @param {number} props.count Number of skeletons to render (default: 6)
 * @param {number} props.columns Number of columns in the grid (default: 3)
 * @param {boolean} props.staggered Enable staggered animation (default: true)
 * @returns {JSX.Element} Grid of video skeletons
 */
export const VideoListSkeleton = ({ 
  count = 6, 
  columns = 3,
  staggered = true 
}) => {
  return (
    <Box sx={{ 
      display: 'grid',
      gridTemplateColumns: {
        xs: '1fr',
        sm: 'repeat(2, 1fr)',
        md: `repeat(${Math.min(columns, 4)}, 1fr)`,
        lg: `repeat(${columns}, 1fr)`
      },
      gap: 2,
      p: 2,
      transition: 'opacity 0.5s ease-in-out',
      animation: 'fadeIn 0.5s ease-in-out'
    }}>
      {Array(count).fill(0).map((_, index) => (
        <Box 
          key={`skeleton-${index}`} 
          sx={{ 
            opacity: 0,
            animation: staggered 
              ? `fadeIn 0.5s ease-in-out forwards ${index * 0.15}s` 
              : 'fadeIn 0.5s ease-in-out forwards',
            '@keyframes fadeIn': {
              '0%': { opacity: 0 },
              '100%': { opacity: 1 }
            }
          }}
        >
          <VideoSkeleton width="100%" />
        </Box>
      ))}
    </Box>
  );
};

/**
 * StableHeightContainer - A simpler container that manages content with optional loading state
 * @param {Object} props Component props
 * @param {string|number} props.height Container height (default: 'auto')
 * @param {string|number} props.minHeight Minimum container height (default: '200px') 
 * @param {boolean} props.isLoading Whether content is loading
 * @param {React.ReactNode} props.loadingFallback Component to show during loading
 * @param {React.ReactNode} props.children Actual content
 * @returns {JSX.Element} Container with content or loading fallback
 */
export const StableHeightContainer = ({ 
  height = 'auto',
  minHeight = '200px',
  isLoading,
  loadingFallback,
  children
}) => {
  return (
    <Box sx={{ 
      height,
      minHeight,
      position: 'relative'
    }}>
      {isLoading ? loadingFallback : children}
    </Box>
  );
};

/**
 * OptimisticContainer - A simplified container that shows loading state or content
 * @param {Object} props Component props
 * @param {boolean} props.isLoading Current loading state
 * @param {boolean} props.previouslyHadContent Whether this view previously had content
 * @param {boolean} props.isEmpty Whether the current data set is empty
 * @param {React.ReactNode} props.loadingFallback Component to show during loading
 * @param {React.ReactNode} props.emptyFallback Component to show when empty
 * @param {React.ReactNode} props.children Actual content
 * @returns {JSX.Element} Container with content or appropriate fallback
 */
export const OptimisticContainer = ({ 
  isLoading,
  previouslyHadContent,
  isEmpty,
  loadingFallback,
  emptyFallback,
  children
}) => {
  // If we're loading and we previously had content (or in a loading sequence),
  // show the loading fallback to avoid flash
  if (isLoading) {
    return <Box>{loadingFallback}</Box>;
  }
  
  // If we have content, show it
  if (!isEmpty) {
    return <Box>{children}</Box>;
  }
  
  // If we're not loading and have no content, show empty state
  return <Box>{emptyFallback}</Box>;
};

/**
 * FieldSkeleton - A skeleton loader for form fields
 * @param {Object} props Component props
 * @param {number} props.height Height of the skeleton (default: 56)
 * @param {string} props.width Width of the skeleton (default: '100%')
 * @param {string} props.variant Skeleton variant (default: 'rectangular')
 * @returns {JSX.Element} Form field skeleton
 */
export const FieldSkeleton = ({ 
  height = 56, 
  width = '100%',
  variant = 'rectangular'
}) => (
  <Skeleton 
    variant={variant}
    width={width}
    height={height}
    animation="wave"
    sx={{ 
      bgcolor: 'rgba(255, 255, 255, 0.11)', 
      borderRadius: 1,
      mb: 2 
    }}
  />
);

export default {
  VideoSkeleton,
  VideoListSkeleton,
  StableHeightContainer,
  OptimisticContainer,
  FieldSkeleton
};