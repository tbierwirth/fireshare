import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Box, CircularProgress } from '@mui/material'

const AuthWrapper = ({ children, redirect }) => {
  const { isLoggedIn, isLoading, user } = useAuth();
  
  // Convert isLoggedIn to proper boolean if it's an object
  const authenticated = typeof isLoggedIn === 'object' 
    ? !!isLoggedIn.authenticated 
    : !!isLoggedIn;
  
  // Enhanced admin detection to check various possible nested structures
  const isAdmin = user?.is_admin === true || 
    (user?.user?.is_admin === true) ||
    (typeof isLoggedIn === 'object' && isLoggedIn.isAdmin === true) || 
    (typeof user === 'object' && user !== null && 'isAdmin' in user && user.isAdmin === true) ||
    false;
    
  // DISABLED: Authentication logging has been disabled to reduce console noise
  // If you need to see auth details for debugging, re-enable this block
  /*
  if (process.env.NODE_ENV === 'development') {
    console.log("Admin status check details:", {
      "user?.is_admin": user?.is_admin,
      "user?.user?.is_admin": user?.user?.is_admin,
      "isLoggedIn.isAdmin": typeof isLoggedIn === 'object' ? isLoggedIn.isAdmin : undefined,
      "user.isAdmin": typeof user === 'object' && user !== null ? user.isAdmin : undefined,
      "userIsNull": user === null,
      "userType": typeof user,
      "final isAdmin value": isAdmin
    });
  }
  */
    
  // Normalize user object with safeguards against null values
  const normalizedUser = user && typeof user === 'object' && user.user ? user.user : user;
  
  // DISABLED: Authentication state logging has been disabled to reduce console noise
  // If you need to see auth details for debugging, re-enable this block
  /*
  if (process.env.NODE_ENV === 'development') {
    console.log("AuthWrapper state:", { 
      authenticated, 
      isAdmin, 
      isLoading, 
      user: user?.username || null
    });
  }
  */
  
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
    // Pass normalized user data along with authenticated flag
    return React.cloneElement(children, { 
      authenticated, 
      isAdmin,
      user: normalizedUser
    });
  }
  
  // Redirect if not authenticated
  return authenticated 
    ? React.cloneElement(children, { 
        authenticated,
        isAdmin,
        user: normalizedUser
      }) 
    : <Navigate to={redirect} />;
}

export default AuthWrapper