import { Box, Button, Grid, Paper, Typography } from '@mui/material'
import React, { useCallback, useState, useEffect } from 'react'
import SnackbarAlert from '../alert/SnackbarAlert'
import VideoModal from '../modal/VideoModal'
import VideoListItem from './VideoListItem'
import SensorsIcon from '@mui/icons-material/Sensors'
import { VideoService } from '../../services'
import { VideoListSkeleton } from './SkeletonLoader'
import { useLoadingState, useOptimisticUI } from '../../hooks'
import UploadButton from '../misc/UploadButton'

const SESSION_KEY_VIDEO_LIST = 'component:videoList:hasShownVideos'

const VideoList = ({ videos, loadingIcon = null, feedView = false, authenticated }) => {
  
  const [vids, setVideos] = useState(videos || [])
  const [alert, setAlert] = useState({ open: false })
  const [videoModal, setVideoModal] = useState({
    open: false,
  })
  
  
  const [isLoading, setIsLoading] = useLoadingState({
    minDuration: 800,
    initialState: true,
    debounceToggles: true
  })
  
  
  useOptimisticUI({
    key: SESSION_KEY_VIDEO_LIST,
    data: videos,
    condition: (data) => Array.isArray(data) && data.length > 0
  })
  
  
  useEffect(() => {
    
    setVideos(videos || [])
    
    
    if (isLoading && videos) {
      
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
          <UploadButton 
            authenticated={authenticated}
            feedView={feedView}
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
      
      {}
      {isLoading && (
        <Box>
          <VideoListSkeleton 
            count={6} 
            columns={1}
          />
        </Box>
      )}
      
      {}
      {!isLoading && (
        <>
          {}
          {vids && vids.length > 0 ? (
            <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
              <Grid container>
                {vids.map((v, index) => (
                  <Grid 
                    key={v.path + v.video_id} 
                    item 
                    xs={12}
                    sx={{ 
                      opacity: 1, 
                      animation: `fadeIn 0.3s ease-in-out forwards ${index * 0.05}s`, 
                      '@keyframes fadeIn': {
                        '0%': { opacity: 0.7, transform: 'translateY(5px)' }, 
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
                        EMPTY_STATE()
          )}
        </>
      )}
    </Box>
  )
}

export default VideoList