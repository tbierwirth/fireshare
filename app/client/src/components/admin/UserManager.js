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
import EditIcon from '@mui/icons-material/Edit';
import SnackbarAlert from '../alert/SnackbarAlert';
import useUserManagement from './hooks/useUserManagement';
import { useAuth } from '../../contexts';

const UserManager = () => {
  // Use the custom hook for user management
  const {
    // Data
    users,
    newUser,
    editingUser,
    
    // State
    isLoading,
    createDialogOpen,
    editDialogOpen,
    alert,
    
    // Mutations loading states
    isCreating,
    isUpdating,
    isDeleting,
    
    // State setters
    setNewUser,
    setEditingUser,
    setCreateDialogOpen,
    setEditDialogOpen,
    setAlert,
    
    // Actions
    handleCreateUser,
    handleEditUser,
    handleDeleteUser,
    handleEditClick,
  } = useUserManagement();

  // Helper functions for UI display
  const getRoleColor = (role) => {
    return role === 'admin' ? 'error' : 'primary';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'suspended':
        return 'warning';
      case 'deleted':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  // Get auth status directly
  const { isAdmin: authIsAdmin, user: authUser } = useAuth();
  
  // Log the current auth status for debugging
  console.log('UserManager - Component render state:', {
    users,
    isLoading,
    authIsAdmin,
    userRole: authUser?.role,
    rawIsAdmin: authUser?.isAdmin,
    createDialogOpen,
    editDialogOpen,
    isCreating,
    isUpdating,
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
        <Typography variant="h5">User Management</Typography>
        {/* Direct user creation button removed - users are created through invite system */}
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Username</TableCell>
              <TableCell>Display Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last Login</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  <CircularProgress size={40} />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Loading users...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.display_name || user.username}</TableCell>
                  <TableCell>{user.email || '-'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={user.role} 
                      color={getRoleColor(user.role)} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={user.status} 
                      color={getStatusColor(user.status)} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>{formatDate(user.last_login)}</TableCell>
                  <TableCell align="right">
                    <IconButton 
                      color="primary" 
                      onClick={() => handleEditClick(user)}
                      disabled={isDeleting} // Disable during delete operation
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      color="error" 
                      onClick={() => handleDeleteUser(user.id)}
                      disabled={isDeleting} // Disable during delete operation
                    >
                      {isDeleting ? <CircularProgress size={24} /> : <DeleteIcon />}
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create User Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => {
          if (!isCreating) {
            console.log('Closing create user dialog');
            setCreateDialogOpen(false);
          }
        }} 
        fullWidth
        keepMounted={true}
      >
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="username"
            label="Username"
            fullWidth
            variant="outlined"
            value={newUser.username}
            onChange={(e) => setNewUser({...newUser, username: e.target.value})}
            required
            disabled={isCreating}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            id="password"
            label="Password"
            type="password"
            fullWidth
            variant="outlined"
            value={newUser.password}
            onChange={(e) => setNewUser({...newUser, password: e.target.value})}
            required
            disabled={isCreating}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            id="email"
            label="Email Address"
            type="email"
            fullWidth
            variant="outlined"
            value={newUser.email}
            onChange={(e) => setNewUser({...newUser, email: e.target.value})}
            disabled={isCreating}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            id="display_name"
            label="Display Name"
            fullWidth
            variant="outlined"
            value={newUser.display_name}
            onChange={(e) => setNewUser({...newUser, display_name: e.target.value})}
            disabled={isCreating}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth variant="outlined" disabled={isCreating}>
            <InputLabel id="create-role-label">Role</InputLabel>
            <Select
              labelId="create-role-label"
              id="create-role-select"
              value={newUser.role}
              onChange={(e) => setNewUser({...newUser, role: e.target.value})}
              label="Role"
              IconComponent={KeyboardArrowDownIcon}
            >
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setCreateDialogOpen(false)} 
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateUser} 
            variant="contained" 
            color="primary"
            disabled={!newUser.username || !newUser.password || isCreating}
            startIcon={isCreating && <CircularProgress size={20} color="inherit" />}
          >
            {isCreating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      {editingUser && (
        <Dialog 
          open={editDialogOpen} 
          onClose={() => !isUpdating && setEditDialogOpen(false)} 
          fullWidth
        >
          <DialogTitle>Edit User: {editingUser.username}</DialogTitle>
          <DialogContent>
            <TextField
              margin="dense"
              id="edit_email"
              label="Email Address"
              type="email"
              fullWidth
              variant="outlined"
              value={editingUser.email || ''}
              onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
              disabled={isUpdating}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              id="edit_display_name"
              label="Display Name"
              fullWidth
              variant="outlined"
              value={editingUser.display_name || ''}
              onChange={(e) => setEditingUser({...editingUser, display_name: e.target.value})}
              disabled={isUpdating}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth variant="outlined" sx={{ mb: 2 }} disabled={isUpdating}>
              <InputLabel id="edit-role-label">Role</InputLabel>
              <Select
                labelId="edit-role-label"
                id="edit-role-select"
                value={editingUser.role || 'user'}
                onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                label="Role"
                IconComponent={KeyboardArrowDownIcon}
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth variant="outlined" disabled={isUpdating}>
              <InputLabel id="edit-status-label">Status</InputLabel>
              <Select
                labelId="edit-status-label"
                id="edit-status-select"
                value={editingUser.status || 'active'}
                onChange={(e) => setEditingUser({...editingUser, status: e.target.value})}
                label="Status"
                IconComponent={KeyboardArrowDownIcon}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
                <MenuItem value="deleted">Deleted</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setEditDialogOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleEditUser} 
              variant="contained" 
              color="primary"
              disabled={isUpdating}
              startIcon={isUpdating && <CircularProgress size={20} color="inherit" />}
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
};

export default UserManager;