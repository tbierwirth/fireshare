import React, { useRef, useState } from 'react'
import { useIsVisible } from 'react-is-visible'
import { Box, Typography, ButtonGroup, Button, IconButton } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import LinkIcon from '@mui/icons-material/Link'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import { getPublicWatchUrl, getUrl, toHHMMSS } from '../../common/utils'
import { VideoService } from '../../services'
import UpdateDetailsModal from '../modal/UpdateDetailsModal'
import { useAuth } from '../../contexts/AuthContext'

const URL = getUrl()
const PURL = getPublicWatchUrl()

const VisibilityCard = ({ 
  video, 
  openVideo, 
  handleAlert, 
  authenticated, 
  deleted,
  feedView = false
}) => {
  
  const { isAdmin } = useAuth()
  
  
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const nodeRef = useRef()
  useIsVisible(nodeRef)
  
  const handleViewClick = (e) => {
    // Don't stop propagation
    console.log('Video clicked:', video.video_id)
    openVideo(video.video_id)
  }

  
  const handleCopyLink = (e) => {
    e.stopPropagation()
    handleAlert({
      type: 'info',
      message: 'Link copied to clipboard',
      open: true,
    })
  }
  
  // Removed visibility toggle as all videos are now public
  
  
  const handleDetailsModalClose = (update) => {
    setDetailsModalOpen(false)
    
    if (update) {
      if (update === 'delete') {
        
        if (typeof deleted === 'function') {
          deleted(video.video_id)
        }
      } else {
        
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
        onClick={(e) => {
          console.log('Box clicked for video_id:', video.video_id);
          handleViewClick(e);
        }}
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
          },
          zIndex: 10 // Ensure clickable area is on top
        }}
      >
      {}
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
            minWidth: 0 
          }}
        >
          {video.info?.title || "No Title"}
        </Typography>
        {/* All videos are now public, no visibility toggle needed */}
      </ButtonGroup>

      {}
      <Box
        sx={{
          position: 'relative',
          width: '100% !important',
          pt: '56.25% !important', 
          backgroundColor: '#222',
          overflow: 'hidden',
          height: '0 !important', 
        }}
      >
        {}
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

        {}
        <img
          src={`${URL}/api/video/poster?id=${video.video_id}`}
          alt={video.info?.title || "Video thumbnail"}
          className="video-card-image"
          onClick={(e) => {
            console.log('Image clicked for video_id:', video.video_id);
            handleViewClick(e);
          }}
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 2,
            cursor: 'pointer'
          }}
          loading="eager"
        />

        {}
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

        {}
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

        {}
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