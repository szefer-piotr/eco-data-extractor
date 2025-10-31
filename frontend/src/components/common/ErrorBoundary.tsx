import React, { ReactNode, ErrorInfo } from 'react';
import { Box, Card, CardContent, CardHeader, Button, Typography, Stack } from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';

interface Props {
  children: ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Card sx={{ bgcolor: '#fff3e0', borderLeft: '4px solid #f57c00' }}>
            <CardHeader
              avatar={<ErrorIcon sx={{ color: '#f57c00', fontSize: 32 }} />}
              title="Something went wrong"
              subheader="An unexpected error occurred"
            />
            <CardContent>
              <Typography variant="body2" sx={{ mb: 2, textAlign: 'left', fontFamily: 'monospace', p: 2, bgcolor: '#fff', borderRadius: 1 }}>
                {this.state.error?.toString()}
              </Typography>
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    textAlign: 'left',
                    p: 2,
                    bgcolor: '#f5f5f5',
                    borderRadius: 1,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    mb: 2,
                    overflow: 'auto',
                    maxHeight: '200px',
                  }}
                >
                  {this.state.errorInfo.componentStack}
                </Typography>
              )}
              <Stack direction="row" spacing={2} sx={{ justifyContent: 'center' }}>
                <Button variant="contained" onClick={this.handleReset}>
                  Try Again
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => (window.location.href = '/')}
                >
                  Go Home
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
