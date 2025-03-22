import React, { useCallback, useEffect, useState, useRef } from 'react'
import { Box, Button, Grid, Paper, Typography } from '@mui/material'
import SnackbarAlert from '../alert/SnackbarAlert'
import VisibilityCard from './VisibilityCard'
import VideoModal from '../modal/VideoModal'
import SensorsIcon from '@mui/icons-material/Sensors'
import { VideoService } from '../../services'


import { TagDisplay } from '../tags'
import { VideoListSkeleton } from '../utils/SkeletonLoader'
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
}) => {
  
  
  
  
  const [vids, setVideos] = useState(videos || []);
  const [alert, setAlert] = useState({ open: false });
  const [videoModal, setVideoModal] = useState({
    open: false,
  });
  
  
  
  
  const [isLoading, setIsLoading] = useState(false);
  
  
  
  
  const actuallyIsLoading = false; 
  
  
  useEffect(() => {
    
    if (videos) {
      setVideos(Array.isArray(videos) ? videos : []);
    }
  }, [videos]);
  
  
  
  useOptimisticUI({
    key: SESSION_KEY_VIDEO_CARDS,
    data: videos,
    condition: (data) => Array.isArray(data) && data.length > 0
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

      {}
      {actuallyIsLoading && !vids.length && (
        <Box>
          <VideoListSkeleton 
            count={6} 
            columns={3}
          />
        </Box>
      )}
      
      {}
      {(
        <>
          {}
          {vids && vids.length > 0 ? (
            <>
              {}
              {}
              
              {}
              <Box 
                className="video-grid"
                sx={{ 
                  animation: 'fadeIn 0.5s ease-in-out',
                  '@keyframes fadeIn': {
                    '0%': { opacity: 0 },
                    '100%': { opacity: 1 }
                  },
                  
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
            </>
          ) : (
                        EMPTY_STATE()
          )}
        </>
      )}
    </Box>
  )
}

export default VideoCards
