import { useState, useEffect } from 'react';
import { 
  useUsers, 
  useCreateUser, 
  useUpdateUser, 
  useDeleteUser 
} from '../../../services/AuthQueryHooks';
import { useAuth } from '../../../contexts';

/**
 * Custom hook for user management functionality
 * Combines React Query hooks with local state for a complete solution
 */
export default function useUserManagement() {
  // Authentication context
  const { isAdmin } = useAuth();
  
  // Local state for the create user dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    email: '',
    display_name: '',
    role: 'user',
  });
  
  // Local state for the edit user dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  // Local state for alerts
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  
  // Log admin status for debugging
  console.log('useUserManagement - Admin status:', { isAdmin });
  
  // Get users data with React Query
  const { 
    data: usersData, 
    isLoading: usersLoading, 
    isError: usersError,
    error: usersErrorData,
    refetch: refetchUsers,
  } = useUsers(isAdmin, {
    retry: 2,
    retryDelay: 1000,
    onError: (error) => {
      console.error('Error fetching users:', error);
      setAlert({
        open: true,
        message: 'Failed to load users. Please try again.',
        severity: 'error',
      });
    }
  });
  
  // Extract users from the response
  const users = usersData?.data?.users || [];
  
  // Use mutations for user operations
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();
  
  // Handle create user form submission
  const handleCreateUser = async () => {
    try {
      // Validate required fields
      if (!newUser.username || !newUser.password) {
        setAlert({
          open: true,
          message: 'Username and password are required',
          severity: 'error',
        });
        return;
      }
      
      console.log('USER MANAGEMENT - Creating user with data:', newUser);
      
      // Call the mutation
      const result = await createUserMutation.mutateAsync(newUser);
      console.log('USER MANAGEMENT - User creation successful:', result);
      
      // Close dialog and reset form
      setCreateDialogOpen(false);
      setNewUser({
        username: '',
        password: '',
        email: '',
        display_name: '',
        role: 'user',
      });
      
      // Show success message
      setAlert({
        open: true,
        message: 'User created successfully',
        severity: 'success',
      });
      
      // Refetch users list
      refetchUsers();
    } catch (error) {
      // Detailed error logging
      console.error('USER MANAGEMENT - Error creating user:', error);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        message: error.message
      });
      
      // Show error message
      setAlert({
        open: true,
        message: error.response?.data || error.message || 'Failed to create user',
        severity: 'error',
      });
    }
  };
  
  // Handle edit user form submission
  const handleEditUser = async () => {
    try {
      if (!editingUser) return;
      
      // Call the mutation
      await updateUserMutation.mutateAsync({
        userId: editingUser.id,
        userData: {
          display_name: editingUser.display_name,
          email: editingUser.email,
          role: editingUser.role,
          status: editingUser.status,
        }
      });
      
      // Close dialog and reset form
      setEditDialogOpen(false);
      setEditingUser(null);
      
      // Show success message
      setAlert({
        open: true,
        message: 'User updated successfully',
        severity: 'success',
      });
      
      // Refetch users list
      refetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      
      // Show error message
      setAlert({
        open: true,
        message: error.response?.data || 'Failed to update user',
        severity: 'error',
      });
    }
  };
  
  // Handle delete user
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }
    
    try {
      // Call the mutation
      await deleteUserMutation.mutateAsync(userId);
      
      // Show success message
      setAlert({
        open: true,
        message: 'User deleted successfully',
        severity: 'success',
      });
      
      // Refetch users list
      refetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      
      // Show error message
      setAlert({
        open: true,
        message: error.response?.data || 'Failed to delete user',
        severity: 'error',
      });
    }
  };
  
  // Handle opening the edit dialog
  const handleEditClick = (user) => {
    setEditingUser({...user});
    setEditDialogOpen(true);
  };
  
  // Effect to handle errors from the query
  useEffect(() => {
    if (usersError && usersErrorData) {
      setAlert({
        open: true,
        message: usersErrorData.message || 'Failed to load users',
        severity: 'error',
      });
    }
  }, [usersError, usersErrorData]);
  
  // Return everything needed for user management
  return {
    // Data
    users,
    newUser,
    editingUser,
    
    // State
    isLoading: usersLoading,
    isError: usersError,
    createDialogOpen,
    editDialogOpen,
    alert,
    
    // Mutations loading states
    isCreating: createUserMutation.isLoading,
    isUpdating: updateUserMutation.isLoading,
    isDeleting: deleteUserMutation.isLoading,
    
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
    refetchUsers,
  };
}