import React, { useRef } from 'react'
import { useIsVisible } from 'react-is-visible'
import { Grid, Box, Skeleton } from '@mui/material'
import CompactVideoCard from './CompactVideoCard'

const DEFAULT_PLACEHOLDER_BG = '#0B2545'; // Dark blue background color

/**
 * Simplified VisibilityCard with reliable placeholders to prevent empty cards
 */
const VisibilityCard = ({ video, openVideo, handleAlert, cardWidth, authenticated, openDetailsModal, deleted }) => {
  const nodeRef = useRef()
  const isVisible = useIsVisible(nodeRef)
  
  // Simplified component with no state management

  // Calculate height based on video aspect ratio
  const previewVideoHeight =
    video.info?.width && video.info?.height ? cardWidth * (video.info.height / video.info.width) : cardWidth / 1.77
  
  // Placeholder card that's shown until content is ready
  const PlaceholderCard = () => (
    <Box sx={{ 
      width: cardWidth, 
      height: previewVideoHeight + 120, // Add space for title and controls
      bgcolor: DEFAULT_PLACEHOLDER_BG,
      borderRadius: 1,
      overflow: 'hidden',
      boxShadow: 1,
      border: '1px solid rgba(51, 153, 255, 0.68)'
    }}>
      {/* Thumbnail area */}
      <Box sx={{
        height: previewVideoHeight,
        bgcolor: 'rgba(255, 255, 255, 0.05)', 
        borderBottom: '1px solid rgba(51, 153, 255, 0.28)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Skeleton 
          variant="rectangular" 
          width="100%" 
          height="100%" 
          animation="wave"
          sx={{ bgcolor: 'rgba(255, 255, 255, 0.08)' }} 
        />
      </Box>
      
      {/* Title area */}
      <Box sx={{ p: 1.5 }}>
        <Skeleton 
          variant="text" 
          width="80%" 
          height={20} 
          animation="wave"
          sx={{ mb: 1, bgcolor: 'rgba(255, 255, 255, 0.08)' }} 
        />
        
        {/* Action buttons */}
        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
          <Skeleton 
            variant="rectangular" 
            width={60} 
            height={30} 
            animation="wave"
            sx={{ borderRadius: 1, bgcolor: 'rgba(255, 255, 255, 0.05)' }} 
          />
          <Skeleton 
            variant="circular" 
            width={30} 
            height={30} 
            animation="wave"
            sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)' }} 
          />
        </Box>
      </Box>
    </Box>
  );
  
  return (
    <Grid item sx={{ width: cardWidth, ml: 0.75, mr: 0.75, mb: 1.5, position: 'relative' }} ref={nodeRef}>
      {/* Always show a placeholder so we never have empty cards */}
      <PlaceholderCard />
      
      {/* When visible, load the actual content on top */}
      {isVisible && (
        <Box 
          sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 2
          }}
        >
          <CompactVideoCard
            visible={true}
            video={video}
            openVideoHandler={openVideo}
            alertHandler={handleAlert}
            cardWidth={cardWidth}
            authenticated={authenticated}
            openDetailsModal={openDetailsModal}
            deleted={deleted}
          />
        </Box>
      )}
    </Grid>
  )
}
export default VisibilityCard
