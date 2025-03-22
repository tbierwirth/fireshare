import React from 'react'
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, Divider, Typography } from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import { VideoService } from '../../services'
import { TagInput } from '../tags'
import SimpleGameSelector from './SimpleGameSelector'
import { useAuth } from '../../contexts/AuthContext'

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
  const handleDialogClose = () => {
    setShowDialog(false)
    setSelectedFile(null)
    setSelectedGame('')
    setSelectedTags([])
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
    
    
    if (selectedTags && selectedTags.length > 0) {
      selectedTags.forEach(tag => {
        formData.append('tags[]', tag)
      })
    }

    try {
      
      if (isLoggedIn) {
        
        await VideoService.upload(formData, uploadProgress)
      } else {
        
        await VideoService.publicUpload(formData, uploadProgress)
      }
      
      setShowDialog(false)
      setUploading(false)
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
    } catch (error) {
      console.error('Upload error:', error)
      setUploading(false)
      
      if (onSuccess) {
        onSuccess({
          message: 'Upload failed. Please try again.',
          type: 'error'
        })
      }
    }
    
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
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
          {uploading ? `Uploading... ${Math.round(progress * 100)}%` : 'Categorize Your Video'}
        </DialogTitle>
        
        <DialogContent>
          {uploading ? (
            <Box sx={{ 
              width: '100%', 
              height: '30px', 
              position: 'relative',
              bgcolor: 'rgba(0, 0, 0, 0.1)',
              borderRadius: 1,
              overflow: 'hidden'
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