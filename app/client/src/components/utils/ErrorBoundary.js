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
    
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    
    
    
  }

  render() {
    if (this.state.hasError) {
      
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

    
    return this.props.children;
  }
}

export default ErrorBoundary;