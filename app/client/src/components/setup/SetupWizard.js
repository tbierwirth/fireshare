import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stepper,
  Step,
  StepLabel,
  Typography,
  TextField,
  Alert,
  AlertTitle,
  Divider,
  Paper
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useSetupWizard } from '../../contexts/SetupWizardContext';
import { AuthService } from '../../services';

// Setup wizard steps
const steps = ['Welcome', 'Create Admin', 'Complete'];

const SetupWizard = () => {
  const { showSetupWizard, setupData, setupLoading, completeSetup, forceShowWizard } = useSetupWizard();
  const { login, isLoggedIn, logout, refreshAuthStatus } = useAuth();
  
  // Local state for the wizard
  const [activeStep, setActiveStep] = useState(0);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Setup wizard mounts automatically when needed

  // Navigate between steps
  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
    setError('');
    setSuccess('');
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
    setError('');
    setSuccess('');
  };

  // Handle creation of admin account during setup
  const handleSetupAdmin = async () => {
    setLoading(true);
    setError('');

    // Validate form
    if (!username || !password || !confirmPassword) {
      setError('Username and password are required');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    
    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      setLoading(false);
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      // Create admin account using the setup endpoint
      const response = await AuthService.setupAdmin(username, password, email);
      setSuccess('Successfully created admin account');
      
      // After successful creation, refresh auth status
      try {
        await refreshAuthStatus();
      } catch (refreshError) {
        // Continue even if the auth refresh fails
      }
      
      // Auto-advance after successful registration
      setTimeout(() => {
        handleNext();
        setSuccess('');
      }, 1000);
    } catch (error) {
      // Error reporting
      if (error.response) {
        setError(error.response.data || 'Setup failed. Please try again.');
      } else if (error.request) {
        setError('No response received from server. Please try again.');
      } else {
        setError(error.message || 'Setup failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle setup completion
  const handleComplete = () => {
    // Clear any cached setup status
    try {
      sessionStorage.removeItem('app.tanstack.query.queries.["setup","status"]');
    } catch (e) {
      console.log('Could not clear cached setup status:', e);
    }
    
    // Refresh auth status
    refreshAuthStatus();
    
    // Complete setup in the context - this calls the server
    completeSetup();
    
    console.log('Setup wizard completed - setup status now tracked server-side');
  };

  // Content for each step
  const getStepContent = (step) => {
    switch (step) {
      case 0: // Welcome
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Welcome to Fireshare Setup
            </Typography>
            <Typography variant="body1">
              This wizard will guide you through the initial setup of your Fireshare instance.
            </Typography>
            <Typography variant="body1" sx={{ mt: 2 }}>
              You'll need to:
            </Typography>
            <Typography component="ol" sx={{ pl: 3 }}>
              <li>Create your admin account</li>
              <li>Configure your application settings</li>
              <li>Start uploading and sharing videos</li>
            </Typography>
            <Alert severity="info" sx={{ mt: 2 }}>
              After setup, you'll have full access to all admin features including user management, video uploads, and settings.
            </Alert>
          </Box>
        );
        
      case 1: // Create Admin
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Create Your Admin Account
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              This will be the main administrator account for your Fireshare instance.
            </Typography>
            
            <TextField
              margin="normal"
              required
              fullWidth
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              variant="outlined"
              helperText="Must be at least 3 characters"
            />
            
            <TextField
              margin="normal"
              fullWidth
              label="Email (Optional)"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              variant="outlined"
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              variant="outlined"
              helperText="Must be at least 8 characters"
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              variant="outlined"
            />
            
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
            
            {success && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {success}
              </Alert>
            )}
          </Box>
        );
        
      case 2: // Complete
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Setup Complete!
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              You've successfully set up your Fireshare instance with your admin account.
            </Typography>
            
            <Alert severity="success" sx={{ mb: 2 }}>
              <AlertTitle>What's Next?</AlertTitle>
              <Typography>
                You can now:
              </Typography>
              <ul>
                <li>Configure your application settings</li>
                <li>Upload and manage videos</li>
                <li>Create invite codes for other users</li>
                <li>Customize your Fireshare instance</li>
              </ul>
            </Alert>
          </Box>
        );
        
      default:
        return 'Unknown step';
    }
  };

  // Bottom navigation buttons for each step
  const getStepActions = (step) => {
    switch (step) {
      case 0: // Welcome
        return (
          <>
            <Box sx={{ flex: '1 1 auto' }} />
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={loading}
            >
              Next
            </Button>
          </>
        );
        
      case 1: // Create Admin
        return (
          <>
            <Button
              disabled={loading}
              onClick={handleBack}
            >
              Back
            </Button>
            <Box sx={{ flex: '1 1 auto' }} />
            <Button
              variant="contained"
              onClick={handleSetupAdmin}
              disabled={loading || !username || !password || !confirmPassword}
            >
              {loading ? <CircularProgress size={24} /> : 'Create Admin Account'}
            </Button>
          </>
        );
        
      case 2: // Complete
        return (
          <>
            <Button
              disabled={loading}
              onClick={handleBack}
            >
              Back
            </Button>
            <Box sx={{ flex: '1 1 auto' }} />
            <Button
              variant="contained"
              onClick={handleComplete}
              disabled={loading}
            >
              Get Started
            </Button>
          </>
        );
        
      default:
        return null;
    }
  };

  // Don't show setup wizard if:
  // 1. It's not explicitly enabled via context
  // 2. User is already logged in (this is a critical check)
  if (!showSetupWizard || isLoggedIn) {
    return null;
  }

  return (
    <Dialog 
      open={showSetupWizard} 
      maxWidth="md" 
      fullWidth 
      disableEscapeKeyDown
      // MUI v5 no longer supports disableBackdropClick
      onClose={(event, reason) => {
        // Prevent dialog from closing when backdrop is clicked
        if (reason === 'backdropClick') {
          return;
        }
      }}
      sx={{ zIndex: 9999 }} // Ensure dialog appears above everything
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h5" component="div" align="center">
          Fireshare Setup Wizard
        </Typography>
      </DialogTitle>
      
      <Divider />
      
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ pt: 2, pb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {setupLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          getStepContent(activeStep)
        )}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 3 }}>
        {getStepActions(activeStep)}
      </DialogActions>
    </Dialog>
  );
};

export default SetupWizard;