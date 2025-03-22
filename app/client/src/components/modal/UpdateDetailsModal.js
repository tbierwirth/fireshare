import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Modal from '@mui/material/Modal';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import { ButtonGroup, Stack, TextField, Typography, Divider, CircularProgress, Skeleton } from '@mui/material';
import { VideoService } from '../../services';
import LightTooltip from '../misc/LightTooltip';
import { TagInput } from '../tags';
import GameSelector from '../tags/GameSelectorWithQuery';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { useVideoGame, useVideoTags } from '../../services/VideoQueryHooks';


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
};


const FieldSkeleton = ({ height = 56 }) => (
  <Skeleton 
    variant="rectangular" 
    width="100%" 
    height={height} 
    animation="wave"
    sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', borderRadius: 1 }} 
  />
);


const UpdateDetailsModal = ({ open, close, videoId, currentTitle, currentDescription, alertHandler }) => {
  
  const queryClient = useQueryClient();
  
  
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [tags, setTags] = React.useState([]);
  const [showDelete, setShowDelete] = React.useState(false);
  
  // Use React Query to fetch data
  const { data: gameData, isLoading: gameLoading } = useVideoGame(videoId);
  const { data: tagsData, isLoading: tagsLoading } = useVideoTags(videoId);
  
  // Set initial values when data is available
  React.useEffect(() => {
    if (!open) return;
    
    // Set title/description from props
    if (currentTitle !== undefined) {
      setTitle(currentTitle || '');
    }
    
    if (currentDescription !== undefined) {
      setDescription(currentDescription || '');
    }
    
    // Initialize tags when data is loaded
    if (tagsData?.data?.tags) {
      setTags(tagsData.data.tags.map(tag => tag.name));
    }
  }, [open, videoId, currentTitle, currentDescription, tagsData]);
  
  // Extract the game from the query result
  const game = gameData?.data?.game || '';
  
  // Reset state when modal closes
  React.useEffect(() => {
    if (!open) {
      setShowDelete(false);
    }
  }, [open]);
  
  // Mutation for saving changes
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Update details
      await VideoService.updateDetails(videoId, {
        title,
        description
      });
      
      // Update game
      await VideoService.setVideoGame(videoId, game);
      
      // Update tags if needed
      if (tags.length > 0) {
        await VideoService.addVideoTags(videoId, tags);
      }
    },
    onSuccess: () => {
      // Show success message
      alertHandler({
        open: true,
        type: 'success',
        message: 'Video updated successfully!'
      });
      
      
      queryClient.invalidateQueries(['videoDetails', videoId]);
      queryClient.invalidateQueries(['videoGame', videoId]);
      queryClient.invalidateQueries(['videoTags', videoId]);
      queryClient.invalidateQueries(['videos']);
      queryClient.invalidateQueries(['publicVideos']);
      
      
      close({
        title,
        description,
        game,
        tags
      });
    },
    onError: (error) => {
      console.error('Error saving video details:', error);
      alertHandler({
        open: true,
        type: 'error',
        message: error.response?.data?.error || 'Failed to update video'
      });
    }
  });
  
  
  const deleteMutation = useMutation({
    mutationFn: () => VideoService.delete(videoId),
    onSuccess: () => {
      alertHandler({
        open: true,
        type: 'success',
        message: 'Video deleted successfully'
      });
      
      
      queryClient.invalidateQueries(['videos']);
      queryClient.invalidateQueries(['publicVideos']);
      
      close('delete');
    },
    onError: (error) => {
      alertHandler({
        open: true,
        type: 'error',
        message: error.response?.data?.error || 'Failed to delete video'
      });
    }
  });
  
  
  const handleSave = () => {
    saveMutation.mutate();
  };
  
  
  const handleDelete = () => {
    deleteMutation.mutate();
  };
  
  
  const handleClose = () => {
    close(null);
  };
  
  
  const isLoading = gameLoading || tagsLoading || saveMutation.isPending || deleteMutation.isPending;
  
  
  if (!open) return null;
  
  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="modal-update-details-title"
      aria-describedby="modal-update-details-description"
    >
      <Box sx={style}>
        <Stack spacing={2}>
          <Typography variant="h6" component="h2" gutterBottom>
            Edit Video Details
          </Typography>
          
          {}
          <TextField
            id="modal-update-details-title"
            label="Video Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isLoading}
          />
          
          {}
          <TextField
            id="modal-update-details-description"
            label="Video Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={4}
            disabled={isLoading}
          />
          
          <Divider sx={{ my: 1 }} />
          
          <Typography variant="subtitle1" gutterBottom>
            Game
          </Typography>
          
          {}
          {gameLoading ? (
            <FieldSkeleton />
          ) : (
            <GameSelector
              initialGame={game} 
              onChange={(newGame) => {
                console.log('Game changed to:', newGame);
                
              }}
              disabled={isLoading}
            />
          )}
          
          <Typography variant="caption" color="text.secondary">
            The game this video is from. This will determine which folder the video appears in.
          </Typography>
          
          <Divider sx={{ my: 1 }} />
          
          <Typography variant="subtitle1" gutterBottom>
            Additional Tags
          </Typography>
          
          {}
          {tagsLoading ? (
            <FieldSkeleton height={80} />
          ) : (
            <TagInput
              initialTags={tags}
              onChange={(newTags) => setTags(newTags)}
              label="Tags (Optional)"
              disabled={isLoading}
            />
          )}
          
          <Typography variant="caption" color="text.secondary">
            Add optional tags like "funny", "highlight", or "tutorial" to make your videos easier to find.
          </Typography>
          
          {}
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isLoading || !game}
            sx={{ mt: 2 }}
          >
            {saveMutation.isPending ? (
              <CircularProgress size={24} />
            ) : (
              'Save Changes'
            )}
          </Button>
          
          <Divider sx={{ my: 1 }} />
          
          {}
          {showDelete ? (
            <ButtonGroup fullWidth>
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={() => setShowDelete(false)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <CircularProgress size={20} />
                ) : (
                  'Delete'
                )}
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
                onClick={() => setShowDelete(true)}
                disabled={isLoading}
              >
                Delete File
              </Button>
            </LightTooltip>
          )}
        </Stack>
      </Box>
    </Modal>
  );
};

export default UpdateDetailsModal;