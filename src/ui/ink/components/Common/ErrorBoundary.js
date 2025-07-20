const React = require('react');

const { Component } = React;
const { Box, Text } = require('ink');

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

module.exports = { default: ErrorBoundary };
