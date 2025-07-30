import React from 'react';
import { render } from 'ink-testing-library';
import { DetailView } from '../../../../src/ui/ink/components/DetailView/DetailView';

// Mock Ink components
jest.mock('ink', () => ({
  Box: ({ children }: any) => children,
  Text: ({ children }: any) => children,
  useInput: jest.fn(),
  useApp: () => ({ exit: jest.fn() }),
}));

describe('DetailView Component', () => {
  const mockOnClose = jest.fn();

  const mockAgent = {
    id: 'test-agent-id',
    name: 'Test Agent',
    status: 'RUNNING' as const,
    startTime: new Date(),
    todos: [],
    instructions: 'Test instructions'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with agent', () => {
    const { lastFrame } = render(
      <DetailView 
        agent={mockAgent}
        onClose={mockOnClose}
      />
    );
    
    expect(lastFrame()).toBeDefined();
  });

  it('should render with running agent', () => {
    const runningAgent = {
      ...mockAgent,
      status: 'RUNNING' as const
    };

    const { lastFrame } = render(
      <DetailView 
        agent={runningAgent}
        onClose={mockOnClose}
      />
    );
    
    expect(lastFrame()).toBeDefined();
  });

  it('should render with failed agent', () => {
    const failedAgent = {
      ...mockAgent,
      status: 'FAILED' as const,
      error: 'Test error message'
    };

    const { lastFrame } = render(
      <DetailView 
        agent={failedAgent}
        onClose={mockOnClose}
      />
    );
    
    expect(lastFrame()).toBeDefined();
  });

  it('should render with spawning agent', () => {
    const spawningAgent = {
      ...mockAgent,
      status: 'SPAWNING' as const
    };

    const { lastFrame } = render(
      <DetailView 
        agent={spawningAgent}
        onClose={mockOnClose}
      />
    );
    
    expect(lastFrame()).toBeDefined();
  });

  it('should render with todos', () => {
    const agentWithTodos = {
      ...mockAgent,
      todos: [
        { content: 'Test todo 1', status: 'pending', priority: 'high', id: '1' },
        { content: 'Test todo 2', status: 'completed', priority: 'medium', id: '2' }
      ]
    };

    const { lastFrame } = render(
      <DetailView 
        agent={agentWithTodos}
        onClose={mockOnClose}
      />
    );
    
    expect(lastFrame()).toBeDefined();
  });
});