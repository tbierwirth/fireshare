import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Button,
  Typography
} from '@mui/material';
import { useAuth } from '../contexts';
import { useAdminConfig } from '../services/ConfigQueryHooks';
import GeneralSettings from '../components/settings/GeneralSettings';
import AdminSettings from '../components/settings/AdminSettings';
import OrganizationSettings from '../components/settings/OrganizationSettings';
import SystemSettings from '../components/settings/SystemSettings';
import { logger } from '../common/logger';

const Settings = () => {
  const [tabValue, setTabValue] = useState(0);
  const { isAdmin } = useAuth();
  const { data: configData, isLoading: configLoading } = useAdminConfig(isAdmin);

  useEffect(() => {
    logger.debug('Settings', 'Settings component mounted', { isAdmin });
  }, [isAdmin]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  if (configLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3, minHeight: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Typography variant="body1">Loading settings...</Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>Settings</Typography>

        <Box sx={{ mb: 3, display: 'flex', gap: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.12)', pb: 1 }}>
          <Button 
            variant={tabValue === 0 ? "contained" : "outlined"} 
            onClick={() => handleTabChange(null, 0)}
          >
            General
          </Button>
          {isAdmin && (
            <Button 
              variant={tabValue === 1 ? "contained" : "outlined"} 
              onClick={() => handleTabChange(null, 1)}
            >
              Admin
            </Button>
          )}
          {isAdmin && (
            <Button 
              variant={tabValue === 2 ? "contained" : "outlined"} 
              onClick={() => handleTabChange(null, 2)}
            >
              Organization
            </Button>
          )}
          {isAdmin && (
            <Button 
              variant={tabValue === 3 ? "contained" : "outlined"} 
              onClick={() => handleTabChange(null, 3)}
            >
              System
            </Button>
          )}
        </Box>

        <Box style={{ display: tabValue === 0 ? 'block' : 'none' }}>
          <GeneralSettings />
        </Box>

        {isAdmin && (
          <Box style={{ display: tabValue === 1 ? 'block' : 'none' }}>
            <AdminSettings config={configData?.data} />
          </Box>
        )}

        {isAdmin && (
          <Box style={{ display: tabValue === 2 ? 'block' : 'none' }}>
            <OrganizationSettings />
          </Box>
        )}

        {isAdmin && (
          <Box style={{ display: tabValue === 3 ? 'block' : 'none' }}>
            <SystemSettings />
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default Settings;