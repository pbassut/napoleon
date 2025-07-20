// Wrapper to create ErrorBoundary with dynamic imports
import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

function createErrorBoundary(React: any, Box: any, Text: any) {
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
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    render(): React.ReactNode {
      if (this.state.hasError) {
        return React.createElement(Box, {
          borderStyle: 'round',
          borderColor: 'red',
          padding: 1,
          flexDirection: 'column',
        }, [
          React.createElement(
            Text,
            { key: 'title', color: 'red', bold: true },
            '⚠️  An error occurred',
          ),
          React.createElement(
            Text,
            { key: 'error', color: 'white' },
            this.state.error?.message || 'Unknown error',
          ),
          React.createElement(
            Text,
            { key: 'help', color: 'gray' },
            '\nPress Ctrl+C to exit',
          ),
        ]);
      }

      return this.props.children;
    }
  }

  return ErrorBoundary;
}

export default createErrorBoundary;