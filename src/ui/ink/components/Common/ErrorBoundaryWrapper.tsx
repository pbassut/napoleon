// Wrapper to create ErrorBoundary with dynamic imports
import React from 'react';
import logger from 'src/utils/logger';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

function createErrorBoundary(React: typeof import('react'), Box: any, Text: any) {
  const { Component } = React;

  class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
      super(props);
      this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
      return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
      logger.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    render(): React.ReactNode {
      if (this.state.hasError) {
        return (
          <Box
            borderStyle="round"
            borderColor="red"
            padding={1}
            flexDirection="column"
          >
            <Text color="red" bold>
              ⚠️  An error occurred
            </Text>
            <Text color="white">
              {this.state.error?.message || 'Unknown error'}
            </Text>
            <Text color="gray">
              {'\nPress Ctrl+C to exit'}
            </Text>
          </Box>
        );
      }

      return this.props.children;
    }
  }

  return ErrorBoundary;
}

export default createErrorBoundary;
