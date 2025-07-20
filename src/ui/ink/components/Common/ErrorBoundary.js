const React = require('react');
const { Component } = React;

// ErrorBoundary that works with dynamic imports
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
      // Since we can't use Ink components directly due to ESM issues,
      // return a simple React element
      return React.createElement('div', null, [
        React.createElement('div', { key: 'error' }, '⚠️  An error occurred: ' + (this.state.error?.message || 'Unknown error')),
        React.createElement('div', { key: 'help' }, 'Press Ctrl+C to exit'),
      ]);
    }

    return this.props.children;
  }
}

module.exports = { default: ErrorBoundary };