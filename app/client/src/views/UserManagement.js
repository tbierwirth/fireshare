import React from 'react';
import { Box, Typography, Tabs, Tab } from '@mui/material';
import UserManager from '../components/admin/UserManager';
import InviteManager from '../components/admin/InviteManager';
import ErrorBoundary from '../components/utils/ErrorBoundary';
import { useAuth } from '../contexts';

const UserManagement = () => {
  const [tabValue, setTabValue] = React.useState(0);
  const { isAdmin, user } = useAuth();

  
  console.log('UserManagement View - Auth status:', { 
    isAdmin, 
    user,
    username: user?.username,
    "user.isAdmin": user?.isAdmin,
    "user.is_admin": user?.is_admin,
    "user.role": user?.role
  });

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  if (!isAdmin) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>Access Denied</Typography>
        <Typography variant="body1">
          You need administrator privileges to access this page.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        User Management
      </Typography>
      <Typography variant="body1" gutterBottom sx={{ mb: 3 }}>
        Manage users and invite codes. Users are created through the invite code system.
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          aria-label="user management tabs"
        >
          <Tab label="Users" id="tab-0" />
          <Tab label="Invite Codes" id="tab-1" />
        </Tabs>
      </Box>

      {tabValue === 0 && (
        <ErrorBoundary>
          <UserManager />
        </ErrorBoundary>
      )}
      
      {tabValue === 1 && (
        <ErrorBoundary>
          <InviteManager />
        </ErrorBoundary>
      )}
    </Box>
  );
};

export default UserManagement;