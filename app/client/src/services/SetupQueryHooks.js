import axios from 'axios';
import { useQuery } from '@tanstack/react-query';

/**
 * Detects if this is a fresh install by checking various API endpoints
 * A fresh install is one where:
 * 1. No users exist in the database
 * 2. API endpoints exist but no one is logged in
 * 3. The setup status endpoint doesn't exist or returns needsSetup: true
 */
const detectFreshInstall = async () => {
  // Clear setupCompleted flag in localStorage on any errors
  // This ensures the setup wizard shows when needed
  const handleFreshInstall = () => {
    localStorage.removeItem('setupCompleted');
    return { needsSetup: true, freshInstall: true };
  };
  
  try {
    // First check if loggedin endpoint exists and what it returns
    const loginStatus = await axios.get('/api/loggedin');
    
    // If we get any response from loggedin but no one is logged in,
    // check if there are any users by trying to access a protected endpoint
    if (loginStatus.data === 'false' || loginStatus.data === false) {
      try {
        // This will either return 401 (auth working but no valid login)
        // or some other error if auth system isn't properly initialized
        await axios.get('/api/profile');
        
        // For database reset detection, also verify if videos table exists
        try {
          await axios.get('/api/videos/public');
          
          // Both auth and videos endpoints exist but no one is logged in
          // This implies a system with no users - fresh install
          return handleFreshInstall();
        } catch (videoError) {
          // If videos endpoint fails with 404, API structure might not be complete
          // This is a sign of a fresh install
          if (videoError.response && videoError.response.status === 404) {
            return handleFreshInstall();
          }
          // For any other error, something else is wrong
          throw videoError;
        }
      } catch (profileError) {
        // If profile endpoint returns 401, auth system works but no valid login
        if (profileError.response && profileError.response.status === 401) {
          // This indicates auth is working but no user is logged in
          return handleFreshInstall();
        }
        // For any other error, something else is wrong
        throw profileError;
      }
    }
    
    // If someone is logged in, this is definitely not a fresh install
    return { needsSetup: false, freshInstall: false };
  } catch (error) {
    // If loggedin endpoint doesn't exist or fails, this might be a fresh install
    if (error.response && error.response.status === 404) {
      return handleFreshInstall();
    }
    // For any other error, we're not sure what's going on
    throw error;
  }
};

/**
 * Hook to fetch the setup status of the application
 * This is used to determine if the application needs first-time setup
 */
export const useSetupStatus = (options = {}) => {
  return useQuery({
    queryKey: ['setup', 'status'],
    queryFn: async () => {
      try {
        // Try endpoints in a way that doesn't throw console warnings
        const endpoints = [
          '/api/setup/status'  // Standard endpoint
        ];
        
        // Try each endpoint in sequence until one works
        for (const endpoint of endpoints) {
          try {
            const response = await axios.get(endpoint);
            
            // Handle different response formats based on endpoint
            if (endpoint === '/api/config') {
              // If config endpoint responds, the app is running but might need setup
              // Check if any users exist by trying to get videos
              try {
                const videosResponse = await axios.get('/api/videos/public');
                if (videosResponse.data && videosResponse.data.videos) {
                  // Videos exist, system is set up
                  return { needsSetup: false, setupCompleted: true };
                }
              } catch (e) {
                // Videos endpoint error, system might be fresh install
                console.log('Could not verify videos, assuming setup needed');
              }
              
              // At this point, assume setup is needed
              return { needsSetup: true, freshInstall: true };
            } else {
              // Handle normal setup endpoint response
              console.log(`Setup status response from ${endpoint}:`, response.data);
              
              // If we got a response with setupCompleted=true, setup is definitely done
              if (response.data.setupCompleted === true) {
                return { needsSetup: false, setupCompleted: true };
              }
              
              // If the API says setup is needed, recognize that this is a fresh install
              if (response.data.needsSetup) {
                return { ...response.data, freshInstall: true };
              }
              
              return response.data;
            }
          } catch (error) {
            console.warn(`Setup status endpoint ${endpoint} failed:`, error);
            // Continue to next endpoint
          }
        }
        
        // If endpoint fails, silently fall back to our detection method
        // No console logging to avoid noise in the console
        const freshInstallCheck = await detectFreshInstall();
        return freshInstallCheck;
      } catch (error) {
        // Make sure the error is properly passed to the query's error state
        console.error('Setup status check completely failed:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes (replaces cacheTime in v5)
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    enabled: true,
    ...options
  });
};