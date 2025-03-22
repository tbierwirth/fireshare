import React from 'react'
import { Box, Grid, Paper, Stack, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button, Divider } from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import styled from '@emotion/styled'
import { VideoService } from '../../services'
import { getSetting } from '../../common/utils'
import { TagInput, GameSelector } from '../tags'

const Input = styled('input')({
  display: 'none',
})

const numberFormat = new Intl.NumberFormat('en-US')

const UploadCard = ({ authenticated, feedView = false, publicUpload = false, fetchVideos, cardWidth, handleAlert }) => {
  const cardHeight = cardWidth / 1.77 + 32
  const [selectedFile, setSelectedFile] = React.useState()
  const [isSelected, setIsSelected] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [uploadRate, setUploadRate] = React.useState()
  const [showTagDialog, setShowTagDialog] = React.useState(false)
  const [selectedGame, setSelectedGame] = React.useState('')
  const [selectedTags, setSelectedTags] = React.useState([])

  const uiConfig = getSetting('ui_config')

  const changeHandler = (event) => {
    setProgress(0)
    const file = event.target.files[0]
    setSelectedFile(file)
    
    
    if (file) {
      setShowTagDialog(true)
    }
  }

  const uploadProgress = (progress, rate) => {
    if (progress <= 1 && progress >= 0) {
      setProgress(progress)
      setUploadRate((prev) => ({ ...rate }))
    }
  }

  
  const dropHandler = (event) => {
    event.preventDefault()
    setProgress(0)
    const file = event.dataTransfer.files[0]
    setSelectedFile(file)
    
    
    if (file) {
      setShowTagDialog(true)
    }
  }
  
  
  const handleDialogClose = (shouldUpload = false) => {
    setShowTagDialog(false)
    if (!shouldUpload) {
      setSelectedFile(null)
    } else {
      setIsSelected(true)
    }
  }

  
  const dragOverHandler = (event) => {
    event.preventDefault()
  }

  React.useEffect(() => {
    async function upload() {
      const formData = new FormData()
      formData.append('file', selectedFile)
      
      
      formData.append('game', selectedGame)
      
      
      if (selectedTags && selectedTags.length > 0) {
        selectedTags.forEach(tag => {
          formData.append('tags[]', tag)
        })
      }
      
      try {
        if (publicUpload) {
          await VideoService.publicUpload(formData, uploadProgress)
        }
        if (!publicUpload && authenticated) {
          await VideoService.upload(formData, uploadProgress)
        }
        handleAlert({
          type: 'success',
          message: 'Your upload will be available in a few seconds.',
          autohideDuration: 3500,
          open: true,
          onClose: () => fetchVideos(),
        })
      } catch (err) {
        handleAlert({
          type: 'error',
          message: `An error occurred while uploading your video.`,
          open: true,
        })
      }
      setProgress(0)
      setUploadRate(null)
      setIsSelected(false)
      setSelectedGame('')
      setSelectedTags([])
    }
    if (isSelected && selectedFile) upload()
    // eslint-disable-next-line
  }, [isSelected])

  if (feedView && !uiConfig?.show_public_upload) return null
  if (!feedView && !uiConfig?.show_admin_upload) return null

  return (
    <Grid item sx={{ ml: 0.75, mr: 0.75, mb: 1.5 }}>
      <label htmlFor="icon-button-file">
        {/* Add onDrop and onDragOver handlers */}
        <Paper
          sx={{
            position: 'relative',
            width: cardWidth,
            height: cardHeight,
            cursor: 'pointer',
            background: 'rgba(0,0,0,0)',
            overflow: 'hidden',
          }}
          variant="outlined"
          onDrop={dropHandler}
          onDragOver={dragOverHandler}
        >
          <Box sx={{ display: 'flex', p: 2, height: '100%' }} justifyContent="center" alignItems="center">
            <Stack sx={{ zIndex: 0, width: '100%' }} alignItems="center">
              {!isSelected && (
                <Input
                  id="icon-button-file"
                  accept="video/mp4,video/webm,video/mov"
                  type="file"
                  name="file"
                  onChange={changeHandler}
                />
              )}
              <CloudUploadIcon sx={{ fontSize: 75 }} />
              {progress !== 0 && progress !== 1 && (
                <>
                  <Typography component="div" variant="overline" align="center" sx={{ fontWeight: 600, fontSize: 16 }}>
                    Uploading... {(100 * progress).toFixed(0)}%
                  </Typography>
                  <Typography variant="overline" align="center" sx={{ fontWeight: 600, fontSize: 12 }}>
                    {numberFormat.format(uploadRate.loaded.toFixed(0))} /{' '}
                    {numberFormat.format(uploadRate.total.toFixed(0))} MB's
                  </Typography>
                </>
              )}
              {progress === 1 && (
                <Typography component="div" variant="overline" align="center" sx={{ fontWeight: 600, fontSize: 16 }}>
                  Processing...
                  <Typography
                    component="span"
                    variant="overline"
                    align="center"
                    display="block"
                    sx={{ fontWeight: 400, fontSize: 12 }}
                  >
                    This may take a few minutes
                  </Typography>
                </Typography>
              )}
            </Stack>
          </Box>
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              zIndex: -1,
              height: cardHeight,
              width: cardWidth * progress,
              backgroundImage: 'linear-gradient(90deg, #BC00E6DF, #FF3729D9)',
              borderRadius: '10px',
            }}
          />
        </Paper>
      </label>
      
      {}
      <Dialog open={showTagDialog} onClose={() => handleDialogClose(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Categorize Your Video</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Please select the game this video is from and add any additional tags.
          </Typography>
          
          {}
          <GameSelector 
            initialGame={selectedGame}
            onChange={setSelectedGame}
            sx={{ width: '100%', mb: 2 }}
          />
          
          <Divider sx={{ my: 2 }} />
          
          {}
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleDialogClose(false)}>Cancel</Button>
          <Button 
            onClick={() => handleDialogClose(true)} 
            variant="contained" 
            color="primary"
            disabled={!selectedGame}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default UploadCard
