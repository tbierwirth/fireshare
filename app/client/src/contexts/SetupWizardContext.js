import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetupStatus } from '../services/SetupQueryHooks';
import { useAuth } from './AuthContext';
import { useQueryClient } from '@tanstack/react-query';

// Create the context
const SetupWizardContext = createContext();

// Hook to use the context
export const useSetupWizard = () => {
  const context = useContext(SetupWizardContext);
  if (!context) {
    console.error('useSetupWizard must be used within a SetupWizardProvider');
    return { 
      showSetupWizard: false, 
      setupData: null, 
      setupLoading: false, 
      completeSetup: () => {}, 
      dismissSetupWizard: () => {}, 
      forceShowWizard: () => {} 
    };
  }
  return context;
};

// Provider component
export const SetupWizardProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  
  // State for the setup wizard - default to show on fresh installs
  const [showSetupWizard, setShowSetupWizard] = useState(true); // Start with true to ensure it shows initially
  const [setupComplete, setSetupComplete] = useState(false);
  
  // Fetch setup status using the query hook - always enabled regardless of localStorage
  const { 
    data: setupData, 
    isLoading: setupLoading,
    error: setupError,
    refetch: refetchSetupStatus
  } = useSetupStatus({
    // Always check with the server regardless of localStorage
    enabled: true,
    // Make this explicitly false to prevent potential query key issues
    throwOnError: false
  });
  
  // When component mounts, get setup status from API rather than localStorage
  useEffect(() => {
    // Fetch setup status directly on mount
    refetchSetupStatus();
  }, [refetchSetupStatus]);

  // Determine if setup is needed based on API response
  useEffect(() => {
    // If the user is logged in, setup is definitely complete
    if (isLoggedIn) {
      setSetupComplete(true);
      setShowSetupWizard(false);
      return;
    }
    
    // If we explicitly completed setup in this session, don't show wizard
    if (setupComplete) {
      setShowSetupWizard(false);
      return;
    }
    
    // If we have valid setup data from API, use it as the source of truth
    if (!setupLoading && setupData) {
      // Check if API explicitly says setup is completed (from config.json)
      if (setupData.setupCompleted === true) {
        setSetupComplete(true);
        setShowSetupWizard(false);
        return;
      }
      
      const needsSetup = setupData.needsSetup === true;
      const freshInstall = setupData.freshInstall === true;
      
      // If this is a fresh install, clear any local state
      if (freshInstall) {
        setSetupComplete(false);
      }
      
      // Show or hide wizard based on API response
      if (needsSetup) {
        setShowSetupWizard(true);
      } else {
        setSetupComplete(true);
        setShowSetupWizard(false);
      }
      return;
    }
    
    // No longer relying on localStorage for setup status
    // If we can't get data from the API, we'll rely on login state
    // If user is logged in, setup is complete
    // This section intentionally left blank to remove localStorage dependency
    
    // No valid data from API and no users - this is likely a fresh install
    if (setupError && !isLoggedIn) {
      // Make a direct request to check if users can log in
      fetch('/api/loggedin')
        .then(response => response.json())
        .then(data => {
          // The loggedin endpoint will return 'false' as text or JSON with user=false for no login
          if (data === 'false' || data === false) {
            // Check if profile endpoint returns 401 - this would mean auth is working but no user
            fetch('/api/profile')
              .then(response => {
                if (response.status === 401) {
                  // Auth system works, but no valid login - endpoints exist, system is set up but no users
                  console.log('Auth system working but no users - checking for fresh install');
                  
                  // One final check - if user count is 0, this is definitely a fresh install
                  // API errors with 404 means API might not be fully initialized yet
                  if (setupError.response && setupError.response.status === 404) {
                    // This is likely a fresh install
                    console.log('Likely a fresh install based on API response');
                    setSetupComplete(false);
                    setShowSetupWizard(true);
                  }
                } else {
                  // Profile endpoint doesn't return 401, something else is going on
                  // We'll trust the server for setup status
                  setSetupComplete(true);
                  setShowSetupWizard(false);
                }
              })
              .catch(() => {
                // If there's a failure, we need to decide if this is a fresh install
                if (setupError.response && setupError.response.status === 404) {
                  // Missing API endpoints likely means fresh install
                  console.log('API endpoints missing - fresh install detected');
                  localStorage.removeItem('setupCompleted');
                  setSetupComplete(false);
                  setShowSetupWizard(true);
                }
              });
          } else {
            // User is logged in according to API, definitely not a fresh install
            console.log('System has valid login session - not a fresh install');
            setSetupComplete(true);
            setShowSetupWizard(false);
          }
        })
        .catch(() => {
          // If there's a failure on even the loggedin endpoint, this might be a fresh install
          console.log('Cannot fetch login status - might be a fresh install');
          if (setupError.response && setupError.response.status === 404) {
            // Missing API endpoints likely means fresh install 
            console.log('API endpoints missing or returning 404 - fresh install detected');
            setSetupComplete(false);
            setShowSetupWizard(true);
          }
        });
    }
  }, [setupData, setupLoading, setupComplete, setupError, isLoggedIn]);
  
  // Complete setup
  const completeSetup = () => {
    // Update local state
    setSetupComplete(true);
    setShowSetupWizard(false);
    
    // Invalidate the setup status query to force a refetch
    // This will get the updated setupCompleted=true from the server
    queryClient.invalidateQueries(['setup', 'status']);
    
    // Also invalidate all video queries to refresh content
    queryClient.invalidateQueries(['videos']);
    queryClient.invalidateQueries(['public-videos']);
    
    // Navigate to dashboard
    navigate('/my/videos');
  };
  
  // Dismiss the wizard (for testing/development only)
  const dismissSetupWizard = () => {
    console.log('Dismissing setup wizard');
    setSetupComplete(true);
    setShowSetupWizard(false);
  };
  
  // Force show wizard (for testing/development only)
  const forceShowWizard = () => {
    console.log('Force showing setup wizard');
    // For testing only - allows temporarily showing the wizard
    // Does NOT clear the setupCompleted flag
    setShowSetupWizard(true);
  };
  
  // Context value
  const contextValue = {
    showSetupWizard,
    setupData,
    setupLoading,
    setupError,
    setupComplete,
    completeSetup,
    dismissSetupWizard,
    forceShowWizard,
    refetchSetupStatus
  };
  
  return (
    <SetupWizardContext.Provider value={contextValue}>
      {children}
    </SetupWizardContext.Provider>
  );
};

export default SetupWizardContext;