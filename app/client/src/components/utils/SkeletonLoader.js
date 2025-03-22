import React from 'react';
import { Box, Skeleton, useTheme } from '@mui/material';

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
      {}
      <Skeleton 
        variant="rectangular" 
        width="100%" 
        height={height} 
        animation="wave"
        sx={{ bgcolor: 'rgba(255, 255, 255, 0.11)' }} 
      />

      {}
      <Box sx={{ p: 1.5 }}>
        {}
        {showTitle && (
          <Skeleton
            variant="text"
            width="70%"
            height={28}
            animation="wave"
            sx={{ mb: 1, bgcolor: 'rgba(255, 255, 255, 0.11)' }}
          />
        )}

        {}
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

        {}
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

export const OptimisticContainer = ({ 
  isLoading,
  previouslyHadContent,
  isEmpty,
  loadingFallback,
  emptyFallback,
  children
}) => {
  
  
  if (isLoading) {
    return <Box>{loadingFallback}</Box>;
  }
  
  
  if (!isEmpty) {
    return <Box>{children}</Box>;
  }
  
  
  return <Box>{emptyFallback}</Box>;
};

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