import React, { Component, ReactNode, ErrorInfo } from 'react';
import { Box, Text } from 'ink';
import logger from 'src/utils/logger';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Box borderStyle="round" borderColor="red" padding={1} flexDirection="column">
          <Text color="red" bold>❌ An error occurred:</Text>
          <Text color="red">{this.state.error?.message || 'Unknown error'}</Text>
          <Text color="red">{this.state.error?.stack || 'Unknown stack trace'}</Text>
          <Text color="gray">Press 'q' to quit</Text>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
