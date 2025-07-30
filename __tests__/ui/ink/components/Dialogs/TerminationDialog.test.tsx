import React from 'react';
import { render } from 'ink-testing-library';
import { TerminationDialog } from '../../../../../src/ui/ink/components/Dialogs/TerminationDialog';
import { Agent } from '../../../../../src/ui/ink/types';

describe('TerminationDialog', () => {
  const mockAgent: Agent = {
    id: 'test-agent-123',
    name: 'Test Agent',
    status: 'running',
    startTime: new Date(Date.now() - 125000).toISOString(), // 2 minutes 5 seconds ago
    pid: 12345,
    workingDirectory: '/test/dir',
    prompt: 'Test prompt',
  };

  const defaultProps = {
    isOpen: true,
    agent: mockAgent,
    onConfirm: jest.fn().mockResolvedValue(undefined),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing when open with agent', () => {
    expect(() => {
      render(<TerminationDialog {...defaultProps} />);
    }).not.toThrow();
  });

  it('should render without crashing when closed', () => {
    expect(() => {
      render(<TerminationDialog {...defaultProps} isOpen={false} />);
    }).not.toThrow();
  });

  it('should render without crashing when agent is null', () => {
    expect(() => {
      render(<TerminationDialog {...defaultProps} agent={null} />);
    }).not.toThrow();
  });

  it('should handle agent without name', () => {
    const agentWithoutName = { ...mockAgent, name: undefined };
    expect(() => {
      render(<TerminationDialog {...defaultProps} agent={agentWithoutName} />);
    }).not.toThrow();
  });

  it('should handle agent without startTime', () => {
    const agentWithoutStartTime = { ...mockAgent, startTime: undefined };
    expect(() => {
      render(<TerminationDialog {...defaultProps} agent={agentWithoutStartTime} />);
    }).not.toThrow();
  });

  it('should handle agent with unknown status', () => {
    const agentWithUnknownStatus = { ...mockAgent, status: undefined };
    expect(() => {
      render(<TerminationDialog {...defaultProps} agent={agentWithUnknownStatus} />);
    }).not.toThrow();
  });

  it('should handle missing onConfirm prop', () => {
    const props = { ...defaultProps, onConfirm: undefined as any };
    expect(() => {
      render(<TerminationDialog {...props} />);
    }).not.toThrow();
  });

  it('should handle missing onCancel prop', () => {
    const props = { ...defaultProps, onCancel: undefined as any };
    expect(() => {
      render(<TerminationDialog {...props} />);
    }).not.toThrow();
  });

  it('should handle all callback props missing', () => {
    expect(() => {
      render(<TerminationDialog isOpen={true} agent={mockAgent} onConfirm={undefined as any} onCancel={undefined as any} />);
    }).not.toThrow();
  });

  it('should handle rapid open/close cycles', () => {
    const { rerender } = render(<TerminationDialog {...defaultProps} />);
    
    expect(() => {
      rerender(<TerminationDialog {...defaultProps} isOpen={false} />);
      rerender(<TerminationDialog {...defaultProps} isOpen={true} />);
      rerender(<TerminationDialog {...defaultProps} isOpen={false} />);
      rerender(<TerminationDialog {...defaultProps} isOpen={true} />);
    }).not.toThrow();
  });

  it('should handle agent changes', () => {
    const { rerender } = render(<TerminationDialog {...defaultProps} />);
    const newAgent = { ...mockAgent, id: 'new-agent', name: 'New Agent' };
    
    expect(() => {
      rerender(<TerminationDialog {...defaultProps} agent={newAgent} />);
      rerender(<TerminationDialog {...defaultProps} agent={null} />);
      rerender(<TerminationDialog {...defaultProps} agent={mockAgent} />);
    }).not.toThrow();
  });

  it('should unmount cleanly', () => {
    const { unmount } = render(<TerminationDialog {...defaultProps} />);
    expect(() => unmount()).not.toThrow();
  });
});