import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Box, CircularProgress } from '@mui/material'

const AuthWrapper = ({ children, redirect }) => {
  const { isLoggedIn, isLoading, user } = useAuth();
  
  
  const authenticated = typeof isLoggedIn === 'object' 
    ? !!isLoggedIn.authenticated 
    : !!isLoggedIn;
  
  
  const isAdmin = user?.is_admin === true || 
    (user?.user?.is_admin === true) ||
    (typeof isLoggedIn === 'object' && isLoggedIn.isAdmin === true) || 
    (typeof user === 'object' && user !== null && 'isAdmin' in user && user.isAdmin === true) ||
    false;
    
  
  
      
  
  const normalizedUser = user && typeof user === 'object' && user.user ? user.user : user;
  
  
  
    
  
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  
  if (!redirect) {
    
    return React.cloneElement(children, { 
      authenticated, 
      isAdmin,
      user: normalizedUser
    });
  }
  
  
  return authenticated 
    ? React.cloneElement(children, { 
        authenticated,
        isAdmin,
        user: normalizedUser
      }) 
    : <Navigate to={redirect} />;
}

export default AuthWrapper