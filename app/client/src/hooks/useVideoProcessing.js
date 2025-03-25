import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useVideoCache } from '../services/VideoQueryHooks';

export const useVideoProcessing = () => {
  const [processingVideos, setProcessingVideos] = useState([]);
  const queryClient = useQueryClient();
  const { refreshVideos } = useVideoCache();

  // Add a new processing video
  const addProcessingVideo = useCallback((processingVideo) => {
    setProcessingVideos(prev => [
      ...prev, 
      {
        jobId: processingVideo.jobId,
        videoId: processingVideo.videoId,
        title: processingVideo.title || 'Processing Video',
        timestamp: new Date().getTime()
      }
    ]);
  }, []);

  // Handle upload result
  const handleUploadResult = useCallback((result) => {
    if (!result) return { message: null, success: false };
    
    if (result.type === 'success') {
      // If a video has started processing, add it to the state for a placeholder card
      if (result.processingStarted && result.jobId && result.videoId) {
        addProcessingVideo({
          jobId: result.jobId,
          videoId: result.videoId,
          title: result.videoTitle || 'New Video'
        });
        return { 
          message: result.message || 'Video upload started',
          success: true
        };
      } else if (result.processingComplete) {
        // If processing is already complete, just refresh the video list
        refreshVideos();
        return { 
          message: result.message || 'Video upload complete',
          success: true
        };
      }
    }
    
    return { 
      message: result.message,
      success: result.type === 'success'
    };
  }, [addProcessingVideo, refreshVideos]);

  // Handle processing completion with a simpler approach
  const handleProcessingComplete = useCallback((videoId) => {
    console.log("Processing completed for videoId:", videoId);
    
    // Simple approach that follows React Query best practices:
    // 1. Preserve session storage flags to prevent empty state flashes
    if (sessionStorage.getItem('route:feed:hasVideos')) {
      sessionStorage.setItem('route:feed:hasVideos', 'true');
    }
    if (sessionStorage.getItem('route:dashboard:hasVideos')) {
      sessionStorage.setItem('route:dashboard:hasVideos', 'true');
    }
    
    // 2. First use refreshVideos() to ensure data is available
    refreshVideos();
    
    // 3. After a brief delay, remove the processing video from state
    setTimeout(() => {
      setProcessingVideos(prev => prev.filter(v => v.videoId !== videoId));
    }, 1000); // Give time for the refresh to complete
  }, [refreshVideos]);

  return {
    processingVideos,
    addProcessingVideo,
    handleUploadResult,
    handleProcessingComplete
  };
};