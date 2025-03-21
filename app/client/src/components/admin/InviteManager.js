import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
// Import Material UI icons properly
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SnackbarAlert from '../alert/SnackbarAlert';
import useInviteManagement from './hooks/useInviteManagement';
import { useAuth } from '../../contexts';

const InviteManager = () => {
  // Use the custom hook for invite management
  const {
    // Data
    invites,
    email,
    expiresDays,
    
    // State
    isLoading,
    dialogOpen,
    alert,
    
    // Mutations loading states
    isCreating,
    isDeleting,
    
    // State setters
    setEmail,
    setExpiresDays,
    setDialogOpen,
    setAlert,
    
    // Actions
    handleCreateInvite,
    handleDeleteInvite,
    copyToClipboard,
    
    // Helpers
    getStatusColor,
    formatDate,
  } = useInviteManagement();

  // Get auth status directly
  const { isAdmin: authIsAdmin, user: authUser } = useAuth();
  
  // Log the current auth status for debugging
  console.log('InviteManager - Component render state:', {
    invites,
    isLoading,
    authIsAdmin,
    userRole: authUser?.role,
    rawIsAdmin: authUser?.isAdmin,
    dialogOpen,
    isCreating,
    isDeleting
  });

  return (
    <>
      <SnackbarAlert 
        open={alert.open} 
        severity={alert.severity} 
        setOpen={(open) => setAlert({ ...alert, open })}
      >
        {alert.message}
      </SnackbarAlert>
      
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">Invite Codes</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => {
            console.log('Opening create invite dialog');
            setDialogOpen(true);
          }}
        >
          Create New Invite
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Expires</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  <CircularProgress size={40} />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Loading invite codes...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : invites.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No invite codes found
                </TableCell>
              </TableRow>
            ) : (
              invites.map((invite) => (
                <TableRow key={invite.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {invite.code}
                      <IconButton 
                        size="small" 
                        onClick={() => copyToClipboard(invite.code)}
                        disabled={isDeleting}
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={invite.status} 
                      color={getStatusColor(invite.status)} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>{invite.email || 'Anyone'}</TableCell>
                  <TableCell>{formatDate(invite.created_at)}</TableCell>
                  <TableCell>{formatDate(invite.expires_at)}</TableCell>
                  <TableCell align="right">
                    {invite.status === 'valid' && (
                      <IconButton 
                        color="error" 
                        onClick={() => handleDeleteInvite(invite.id)}
                        disabled={isDeleting}
                      >
                        {isDeleting && invite.id === isDeleting ? (
                          <CircularProgress size={24} color="inherit" />
                        ) : (
                          <DeleteIcon />
                        )}
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog 
        open={dialogOpen} 
        onClose={() => {
          if (!isCreating) {
            console.log('Closing create invite dialog');
            setDialogOpen(false);
          }
        }}
        fullWidth
        keepMounted={true}
      >
        <DialogTitle>Create New Invite Code</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="email"
            label="Email Address (optional)"
            type="email"
            fullWidth
            variant="outlined"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            helperText="If provided, only this email can use the invite code"
            disabled={isCreating}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth variant="outlined" disabled={isCreating}>
            <InputLabel id="expires-label">Expires in</InputLabel>
            <Select
              labelId="expires-label"
              id="expires-select"
              value={expiresDays}
              onChange={(e) => setExpiresDays(e.target.value)}
              label="Expires in"
              IconComponent={KeyboardArrowDownIcon}
            >
              <MenuItem value={1}>1 day</MenuItem>
              <MenuItem value={7}>7 days</MenuItem>
              <MenuItem value={30}>30 days</MenuItem>
              <MenuItem value={90}>90 days</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDialogOpen(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateInvite} 
            variant="contained" 
            color="primary"
            disabled={isCreating}
            startIcon={isCreating && <CircularProgress size={20} color="inherit" />}
          >
            {isCreating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default InviteManager;