const React = require('react');

// Mock Box component
const Box = ({ children, ...props }) => {
  return React.createElement('div', props, children);
};

// Mock Text component  
const Text = ({ children, ...props }) => {
  return React.createElement('span', props, children);
};

// Mock useInput hook
const useInput = (inputHandler, options = {}) => {
  // Return empty function for tests
  return inputHandler;
};

// Mock useFocus hook
const useFocus = (options = {}) => {
  return {
    isFocused: false,
    focus: jest.fn(),
    blur: jest.fn()
  };
};

// Mock useApp hook
const useApp = () => {
  return {
    exit: jest.fn()
  };
};

// Mock useStdout hook
const useStdout = () => {
  return {
    stdout: process.stdout,
    write: jest.fn()
  };
};

// Mock render function
const render = jest.fn();

module.exports = {
  Box,
  Text,
  useInput,
  useFocus,
  useApp,
  useStdout,
  render
};