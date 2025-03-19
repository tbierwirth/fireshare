import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthService } from '../services';
import { cache } from '../common/utils';

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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  
  // Function to check authentication state with caching
  const checkAuthStatus = async () => {
    setIsLoading(true);
    
    try {
      // Check cache first
      const cachedAuth = cache.get('auth_status');
      if (cachedAuth) {
        console.log('Using cached auth status');
        setIsLoggedIn(cachedAuth.isLoggedIn);
        setUser(cachedAuth.user);
        setIsLoading(false);
        
        // Refresh in the background if cached data is more than 5 minutes old
        const cacheAge = Date.now() - (cachedAuth.timestamp || 0);
        if (cacheAge > 5 * 60 * 1000) {
          refreshAuthStatus();
        }
        return;
      }
      
      // Check if there's already an in-flight request
      const requestKey = 'request:get:/api/loggedin:{}'; 
      if (cache.isRequestPending(requestKey)) {
        console.log('Reusing in-flight auth check request');
        await cache.getPendingRequest(requestKey);
        return; // The refreshAuthStatus flow will handle setting the state
      }
      
      // No cache or expired, fetch from API
      refreshAuthStatus();
    } catch (error) {
      console.error('Auth check error:', error);
      setIsLoggedIn(false);
      setUser(null);
      setIsLoading(false);
    }
  };
  
  // Refresh auth status from the server
  const refreshAuthStatus = async () => {
    try {
      // Create request keys for deduplication
      const loginRequestKey = 'request:get:/api/loggedin:{}';
      
      // Use cache.registerRequest to dedupe the request
      let authPromise;
      if (cache.isRequestPending(loginRequestKey)) {
        console.log('Using existing auth check request');
        authPromise = cache.getPendingRequest(loginRequestKey);
      } else {
        console.log('Creating new auth check request');
        authPromise = AuthService.isLoggedIn();
        cache.registerRequest(loginRequestKey, authPromise);
      }
      
      const authRes = await authPromise;
      const isAuthenticated = authRes.data;
      setIsLoggedIn(isAuthenticated);
      
      // If logged in, get user profile
      if (isAuthenticated) {
        try {
          const profileRequestKey = 'request:get:/api/profile:{}';
          
          let profilePromise;
          if (cache.isRequestPending(profileRequestKey)) {
            console.log('Using existing profile request');
            profilePromise = cache.getPendingRequest(profileRequestKey);
          } else {
            console.log('Creating new profile request');
            profilePromise = AuthService.getProfile();
            cache.registerRequest(profileRequestKey, profilePromise);
          }
          
          const profileRes = await profilePromise;
          setUser(profileRes.data);
        } catch (err) {
          console.error('Error fetching user profile:', err);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      
      // Update cache
      cache.set('auth_status', {
        isLoggedIn: isAuthenticated,
        user: isAuthenticated ? user : null,
        timestamp: Date.now()
      }, 15 * 60 * 1000); // 15 minute TTL
    } catch (err) {
      console.error('Authentication check failed:', err);
      setIsLoggedIn(false);
      setUser(null);
      
      // Clear cache on error
      localStorage.removeItem('auth_status');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Login user and set auth state
  const login = async (username, password) => {
    try {
      const res = await AuthService.login(username, password);
      setIsLoggedIn(true);
      
      // Get user profile after login
      try {
        const profileRes = await AuthService.getProfile();
        setUser(profileRes.data);
      } catch (err) {
        console.error('Error fetching user profile after login:', err);
      }
      
      // Update cache with new auth status
      cache.set('auth_status', {
        isLoggedIn: true,
        user: user,
        timestamp: Date.now()
      }, 15 * 60 * 1000);
      
      return res;
    } catch (err) {
      console.error('Login failed:', err);
      throw err;
    }
  };
  
  // Logout user and clear auth state
  const logout = async () => {
    try {
      await AuthService.logout();
    } catch (err) {
      console.error('Logout API error:', err);
    } finally {
      setIsLoggedIn(false);
      setUser(null);
      
      // Clear auth cache
      localStorage.removeItem('auth_status');
    }
  };
  
  // Check auth status on initial load
  useEffect(() => {
    checkAuthStatus();
  }, []);
  
  // Create the auth value with all the needed data and functions
  const authValue = {
    isLoggedIn,
    isLoading,
    user,
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