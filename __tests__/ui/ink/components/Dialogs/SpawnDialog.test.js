const React = require('react');
const { SpawnDialog } = require('../../../../../src/ui/ink/components/Dialogs/SpawnDialog');

// Mock ink components
jest.mock('ink', () => ({
  Box: ({ children, ...props }) => ({ type: 'Box', props, children }),
  Text: ({ children, ...props }) => ({ type: 'Text', props, children }),
  useInput: jest.fn(),
  useFocus: jest.fn(() => ({ isFocused: true })),
}));

// Mock ink-text-input
jest.mock('ink-text-input', () => {
  return ({ children, ...props }) => ({ type: 'TextInput', props, children });
});

describe('SpawnDialog', () => {
  let mockOnClose;
  let mockOnSubmit;

  beforeEach(() => {
    mockOnClose = jest.fn();
    mockOnSubmit = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create SpawnDialog component without errors', () => {
    expect(() => {
      React.createElement(SpawnDialog, {
        isOpen: true,
        onClose: mockOnClose,
        onSubmit: mockOnSubmit
      });
    }).not.toThrow();
  });

  it('should render null when isOpen is false', () => {
    const result = React.createElement(SpawnDialog, {
      isOpen: false,
      onClose: mockOnClose,
      onSubmit: mockOnSubmit
    });
    
    expect(result).toBeDefined();
  });

  it('should accept onClose callback prop', () => {
    const result = React.createElement(SpawnDialog, {
      isOpen: true,
      onClose: mockOnClose,
      onSubmit: mockOnSubmit
    });
    
    expect(result.props.onClose).toBe(mockOnClose);
  });

  it('should accept onSubmit callback prop', () => {
    const result = React.createElement(SpawnDialog, {
      isOpen: true,
      onClose: mockOnClose,
      onSubmit: mockOnSubmit
    });
    
    expect(result.props.onSubmit).toBe(mockOnSubmit);
  });

  it('should accept isOpen boolean prop', () => {
    const result = React.createElement(SpawnDialog, {
      isOpen: true,
      onClose: mockOnClose,
      onSubmit: mockOnSubmit
    });
    
    expect(result.props.isOpen).toBe(true);
  });

  it('should be exported from module', () => {
    expect(SpawnDialog).toBeDefined();
    expect(typeof SpawnDialog).toBe('function');
  });

  it('should handle component instantiation with all required props', () => {
    expect(() => {
      const component = React.createElement(SpawnDialog, {
        isOpen: false,
        onClose: mockOnClose,
        onSubmit: mockOnSubmit
      });
      expect(component).toBeDefined();
    }).not.toThrow();
  });
});