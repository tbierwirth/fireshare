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
const steps = ['Welcome', 'Login', 'Create Admin', 'Complete'];

const SetupWizard = () => {
  const { showSetupWizard, setupData, setupLoading, completeSetup, forceShowWizard } = useSetupWizard();
  const { login, isLoggedIn, logout, refreshAuthStatus } = useAuth();
  
  // Local state for the wizard
  const [activeStep, setActiveStep] = useState(0);
  const [defaultUsername, setDefaultUsername] = useState('admin');
  const [defaultPassword, setDefaultPassword] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  // Update state when setup data changes
  useEffect(() => {
    if (setupData) {
      setDefaultUsername(setupData.defaultUsername || 'admin');
      setInviteCode(setupData.inviteCode || '');
    }
  }, [setupData]);

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

  // Handle default admin login
  const handleDefaultLogin = async () => {
    setLoading(true);
    setError('');
    
    try {
      await login(defaultUsername, defaultPassword);
      setSuccess('Successfully logged in with default admin account');
      
      // Auto-advance after successful login
      setTimeout(() => {
        handleNext();
        setSuccess('');
      }, 1000);
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle registration of new admin account
  const handleRegister = async () => {
    setLoading(true);
    setError('');

    // Validate form
    if (!username || !password || !confirmPassword) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      // Register using the invite code
      await AuthService.register(username, password, email, inviteCode);
      setSuccess('Successfully registered your admin account');

      // Logout from default admin and login with new account
      await logout();
      await login(username, password);
      
      // Auto-advance after successful registration
      setTimeout(() => {
        handleNext();
        setSuccess('');
      }, 1000);
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.response?.data || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle setup completion
  const handleComplete = () => {
    refreshAuthStatus();
    completeSetup();
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
              <li>Log in with the default admin account</li>
              <li>Create your personal admin account</li>
              <li>Complete the setup process</li>
            </Typography>
            <Alert severity="info" sx={{ mt: 2 }}>
              For security, after setup you should delete the default admin account.
            </Alert>
          </Box>
        );
        
      case 1: // Login
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Login with Default Admin Account
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Use the default admin credentials to log in. The default username is usually "admin".
            </Typography>
            
            <TextField
              margin="normal"
              required
              fullWidth
              label="Default Username"
              value={defaultUsername}
              onChange={(e) => setDefaultUsername(e.target.value)}
              disabled={loading}
              variant="outlined"
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              label="Default Password"
              type="password"
              value={defaultPassword}
              onChange={(e) => setDefaultPassword(e.target.value)}
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
        
      case 2: // Create Admin
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Create Your Personal Admin Account
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Create your personal admin account that you'll use going forward.
            </Typography>
            
            <Alert severity="info" sx={{ mb: 2 }}>
              <AlertTitle>Your Setup Invite Code</AlertTitle>
              <Typography sx={{ wordBreak: 'break-all', fontWeight: 'bold' }}>
                {inviteCode}
              </Typography>
            </Alert>
            
            <TextField
              margin="normal"
              required
              fullWidth
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              variant="outlined"
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
            
            <TextField
              margin="normal"
              required
              fullWidth
              label="Invite Code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
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
        
      case 3: // Complete
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Setup Complete!
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              You've successfully set up your Fireshare instance with your personal admin account.
            </Typography>
            
            <Alert severity="warning" sx={{ mb: 2 }}>
              <AlertTitle>Important Security Step</AlertTitle>
              For security, you should delete the default admin account immediately.
              After completing setup, you'll be redirected to the User Management page where you can do this.
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
        
      case 1: // Login
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
              onClick={handleDefaultLogin}
              disabled={loading || !defaultUsername || !defaultPassword}
            >
              {loading ? <CircularProgress size={24} /> : 'Login'}
            </Button>
          </>
        );
        
      case 2: // Create Admin
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
              onClick={handleRegister}
              disabled={loading || !username || !password || !confirmPassword || !inviteCode}
            >
              {loading ? <CircularProgress size={24} /> : 'Create Account'}
            </Button>
          </>
        );
        
      case 3: // Complete
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
              Complete Setup
            </Button>
          </>
        );
        
      default:
        return null;
    }
  };

  if (!showSetupWizard) {
    return null;
  }

  // Log the state of the setup wizard for debugging
  console.log('Setup Wizard render', { 
    showSetupWizard, 
    setupData, 
    setupLoading, 
    activeStep 
  });

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