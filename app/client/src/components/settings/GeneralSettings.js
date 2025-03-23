import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  Snackbar,
  CircularProgress,
  FormControlLabel,
  Switch
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { useUserSettings, useUpdateUserSettings } from '../../services/ConfigQueryHooks';
import { useAuth } from '../../contexts';
import { logger } from '../../common/logger';

const GeneralSettings = () => {
  const [userSettings, setUserSettings] = useState({
    darkMode: false,
    defaultViewStyle: 'card',
    cardSize: 300
  });
  const [originalSettings, setOriginalSettings] = useState({});
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });

  const { data: userSettingsData, isLoading: userSettingsLoading } = useUserSettings();
  const updateUserSettingsMutation = useUpdateUserSettings();

  useEffect(() => {
    if (userSettingsData?.data) {
      logger.debug('GeneralSettings', 'User settings loaded', userSettingsData.data);
      
      const settings = {
        darkMode: userSettingsData.data.darkMode ?? (localStorage.getItem('darkMode') === 'true'),
        defaultViewStyle: userSettingsData.data.defaultViewStyle ?? (localStorage.getItem('listStyle') || 'card'),
        cardSize: userSettingsData.data.cardSize ?? (parseInt(localStorage.getItem('cardSize')) || 300)
      };
      
      setUserSettings(settings);
      setOriginalSettings(settings);
    }
  }, [userSettingsData]);

  const handleSave = async () => {
    try {
      // Save settings to localStorage
      localStorage.setItem('darkMode', userSettings.darkMode);
      localStorage.setItem('listStyle', userSettings.defaultViewStyle);
      localStorage.setItem('cardSize', userSettings.cardSize);
      
      // Also save to backend (if endpoint exists)
      try {
        await updateUserSettingsMutation.mutateAsync(userSettings);
      } catch (apiError) {
        logger.warn('GeneralSettings', 'Backend API for user settings not implemented yet', apiError);
        // Continue since we've already saved to localStorage
      }
      
      setAlert({
        open: true,
        message: 'Settings saved successfully!',
        severity: 'success'
      });
      setOriginalSettings(userSettings);
    } catch (error) {
      logger.error('GeneralSettings', 'Error saving settings', error);
      setAlert({
        open: true,
        message: 'Failed to save settings',
        severity: 'error'
      });
    }
  };

  const hasChanges = () => {
    return JSON.stringify(userSettings) !== JSON.stringify(originalSettings);
  };

  if (userSettingsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 600 }}>
      <Typography variant="h6" gutterBottom>User Preferences</Typography>

      <Box sx={{ mt: 3 }}>
        <FormControlLabel
          control={
            <Switch
              checked={userSettings.darkMode || false}
              onChange={(e) => setUserSettings({...userSettings, darkMode: e.target.checked})}
            />
          }
          label="Dark Mode"
        />
      </Box>

      <Box sx={{ mt: 3 }}>
        <Typography gutterBottom>Default View Style</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant={userSettings.defaultViewStyle === 'card' ? 'contained' : 'outlined'}
            onClick={() => setUserSettings({...userSettings, defaultViewStyle: 'card'})}
          >
            Card View
          </Button>
          <Button 
            variant={userSettings.defaultViewStyle === 'list' ? 'contained' : 'outlined'}
            onClick={() => setUserSettings({...userSettings, defaultViewStyle: 'list'})}
          >
            List View
          </Button>
        </Box>
      </Box>


      <Box sx={{ mt: 3 }}>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={!hasChanges() || updateUserSettingsMutation.isLoading}
          onClick={handleSave}
        >
          {updateUserSettingsMutation.isLoading ? (
            <>
              <CircularProgress size={24} sx={{ mr: 1 }} /> 
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </Box>

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

export default GeneralSettings;