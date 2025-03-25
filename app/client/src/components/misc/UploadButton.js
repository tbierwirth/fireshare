import React from 'react'
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, Divider, Typography } from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import { VideoService } from '../../services'
import { TagInput } from '../tags'
import SimpleGameSelector from './SimpleGameSelector'
import { useAuth } from '../../contexts/AuthContext'

// Utility function to get filename without extension (since we can't use Path directly)
const getFilenameWithoutExtension = (filename) => {
  if (!filename) return '';
  const parts = filename.split('.');
  // Remove the last part (extension) and join the rest
  return parts.slice(0, -1).join('.');
}

const UploadButton = ({ onSuccess }) => {
  
  const { isLoggedIn } = useAuth()
  
  const [selectedFile, setSelectedFile] = React.useState(null)
  const [selectedGame, setSelectedGame] = React.useState('')
  const [selectedTags, setSelectedTags] = React.useState([])
  const [showDialog, setShowDialog] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  // We track upload rate for future display enhancements
  const [uploadRate, setUploadRate] = React.useState(null) // eslint-disable-line no-unused-vars
  const [processingStatus, setProcessingStatus] = React.useState(null)
  const [processingProgress, setProcessingProgress] = React.useState(0)
  const [jobId, setJobId] = React.useState(null)
  const [processingJobActive, setProcessingJobActive] = React.useState(false)
  const statusIntervalRef = React.useRef(null)
  const fileInputRef = React.useRef()

  // When the button is clicked, open the file selector
  const handleButtonClick = () => {
    fileInputRef.current.click()
  }

  // When a file is selected via the input, show the tag dialog
  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
      setSelectedFile(file)
      setShowDialog(true)
    }
  }

  // Track upload progress
  const uploadProgress = (progress, rate) => {
    if (progress <= 1 && progress >= 0) {
      setProgress(progress)
      setUploadRate(rate)
    }
  }

  // Close the dialog and reset selected file if cancelled
  // Clean up interval on unmount
  React.useEffect(() => {
    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current)
      }
    }
  }, [])

  // Function to start polling for processing status
  const startProcessingStatusPolling = (id) => {
    setJobId(id)
    setProcessingJobActive(true)
    setProcessingStatus('processing')
    setProcessingProgress(0)

    // Clear any existing interval
    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current)
    }
    
    // Define the status check function
    const checkStatus = async () => {
      try {
        const response = await VideoService.checkProcessingStatus(id)
        const { status, progress } = response.data
        
        setProcessingStatus(status)
        setProcessingProgress(progress)

        // If processing is complete or failed, stop polling
        if (status === 'completed' || status === 'failed') {
          clearInterval(statusIntervalRef.current)
          statusIntervalRef.current = null
          
          // If completed, hide the dialog immediately
          if (status === 'completed') {
            // Close dialog and reset state immediately
            setProcessingJobActive(false)
            setShowDialog(false)
            
            // Notify success with processing completed
            if (onSuccess) {
              onSuccess({
                message: 'Video upload successful!',
                type: 'success',
                videoId: response.data.video_id,
                processingComplete: true,
                // Use quietRefresh to trigger a more targeted update
                quietRefresh: true
              })
            }
          } else {
            // If failed, show error message
            setProcessingJobActive(false)
            if (onSuccess) {
              onSuccess({
                message: `Processing failed: ${response.data.error || 'Unknown error'}`,
                type: 'error'
              })
            }
          }
        }
      } catch (error) {
        console.error('Error checking processing status:', error)
      }
    }
    
    // Check status immediately first
    checkStatus()
    
    // Then start polling at a consistent interval with ProcessingVideoCard
    statusIntervalRef.current = setInterval(checkStatus, 3000) // Poll every 3 seconds
  }

  const handleDialogClose = () => {
    // Don't close if processing is still active
    if (processingJobActive) {
      return
    }
    
    setShowDialog(false)
    setSelectedFile(null)
    setSelectedGame('')
    setSelectedTags([])
    
    // Clear any polling interval
    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current)
      statusIntervalRef.current = null
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Handle the upload when confirmed
  const handleUpload = async () => {
    if (!selectedFile || !selectedGame) return

    setUploading(true)
    setProgress(0)

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('game', selectedGame)
    // No need to set privacy as all videos are now public by default
    
    if (selectedTags && selectedTags.length > 0) {
      selectedTags.forEach(tag => {
        formData.append('tags[]', tag)
      })
    }

    try {
      let response
      
      if (isLoggedIn) {
        response = await VideoService.upload(formData, uploadProgress)
      } else {
        response = await VideoService.publicUpload(formData, uploadProgress)
      }
      
      setUploading(false)
      setProgress(1) // Set to 100% when upload is complete
      
      // Extract job_id from the response
      const { job_id } = response.data
      
      // If we have a job ID, close the dialog immediately and show processing card
      if (job_id) {
        // Close the dialog immediately after upload
        setShowDialog(false)
        setSelectedFile(null)
        setSelectedGame('')
        setSelectedTags([])
        
        // Show initial success message and create processing card
        if (onSuccess) {
          // Show a minimalist success message and add the processing card
          onSuccess({
            message: 'Video uploaded and processing started',
            type: 'success',
            jobId: job_id,
            videoId: response.data.video_id,
            videoTitle: getFilenameWithoutExtension(selectedFile.name),
            processingStarted: true
          })
        }
        
        // Start polling for processing status in the background
        startProcessingStatusPolling(job_id)
      } else {
        // If no job ID, just close dialog and show success
        setShowDialog(false)
        setSelectedFile(null)
        setSelectedGame('')
        setSelectedTags([])
        
        // Call success callback
        if (onSuccess) {
          onSuccess({
            message: 'Upload successful! Your video will be available shortly.',
            type: 'success'
          })
        }
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploading(false)
      
      if (onSuccess) {
        onSuccess({
          message: 'Upload failed. Please try again.',
          type: 'error'
        })
      }
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/mov"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {}
      <Button
        variant="contained"
        color="primary"
        startIcon={<CloudUploadIcon />}
        onClick={handleButtonClick}
        disabled={uploading}
      >
        {isLoggedIn ? "Upload My Clip" : "Upload New Clip"}
      </Button>

      {}
      <Dialog open={showDialog} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {uploading
            ? `Uploading... ${Math.round(progress * 100)}%` 
            : 'Categorize Your Video'
          }
        </DialogTitle>
        
        <DialogContent>
          {uploading ? (
            <>
              <Box sx={{ 
                width: '100%', 
                height: '30px', 
                position: 'relative',
                bgcolor: 'rgba(0, 0, 0, 0.1)',
                borderRadius: 1,
                overflow: 'hidden',
                mb: 2
              }}>
                <Box 
                  sx={{ 
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: `${progress * 100}%`,
                    bgcolor: 'primary.main',
                    transition: 'width 0.3s ease-in-out'
                  }}
                />
              </Box>
              <Typography variant="body2" align="center" sx={{ mt: 1 }}>
                Uploading your video... This may take a moment depending on file size.
              </Typography>
            </>
          ) : (
            <>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Please select the game this video is from and add any additional tags.
              </Typography>
              
              {}
              <SimpleGameSelector 
                initialGame={selectedGame || ''}
                onChange={(game) => setSelectedGame(game || '')}
                sx={{ width: '100%', mb: 2 }}
              />
              
              <Divider sx={{ my: 2 }} />
              
              {/* Additional Tags (Optional) */}
              <Typography variant="subtitle2" gutterBottom>
                Additional Tags (Optional)
              </Typography>
              
              <TagInput 
                onChange={setSelectedTags} 
                label="Tags" 
                sx={{ width: '100%', mt: 1 }} 
                initialTags={selectedTags}
              />
              
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Add optional tags like "funny", "highlight", or "tutorial" to make your videos easier to find.
              </Typography>
            </>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleDialogClose} disabled={uploading}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            variant="contained" 
            color="primary"
            disabled={!selectedGame || uploading}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default UploadButton