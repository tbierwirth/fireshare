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
    throw new Error('useSetupWizard must be used within a SetupWizardProvider');
  }
  return context;
};

// Provider component
export const SetupWizardProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const { isLoggedIn, isLoading: authLoading, user } = useAuth();
  const navigate = useNavigate();
  
  // State for the setup wizard - default to show on fresh installs
  const [showSetupWizard, setShowSetupWizard] = useState(true); // Start with true to ensure it shows initially
  const [setupComplete, setSetupComplete] = useState(false);
  
  // Fetch setup status using the query hook
  const { 
    data: setupData, 
    isLoading: setupLoading,
    error: setupError,
    refetch: refetchSetupStatus
  } = useSetupStatus({
    // Always enable the setup status check, regardless of setupComplete state
    enabled: true,
    // Make this explicitly false to prevent potential query key issues
    throwOnError: false
  });
  
  // Determine if setup is needed
  useEffect(() => {
    console.log('Setup effect running', {
      setupLoading, 
      authLoading, 
      setupData, 
      needsSetup: setupData?.needsSetup,
      setupComplete
    });
    
    if (!setupLoading && setupData) {
      const needsSetup = setupData.needsSetup === true;
      
      // Only show the setup wizard if:
      // 1. The application needs setup
      // 2. Setup is not already complete
      if (needsSetup && !setupComplete) {
        console.log('Showing setup wizard');
        setShowSetupWizard(true);
      } else {
        setShowSetupWizard(false);
      }
    }
  }, [setupData, setupLoading, authLoading, setupComplete]);
  
  // Complete setup
  const completeSetup = () => {
    setSetupComplete(true);
    setShowSetupWizard(false);
    
    // Invalidate the setup status query to force a refetch
    queryClient.invalidateQueries(['setup', 'status']);
    
    // Navigate to dashboard
    navigate('/my/videos');
  };
  
  // Dismiss the wizard (for testing/development only)
  const dismissSetupWizard = () => {
    console.log('Dismissing setup wizard');
    setShowSetupWizard(false);
  };
  
  // Force show wizard (for testing/development only)
  const forceShowWizard = () => {
    console.log('Force showing setup wizard');
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