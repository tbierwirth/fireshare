import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Typography,
  Alert,
  Snackbar,
  LinearProgress,
  CircularProgress
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import StorageIcon from '@mui/icons-material/Storage';
import { useScanLibrary, useSystemWarnings } from '../../services/ConfigQueryHooks';
import { useAuth } from '../../contexts';
import { logger } from '../../common/logger';

const SystemSettings = () => {
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [scanning, setScanning] = useState(false);
  const { isAdmin } = useAuth();
  
  // Get system warnings from backend
  const { data: warningsData, isLoading: warningsLoading } = useSystemWarnings(isAdmin);
  
  // Mutation for library scanning
  const scanLibraryMutation = useScanLibrary();

  const handleScan = async () => {
    try {
      setScanning(true);
      await scanLibraryMutation.mutateAsync();
      
      setAlert({
        open: true,
        message: 'Scan initiated. This may take several minutes.',
        severity: 'info'
      });
      
      // Show progress indicator for a few seconds
      setTimeout(() => {
        setScanning(false);
      }, 5000);
    } catch (error) {
      logger.error('SystemSettings', 'Error initiating scan', error);
      setAlert({
        open: true,
        message: `Failed to start scan: ${error.response?.data || error.message}`,
        severity: 'error'
      });
      setScanning(false);
    }
  };

  if (warningsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Handle API errors gracefully
  const hasWarningsError = !warningsLoading && !warningsData;
  
  // Get warnings from API response (only if we didn't encounter an error)
  const warnings = !hasWarningsError ? (warningsData?.data || []) : [];
  const hasWarnings = Array.isArray(warnings) && warnings.length > 0;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>System Management</Typography>

      {hasWarningsError && (
        <Card sx={{ mb: 3, bgcolor: 'rgba(255, 193, 7, 0.1)' }}>
          <CardContent>
            <Typography variant="subtitle1" color="warning.main" gutterBottom>
              Database Warning
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Alert severity="warning" sx={{ mt: 1 }}>
              Unable to retrieve system warnings. The database may not be properly initialized.
            </Alert>
            <Typography variant="body2" sx={{ mt: 2 }}>
              This is common in new installations. You may need to run database migrations.
            </Typography>
          </CardContent>
        </Card>
      )}

      {hasWarnings && (
        <Card sx={{ mb: 3, bgcolor: 'rgba(255, 193, 7, 0.1)' }}>
          <CardContent>
            <Typography variant="subtitle1" color="warning.main" gutterBottom>
              System Warnings
            </Typography>
            <Divider sx={{ my: 1 }} />
            {warnings.map((warning, index) => (
              <Alert key={index} severity="warning" sx={{ mt: 1 }}>
                {warning}
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            <StorageIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            Library Management
          </Typography>

          <Divider sx={{ my: 1 }} />

          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              startIcon={<SyncIcon />}
              onClick={handleScan}
              disabled={scanning || scanLibraryMutation.isLoading}
            >
              {scanning || scanLibraryMutation.isLoading ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1 }} /> 
                  Scanning...
                </>
              ) : (
                'Scan Library for New Videos'
              )}
            </Button>

            {scanning && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress />
                <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                  Scanning for new videos. This may take several minutes...
                </Typography>
              </Box>
            )}
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            This will scan your configured video directories for new videos and add them to the library.
            The process runs in the background and may take several minutes depending on the number of videos.
          </Typography>
        </CardContent>
      </Card>

      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={() => setAlert({...alert, open: false})}
      >
        <Alert severity={alert.severity} onClose={() => setAlert({...alert, open: false})}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SystemSettings;