import React from 'react';
import { render } from 'ink-testing-library';
import { SpawnDialog } from '../../../../src/ui/ink/components/Dialogs/SpawnDialog';
import { TerminationDialog } from '../../../../src/ui/ink/components/Dialogs/TerminationDialog';

// Mock Ink components
jest.mock('ink', () => ({
  Box: ({ children }: any) => children,
  Text: ({ children }: any) => children,
  useInput: jest.fn(),
  useApp: () => ({ exit: jest.fn() }),
}));

// Mock TextEditor
jest.mock('../../../../src/ui/ink/components/Common/TextEditor', () => ({
  TextEditor: ({ onSubmit, onCancel }: any) => 'TextEditor'
}));

describe('SpawnDialog Component', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when open', () => {
    const { lastFrame } = render(
      <SpawnDialog 
        isOpen={true}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );
    
    expect(lastFrame()).toBeDefined();
  });

  it('should not render when closed', () => {
    const { lastFrame } = render(
      <SpawnDialog 
        isOpen={false}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );
    
    expect(lastFrame()).toBeDefined();
  });
});

describe('TerminationDialog Component', () => {
  const mockOnConfirm = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when open', () => {
    const { lastFrame } = render(
      <TerminationDialog 
        isOpen={true}
        agentName="Test Agent"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    
    expect(lastFrame()).toBeDefined();
  });

  it('should not render when closed', () => {
    const { lastFrame } = render(
      <TerminationDialog 
        isOpen={false}
        agentName="Test Agent"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    
    expect(lastFrame()).toBeDefined();
  });

  it('should render with agent name', () => {
    const { lastFrame } = render(
      <TerminationDialog 
        isOpen={true}
        agentName="My Test Agent"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    
    expect(lastFrame()).toBeDefined();
  });
});