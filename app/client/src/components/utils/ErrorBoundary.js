import React from 'react';
import { Typography, Button, Box, Paper } from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console (keep this for critical errors)
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // You could log the error to an error reporting service here
    // Example: ErrorReportingService.captureException(error, { extra: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI when an error occurs
      return (
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            m: 2, 
            textAlign: 'center',
            backgroundColor: '#fff8f8',
            borderLeft: '5px solid #f44336'
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <ErrorIcon color="error" sx={{ fontSize: 60 }} />
          </Box>
          
          <Typography variant="h5" color="error" gutterBottom>
            Something went wrong
          </Typography>
          
          <Typography variant="body1" sx={{ mb: 2 }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Typography>
          
          <Box sx={{ mb: 3, backgroundColor: '#f5f5f5', p: 2, textAlign: 'left', borderRadius: 1 }}>
            <Typography variant="body2" component="pre" sx={{ overflow: 'auto', whiteSpace: 'pre-wrap' }}>
              {this.state.error?.stack || 'No stack trace available'}
            </Typography>
          </Box>
          
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => {
              this.setState({ hasError: false, error: null, errorInfo: null });
              window.location.reload();
            }}
          >
            Try Again
          </Button>
        </Paper>
      );
    }

    // If no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;