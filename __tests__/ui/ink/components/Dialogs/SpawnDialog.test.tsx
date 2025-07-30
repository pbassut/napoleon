import React from 'react';
import { render } from 'ink-testing-library';
import { SpawnDialog } from '../../../../../src/ui/ink/components/Dialogs/SpawnDialog';

// Mock dependencies
jest.mock('../../../../../src/utils/logger', () => ({
  debug: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../../../../../src/utils/backtick-protection', () => ({
  protectBackticks: jest.fn((input: string) => input.replace(/`/g, '\\`')),
  isInputSafe: jest.fn(() => true),
}));

describe('SpawnDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSubmit: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing when open', () => {
    expect(() => {
      render(<SpawnDialog {...defaultProps} />);
    }).not.toThrow();
  });

  it('should render without crashing when closed', () => {
    expect(() => {
      render(<SpawnDialog {...defaultProps} isOpen={false} />);
    }).not.toThrow();
  });

  it('should handle missing onClose prop', () => {
    const props = { ...defaultProps, onClose: undefined as any };
    expect(() => {
      render(<SpawnDialog {...props} />);
    }).not.toThrow();
  });

  it('should handle missing onSubmit prop', () => {
    const props = { ...defaultProps, onSubmit: undefined as any };
    expect(() => {
      render(<SpawnDialog {...props} />);
    }).not.toThrow();
  });

  it('should handle all props missing except isOpen', () => {
    expect(() => {
      render(<SpawnDialog isOpen={true} onClose={undefined as any} onSubmit={undefined as any} />);
    }).not.toThrow();
  });

  it('should handle rapid open/close cycles', () => {
    const { rerender } = render(<SpawnDialog {...defaultProps} />);
    
    expect(() => {
      rerender(<SpawnDialog {...defaultProps} isOpen={false} />);
      rerender(<SpawnDialog {...defaultProps} isOpen={true} />);
      rerender(<SpawnDialog {...defaultProps} isOpen={false} />);
      rerender(<SpawnDialog {...defaultProps} isOpen={true} />);
    }).not.toThrow();
  });

  it('should unmount cleanly', () => {
    const { unmount } = render(<SpawnDialog {...defaultProps} />);
    expect(() => unmount()).not.toThrow();
  });

  describe('Immediate Exit Logic', () => {
    it('should handle SpawnDialog component structure', async () => {
      const mockOnClose = jest.fn();
      const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
      
      // Test that the component can be imported and instantiated
      const SpawnDialogModule = await import('../../../../../src/ui/ink/components/Dialogs/SpawnDialog');
      expect(SpawnDialogModule.SpawnDialog).toBeDefined();
      
      // Test component renders without error
      expect(() => {
        render(
          <SpawnDialog 
            isOpen={true} 
            onClose={mockOnClose} 
            onSubmit={mockOnSubmit} 
          />
        );
      }).not.toThrow();
    });

    it('should handle different prop combinations', () => {
      const mockOnClose = jest.fn();
      const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
      
      // Test with open state
      expect(() => {
        render(
          <SpawnDialog 
            isOpen={true} 
            onClose={mockOnClose} 
            onSubmit={mockOnSubmit} 
          />
        );
      }).not.toThrow();
      
      // Test with closed state
      expect(() => {
        render(
          <SpawnDialog 
            isOpen={false} 
            onClose={mockOnClose} 
            onSubmit={mockOnSubmit} 
          />
        );
      }).not.toThrow();
    });

    it('should handle error scenarios', () => {
      const mockOnClose = jest.fn();
      const mockOnSubmit = jest.fn().mockRejectedValue(new Error('Test error'));
      
      expect(() => {
        render(
          <SpawnDialog 
            isOpen={true} 
            onClose={mockOnClose} 
            onSubmit={mockOnSubmit} 
          />
        );
      }).not.toThrow();
    });
  });
});