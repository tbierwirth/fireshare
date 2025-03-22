import React, { createContext, useContext, useState, useEffect } from 'react';

import { AuthService } from '../services';
import { cache } from '../common/utils';
import { useQueryClient } from '@tanstack/react-query';
import { 
  useAuthStatus, 
  useUserProfile, 
  useLogin as useLoginMutation,
  useLogout as useLogoutMutation
} from '../services/AuthQueryHooks';


const AuthContext = createContext();


export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const [skipProfileFetch, setSkipProfileFetch] = useState(true);
  
  
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
  
  
  const isAuthenticated = !!authData?.data?.user;
  const rawUserData = authData?.data?.user || null;
  
  
  const normalizeAdminStatus = (userData) => {
    if (!userData) return false;
    
    
        
    
    if (userData.username === 'admin') {
      return true;
    }
    
    
    
    return userData.is_admin === true || 
           userData.isAdmin === true || 
           userData.admin === true ||
           userData.role === 'admin' ||
           (userData.roles && Array.isArray(userData.roles) && userData.roles.includes('admin')) ||
           false;
  };
  
  
  const normalizedUserData = rawUserData ? {
    ...rawUserData,
    is_admin: normalizeAdminStatus(rawUserData),
    isAdmin: normalizeAdminStatus(rawUserData)
  } : null;
  
  
  const isAdmin = normalizedUserData ? normalizedUserData.is_admin : false;
  
  
  const { 
    
    data: profileData,
    isLoading: profileLoading,
    refetch: refetchProfile
  } = useUserProfile(isAuthenticated && !skipProfileFetch, {
    enabled: isAuthenticated && !skipProfileFetch,
    onSuccess: (data) => {
      
      
      
      
      const userData = data?.data?.user || data?.data || null;
      if (userData) {
        cache.set('user_profile', {
          user: {
            ...userData,
            is_admin: normalizeAdminStatus(userData),
            isAdmin: normalizeAdminStatus(userData)
          },
          timestamp: Date.now()
        }, 5 * 60 * 1000); 
      }
    }
  });
  
  
  const loginMutation = useLoginMutation();
  const logoutMutation = useLogoutMutation();
  
  
  const login = async (username, password) => {
    try {
      console.log(`Login attempt for ${username}`);
      
      
      localStorage.removeItem('auth_status');
      cache.remove('user_profile');
      
      
      const result = await loginMutation.mutateAsync({ username, password });
      console.log('Login successful:', result);
      
      
      setSkipProfileFetch(false);
      await refetchAuth();
      
      return result;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };
  
  
  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
      
      
      localStorage.removeItem('auth_status');
      cache.remove('user_profile');
      
      
      await refetchAuth();
      
      console.log('Logout completed successfully');
    } catch (error) {
      console.error('Logout failed:', error);
      
      
      queryClient.clear();
    }
  };
  
  
  const refreshAuthStatus = async () => {
    console.log('Manually refreshing auth status');
    
    
    localStorage.removeItem('auth_status');
    cache.remove('user_profile');
    
    
    setSkipProfileFetch(false);
    await refetchAuth();
    
    if (isAuthenticated) {
      await refetchProfile();
    }
  };
  
  
  useEffect(() => {
    
    if (!authLoading && !authFetching && isAuthenticated) {
      setSkipProfileFetch(false);
    }
  }, [authLoading, authFetching, isAuthenticated]);
  
  
  const isLoading = authLoading || (profileLoading && isAuthenticated);
  
  
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