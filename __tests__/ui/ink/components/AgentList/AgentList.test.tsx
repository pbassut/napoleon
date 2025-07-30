import React from 'react';
import { render } from 'ink-testing-library';
import AgentList from '../../../../../src/ui/ink/components/AgentList/AgentList';
import { Agent } from '../../../../../src/ui/ink/types';

// Mock logger to avoid console output during tests
jest.mock('../../../../../src/utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// Mock AgentItem component for focused testing
jest.mock('../../../../../src/ui/ink/components/AgentList/AgentItem', () => {
  return jest.fn(({ agent, isSelected, index }) => 
    React.createElement('div', { 
      'data-testid': 'agent-item',
      'data-agent-id': agent.id,
      'data-selected': isSelected,
      'data-index': index 
    }, `${agent.name} - ${agent.status.toUpperCase()}`)
  );
});

// Mock process.stdout.columns for consistent terminal width
Object.defineProperty(process.stdout, 'columns', {
  value: 80,
  writable: true,
});

describe('AgentList', () => {
  const mockOnSelectionChange = jest.fn();

  beforeEach(() => {
    mockOnSelectionChange.mockClear();
    jest.clearAllMocks();
  });

  const createMockAgent = (overrides: Partial<Agent> = {}): Agent => ({
    id: '1',
    name: 'Test Agent',
    status: 'running',
    pid: 1234,
    createdAt: new Date('2023-01-01T00:00:00Z'),
    runtime: '00:05:30',
    currentTask: 'Processing data',
    ...overrides,
  });

  const createAgents = (count: number): Agent[] => 
    Array.from({ length: count }, (_, i) => createMockAgent({
      id: `agent-${i}`,
      name: `Agent ${i + 1}`,
      status: i % 2 === 0 ? 'running' : 'pending',
      currentTask: `Task ${i + 1}`,
    }));

  describe('Component Structure', () => {
    it('should render without crashing with empty agents', () => {
      expect(() => {
        render(
          <AgentList
            agents={[]}
            selectedIndex={0}
            onSelectionChange={mockOnSelectionChange}
          />
        );
      }).not.toThrow();
    });

    it('should render without crashing with single agent', () => {
      const agent = createMockAgent();
      expect(() => {
        render(
          <AgentList
            agents={[agent]}
            selectedIndex={0}
            onSelectionChange={mockOnSelectionChange}
          />
        );
      }).not.toThrow();
    });

    it('should render without crashing with multiple agents', () => {
      const agents = createAgents(5);
      expect(() => {
        render(
          <AgentList
            agents={agents}
            selectedIndex={2}
            onSelectionChange={mockOnSelectionChange}
          />
        );
      }).not.toThrow();
    });

    it('should handle different height values', () => {
      const agents = createAgents(3);
      [5, 8, 12, 15].forEach(height => {
        expect(() => {
          render(
            <AgentList
              agents={agents}
              selectedIndex={0}
              onSelectionChange={mockOnSelectionChange}
              height={height}
            />
          );
        }).not.toThrow();
      });
    });

    it('should handle modal open state', () => {
      expect(() => {
        render(
          <AgentList
            agents={[]}
            selectedIndex={0}
            onSelectionChange={mockOnSelectionChange}
            isModalOpen={true}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Props Handling', () => {
    it('should use default props when not provided', () => {
      expect(() => {
        render(
          <AgentList
            agents={[]}
            selectedIndex={0}
            onSelectionChange={mockOnSelectionChange}
          />
        );
      }).not.toThrow();
    });

    it('should handle undefined optional props', () => {
      expect(() => {
        render(
          <AgentList
            agents={[]}
            selectedIndex={0}
            onSelectionChange={mockOnSelectionChange}
            height={undefined}
            isModalOpen={undefined}
          />
        );
      }).not.toThrow();
    });

    it('should handle malformed agent data', () => {
      const malformedAgent = {
        id: null,
        name: '',
        status: 'unknown',
        pid: null,
        createdAt: null,
        runtime: null,
        currentTask: null,
      } as any;

      expect(() => {
        render(
          <AgentList
            agents={[malformedAgent]}
            selectedIndex={0}
            onSelectionChange={mockOnSelectionChange}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Selection Management', () => {
    it('should handle selection at beginning', () => {
      const agents = createAgents(5);
      expect(() => {
        render(
          <AgentList
            agents={agents}
            selectedIndex={0}
            onSelectionChange={mockOnSelectionChange}
          />
        );
      }).not.toThrow();
    });

    it('should handle selection at end', () => {
      const agents = createAgents(5);
      expect(() => {
        render(
          <AgentList
            agents={agents}
            selectedIndex={4}
            onSelectionChange={mockOnSelectionChange}
          />
        );
      }).not.toThrow();
    });

    it('should handle selection beyond bounds', () => {
      const agents = createAgents(5);
      expect(() => {
        render(
          <AgentList
            agents={agents}
            selectedIndex={10}
            onSelectionChange={mockOnSelectionChange}
          />
        );
      }).not.toThrow();
    });

    it('should handle negative selection index', () => {
      const agents = createAgents(5);
      expect(() => {
        render(
          <AgentList
            agents={agents}
            selectedIndex={-1}
            onSelectionChange={mockOnSelectionChange}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Scroll Behavior', () => {
    it('should handle scrolling with large agent list', () => {
      const agents = createAgents(50);
      expect(() => {
        render(
          <AgentList
            agents={agents}
            selectedIndex={25}
            onSelectionChange={mockOnSelectionChange}
            height={10}
          />
        );
      }).not.toThrow();
    });

    it('should handle minimum height constraints', () => {
      const agents = createAgents(10);
      expect(() => {
        render(
          <AgentList
            agents={agents}
            selectedIndex={0}
            onSelectionChange={mockOnSelectionChange}
            height={1}
          />
        );
      }).not.toThrow();
    });

    it('should handle zero height edge case', () => {
      const agents = createAgents(5);
      expect(() => {
        render(
          <AgentList
            agents={agents}
            selectedIndex={0}
            onSelectionChange={mockOnSelectionChange}
            height={0}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Agent Status Variations', () => {
    it('should handle all agent status types', () => {
      const statuses: Agent['status'][] = ['running', 'pending', 'error', 'terminated', 'success'];
      
      statuses.forEach(status => {
        const agent = createMockAgent({ status });
        expect(() => {
          render(
            <AgentList
              agents={[agent]}
              selectedIndex={0}
              onSelectionChange={mockOnSelectionChange}
            />
          );
        }).not.toThrow();
      });
    });

    it('should handle agents with long names', () => {
      const agent = createMockAgent({ 
        name: 'This is a very long agent name that should be handled properly by the component' 
      });
      expect(() => {
        render(
          <AgentList
            agents={[agent]}
            selectedIndex={0}
            onSelectionChange={mockOnSelectionChange}
          />
        );
      }).not.toThrow();
    });

    it('should handle agents without current task', () => {
      const agent = createMockAgent({ currentTask: undefined });
      expect(() => {
        render(
          <AgentList
            agents={[agent]}
            selectedIndex={0}
            onSelectionChange={mockOnSelectionChange}
          />
        );
      }).not.toThrow();
    });

    it('should handle agents with empty names', () => {
      const agent = createMockAgent({ name: '' });
      expect(() => {
        render(
          <AgentList
            agents={[agent]}
            selectedIndex={0}
            onSelectionChange={mockOnSelectionChange}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle very large agent lists', () => {
      const largeAgentList = createAgents(1000);
      expect(() => {
        render(
          <AgentList
            agents={largeAgentList}
            selectedIndex={500}
            onSelectionChange={mockOnSelectionChange}
            height={15}
          />
        );
      }).not.toThrow();
    });

    it('should handle rapid prop changes', () => {
      const agents = createAgents(10);
      const { rerender } = render(
        <AgentList
          agents={agents}
          selectedIndex={0}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      // Test multiple rerenders
      for (let i = 0; i < 10; i++) {
        expect(() => {
          rerender(
            <AgentList
              agents={agents}
              selectedIndex={i % agents.length}
              onSelectionChange={mockOnSelectionChange}
            />
          );
        }).not.toThrow();
      }
    });

    it('should handle agent list changes', () => {
      let agents = createAgents(3);
      const { rerender } = render(
        <AgentList
          agents={agents}
          selectedIndex={0}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      // Add agents
      agents = createAgents(8);
      expect(() => {
        rerender(
          <AgentList
            agents={agents}
            selectedIndex={0}
            onSelectionChange={mockOnSelectionChange}
          />
        );
      }).not.toThrow();

      // Remove agents
      agents = createAgents(2);
      expect(() => {
        rerender(
          <AgentList
            agents={agents}
            selectedIndex={0}
            onSelectionChange={mockOnSelectionChange}
          />
        );
      }).not.toThrow();

      // Empty agents
      expect(() => {
        rerender(
          <AgentList
            agents={[]}
            selectedIndex={0}
            onSelectionChange={mockOnSelectionChange}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Integration', () => {
    it('should work with various terminal widths', () => {
      const originalColumns = process.stdout.columns;
      const agents = createAgents(5);

      [40, 80, 120, 200].forEach(width => {
        Object.defineProperty(process.stdout, 'columns', {
          value: width,
          writable: true,
        });

        expect(() => {
          render(
            <AgentList
              agents={agents}
              selectedIndex={2}
              onSelectionChange={mockOnSelectionChange}
            />
          );
        }).not.toThrow();
      });

      // Restore original width
      Object.defineProperty(process.stdout, 'columns', {
        value: originalColumns,
        writable: true,
      });
    });

    it('should handle component lifecycle properly', () => {
      const agents = createAgents(3);
      const { unmount } = render(
        <AgentList
          agents={agents}
          selectedIndex={1}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });

  describe('Accessibility and Usability', () => {
    it('should handle keyboard navigation scenarios', () => {
      const agents = createAgents(10);
      
      // Test different selection positions that would require scrolling
      [0, 5, 9].forEach(selectedIndex => {
        expect(() => {
          render(
            <AgentList
              agents={agents}
              selectedIndex={selectedIndex}
              onSelectionChange={mockOnSelectionChange}
              height={6}
            />
          );
        }).not.toThrow();
      });
    });

    it('should provide meaningful empty state', () => {
      expect(() => {
        render(
          <AgentList
            agents={[]}
            selectedIndex={0}
            onSelectionChange={mockOnSelectionChange}
            isModalOpen={false}
          />
        );
      }).not.toThrow();
    });

    it('should handle modal state properly', () => {
      expect(() => {
        render(
          <AgentList
            agents={[]}
            selectedIndex={0}
            onSelectionChange={mockOnSelectionChange}
            isModalOpen={true}
          />
        );
      }).not.toThrow();
    });
  });
});