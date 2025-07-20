import React, { Component, ReactNode } from 'react';
const { Box, Text } = require('ink');

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ErrorBoundary that works with Ink components
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box flexDirection="column" padding={2} borderStyle="single" borderColor="red">
          <Text color="red" bold>
            ⚠️  An error occurred in the UI
          </Text>
          <Text color="red">
            {this.state.error?.message || 'Unknown error'}
          </Text>
          <Text color="gray" marginTop={1}>
            Press Ctrl+C to exit or 'q' to return
          </Text>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;