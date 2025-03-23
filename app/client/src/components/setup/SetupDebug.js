import React from 'react';
import { Box, Button, Typography, Paper, Card, CardContent, CardActions, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useSetupWizard } from '../../contexts/SetupWizardContext';
import { useSetupStatus } from '../../services/SetupQueryHooks';

/**
 * Development component for testing and debugging the Setup Wizard
 * This component provides buttons to force show the wizard and check status
 */
const SetupDebug = () => {
  const { forceShowWizard, dismissSetupWizard, showSetupWizard, setupData, refetchSetupStatus } = useSetupWizard();
  const { data: statusData, isLoading, refetch } = useSetupStatus();

  const handleRefreshStatus = () => {
    console.log("Manually refreshing setup status");
    refetch();
    refetchSetupStatus();
  };

  return (
    <Box sx={{ 
      position: 'fixed', 
      bottom: 0, 
      right: 0, 
      zIndex: 9000, 
      width: '400px',
      margin: 2,
    }}>
      <Accordion defaultExpanded={true}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            Setup Wizard Debug Panel
          </Typography>
        </AccordionSummary>
        
        <AccordionDetails>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }} gutterBottom>
              Current Status: {showSetupWizard ? 
                <Box component="span" sx={{ color: 'success.main' }}>Wizard VISIBLE</Box> : 
                <Box component="span" sx={{ color: 'error.main' }}>Wizard HIDDEN</Box>}
            </Typography>
            
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              Setup Data:
            </Typography>
            <Card variant="outlined" sx={{ mb: 1, bgcolor: 'action.hover' }}>
              <CardContent sx={{ py: 1, px: 2 }}>
                <pre style={{ margin: 0, fontSize: '0.75rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {setupData ? JSON.stringify(setupData, null, 2) : 'No data'}
                </pre>
              </CardContent>
            </Card>
            
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              API Status: {isLoading && ' (Loading...)'}
            </Typography>
            <Card variant="outlined" sx={{ mb: 1, bgcolor: 'action.hover' }}>
              <CardContent sx={{ py: 1, px: 2 }}>
                <pre style={{ margin: 0, fontSize: '0.75rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {statusData ? JSON.stringify(statusData, null, 2) : 'No data'}
                </pre>
              </CardContent>
            </Card>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              variant="contained" 
              color="primary" 
              size="small"
              onClick={forceShowWizard}
            >
              Show Wizard
            </Button>
            
            <Button 
              variant="outlined" 
              color="secondary" 
              size="small"
              onClick={dismissSetupWizard}
            >
              Hide Wizard
            </Button>
            
            <Button 
              variant="outlined"
              size="small" 
              onClick={handleRefreshStatus}
            >
              Refresh Status
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default SetupDebug;