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
  
  // State for the setup wizard
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  
  // Fetch setup status using the query hook
  const { 
    data: setupData, 
    isLoading: setupLoading,
    error: setupError,
    refetch: refetchSetupStatus
  } = useSetupStatus({
    // Don't refetch if setup is complete
    enabled: !setupComplete
  });
  
  // Determine if setup is needed
  useEffect(() => {
    if (!setupLoading && !authLoading && setupData) {
      const needsSetup = setupData.needsSetup === true;
      
      // Only show the setup wizard if:
      // 1. The application needs setup
      // 2. Setup is not already complete
      // 3. User is not in the middle of the setup flow
      if (needsSetup && !setupComplete) {
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
    
    // Navigate to users page to delete default admin
    navigate('/users');
  };
  
  // Dismiss the wizard (for testing/development only)
  const dismissSetupWizard = () => {
    setShowSetupWizard(false);
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
    refetchSetupStatus
  };
  
  return (
    <SetupWizardContext.Provider value={contextValue}>
      {children}
    </SetupWizardContext.Provider>
  );
};

export default SetupWizardContext;