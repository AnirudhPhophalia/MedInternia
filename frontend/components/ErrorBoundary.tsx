import React, { Component, ReactNode } from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="70vh"
          p={4}
          textAlign="center"
          role="alert"
          aria-live="assertive"
        >
          <Stack spacing={2} alignItems="center" maxWidth={520}>
            <Typography variant="h4" component="h1" gutterBottom>
              Oops, something went wrong!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              We could not load this part of MedInternia safely. Please try
              again, and if the problem continues, refresh later or contact
              support.
            </Typography>
            <Button variant="contained" onClick={this.handleRetry}>
              Try Again
            </Button>
          </Stack>
        </Box>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
