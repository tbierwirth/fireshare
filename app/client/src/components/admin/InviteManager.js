import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { AuthService } from '../../services';
import SnackbarAlert from '../alert/SnackbarAlert';

const InviteManager = () => {
  const [invites, setInvites] = useState([]);
  const [, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [expiresDays, setExpiresDays] = useState(7);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    loadInvites();
  }, []);

  const loadInvites = async () => {
    try {
      setLoading(true);
      const response = await AuthService.getInvites();
      setInvites(response.data.invites);
    } catch (error) {
      setAlert({
        open: true,
        message: 'Failed to load invites',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async () => {
    try {
      const response = await AuthService.createInvite(email, expiresDays);
      setInvites([response.data.invite, ...invites]);
      setDialogOpen(false);
      setEmail('');
      setExpiresDays(7);
      
      setAlert({
        open: true,
        message: 'Invite code created successfully',
        severity: 'success',
      });
    } catch (error) {
      setAlert({
        open: true,
        message: 'Failed to create invite code',
        severity: 'error',
      });
    }
  };

  const handleDeleteInvite = async (inviteId) => {
    try {
      await AuthService.deleteInvite(inviteId);
      setInvites(invites.filter(invite => invite.id !== inviteId));
      
      setAlert({
        open: true,
        message: 'Invite code deleted',
        severity: 'success',
      });
    } catch (error) {
      setAlert({
        open: true,
        message: 'Failed to delete invite code',
        severity: 'error',
      });
    }
  };

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    setAlert({
      open: true,
      message: 'Invite code copied to clipboard',
      severity: 'info',
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'valid':
        return 'success';
      case 'used':
        return 'secondary';
      case 'expired':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

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
          onClick={() => setDialogOpen(true)}
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
            {invites.length === 0 ? (
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
                      <IconButton size="small" onClick={() => copyToClipboard(invite.code)}>
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
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
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
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth variant="outlined">
            <InputLabel>Expires in</InputLabel>
            <Select
              value={expiresDays}
              onChange={(e) => setExpiresDays(e.target.value)}
              label="Expires in"
            >
              <MenuItem value={1}>1 day</MenuItem>
              <MenuItem value={7}>7 days</MenuItem>
              <MenuItem value={30}>30 days</MenuItem>
              <MenuItem value={90}>90 days</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateInvite} variant="contained" color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default InviteManager;