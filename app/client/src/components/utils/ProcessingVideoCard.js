import React, { useState, useEffect, useMemo } from 'react';
import { Box, CircularProgress, Typography, Paper } from '@mui/material';
import { VideoService } from '../../services';

/**
 * A placeholder card for videos that are still being processed
 * Polls the API for processing status and updates automatically
 * Designed to look like a regular video card with an overlay
 */
const ProcessingVideoCard = ({ 
  jobId, 
  videoId, 
  title,
  onProcessingComplete
}) => {
  const [processingStatus, setProcessingStatus] = useState('processing');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [pollingActive, setPollingActive] = useState(true);
  
  // Poll for video processing status
  useEffect(() => {
    let intervalId = null;
    
    if (pollingActive && jobId) {
      // Initial status check immediately
      const checkStatus = async () => {
        try {
          const response = await VideoService.checkProcessingStatus(jobId);
          const { status, progress } = response.data;
          
          setProcessingStatus(status);
          setProcessingProgress(progress);
          
          // If processing is complete, stop polling and notify parent
          if (status === 'completed') {
            clearInterval(intervalId);
            setPollingActive(false);
            
            // Immediately notify parent to handle the completion
            if (onProcessingComplete) {
              console.log("Processing completed for videoId:", videoId);
              try {
                // Notify parent component about completion
                // The parent component (via useVideoProcessing) will handle
                // cache invalidation and UI updates
                onProcessingComplete(videoId);
              } catch (err) {
                console.error("Error handling processing completion:", err);
              }
            }
          } else if (status === 'failed') {
            clearInterval(intervalId);
            setPollingActive(false);
          }
        } catch (error) {
          console.error('Error checking processing status:', error);
        }
      };
      
      // Check immediately on mount
      checkStatus();
      
      // Start polling at a reasonable interval to reduce API load while still providing updates
      intervalId = setInterval(checkStatus, 3000); // Poll every 3 seconds
    }
    
    // Cleanup on unmount
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [jobId, videoId, pollingActive, onProcessingComplete]);
  
  // More subtle status message
  const getStatusMessage = () => {
    switch (processingStatus) {
      case 'queued':
        return 'Queued';
      case 'processing':
        return `${processingProgress}%`;
      case 'completed':
        return 'Complete!';
      case 'failed':
        return 'Failed';
      default:
        return 'Processing';
    }
  };
  
  // Generate poster URL if video processing is complete or close to complete
  const posterUrl = useMemo(() => {
    if (processingStatus === 'completed' || processingProgress >= 75) {
      return `/api/video/poster/${videoId}`;
    }
    return null;
  }, [videoId, processingStatus, processingProgress]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      {/* Header with title */}
      <Box
        sx={{
          background: '#0b132b',
          padding: 1,
          borderTopLeftRadius: '6px',
          borderTopRightRadius: '6px',
        }}
      >
        <Typography
          sx={{
            color: '#fff',
            fontWeight: 575,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: '14px',
          }}
        >
          {title || 'Processing Video...'}
        </Typography>
      </Box>

      {/* Processing indicator */}
      <Paper 
        variant="outlined" 
        sx={{ 
          position: 'relative',
          height: 0,
          width: '100%', 
          paddingBottom: '56.25%', // 16:9 aspect ratio
          backgroundColor: 'rgba(30, 30, 30, 0.7)',
          overflow: 'hidden',
          borderRadius: 0,
          borderBottomLeftRadius: '6px',
          borderBottomRightRadius: '6px',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundImage: posterUrl ? `url(${posterUrl})` : 'none',
          transition: 'all 0.3s ease',
          flexGrow: 1,
          // Removed colored borders for a cleaner look
          border: 'none',
          boxShadow: posterUrl ? '0 4px 8px rgba(0,0,0,0.2)' : 'none'
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 2,
            background: posterUrl 
              ? 'linear-gradient(to bottom, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.6))' 
              : 'linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7))',
            backdropFilter: 'blur(2px)'
          }}
        >
          <Box sx={{ 
            position: 'relative', 
            mb: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <CircularProgress 
              variant={processingProgress > 0 ? "determinate" : "indeterminate"}
              value={processingProgress} 
              size={60}
              thickness={4}
              sx={{ 
                mb: 1,
                color: processingStatus === 'completed' ? '#4caf50' : 
                       processingStatus === 'failed' ? '#f44336' : 
                       '#3f51b5',
                // Add nice animation for the progress
                animation: processingStatus === 'completed' ? 
                          'completedPulse 1.5s ease-in-out infinite' : 
                          'none',
                '@keyframes completedPulse': {
                  '0%': { boxShadow: '0 0 0 0 rgba(76, 175, 80, 0.5)' },
                  '70%': { boxShadow: '0 0 0 10px rgba(76, 175, 80, 0)' },
                  '100%': { boxShadow: '0 0 0 0 rgba(76, 175, 80, 0)' }
                }
              }}
            />
            {/* Percentage display removed as requested */}
            
            <Typography 
              variant="caption" 
              align="center" 
              color="text.secondary"
              sx={{
                px: 2,
                py: 0.5,
                borderRadius: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                fontWeight: 'medium',
                mt: 1,
                color: '#fff'
              }}
            >
              Processing...
            </Typography>
          </Box>
          
          <Typography variant="body2" sx={{ mt: 2, color: '#aaa', textAlign: 'center' }}>
            Processing video... This may take a moment.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default ProcessingVideoCard;