import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Typography,
  Alert,
  Snackbar,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  ToggleButton
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useAdminConfig, useUpdateConfig } from '../../services/ConfigQueryHooks';
import { logger } from '../../common/logger';
import LightTooltip from '../../components/misc/LightTooltip';

const AdminSettings = ({ config: propConfig }) => {
  const [config, setConfig] = useState({});
  const [originalConfig, setOriginalConfig] = useState({});
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });

  const { data: configData, isLoading: configLoading } = useAdminConfig(true);
  const updateConfigMutation = useUpdateConfig();

  useEffect(() => {
    const effectiveConfig = propConfig || configData?.data;
    if (effectiveConfig) {
      logger.debug('AdminSettings', 'Config loaded', effectiveConfig);
      setConfig(effectiveConfig);
      setOriginalConfig(effectiveConfig);
    }
  }, [propConfig, configData]);

  const handleSave = async () => {
    try {
      await updateConfigMutation.mutateAsync(config);
      setAlert({
        open: true,
        message: 'Settings saved successfully!',
        severity: 'success'
      });
      setOriginalConfig(config);
    } catch (error) {
      logger.error('AdminSettings', 'Error saving admin config', error);
      setAlert({
        open: true,
        message: 'Failed to save settings: ' + (error.response?.data || error.message),
        severity: 'error'
      });
    }
  };

  const hasChanges = () => {
    return JSON.stringify(config) !== JSON.stringify(originalConfig);
  };

  const updateConfig = (path, value) => {
    // Helper to update nested config properties
    const newConfig = {...config};
    const pathParts = path.split('.');
    let current = newConfig;

    for (let i = 0; i < pathParts.length - 1; i++) {
      if (!current[pathParts[i]]) {
        current[pathParts[i]] = {};
      }
      current = current[pathParts[i]];
    }

    current[pathParts[pathParts.length - 1]] = value;
    setConfig(newConfig);
  };

  if (configLoading && !propConfig) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Video Visibility and Upload Settings</Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>Default Video Privacy</Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <LightTooltip
              title={config.app_config?.video_defaults?.private ? 'Private' : 'Public'}
              placement="top"
              enterDelay={500}
              leaveDelay={500}
              enterNextDelay={1000}
            >
              <ToggleButton
                size="small"
                value="check"
                selected={config.app_config?.video_defaults?.private || false}
                onChange={() => {
                  updateConfig('app_config.video_defaults.private', !config.app_config?.video_defaults?.private);
                }}
                sx={{ mr: 2 }}
              >
                {config.app_config?.video_defaults?.private ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </ToggleButton>
            </LightTooltip>

            <Typography variant="overline" sx={{ fontWeight: 700, fontSize: 14 }}>
              {config.app_config?.video_defaults?.private ? 'Videos are private by default' : 'Videos are public by default'}
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={config.app_config?.allow_public_upload || false}
                  onChange={(e) => {
                    updateConfig('app_config.allow_public_upload', e.target.checked);
                    if (!e.target.checked) {
                      updateConfig('ui_config.show_public_upload', false);
                    }
                  }}
                />
              }
              label="Allow Public Upload"
            />
          </Box>

          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={config.ui_config?.show_admin_upload || false}
                  onChange={(e) => updateConfig('ui_config.show_admin_upload', e.target.checked)}
                />
              }
              label="Show Admin Upload Card"
            />
          </Box>

          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={config.ui_config?.show_public_upload || false}
                  onChange={(e) => updateConfig('ui_config.show_public_upload', e.target.checked)}
                  disabled={!config.app_config?.allow_public_upload}
                />
              }
              label="Show Public Upload Card"
            />
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>Link and Upload Folder Settings</Typography>

          <TextField
            fullWidth
            margin="normal"
            label="Shareable Link Domain"
            helperText="Used for generating shareable links (e.g., example.com)"
            value={config.ui_config?.shareable_link_domain || ''}
            onChange={(e) => updateConfig('ui_config.shareable_link_domain', e.target.value)}
          />

          <TextField
            fullWidth
            margin="normal"
            label="Public Upload Folder Name"
            disabled={!config.app_config?.allow_public_upload}
            value={config.app_config?.public_upload_folder_name || ''}
            onChange={(e) => updateConfig('app_config.public_upload_folder_name', e.target.value)}
          />

          <TextField
            fullWidth
            margin="normal"
            label="Admin Upload Folder Name"
            value={config.app_config?.admin_upload_folder_name || ''}
            onChange={(e) => updateConfig('app_config.admin_upload_folder_name', e.target.value)}
          />
        </CardContent>
      </Card>

      <Box sx={{ mt: 3 }}>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={!hasChanges() || updateConfigMutation.isLoading}
          onClick={handleSave}
        >
          {updateConfigMutation.isLoading ? (
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

export default AdminSettings;