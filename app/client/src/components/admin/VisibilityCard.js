import React, { useRef, useState } from 'react'
import { useIsVisible } from 'react-is-visible'
import { Box, Typography, ButtonGroup, Button, IconButton } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import LinkIcon from '@mui/icons-material/Link'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import { getPublicWatchUrl, getUrl, toHHMMSS } from '../../common/utils'
import { VideoService } from '../../services'
import UpdateDetailsModal from '../modal/UpdateDetailsModal'
import { useAuth } from '../../contexts/AuthContext'

const URL = getUrl()
const PURL = getPublicWatchUrl()

/**
 * Completely rewritten VisibilityCard with direct DOM rendering
 */
const VisibilityCard = ({ 
  video, 
  openVideo, 
  handleAlert, 
  authenticated, 
  deleted,
  feedView = false
}) => {
  // Get auth context to check if user is admin
  const { isAdmin } = useAuth()
  
  // Local state for modal and visibility
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const nodeRef = useRef()
  useIsVisible(nodeRef) // Keep the hook call to avoid breaking changes
  const [privateView, setPrivateView] = useState(video.info?.private)
  
  const handleViewClick = (e) => {
    e.stopPropagation()
    openVideo(video.video_id)
  }

  // Directly copy the URL when clicked
  const handleCopyLink = (e) => {
    e.stopPropagation()
    handleAlert({
      type: 'info',
      message: 'Link copied to clipboard',
      open: true,
    })
  }
  
  // Toggle video visibility
  const handleToggleVisibility = async (e) => {
    e.stopPropagation()
    try {
      await VideoService.updatePrivacy(video.video_id, !privateView)
      setPrivateView(!privateView)
      
      // Show success message
      handleAlert({
        type: privateView ? 'info' : 'warning',
        message: privateView ? `Added to your public feed` : `Removed from your public feed`,
        open: true,
      })
      
      // Update parent component if needed through a callback
      if (typeof video.handleUpdate === 'function') {
        video.handleUpdate({ id: video.video_id, private: !privateView })
      }
    } catch (err) {
      console.error('Error toggling visibility:', err)
      handleAlert({
        type: 'error',
        message: 'Failed to update visibility',
        open: true,
      })
    }
  }
  
  // Handle modal close with update handling
  const handleDetailsModalClose = (update) => {
    setDetailsModalOpen(false)
    
    if (update) {
      if (update === 'delete') {
        // Call delete handler if provided
        if (typeof deleted === 'function') {
          deleted(video.video_id)
        }
      } else {
        // Update local state if needed (currently not required)
      }
    }
  }

  return (
    <>
      <UpdateDetailsModal
        open={detailsModalOpen}
        close={handleDetailsModalClose}
        videoId={video.video_id}
        currentTitle={video.info?.title || ''}
        currentDescription={video.info?.description || ''}
        alertHandler={handleAlert}
      />
    
      <Box 
        ref={nodeRef}
        className="card-inner"
        onClick={handleViewClick}
        sx={{ 
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'block',
          cursor: 'pointer',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          transition: 'transform 0.2s ease-out, box-shadow 0.2s ease-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 6px 12px rgba(0,0,0,0.3)',
          }
        }}
      >
      {/* Title bar */}
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
          // Remove any default border styling
          '& .MuiButtonGroup-grouped': {
            borderRight: 'none',
            borderLeft: 'none',
          },
          zIndex: 5
        }}
      >
        {isAdmin && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              setDetailsModalOpen(true);
            }}
            sx={{
              bgcolor: 'rgba(0,0,0,0)',
              borderBottomLeftRadius: 0,
              borderTopLeftRadius: '6px',
              m: 0,
              border: 'none',
              borderRight: 'none'
            }}
          >
            <EditIcon />
          </Button>
        )}
        <Typography
          sx={{
            pl: authenticated ? 0 : 1.5,
            pr: 1.5,
            width: '100%',
            bgcolor: 'rgba(0,0,0,0)',
            color: '#fff',
            fontWeight: 575,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: '36px',
            fontSize: '14px',
            border: 'none',
            minWidth: 0 // Ensure text can shrink properly
          }}
        >
          {video.info?.title || "No Title"}
        </Typography>
        {/* Only show visibility toggle if admin AND not in feed view, or if it's your own video */}
        {(isAdmin || (authenticated && !feedView)) && (
          <Button
            edge="end"
            onClick={handleToggleVisibility}
            sx={{
              borderBottomRightRadius: 0,
              borderTopRightRadius: '6px',
              bgcolor: 'rgba(0,0,0,0)',
              color: privateView ? '#FF2323B2' : '#2382FFB7',
              border: 'none',
              borderLeft: 'none',
              ':hover': {
                bgcolor: privateView ? '#FF232340' : '#2382FF40',
              },
            }}
          >
            {privateView ? <VisibilityOffIcon /> : <VisibilityIcon />}
          </Button>
        )}
      </ButtonGroup>

      {/* Content area */}
      <Box
        sx={{
          position: 'relative',
          width: '100% !important',
          pt: '56.25% !important', // 16:9 aspect ratio
          backgroundColor: '#222',
          overflow: 'hidden',
          height: '0 !important', // Force aspect ratio through padding-top and height:0
        }}
      >
        {/* Video ID placeholder */}
        <Box
          sx={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#aaa'
          }}
        >
          {video.video_id.substring(0, 10)}
        </Box>

        {/* Actual poster image - with stable cache key to prevent reloading */}
        <img
          src={`${URL}/api/video/poster?id=${video.video_id}`}
          alt={video.info?.title || "Video thumbnail"}
          className="video-card-image"
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 2
          }}
          loading="eager"
        />

        {/* Copy link button */}
        <Box sx={{ position: 'absolute', bottom: 3, left: 3, zIndex: 3 }}>
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
              onClick={handleCopyLink}
            >
              <LinkIcon />
            </IconButton>
          </CopyToClipboard>
        </Box>

        {/* Duration info */}
        <Box sx={{ position: 'absolute', bottom: 39, right: 3, zIndex: 3 }}>
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

        {/* View count */}
        <Box sx={{ position: 'absolute', bottom: 14, right: 3, zIndex: 3 }}>
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
      </Box>
    </Box>
    </>
  )
}

export default VisibilityCard
