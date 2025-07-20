import React, { Component } from 'react';
import { Box, Text } from 'ink';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box borderStyle="round" borderColor="red" padding={1} flexDirection="column">
          <Text color="red" bold>❌ An error occurred:</Text>
          <Text color="red">{this.state.error?.message || 'Unknown error'}</Text>
          <Text color="gray">Press 'q' to quit</Text>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;