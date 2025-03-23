import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography, Paper } from '@mui/material';
import { VideoService } from '../../services';

/**
 * A placeholder card for videos that are still being processed
 * Polls the API for processing status and updates automatically
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
      // Start polling
      intervalId = setInterval(async () => {
        try {
          const response = await VideoService.checkProcessingStatus(jobId);
          const { status, progress } = response.data;
          
          setProcessingStatus(status);
          setProcessingProgress(progress);
          
          // If processing is complete, stop polling and notify parent
          if (status === 'completed') {
            clearInterval(intervalId);
            setPollingActive(false);
            if (onProcessingComplete) {
              onProcessingComplete(videoId);
            }
          } else if (status === 'failed') {
            clearInterval(intervalId);
            setPollingActive(false);
          }
        } catch (error) {
          console.error('Error checking processing status:', error);
        }
      }, 2000); // Poll every 2 seconds
    }
    
    // Cleanup on unmount
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [jobId, videoId, pollingActive, onProcessingComplete]);
  
  // Determine status message based on current state
  const getStatusMessage = () => {
    switch (processingStatus) {
      case 'queued':
        return 'Video queued for processing...';
      case 'processing':
        return `Processing video... ${processingProgress}%`;
      case 'completed':
        return 'Processing complete!';
      case 'failed':
        return 'Processing failed';
      default:
        return 'Processing...';
    }
  };
  
  return (
    <Paper 
      variant="outlined" 
      sx={{ 
        position: 'relative',
        height: 0,
        width: '100%', 
        paddingBottom: '56.25%', // 16:9 aspect ratio
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderRadius: 1
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
          padding: 2
        }}
      >
        <CircularProgress 
          variant="determinate" 
          value={processingProgress} 
          size={60}
          thickness={4}
          sx={{ mb: 2 }}
        />
        
        <Typography 
          variant="subtitle1" 
          align="center" 
          sx={{ 
            fontWeight: 'medium',
            mb: 1
          }}
        >
          {title || 'Processing Video'}
        </Typography>
        
        <Typography 
          variant="body2" 
          align="center" 
          color="text.secondary"
        >
          {getStatusMessage()}
        </Typography>
      </Box>
    </Paper>
  );
};

export default ProcessingVideoCard;