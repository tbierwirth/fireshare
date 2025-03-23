import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useGames, useTags } from '../../services/VideoQueryHooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { VideoService } from '../../services';
import { logger } from '../../common/logger';

const OrganizationSettings = () => {
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [dialog, setDialog] = useState({ open: false, type: '', item: null });
  const [editItem, setEditItem] = useState({ name: '' });

  const queryClient = useQueryClient();
  const { data: gamesData, isLoading: gamesLoading } = useGames('');
  const { data: tagsData, isLoading: tagsLoading } = useTags('');

  // Mutations
  const deleteTagMutation = useMutation({
    mutationFn: (tagId) => VideoService.deleteTag(tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      setAlert({
        open: true,
        message: 'Tag deleted successfully',
        severity: 'success'
      });
    },
    onError: (error) => {
      logger.error('OrganizationSettings', 'Error deleting tag', error);
      setAlert({
        open: true,
        message: `Failed to delete tag: ${error.response?.data || error.message}`,
        severity: 'error'
      });
    }
  });

  const updateGameMutation = useMutation({
    mutationFn: ({ gameId, name }) => {
      logger.debug('OrganizationSettings', 'Updating game', { gameId, name });
      return VideoService.updateGame(gameId, name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      setAlert({
        open: true,
        message: 'Game updated successfully',
        severity: 'success'
      });
    },
    onError: (error) => {
      logger.error('OrganizationSettings', 'Error updating game', error);
      setAlert({
        open: true,
        message: `Failed to update game: ${error.response?.data || error.message}`,
        severity: 'error'
      });
    }
  });

  const updateTagMutation = useMutation({
    mutationFn: ({ tagId, name }) => {
      logger.debug('OrganizationSettings', 'Updating tag', { tagId, name });
      return VideoService.updateTag(tagId, name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      setAlert({
        open: true,
        message: 'Tag updated successfully',
        severity: 'success'
      });
    },
    onError: (error) => {
      logger.error('OrganizationSettings', 'Error updating tag', error);
      setAlert({
        open: true,
        message: `Failed to update tag: ${error.response?.data || error.message}`,
        severity: 'error'
      });
    }
  });

  const handleDelete = async (type, id) => {
    try {
      if (type === 'tag') {
        await deleteTagMutation.mutateAsync(id);
      } else {
        // Games can't be deleted directly as they're required for videos
        setAlert({
          open: true,
          message: 'Games cannot be deleted as they are required for videos',
          severity: 'info'
        });
      }
    } catch (error) {
      // Error handling is done in the mutation callbacks
    }
  };

  const handleEdit = (type, item) => {
    setDialog({ open: true, type, item });
    setEditItem({ name: item.name });
  };

  const handleSaveEdit = async () => {
    try {
      const { type, item } = dialog;

      if (type === 'tag') {
        await updateTagMutation.mutateAsync({ tagId: item.id, name: editItem.name });
      } else if (type === 'game') {
        await updateGameMutation.mutateAsync({ gameId: item.id, name: editItem.name });
      }

      setDialog({ open: false, type: '', item: null });
    } catch (error) {
      // Error handling is done in the mutation callbacks
    }
  };

  // Handle errors gracefully
  const hasGamesError = !gamesLoading && !gamesData;
  const hasTagsError = !tagsLoading && !tagsData;
  
  const games = gamesData?.data?.games || [];
  // Only attempt to access tags data if we didn't get an error
  const tags = !hasTagsError ? (tagsData?.data?.tags || []) : [];

  const isLoading = gamesLoading || tagsLoading;

  // Log error details for debugging
  useEffect(() => {
    if (hasGamesError) {
      logger.error('OrganizationSettings', 'Failed to load games data', { gamesLoading, gamesData });
    }
    if (hasTagsError) {
      logger.error('OrganizationSettings', 'Failed to load tags data', { tagsLoading, tagsData });
    }
  }, [hasGamesError, hasTagsError, gamesLoading, tagsLoading, gamesData, tagsData]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Show error message if there was a problem loading data
  if (hasGamesError || hasTagsError) {
    return (
      <Box sx={{ mt: 3 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body1" gutterBottom>
            <strong>Database Table Loading Issue</strong>
          </Typography>
          <Typography variant="body2">
            {hasGamesError && "Failed to load games data. "}
            {hasTagsError && "Failed to load tags data. "}
            This could happen if the database tables haven't been fully initialized yet or if there's a temporary API issue.
          </Typography>
        </Alert>
        
        <Card sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>What to Do</Typography>
          
          <Typography variant="body2" paragraph>
            Try these troubleshooting steps in order:
          </Typography>
          
          <ol>
            <li>
              <Typography variant="body2" paragraph>
                <strong>Refresh the page</strong> - Sometimes this is a temporary issue that resolves itself.
              </Typography>
            </li>
            <li>
              <Typography variant="body2" paragraph>
                <strong>Try adding content first</strong> - Upload a video and assign a game to it, which may automatically create the required tables.
              </Typography>
            </li>
            <li>
              <Typography variant="body2" paragraph>
                <strong>Check server logs</strong> - Look for SQL errors or migration issues related to tag or game tables.
              </Typography>
            </li>
            <li>
              <Typography variant="body2" paragraph>
                <strong>Run database migrations</strong> - If you have command-line access, try running:
              </Typography>
              <Box sx={{ 
                bgcolor: '#f5f5f5', 
                p: 2, 
                borderRadius: 1,
                fontFamily: 'monospace',
                mb: 2
              }}>
                flask db upgrade
              </Box>
            </li>
          </ol>
        </Card>
        
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => window.location.reload()}
          startIcon={<RefreshIcon />}
        >
          Refresh Page
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Game and Tag Organization</Typography>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
        <Card sx={{ flex: 1, mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>Games</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Games are required for videos. Renaming a game will update all associated videos.
            </Typography>

            <Divider sx={{ my: 1 }} />

            <List>
              {games.map(game => (
                <ListItem key={game.id} divider>
                  <ListItemText
                    primary={game.name}
                    secondary={`${game.video_count || 0} videos`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" onClick={() => handleEdit('game', game)}>
                      <EditIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
              {games.length === 0 && (
                <ListItem>
                  <ListItemText primary="No games found" />
                </ListItem>
              )}
            </List>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>Tags</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Tags are optional categorizations. You can delete unused tags.
            </Typography>

            <Divider sx={{ my: 1 }} />

            <List>
              {tags.map(tag => (
                <ListItem key={tag.id} divider>
                  <ListItemText
                    primary={tag.name}
                    secondary={`${tag.video_count || 0} videos`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" onClick={() => handleEdit('tag', tag)} sx={{ mr: 1 }}>
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => handleDelete('tag', tag.id)}
                      disabled={tag.video_count > 0 || deleteTagMutation.isLoading}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
              {tags.length === 0 && (
                <ListItem>
                  <ListItemText primary="No tags found" />
                </ListItem>
              )}
            </List>
          </CardContent>
        </Card>
      </Box>

      {dialog.open && (
        <>
          <Box 
            sx={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              backgroundColor: 'rgba(0, 0, 0, 0.5)', 
              zIndex: 1299 
            }}
            onClick={() => setDialog({ ...dialog, open: false })}
          />
          <Card sx={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, maxWidth: '90%', zIndex: 1300, p: 2 }}>
            <Typography variant="h6" gutterBottom>Edit {dialog.type}</Typography>
            <Box sx={{ mt: 2, mb: 3 }}>
              <Typography gutterBottom>Name</Typography>
              <input
                type="text"
                style={{ width: '100%', padding: '8px', fontSize: '16px' }}
                value={editItem.name}
                onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                autoFocus
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button onClick={() => setDialog({ ...dialog, open: false })}>Cancel</Button>
              <Button 
                onClick={handleSaveEdit} 
                variant="contained" 
                color="primary"
                disabled={
                  (dialog.type === 'tag' && updateTagMutation.isLoading) || 
                  (dialog.type === 'game' && updateGameMutation.isLoading)
                }
              >
                Save
              </Button>
            </Box>
          </Card>
        </>
      )}

      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={() => setAlert({...alert, open: false})}
      >
        <Alert severity={alert.severity} onClose={() => setAlert({...alert, open: false})}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default OrganizationSettings;