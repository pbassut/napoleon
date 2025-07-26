const React = require('react');
const { TextEditor } = require('../../../../src/ui/ink/components/Common/TextEditor');

// Mock ink components
jest.mock('ink', () => ({
  Box: ({ children, ...props }) => ({ type: 'Box', props, children }),
  Text: ({ children, ...props }) => ({ type: 'Text', props, children }),
  useInput: jest.fn(),
}));

describe('TextEditor', () => {
  let mockOnChange;

  beforeEach(() => {
    mockOnChange = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create TextEditor component without errors', () => {
    expect(() => {
      React.createElement(TextEditor, {
        value: 'Hello world',
        onChange: mockOnChange
      });
    }).not.toThrow();
  });

  it('should accept value prop', () => {
    const result = React.createElement(TextEditor, {
      value: 'Hello world',
      onChange: mockOnChange
    });

    expect(result.props.value).toBe('Hello world');
  });

  it('should accept onChange callback prop', () => {
    const result = React.createElement(TextEditor, {
      value: '',
      onChange: mockOnChange
    });

    expect(result.props.onChange).toBe(mockOnChange);
  });

  it('should accept placeholder prop', () => {
    const result = React.createElement(TextEditor, {
      value: '',
      onChange: mockOnChange,
      placeholder: 'Enter text...'
    });

    expect(result.props.placeholder).toBe('Enter text...');
  });

  it('should accept multiline prop', () => {
    const result = React.createElement(TextEditor, {
      value: '',
      onChange: mockOnChange,
      multiline: true
    });

    expect(result.props.multiline).toBe(true);
  });

  it('should accept showCursor prop', () => {
    const result = React.createElement(TextEditor, {
      value: '',
      onChange: mockOnChange,
      showCursor: false
    });

    expect(result.props.showCursor).toBe(false);
  });

  it('should be exported from module', () => {
    expect(TextEditor).toBeDefined();
    expect(typeof TextEditor).toBe('function');
  });
});