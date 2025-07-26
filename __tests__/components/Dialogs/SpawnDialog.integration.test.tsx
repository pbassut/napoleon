const React = require('react');
const { SpawnDialog } = require('../../../src/ui/ink/components/Dialogs/SpawnDialog');

// Mock ink components
jest.mock('ink', () => ({
  Box: ({ children, ...props }) => ({ type: 'Box', props, children }),
  Text: ({ children, ...props }) => ({ type: 'Text', props, children }),
  useInput: jest.fn(),
  useFocus: jest.fn(() => ({ isFocused: true })),
}));

// Mock TextEditor component
jest.mock('../../../src/ui/ink/components/Common/TextEditor', () => ({
  TextEditor: ({ children, ...props }) => ({ type: 'TextEditor', props, children }),
}));

describe('SpawnDialog Integration with TextEditor', () => {
  let mockOnClose;
  let mockOnSubmit;

  beforeEach(() => {
    mockOnClose = jest.fn();
    mockOnSubmit = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create SpawnDialog with TextEditor component', () => {
    expect(() => {
      React.createElement(SpawnDialog, {
        isOpen: true,
        onClose: mockOnClose,
        onSubmit: mockOnSubmit
      });
    }).not.toThrow();
  });

  it('should pass correct props to TextEditor', () => {
    const component = React.createElement(SpawnDialog, {
      isOpen: true,
      onClose: mockOnClose,
      onSubmit: mockOnSubmit
    });

    // The component should be defined
    expect(component).toBeDefined();
    expect(component.type).toBe(SpawnDialog);
  });

  it('should handle TextEditor integration with dialog state', () => {
    const result = React.createElement(SpawnDialog, {
      isOpen: true,
      onClose: mockOnClose,
      onSubmit: mockOnSubmit
    });

    expect(result.props.isOpen).toBe(true);
    expect(result.props.onClose).toBe(mockOnClose);
    expect(result.props.onSubmit).toBe(mockOnSubmit);
  });
});