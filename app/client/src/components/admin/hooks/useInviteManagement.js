import { useState, useEffect } from 'react';
import { 
  useInvites, 
  useCreateInvite, 
  useDeleteInvite 
} from '../../../services/AuthQueryHooks';
import { useAuth } from '../../../contexts';

/**
 * Custom hook for invite management functionality
 * Combines React Query hooks with local state for a complete solution
 */
export default function useInviteManagement() {
  // Authentication context
  const { isAdmin } = useAuth();
  
  // Local state for the create invite dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [expiresDays, setExpiresDays] = useState(7);
  
  // Local state for alerts
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  
  // Log admin status for debugging
  console.log('useInviteManagement - Admin status:', { isAdmin });
  
  // Get invites data with React Query
  const { 
    data: invitesData, 
    isLoading: invitesLoading, 
    isError: invitesError,
    error: invitesErrorData,
    refetch: refetchInvites,
  } = useInvites(isAdmin, {
    retry: 2,
    retryDelay: 1000,
    onError: (error) => {
      console.error('Error fetching invites:', error);
      setAlert({
        open: true,
        message: 'Failed to load invite codes. Please try again.',
        severity: 'error',
      });
    }
  });
  
  // Extract invites from the response
  const invites = invitesData?.data?.invites || [];
  
  // Use mutations for invite operations
  const createInviteMutation = useCreateInvite();
  const deleteInviteMutation = useDeleteInvite();
  
  // Handle create invite form submission
  const handleCreateInvite = async () => {
    try {
      console.log('INVITE MANAGEMENT - Creating invite with data:', { email, expiresDays });
      
      // Call the mutation
      const result = await createInviteMutation.mutateAsync({
        email,
        expiresDays
      });
      
      console.log('INVITE MANAGEMENT - Invite creation successful:', result);
      
      // Close dialog and reset form
      setDialogOpen(false);
      setEmail('');
      setExpiresDays(7);
      
      // Show success message
      setAlert({
        open: true,
        message: 'Invite code created successfully',
        severity: 'success',
      });
      
      // Refetch invites list
      refetchInvites();
    } catch (error) {
      // Detailed error logging
      console.error('INVITE MANAGEMENT - Error creating invite:', error);
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
        message: error.response?.data || error.message || 'Failed to create invite code',
        severity: 'error',
      });
    }
  };
  
  // Handle delete invite
  const handleDeleteInvite = async (inviteId) => {
    try {
      // Call the mutation
      await deleteInviteMutation.mutateAsync(inviteId);
      
      // Show success message
      setAlert({
        open: true,
        message: 'Invite code deleted',
        severity: 'success',
      });
      
      // Refetch invites list
      refetchInvites();
    } catch (error) {
      console.error('Error deleting invite:', error);
      
      // Show error message
      setAlert({
        open: true,
        message: error.response?.data || 'Failed to delete invite code',
        severity: 'error',
      });
    }
  };
  
  // Copy invite code to clipboard
  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    setAlert({
      open: true,
      message: 'Invite code copied to clipboard',
      severity: 'info',
    });
  };
  
  // Color helpers
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
  
  // Date formatter
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };
  
  // Effect to handle errors from the query
  useEffect(() => {
    if (invitesError && invitesErrorData) {
      setAlert({
        open: true,
        message: invitesErrorData.message || 'Failed to load invites',
        severity: 'error',
      });
    }
  }, [invitesError, invitesErrorData]);
  
  // Return everything needed for invite management
  return {
    // Data
    invites,
    email,
    expiresDays,
    
    // State
    isLoading: invitesLoading,
    isError: invitesError,
    dialogOpen,
    alert,
    
    // Mutations loading states
    isCreating: createInviteMutation.isLoading,
    isDeleting: deleteInviteMutation.isLoading,
    
    // State setters
    setEmail,
    setExpiresDays,
    setDialogOpen,
    setAlert,
    
    // Actions
    handleCreateInvite,
    handleDeleteInvite,
    copyToClipboard,
    refetchInvites,
    
    // Helpers
    getStatusColor,
    formatDate,
  };
}