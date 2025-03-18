import * as React from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Modal from '@mui/material/Modal'
import CancelIcon from '@mui/icons-material/Cancel'
import DeleteIcon from '@mui/icons-material/Delete'
import { ButtonGroup, Stack, TextField, Typography, Divider } from '@mui/material'
import { VideoService } from '../../services'
import LightTooltip from '../misc/LightTooltip'
import { TagInput, GameSelector } from '../tags'

//
const style = {
  position: 'absolute',
  top: '50%',
  left: '49.5%',
  transform: 'translate(-50%, -50%)',
  width: 500,
  background: '#0B2545',
  border: '2px solid #086BFF9B',
  boxShadow: 24,
  p: 4,
  maxHeight: '90vh',
  overflowY: 'auto'
}

const UpdateDetailsModal = ({ open, close, videoId, currentTitle, currentDescription, alertHandler }) => {
  const [title, setTitle] = React.useState(currentTitle)
  const [description, setDescription] = React.useState(currentDescription)
  const [game, setGame] = React.useState('')
  const [tags, setTags] = React.useState([])
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [, setLoading] = React.useState(false)
  
  // Load video game and tags when modal opens
  React.useEffect(() => {
    if (open && videoId) {
      setLoading(true)
      
      // Load the game
      VideoService.getVideoGame(videoId)
        .then(response => {
          if (response.data && response.data.game) {
            setGame(response.data.game)
          }
        })
        .catch(error => {
          console.error('Error loading game:', error)
        })
      
      // Load the tags
      VideoService.getVideoTags(videoId)
        .then(response => {
          if (response.data && response.data.tags) {
            setTags(response.data.tags.map(tag => tag.name))
          }
        })
        .catch(error => {
          console.error('Error loading tags:', error)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [open, videoId])

  const onTitleChange = (e) => setTitle(e.target.value)
  const onDescriptionChange = (e) => setDescription(e.target.value)

  const handleClose = (update) => {
    setConfirmDelete(false)
    close(update)
  }

  const handleSave = async () => {
    // First update video details
    const update = {
      title: title || currentTitle,
      description: description || currentDescription,
    }
    try {
      await VideoService.updateDetails(videoId, update)
      
      // Then update game
      if (game) {
        await VideoService.setVideoGame(videoId, game)
      }
      
      // Then update tags if provided
      if (tags.length > 0) {
        await VideoService.addVideoTags(videoId, tags)
      }
      
      alertHandler({
        open: true,
        type: 'success',
        message: 'Video details, game, and tags updated!',
      })
    } catch (err) {
      alertHandler({
        open: true,
        type: 'error',
        message: `${err.response?.data?.error || 'An unknown error occurred attempting to update the video'}`,
      })
    }
    handleClose({...update, game, tags})
  }

  const handleDelete = async () => {
    try {
      await VideoService.delete(videoId)
      alertHandler({
        open: true,
        type: 'success',
        message: 'Video has been deleted.',
      })
      handleClose('delete')
    } catch (err) {
      alertHandler({
        open: true,
        type: 'error',
        message: `${err.respnose?.data || 'An unknown error occurred attempting to delete the video'}`,
      })
    }
  }

  React.useEffect(() => {
    function update() {
      setTitle(currentTitle)
      setDescription(currentDescription)
    }
    update()
  }, [currentTitle, currentDescription])

  return (
    <Modal
      open={open}
      onClose={() => handleClose(null)}
      aria-labelledby="modal-update-details-title"
      aria-describedby="modal-update-details-description"
    >
      <Box sx={style}>
        <Stack spacing={2}>
          <Typography variant="h6" component="h2" gutterBottom>
            Edit Video Details
          </Typography>
          
          <TextField
            id="modal-update-details-title"
            label="Video Title"
            value={title !== null ? title : currentTitle}
            onChange={onTitleChange}
          />
          
          <TextField
            id="modal-update-details-description"
            label="Video Description"
            value={description !== null ? description : currentDescription}
            onChange={onDescriptionChange}
            multiline
            rows={4}
          />
          
          <Divider sx={{ my: 1 }} />
          
          <Typography variant="subtitle1" gutterBottom>
            Game
          </Typography>
          
          <GameSelector 
            initialGame={game}
            onChange={setGame}
            sx={{ width: '100%', mb: 2 }}
          />
          
          <Typography variant="caption" color="text.secondary">
            The game this video is from. This will determine which folder the video appears in.
          </Typography>
          
          <Divider sx={{ my: 1 }} />
          
          <Typography variant="subtitle1" gutterBottom>
            Additional Tags
          </Typography>
          
          <TagInput 
            initialTags={tags} 
            onChange={setTags}
            label="Tags (Optional)" 
          />
          
          <Typography variant="caption" color="text.secondary">
            Add optional tags like "funny", "highlight", or "tutorial" to make your videos easier to find.
          </Typography>
          
          <Button 
            variant="contained" 
            onClick={handleSave}
            disabled={!game}
            sx={{ mt: 2 }}
          >
            Save Changes
          </Button>

          <Divider sx={{ my: 1 }} />

          {confirmDelete ? (
            <ButtonGroup fullWidth>
              <Button variant="outlined" startIcon={<CancelIcon />} onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleDelete}>
                Delete
              </Button>
            </ButtonGroup>
          ) : (
            <LightTooltip
              title="This will delete the associated file, this action is not reverseable."
              placement="bottom"
              enterDelay={1000}
              leaveDelay={500}
              enterNextDelay={1000}
              arrow
            >
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => setConfirmDelete(true)}
              >
                Delete File
              </Button>
            </LightTooltip>
          )}
        </Stack>
      </Box>
    </Modal>
  )
}

export default UpdateDetailsModal
