import React, { useCallback, useEffect, useState, useRef } from 'react'
import { Box, Button, Grid, Paper, Typography } from '@mui/material'
import SnackbarAlert from '../alert/SnackbarAlert'
import VisibilityCard from './VisibilityCard'
import VideoModal from '../modal/VideoModal'
import SensorsIcon from '@mui/icons-material/Sensors'
import { VideoService } from '../../services'
// Removed UploadCard import since we're using the dedicated UploadButton instead
// eslint-disable-next-line no-unused-vars
import { TagDisplay } from '../tags'
import { VideoListSkeleton } from '../utils/SkeletonLoader'
import { useOptimisticUI } from '../../hooks'
// Removed useLoadingState import since we're no longer using it
import { logger } from '../../common/logger'

// Session storage key to track if this component has shown videos before
const SESSION_KEY_VIDEO_CARDS = 'component:videoCards:hasShownVideos'

/**
 * Enhanced VideoCards component with improved loading state management
 * using custom hooks for smoother transitions
 */
const VideoCards = ({
  videos,
  loadingIcon = null,
  feedView = false,
  fetchVideos,
  authenticated,
  size, // Size in pixels for the cards
}) => {
  // REMOVED: We're now handling size changes in a single useEffect below
  // Size prop is used for card dimensions
  // Removed showUploadCard prop since we're using the dedicated UploadButton
  // Track local state
  const [vids, setVideos] = useState(videos || []);
  const [alert, setAlert] = useState({ open: false });
  const [videoModal, setVideoModal] = useState({
    open: false,
  });
  
  // Loading state controlled directly through CSS transitions and forced rendering
  // This variable is kept for API compatibility but not actively used
  // eslint-disable-next-line no-unused-vars
  const [isLoading, setIsLoading] = useState(false);
  
  // Process videos for display
  
  // Always force loading to false for rendering - this is critical to ensure content always renders
  const actuallyIsLoading = false; // Force to false to ensure content always renders
  
  // Process videos data when it changes
  useEffect(() => {
    // Update local state when videos prop changes
    if (videos) {
      setVideos(Array.isArray(videos) ? videos : []);
    }
  }, [videos]);
  
  // Use our optimistic UI hook to track if videos have been shown before
  // This helps in deciding what to show during initial load
  useOptimisticUI({
    key: SESSION_KEY_VIDEO_CARDS,
    data: videos,
    condition: (data) => Array.isArray(data) && data.length > 0
  });
  
  // Reference to track previous size for change detection
  const prevSizeRef = useRef(size);
  
  // Simple check to log card size changes
  useEffect(() => {
    // Use size or fallback to default
    const currentSize = size || 300;
    
    // Log significant size changes
    if (Math.abs((prevSizeRef.current || 0) - currentSize) > 5) {
      logger.debug('VideoCards', `Card size changed: ${prevSizeRef.current || 'initial'} → ${currentSize}px`);
    }
    
    // Update ref for future comparisons
    prevSizeRef.current = currentSize;
    
    // Let CSS variables handle the sizing through the stylesheet
    // No direct DOM manipulation needed
  }, [size]);
  
  // CRITICAL FIX: Ensure the videos are always available and local state is updated
  useEffect(() => {
    if (!videos) return; // Skip if no videos yet
    
    // Update local state with videos and force loading to false
    // No delay needed since we're using CSS transitions now
    setVideos(Array.isArray(videos) ? videos : []);
    setIsLoading(false);
  }, [videos]); // IMPORTANT: Only depend on videos, not size or other props
  
  // Skip re-renders based on size changes - we handle size via direct DOM manipulation
  const prevSizeStringRef = useRef(size?.toString());
  useEffect(() => {
    // Only process significant changes (> 5px difference)
    const currentSizeStr = size?.toString();
    const prevSizeStr = prevSizeStringRef.current;
    
    if (currentSizeStr !== prevSizeStr) {
      if (Math.abs((size || 0) - (Number(prevSizeStr) || 0)) > 5) {
        logger.debug('VideoCards', `Size changed significantly: ${prevSizeStr} → ${currentSizeStr}px`);
        prevSizeStringRef.current = currentSizeStr;
      } else {
        // If change is small, don't log or process
        prevSizeStringRef.current = currentSizeStr;
      }
    }
  }, [size]); // We track size but don't use it to manipulate the DOM

  const openVideo = (id) => {
    setVideoModal({
      open: true,
      id,
    })
  }

  const onModalClose = () => {
    setVideoModal({ open: false })
  }

  const memoizedHandleAlert = useCallback((alert) => {
    setAlert(alert)
  }, [])

  const handleScan = () => {
    VideoService.scan().catch((err) =>
      setAlert({
        open: true,
        type: 'error',
        message: err.response?.data || 'Unknown Error',
      }),
    )
    setAlert({
      open: true,
      type: 'info',
      message: 'Scan initiated. This could take a few minutes.',
    })
  }

  const handleUpdate = (update) => {
    const { id, ...rest } = update
    setVideos((vs) => vs.map((v) => (v.video_id === id ? { ...v, info: { ...v.info, ...rest } } : v)))
  }

  const handleDelete = (id) => {
    setVideos((vs) => vs.filter((v) => v.video_id !== id))
  }

  const EMPTY_STATE = () => (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <Grid
        sx={{ p: 2, height: 200 }}
        container
        item
        spacing={2}
        direction="column"
        justifyContent="center"
        alignItems="center"
      >
        {!loadingIcon && (
          <>
            <Grid item>
              <Typography
                variant="h4"
                align="center"
                color="primary"
                sx={{
                  fontFamily: 'monospace',
                  fontWeight: 500,
                  letterSpacing: '.2rem',
                  textDecoration: 'none',
                }}
              >
                NO VIDEOS FOUND
              </Typography>
            </Grid>

            {!feedView && (
              <Grid item>
                <Button variant="contained" size="large" startIcon={<SensorsIcon />} onClick={handleScan}>
                  Scan Library
                </Button>
              </Grid>
            )}
          </>
        )}
        {loadingIcon}
      </Grid>
      {/* Upload card removed in favor of the dedicated Upload button */}
    </Paper>
  )

  return (
    <Box>
      <VideoModal
        open={videoModal.open}
        onClose={onModalClose}
        videoId={videoModal.id}
        feedView={feedView}
        authenticated={authenticated}
        updateCallback={handleUpdate}
      />
      <SnackbarAlert
        severity={alert.type}
        open={alert.open}
        onClose={alert.onClose}
        setOpen={(open) => setAlert({ ...alert, open })}
      >
        {alert.message}
      </SnackbarAlert>

      {/* Show placeholders only during first load with no videos */}
      {actuallyIsLoading && !vids.length && (
        <Box>
          <VideoListSkeleton 
            count={6} 
            columns={3}
          />
        </Box>
      )}
      
      {/* CRITICAL: Always render content, don't wait for loading state */}
      {(
        <>
          {/* Show videos if available */}
          {vids && vids.length > 0 ? (
            <>
              {/* Upload card removed in favor of the dedicated Upload button */}
              {/* Render video cards */}
              
              {/* SIMPLIFIED: Let cards flow naturally with flexbox for responsive layout */}
              <Box 
                className="video-grid"
                sx={{ 
                  animation: 'fadeIn 0.5s ease-in-out',
                  '@keyframes fadeIn': {
                    '0%': { opacity: 0 },
                    '100%': { opacity: 1 }
                  },
                  // Add a visual indicator of the current size for debugging
                  '&::before': process.env.NODE_ENV === 'development' ? {
                    content: `"Card size: ${size || 300}px"`,
                    display: 'block',
                    width: '100%',
                    textAlign: 'center',
                    color: 'white',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    padding: '4px',
                    marginBottom: '10px',
                    borderRadius: '4px'
                  } : {}
                }}
                data-size={size || 300} // Add data attribute for easier debugging
              >
                {vids.map((v, index) => (
                  <Box 
                    className="video-card-container"
                    key={`video-card-${v.video_id}`}
                    sx={{
                      animation: `fadeInCard 0.4s ease-out forwards ${index * 0.03}s`,
                      '@keyframes fadeInCard': {
                        '0%': { opacity: 0, transform: 'translateY(8px)' },
                        '100%': { opacity: 1, transform: 'translateY(0)' }
                      },
                      // Card sizing is controlled by CSS variables
                      // and direct style application in the useEffect above
                      outline: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <VisibilityCard
                      video={v}
                      handleAlert={memoizedHandleAlert}
                      openVideo={openVideo}
                      cardWidth="100%" // 100% of parent container (which is size px)
                      // No explicit height - will be calculated based on video aspect ratio
                      authenticated={authenticated}
                      deleted={handleDelete}
                    />
                  </Box>
                ))}
              </Box>
            </>
          ) : (
            /* Show empty state if no videos available */
            EMPTY_STATE()
          )}
        </>
      )}
    </Box>
  )
}

export default VideoCards
