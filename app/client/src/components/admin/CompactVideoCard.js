import React from 'react'
import { Button, ButtonGroup, Grid, IconButton, InputBase, Typography, Box } from '@mui/material'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import VisibilityIcon from '@mui/icons-material/Visibility'
import EditIcon from '@mui/icons-material/Edit'
import LinkIcon from '@mui/icons-material/Link'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import { getPublicWatchUrl, getUrl, toHHMMSS, useDebounce } from '../../common/utils'
import VideoService from '../../services/VideoService'
import _ from 'lodash'
import UpdateDetailsModal from '../modal/UpdateDetailsModal'
import LightTooltip from '../misc/LightTooltip'
import { TagDisplay } from '../tags'

const URL = getUrl()
const PURL = getPublicWatchUrl()

const CompactVideoCard = ({ 
  video, 
  openVideoHandler, 
  alertHandler, 
  cardWidth, 
  cardHeight, 
  authenticated, 
  deleted,
  fitMode = 'cover', // New prop to control how image fits (cover, contain)
  onVideoLoaded = () => {}, // Callback when video poster image loads
  onVideoError = () => {}   // Callback when video poster fails to load
}) => {
  const [intVideo, setIntVideo] = React.useState(video)
  const [videoId, setVideoId] = React.useState(video.video_id)
  const [title, setTitle] = React.useState(video.info?.title)
  const [description, setDescription] = React.useState(video.info?.description)
  const [updatedTitle, setUpdatedTitle] = React.useState(null)
  const debouncedTitle = useDebounce(updatedTitle, 1500)
  // We keep track of hover state even though we disabled hover preview
  // for future use if we re-enable the feature
  const [hover, setHover] = React.useState(false) // eslint-disable-line no-unused-vars
  const [privateView, setPrivateView] = React.useState(video.info?.private)

  const [detailsModalOpen, setDetailsModalOpen] = React.useState(false)

  const previousVideoRef = React.useRef()
  const previousVideo = previousVideoRef.current
  if (!_.isEqual(video, previousVideo) && !_.isEqual(video, intVideo)) {
    setIntVideo(video)
    setVideoId(video.video_id)
    setTitle(video.info?.title)
    setDescription(video.info?.description)
    setPrivateView(video.info?.private)
    setUpdatedTitle(null)
  }
  React.useEffect(() => {
    previousVideoRef.current = video
  })

  // Disabled hover preview
  const debouncedMouseEnter = React.useRef(
    _.debounce(() => {
      // Do nothing - hover preview disabled
    }, 750),
  ).current

  const handleMouseLeave = () => {
    debouncedMouseEnter.cancel()
    // Keep hover state false
    setHover(false)
  }

  React.useEffect(() => {
    async function update() {
      try {
        await VideoService.updateTitle(video.video_id, debouncedTitle)
        setTitle(updatedTitle)
        alertHandler({
          type: 'success',
          message: 'Title Updated',
          open: true,
        })
      } catch (err) {
        alertHandler({
          type: 'error',
          message: 'An error occurred trying to update the title',
          open: true,
        })
      }
    }
    if (debouncedTitle && debouncedTitle !== title) {
      update()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTitle])

  const handleMouseDown = (e) => {
    if (e.button === 1) {
      window.open(`${PURL}${video.video_id}`, '_blank')
    }
  }

  const handlePrivacyChange = async () => {
    try {
      await VideoService.updatePrivacy(video.video_id, !privateView)
      alertHandler({
        type: privateView ? 'info' : 'warning',
        message: privateView ? `Added to your public feed` : `Removed from your public feed`,
        open: true,
      })
      setPrivateView(!privateView)
    } catch (err) {
      console.log(err)
    }
  }

  const handleDetailsModalClose = (update) => {
    setDetailsModalOpen(false)
    if (update) {
      if (update === 'delete') {
        deleted(videoId)
      } else {
        if (update.title !== title) setTitle(update.title)
        if (update.description !== description) setDescription(update.description)
      }
    }
  }

  // Get video dimensions or use standard 16:9 if not available
  let actualWidth = video.info?.width || 1920;  // Default to 1080p width if not specified
  let actualHeight = video.info?.height || 1080; // Default to 1080p height if not specified
  
  // Calculate the actual aspect ratio of this specific video
  // Use 16:9 (1.78) as fallback if calculations result in invalid values
  const aspectRatio = actualWidth && actualHeight ? actualWidth / actualHeight : 16/9;
  
  // Standard aspect ratio currently unused but kept for future aspect ratio calculations
  // eslint-disable-next-line no-unused-vars
  const standardAspectRatio = 16/9; // Standard video aspect ratio for uniform display
  
  // Handle percentage-based width (currently unused but kept for future width calculations)
  // eslint-disable-next-line no-unused-vars
  const numericWidth = typeof cardWidth === 'string' && cardWidth.includes('%')
    ? 300 // Default to 300px for calculating height when using percentage width 
    : cardWidth;
  
  // Only log in development and only occasionally to reduce noise
  if (process.env.NODE_ENV === 'development' && Math.random() < 0.01) {
    console.log(`Video ${video.video_id} dimensions:`, {
      width: actualWidth,
      height: actualHeight,
      actualAspectRatio: aspectRatio.toFixed(3),
      cardWidth: cardWidth
    });
  }

  return (
    <>
      <UpdateDetailsModal
        open={detailsModalOpen}
        close={handleDetailsModalClose}
        videoId={video.video_id}
        currentTitle={title || ''}
        currentDescription={description || ''}
        alertHandler={alertHandler}
      />

      <Box
        sx={{
          width: '100%',
          bgcolor: 'rgba(0, 0, 0, 0.2)',
          lineHeight: 0,
          borderRadius: '6px',
          overflow: 'hidden',
          boxShadow: 1,
          display: 'block',
          height: '100%',
          position: 'relative',
          zIndex: 1,
          '&:hover': {
            boxShadow: 3,
            transform: 'translateY(-4px)',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease'
          }
        }}
      >
        <ButtonGroup
          variant="contained"
          size="small"
          sx={{
            width: '100%',
            background: '#0b132b',
            display: 'flex',
            borderRadius: '6px 6px 0 0',
            '.MuiButtonGroup-grouped:not(:last-of-type)': {
              border: 'none',
            },
          }}
        >
          {authenticated && (
            <Button
              onClick={() => setDetailsModalOpen(true)}
              sx={{
                bgcolor: 'rgba(0,0,0,0)',
                borderBottomLeftRadius: 0,
                borderTopLeftRadius: '6px',
                m: 0,
              }}
            >
              <EditIcon />
            </Button>
          )}
          <LightTooltip
            title={title || ''}
            placement="bottom"
            enterDelay={1000}
            leaveDelay={500}
            enterNextDelay={1000}
            arrow
          >
            <InputBase
              sx={{
                pl: authenticated ? 0 : 1.5,
                pr: 1.5,
                width: '100%', // Use 100% for responsive layout
                bgcolor: 'rgba(0,0,0,0)',
                WebkitTextFillColor: '#fff',
                fontWeight: 575,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                '& .MuiInputBase-input.Mui-disabled': {
                  WebkitTextFillColor: '#fff',
                  fontWeight: 575,
                },
              }}
              placeholder="Video Title..."
              value={updatedTitle !== null ? updatedTitle : title}
              onChange={(e) => authenticated && setUpdatedTitle(e.target.value)}
              disabled={!authenticated}
              inputProps={{ 'aria-label': 'search google maps' }}
            />
          </LightTooltip>
          {authenticated && (
            <Button
              onClick={handlePrivacyChange}
              edge="end"
              sx={{
                borderBottomRightRadius: 0,
                borderTopRightRadius: '6px',
                bgcolor: 'rgba(0,0,0,0)',
                color: privateView ? '#FF2323B2' : '#2382FFB7',
                ':hover': {
                  bgcolor: privateView ? '#FF232340' : '#2382FF40',
                },
              }}
            >
              {privateView ? <VisibilityOffIcon /> : <VisibilityIcon />}
            </Button>
          )}
        </ButtonGroup>
        <Box
          sx={{
            lineHeight: 0,
            bgcolor: 'rgba(0,0,0,0)',
            p: 0,
            '&:last-child': { p: 0 },
          }}
        >
          <div
            style={{ position: 'relative', cursor: 'pointer' }}
            onClick={() => openVideoHandler(video.video_id)}
            onMouseEnter={debouncedMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={handleMouseDown}
          >
            {!video.available && (
              <Box
                sx={{ position: 'absolute', top: 0, left: 0, background: '#FF000060', width: '100%', height: '100%' }}
              >
                <Grid container direction="row" alignItems="center" sx={{ width: '100%', height: '100%' }}>
                  <Typography
                    variant="overline"
                    sx={{
                      width: '100%',
                      fontSize: 28,
                      fontWeight: 750,
                    }}
                    align="center"
                  >
                    File Missing
                  </Typography>
                </Grid>
              </Box>
            )}
            {/* Based on server code at line 187 in videos.py, we need to use the poster API endpoint */}
            {/* CRITICAL: Removed cache-busting to prevent image reload during resize */}
            {/* Hardcoded placeholder for testing */}
            <div 
              style={{ 
                position: 'absolute', 
                top: 0, left: 0, 
                width: '100%', 
                height: '100%', 
                backgroundColor: '#222',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                zIndex: 1,
                fontWeight: 'bold'
              }}
            >
              {video.video_id.substring(0, 8)}
            </div>
            
            {/* Direct img element - more reliable than React */}
            <img
              className="video-card-image"
              src={`${URL}/api/video/poster?id=${video.video_id}&no-cache=${Date.now()}`}
              alt="Poster"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: 2
              }}
              onLoad={(e) => {
                console.log(`Poster loaded for ${video.video_id}`);
                e.target.style.zIndex = 3; // Bring to front when loaded
                onVideoLoaded(e);
              }}
              onError={(e) => {
                console.error(`Failed to load poster for ${video.video_id}`, e);
                e.target.style.display = 'none'; // Hide if error
                onVideoError(e);
              }}
            />

            {/* Video hover preview disabled */}
            <Box sx={{ position: 'absolute', bottom: 3, left: 3 }}>
              <CopyToClipboard text={`${PURL}${video.video_id}`}>
                <IconButton
                  sx={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    '&:hover': {
                      background: '#2684FF88',
                    },
                  }}
                  aria-label="copy link"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation()
                    alertHandler({
                      type: 'info',
                      message: 'Link copied to clipboard',
                      open: true,
                    })
                  }}
                  onMouseDown={handleMouseDown}
                >
                  <LinkIcon />
                </IconButton>
              </CopyToClipboard>
            </Box>
            <Box sx={{ position: 'absolute', bottom: 39, right: 3 }}>
              <Typography
                variant="div"
                color="white"
                sx={{
                  p: 0.5,
                  fontWeight: 700,
                  fontSize: 12,
                  fontFamily: 'monospace',
                  background: 'rgba(0, 0, 0, 0.6)',
                  borderRadius: '4px',
                }}
              >
                {toHHMMSS(video.info.duration)}
              </Typography>
            </Box>
            <Box sx={{ position: 'absolute', bottom: 14, right: 3 }}>
              <Typography
                variant="div"
                color="white"
                sx={{
                  p: 0.5,
                  fontWeight: 700,
                  fontSize: 12,
                  fontFamily: 'monospace',
                  background: 'rgba(0, 0, 0, 0.6)',
                  borderRadius: '4px',
                }}
              >
                {`${video.view_count} ${video.view_count === 1 ? 'View' : 'Views'}`}
              </Typography>
            </Box>
            
            {/* Show tags if available */}
            {video.tags && video.tags.length > 0 && (
              <Box 
                sx={{ 
                  position: 'absolute', 
                  bottom: 3, 
                  right: 40, 
                  left: 40,
                  display: 'flex',
                  justifyContent: 'center',
                  maxWidth: cardWidth - 80,
                }}
              >
                <TagDisplay 
                  tags={video.tags} 
                  max={2} 
                  showCount={true}
                  sx={{ 
                    background: 'rgba(0, 0, 0, 0.6)',
                    borderRadius: '4px',
                    p: 0.5,
                  }}
                />
              </Box>
            )}
          </div>
        </Box>
      </Box>
    </>
  )
}

export default CompactVideoCard
