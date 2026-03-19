jest.mock('../../../../src/utils/logger');

import React from 'react';
import { render } from 'ink-testing-library';
import AgentList from '../../../../src/ui/ink/components/AgentList/AgentList';

// Mock Ink components
jest.mock('ink', () => ({
  Box: ({ children }: any) => children,
  Text: ({ children }: any) => children,
  useInput: jest.fn(),
  useApp: () => ({ exit: jest.fn() }),
}));

describe('AgentList Component', () => {
  const mockOnSelectionChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render empty list', () => {
    const { lastFrame } = render(
      <AgentList 
        agents={[]} 
        selectedIndex={0} 
        onSelectionChange={mockOnSelectionChange} 
      />
    );
    
    expect(lastFrame()).toBeDefined();
  });

  it('should render with agents', () => {
    const agents = [
      { 
        id: 'agent-1', 
        name: 'Test Agent 1', 
        status: 'RUNNING' as const,
        startTime: new Date(),
        todos: []
      },
      { 
        id: 'agent-2', 
        name: 'Test Agent 2', 
        status: 'IDLE' as const,
        startTime: new Date(),
        todos: []
      }
    ];

    const { lastFrame } = render(
      <AgentList 
        agents={agents} 
        selectedIndex={0} 
        onSelectionChange={mockOnSelectionChange} 
      />
    );
    
    expect(lastFrame()).toBeDefined();
  });

  it('should handle different agent statuses', () => {
    const agents = [
      { 
        id: 'agent-1', 
        name: 'Spawning Agent', 
        status: 'SPAWNING' as const,
        startTime: new Date(),
        todos: []
      },
      { 
        id: 'agent-2', 
        name: 'Failed Agent', 
        status: 'FAILED' as const,
        startTime: new Date(),
        todos: [],
        error: 'Test error'
      }
    ];

    const { lastFrame } = render(
      <AgentList 
        agents={agents} 
        selectedIndex={1} 
        onSelectionChange={mockOnSelectionChange} 
      />
    );
    
    expect(lastFrame()).toBeDefined();
  });
});
