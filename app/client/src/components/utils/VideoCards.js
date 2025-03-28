import React, { useCallback, useEffect, useState, useRef } from 'react'
import { Box, Button, Grid, Paper, Typography } from '@mui/material'
import SnackbarAlert from '../alert/SnackbarAlert'
import VisibilityCard from './VisibilityCard' // Updated import path
import VideoModal from '../modal/VideoModal'
import SensorsIcon from '@mui/icons-material/Sensors'
import { VideoService } from '../../services'

// TagDisplay is imported but not used - commenting out to fix warning
// import { TagDisplay } from '../tags'
import { VideoListSkeleton } from './SkeletonLoader'
import { useOptimisticUI } from '../../hooks'

import { logger } from '../../common/logger'


const SESSION_KEY_VIDEO_CARDS = 'component:videoCards:hasShownVideos'

const VideoCards = ({
  videos,
  loadingIcon = null,
  feedView = false,
  fetchVideos,
  authenticated,
  size,
  inGrid = false // New prop to indicate if component is used within the combined grid
}) => {
  const [vids, setVideos] = useState(videos || []);
  const [alert, setAlert] = useState({ open: false });
  const [videoModal, setVideoModal] = useState({
    open: false,
  });
  
  // Replaced with a simpler approach to fix unused variable warning
  const [, setIsLoading] = useState(false); // Only keeping the setter
  const actuallyIsLoading = false;
  
  useEffect(() => {
    if (videos) {
      setVideos(Array.isArray(videos) ? videos : []);
    }
  }, [videos]);
  
  // Always call hooks at the top level - use internal condition instead
  useOptimisticUI({
    key: SESSION_KEY_VIDEO_CARDS,
    data: videos,
    condition: (data) => !inGrid && Array.isArray(data) && data.length > 0
  });
  
  const prevSizeRef = useRef(size);
  
  useEffect(() => {
    const currentSize = size || 300;
    prevSizeRef.current = currentSize;
  }, [size]);
  
  useEffect(() => {
    if (!videos) return;
    setVideos(Array.isArray(videos) ? videos : []);
    setIsLoading(false);
  }, [videos]); 
  
  
  const prevSizeStringRef = useRef(size?.toString());
  useEffect(() => {
    
    const currentSizeStr = size?.toString();
    const prevSizeStr = prevSizeStringRef.current;
    
    if (currentSizeStr !== prevSizeStr) {
      if (Math.abs((size || 0) - (Number(prevSizeStr) || 0)) > 5) {
        logger.debug('VideoCards', `Size changed significantly: ${prevSizeStr} → ${currentSizeStr}px`);
        prevSizeStringRef.current = currentSizeStr;
      } else {
        
        prevSizeStringRef.current = currentSizeStr;
      }
    }
  }, [size]); 

  const openVideo = (id) => {
    console.log('Opening video modal for ID:', id)
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
      {}
    </Paper>
  )

  // If we're in grid mode, just render a single video card
  if (inGrid && vids && vids.length === 1) {
    return (
      <VisibilityCard
        video={vids[0]}
        handleAlert={memoizedHandleAlert}
        openVideo={openVideo}
        cardWidth="100%"
        authenticated={authenticated}
        deleted={handleDelete}
        feedView={feedView}
      />
    );
  }

  // Normal grid display for multiple videos
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
      {console.log('VideoCards render - videoModal state:', videoModal)}
      <SnackbarAlert
        severity={alert.type}
        open={alert.open}
        onClose={alert.onClose}
        setOpen={(open) => setAlert({ ...alert, open })}
      >
        {alert.message}
      </SnackbarAlert>

      {actuallyIsLoading && !vids.length && (
        <Box>
          <VideoListSkeleton 
            count={6} 
            columns={3}
          />
        </Box>
      )}
      
      {vids && vids.length > 0 ? (
        <Box 
          className="video-grid"
          sx={{ 
            animation: 'fadeIn 0.5s ease-in-out',
            '@keyframes fadeIn': {
              '0%': { opacity: 0 },
              '100%': { opacity: 1 }
            },
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
              xl: 'repeat(5, 1fr)'
            },
            gap: 2
          }}
          data-size={size || 300} 
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
                outline: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <VisibilityCard
                video={v}
                handleAlert={memoizedHandleAlert}
                openVideo={openVideo}
                cardWidth="100%" 
                authenticated={authenticated}
                deleted={handleDelete}
                feedView={feedView}
              />
            </Box>
          ))}
        </Box>
      ) : (
        EMPTY_STATE()
      )}
    </Box>
  )
}

export default VideoCards