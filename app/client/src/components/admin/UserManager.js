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
import EditIcon from '@mui/icons-material/Edit';
import { AuthService } from '../../services';
import SnackbarAlert from '../alert/SnackbarAlert';

const UserManager = () => {
  const [users, setUsers] = useState([]);
  const [, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    email: '',
    display_name: '',
    role: 'user',
  });
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await AuthService.getUsers();
      setUsers(response.data.users);
    } catch (error) {
      setAlert({
        open: true,
        message: 'Failed to load users',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      const response = await AuthService.createUser(newUser);
      setUsers([...users, response.data.user]);
      setCreateDialogOpen(false);
      setNewUser({
        username: '',
        password: '',
        email: '',
        display_name: '',
        role: 'user',
      });
      
      setAlert({
        open: true,
        message: 'User created successfully',
        severity: 'success',
      });
    } catch (error) {
      setAlert({
        open: true,
        message: error.response?.data || 'Failed to create user',
        severity: 'error',
      });
    }
  };

  const handleEditUser = async () => {
    try {
      const response = await AuthService.updateUser(editingUser.id, {
        display_name: editingUser.display_name,
        email: editingUser.email,
        role: editingUser.role,
        status: editingUser.status,
      });
      
      setUsers(users.map(user => 
        user.id === editingUser.id ? response.data.user : user
      ));
      
      setEditDialogOpen(false);
      setEditingUser(null);
      
      setAlert({
        open: true,
        message: 'User updated successfully',
        severity: 'success',
      });
    } catch (error) {
      setAlert({
        open: true,
        message: error.response?.data || 'Failed to update user',
        severity: 'error',
      });
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }
    
    try {
      await AuthService.deleteUser(userId);
      setUsers(users.filter(user => user.id !== userId));
      
      setAlert({
        open: true,
        message: 'User deleted successfully',
        severity: 'success',
      });
    } catch (error) {
      setAlert({
        open: true,
        message: error.response?.data || 'Failed to delete user',
        severity: 'error',
      });
    }
  };

  const handleEditClick = (user) => {
    setEditingUser({...user});
    setEditDialogOpen(true);
  };

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
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => setCreateDialogOpen(true)}
        >
          Create New User
        </Button>
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
            {users.length === 0 ? (
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
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      color="error" 
                      onClick={() => handleDeleteUser(user.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} fullWidth>
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
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth variant="outlined">
            <InputLabel>Role</InputLabel>
            <Select
              value={newUser.role}
              onChange={(e) => setNewUser({...newUser, role: e.target.value})}
              label="Role"
            >
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateUser} 
            variant="contained" 
            color="primary"
            disabled={!newUser.username || !newUser.password}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      {editingUser && (
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth>
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
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={editingUser.role || 'user'}
                onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                label="Role"
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth variant="outlined">
              <InputLabel>Status</InputLabel>
              <Select
                value={editingUser.status || 'active'}
                onChange={(e) => setEditingUser({...editingUser, status: e.target.value})}
                label="Status"
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
                <MenuItem value="deleted">Deleted</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleEditUser} 
              variant="contained" 
              color="primary"
            >
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
};

export default UserManager;