import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Box, CircularProgress } from '@mui/material'

const AuthWrapper = ({ children, redirect }) => {
  const { isLoggedIn, isLoading } = useAuth();
  
  // Show minimal loading indicator while checking auth
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  // No redirect specified, just pass auth status to child
  if (!redirect) {
    return React.cloneElement(children, { authenticated: isLoggedIn });
  }
  
  // Redirect if not authenticated
  return isLoggedIn 
    ? React.cloneElement(children, { authenticated: isLoggedIn }) 
    : <Navigate to={redirect} />;
}

export default AuthWrapper