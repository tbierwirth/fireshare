import React, { createContext, useContext, useState, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { AuthService } from '../services';
import { cache } from '../common/utils';
import { useQueryClient } from '@tanstack/react-query';
import { 
  useAuthStatus, 
  useUserProfile, 
  useLogin as useLoginMutation,
  useLogout as useLogoutMutation
} from '../services/AuthQueryHooks';

// Create auth context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Provider component that wraps the app and makes auth object available
export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const [skipProfileFetch, setSkipProfileFetch] = useState(true);
  
  // Use React Query for auth status
  const { 
    data: authData,
    isLoading: authLoading, 
    refetch: refetchAuth,
    isFetching: authFetching
  } = useAuthStatus({
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 1
  });
  
  // Extract authentication status from the response
  const isAuthenticated = !!authData?.data?.user;
  const rawUserData = authData?.data?.user || null;
  
  // Process the authentication response to determine admin status
  const normalizeAdminStatus = (userData) => {
    if (!userData) return false;
    
    // DISABLED: Auth context logging
    /*
    if (process.env.NODE_ENV === 'development') {
      console.log('AUTH CONTEXT - Normalizing admin status:', {
        userData,
        username: userData.username,
        is_admin: userData.is_admin,
        isAdmin: userData.isAdmin,
        admin: userData.admin,
        role: userData.role
      });
    }
    */
    
    // Special case for admin user - the backend special-cases this username
    if (userData.username === 'admin') {
      return true;
    }
    
    // Check all possible admin flags consistently
    // Include role-based check as the backend uses this
    return userData.is_admin === true || 
           userData.isAdmin === true || 
           userData.admin === true ||
           userData.role === 'admin' ||
           (userData.roles && Array.isArray(userData.roles) && userData.roles.includes('admin')) ||
           false;
  };
  
  // Set normalized user data with consistent admin flag
  const normalizedUserData = rawUserData ? {
    ...rawUserData,
    is_admin: normalizeAdminStatus(rawUserData),
    isAdmin: normalizeAdminStatus(rawUserData)
  } : null;
  
  // Track if user is an admin based on the normalized data
  const isAdmin = normalizedUserData ? normalizedUserData.is_admin : false;
  
  // Fetch profile data when auth status changes (only if authenticated)
  const { 
    // eslint-disable-next-line no-unused-vars
    data: profileData,
    isLoading: profileLoading,
    refetch: refetchProfile
  } = useUserProfile(isAuthenticated && !skipProfileFetch, {
    enabled: isAuthenticated && !skipProfileFetch,
    onSuccess: (data) => {
      // DISABLED: Profile data logging
      // console.log('Profile data fetched successfully:', data);
      
      // Update the cache with the new profile data
      const userData = data?.data?.user || data?.data || null;
      if (userData) {
        cache.set('user_profile', {
          user: {
            ...userData,
            is_admin: normalizeAdminStatus(userData),
            isAdmin: normalizeAdminStatus(userData)
          },
          timestamp: Date.now()
        }, 5 * 60 * 1000); // 5 minute TTL
      }
    }
  });
  
  // Use mutations for login and logout
  const loginMutation = useLoginMutation();
  const logoutMutation = useLogoutMutation();
  
  // Login function that uses the mutation
  const login = async (username, password) => {
    try {
      console.log(`Login attempt for ${username}`);
      
      // Clear any existing auth data
      localStorage.removeItem('auth_status');
      cache.remove('user_profile');
      
      // Execute the login mutation
      const result = await loginMutation.mutateAsync({ username, password });
      console.log('Login successful:', result);
      
      // Force a refresh of auth status
      setSkipProfileFetch(false);
      await refetchAuth();
      
      return result;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };
  
  // Logout function that uses the mutation
  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
      
      // Clear any cached auth data
      localStorage.removeItem('auth_status');
      cache.remove('user_profile');
      
      // Force auth query to refresh with logged out state
      await refetchAuth();
      
      console.log('Logout completed successfully');
    } catch (error) {
      console.error('Logout failed:', error);
      
      // Even if the API call fails, clear local state
      queryClient.clear();
    }
  };
  
  // Refresh auth status manually (for use in components)
  const refreshAuthStatus = async () => {
    console.log('Manually refreshing auth status');
    
    // Clear cache and force a fresh fetch
    localStorage.removeItem('auth_status');
    cache.remove('user_profile');
    
    // Enable profile fetching and refetch auth data
    setSkipProfileFetch(false);
    await refetchAuth();
    
    if (isAuthenticated) {
      await refetchProfile();
    }
  };
  
  // Set up the initial auth check when component mounts
  useEffect(() => {
    // After the first auth check completes, enable profile fetching
    if (!authLoading && !authFetching && isAuthenticated) {
      setSkipProfileFetch(false);
    }
  }, [authLoading, authFetching, isAuthenticated]);
  
  // Determine overall loading state
  const isLoading = authLoading || (profileLoading && isAuthenticated);
  
  // Create the auth value with all the needed data and functions
  const authValue = {
    isLoggedIn: isAuthenticated,
    isLoading,
    isAdmin,
    user: normalizedUserData,
    login,
    logout,
    refreshAuthStatus
  };
  
  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;