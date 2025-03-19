import * as React from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Modal from '@mui/material/Modal'
import CancelIcon from '@mui/icons-material/Cancel'
import DeleteIcon from '@mui/icons-material/Delete'
import { ButtonGroup, Stack, TextField, Typography, Divider, CircularProgress } from '@mui/material'
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
  // Use undefined for game during loading to prevent UI flash
  const [game, setGame] = React.useState(undefined)
  const [tags, setTags] = React.useState([])
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [gameLoading, setGameLoading] = React.useState(false)
  
  // Load video game and tags when modal opens
  React.useEffect(() => {
    // Create a flag to track whether the component is still mounted
    let isMounted = true;
    
    if (open && videoId) {
      // Reset state and set loading states
      setLoading(true);
      setGameLoading(true);
      setGame(undefined); // Use undefined to prevent UI flashing
      console.log("Loading video details for videoId:", videoId);
      
      // Use Promise.all to load game and tags in parallel
      Promise.all([
        // Load the game
        VideoService.getVideoGame(videoId)
          .then(response => {
            console.log("Game API response:", response.data);
            return response.data && response.data.game ? response.data.game : '';
          })
          .catch(error => {
            console.error('Error loading game:', error);
            return ''; // Default to empty string on error
          }),
          
        // Load the tags
        VideoService.getVideoTags(videoId)
          .then(response => {
            console.log("Tags API response:", response.data);
            return response.data && response.data.tags 
              ? response.data.tags.map(tag => tag.name) 
              : [];
          })
          .catch(error => {
            console.error('Error loading tags:', error);
            return []; // Default to empty array on error
          })
      ])
      .then(([gameValue, tagsValue]) => {
        // Only update state if component is still mounted
        if (isMounted) {
          console.log("Setting game to:", gameValue);
          setGame(gameValue);
          setTags(tagsValue);
          setGameLoading(false);
          setLoading(false);
        }
      });
    } else if (!open) {
      // Reset when modal closes
      setGame(undefined); // Reset to undefined instead of empty string
      setTags([]);
      setGameLoading(false);
      setLoading(false);
    }
    
    // Clean up function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [open, videoId])

  const onTitleChange = (e) => setTitle(e.target.value)
  const onDescriptionChange = (e) => setDescription(e.target.value)

  const handleClose = (update) => {
    setConfirmDelete(false)
    close(update)
  }

  const handleSave = async () => {
    // Don't allow saving if still loading game information
    if (game === undefined || gameLoading) {
      alertHandler({
        open: true,
        type: 'error',
        message: 'Please wait for game information to load before saving',
      });
      return;
    }
    
    // First update video details
    const update = {
      title: title || currentTitle,
      description: description || currentDescription,
    }
    try {
      await VideoService.updateDetails(videoId, update)
      
      // Then update game - ALWAYS send the game to ensure it's set
      // (The API will handle cases where game is empty by returning an appropriate error)
      console.log("Sending game update:", game)
      await VideoService.setVideoGame(videoId, game)
      
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
      console.error("Error saving video details:", err)
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
          
          {gameLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                Loading game information...
              </Typography>
              <CircularProgress size={20} />
            </Box>
          ) : (
            <GameSelector 
              initialGame={game}
              onChange={setGame}
              loading={gameLoading}
              sx={{ width: '100%', mb: 2 }}
            />
          )}
          
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
            disabled={game === ''}
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
