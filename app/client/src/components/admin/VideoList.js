import { Box, Button, Grid, Paper, Typography } from '@mui/material'
import React, { useCallback, useState, useEffect, useRef } from 'react'
import SnackbarAlert from '../alert/SnackbarAlert'
import VideoModal from '../modal/VideoModal'
import VideoListItem from './VideoListItem'
import SensorsIcon from '@mui/icons-material/Sensors'
import { VideoService } from '../../services'
import UploadCard from './UploadCard'
import { VideoListSkeleton } from '../utils/SkeletonLoader'
import { useLoadingState, useOptimisticUI } from '../../hooks'

// Session storage key to track if this component has shown videos before
const SESSION_KEY_VIDEO_LIST = 'component:videoList:hasShownVideos'

/**
 * Enhanced VideoList component with improved loading state management
 * using custom hooks for smoother transitions
 */
const VideoList = ({ videos, loadingIcon = null, feedView = false, authenticated }) => {
  // Track component state
  const [vids, setVideos] = useState(videos || [])
  const [alert, setAlert] = useState({ open: false })
  const [videoModal, setVideoModal] = useState({
    open: false,
  })
  
  // Use our custom loading state hook (manages minimum duration and debouncing)
  const [isLoading, setIsLoading, isFirstLoad] = useLoadingState({
    minDuration: 800,
    initialState: true,
    debounceToggles: true
  })
  
  // Use our optimistic UI hook to track if videos have been shown before
  const hadVideos = useOptimisticUI({
    key: SESSION_KEY_VIDEO_LIST,
    data: videos,
    condition: (data) => Array.isArray(data) && data.length > 0
  })
  
  // Update videos when the prop changes
  useEffect(() => {
    // Update local state without transitions
    setVideos(videos || [])
    
    // Signal that loading is complete after receiving videos
    if (isLoading && videos) {
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setIsLoading(false)
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [videos, isLoading, setIsLoading])

  const openVideo = (id) => {
    setVideoModal({
      open: true,
      id,
    })
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
      {!loadingIcon && (
        <Grid container justifyContent="center">
          <UploadCard
            authenticated={authenticated}
            feedView={feedView}
            cardWidth={250}
            handleAlert={memoizedHandleAlert}
            publicUpload={feedView}
          />
        </Grid>
      )}
    </Paper>
  )

  return (
    <Box>
      <VideoModal
        open={videoModal.open}
        onClose={() => setVideoModal({ open: false })}
        videoId={videoModal.id}
        feedView={feedView}
        authenticated={authenticated}
        updateCallback={handleUpdate}
      />

      <SnackbarAlert severity={alert.type} open={alert.open} setOpen={(open) => setAlert({ ...alert, open })}>
        {alert.message}
      </SnackbarAlert>
      
      {/* Always show skeletons during loading */}
      {isLoading && (
        <Box>
          <VideoListSkeleton 
            count={6} 
            columns={1}
          />
        </Box>
      )}
      
      {/* After loading is complete, show appropriate content */}
      {!isLoading && (
        <>
          {/* Show videos if available */}
          {vids && vids.length > 0 ? (
            <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
              <Grid container>
                {vids.map((v, index) => (
                  <Grid 
                    key={v.path + v.video_id} 
                    item 
                    xs={12}
                    sx={{ 
                      opacity: 0,
                      animation: `fadeIn 0.5s ease-in-out forwards ${index * 0.1}s`,
                      '@keyframes fadeIn': {
                        '0%': { opacity: 0, transform: 'translateY(10px)' },
                        '100%': { opacity: 1, transform: 'translateY(0)' }
                      }
                    }}
                  >
                    <VideoListItem
                      video={v}
                      openVideoHandler={openVideo}
                      alertHandler={memoizedHandleAlert}
                      feedView={feedView}
                      authenticated={authenticated}
                      deleted={handleDelete}
                    />
                  </Grid>
                ))}
              </Grid>
            </Paper>
          ) : (
            /* Show empty state if no videos available */
            EMPTY_STATE()
          )}
        </>
      )}
    </Box>
  )
}

export default VideoList
