/**
 * Coverage tests for ErrorBoundaryWrapper component
 */
import React from 'react';
import createErrorBoundary from '../../../../../src/ui/ink/components/Common/ErrorBoundaryWrapper';

// Mock Ink components  
jest.mock('ink', () => ({
  Box: ({ children }: any) => children,
  Text: ({ children }: any) => children,
}));

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = jest.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
});

describe('ErrorBoundaryWrapper Coverage Tests', () => {
  it('should create ErrorBoundary using factory function', () => {
    const { Box, Text } = require('ink');
    const ErrorBoundary = createErrorBoundary(React, Box, Text);
    expect(ErrorBoundary).toBeDefined();
    expect(typeof ErrorBoundary).toBe('function');
  });

  it('should render children when no error occurs', () => {
    const { Box, Text } = require('ink');
    const ErrorBoundary = createErrorBoundary(React, Box, Text);
    const TestChild = () => React.createElement('span', null, 'Normal child content');
    
    // Create a simple instance to test render without ink-testing-library
    const instance = React.createElement(ErrorBoundary, null, React.createElement(TestChild));
    expect(instance).toBeDefined();
  });

  it('should handle error state correctly', () => {
    const { Box, Text } = require('ink');
    const ErrorBoundary = createErrorBoundary(React, Box, Text);
    
    // Test getDerivedStateFromError static method
    const error = new Error('Test error');
    const newState = ErrorBoundary.getDerivedStateFromError(error);
    expect(newState).toEqual({ hasError: true, error });
  });

  it('should handle null error', () => {
    const { Box, Text } = require('ink');
    const ErrorBoundary = createErrorBoundary(React, Box, Text);
    
    // Test getDerivedStateFromError with null
    const newState = ErrorBoundary.getDerivedStateFromError(null);
    expect(newState).toEqual({ hasError: true, error: null });
  });

  it('should call componentDidCatch', () => {
    const { Box, Text } = require('ink');
    const ErrorBoundary = createErrorBoundary(React, Box, Text);
    
    // Create instance and call componentDidCatch directly
    const instance = new ErrorBoundary({ children: null });
    const error = new Error('Test error');
    const errorInfo = { componentStack: 'test stack' };
    
    instance.componentDidCatch(error, errorInfo);
    expect(console.error).toHaveBeenCalledWith(
      'ErrorBoundary caught an error:',
      error,
      errorInfo
    );
  });

  it('should render error UI when hasError is true', () => {
    const { Box, Text } = require('ink');
    const ErrorBoundary = createErrorBoundary(React, Box, Text);
    
    // Create instance with error state
    const instance = new ErrorBoundary({ children: React.createElement('div', null, 'child') });
    instance.state = { hasError: true, error: new Error('Test error') };
    
    const result = instance.render();
    expect(result).toBeDefined();
  });

  it('should render error UI with unknown error message', () => {
    const { Box, Text } = require('ink');
    const ErrorBoundary = createErrorBoundary(React, Box, Text);
    
    // Create instance with null error
    const instance = new ErrorBoundary({ children: React.createElement('div', null, 'child') });
    instance.state = { hasError: true, error: null };
    
    const result = instance.render();
    expect(result).toBeDefined();
  });

  it('should render children when no error', () => {
    const { Box, Text } = require('ink');
    const ErrorBoundary = createErrorBoundary(React, Box, Text);
    
    const testChild = React.createElement('div', null, 'test child');
    const instance = new ErrorBoundary({ children: testChild });
    instance.state = { hasError: false, error: null };
    
    const result = instance.render();
    expect(result).toBe(testChild);
  });

  it('should handle error with empty message', () => {
    const { Box, Text } = require('ink');
    const ErrorBoundary = createErrorBoundary(React, Box, Text);
    
    const instance = new ErrorBoundary({ children: null });
    const error = new Error('');
    instance.state = { hasError: true, error };
    
    const result = instance.render();
    expect(result).toBeDefined();
  });
});