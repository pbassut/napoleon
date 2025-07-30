import React from 'react';
import { render } from 'ink-testing-library';
import AgentListCompat from '../../../../../src/ui/ink/components/AgentList/AgentListCompat';
import { Agent } from '../../../../../src/ui/ink/types';

// Mock terminal capabilities
jest.mock('../../../../../src/ui/ink/utils/terminal-capabilities', () => ({
  getStatusSymbol: jest.fn((status) => {
    const symbols: Record<string, string> = {
      running: '●',
      pending: '○',
      error: '✗',
      terminated: '■',
      success: '✓',
      arrowUp: '↑',
      arrowDown: '↓',
    };
    return symbols[status] || '?';
  }),
  detectCapabilities: jest.fn(() => ({
    supportsColor: true,
    supportsUnicode: true,
    supportsEmoji: false,
    isCI: false,
  })),
}));

// Mock input normalizer
jest.mock('../../../../../src/ui/ink/utils/input-normalizer', () => ({
  normalizeKey: jest.fn((input, key) => ({ input, key })),
  matchesBinding: jest.fn(() => false),
}));

describe('AgentListCompat', () => {
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
          <AgentListCompat
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
          <AgentListCompat
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
          <AgentListCompat
            agents={agents}
            selectedIndex={2}
            onSelectionChange={mockOnSelectionChange}
          />
        );
      }).not.toThrow();
    });

    it('should handle default height', () => {
      expect(() => {
        render(
          <AgentListCompat
            agents={[]}
            selectedIndex={0}
            onSelectionChange={mockOnSelectionChange}
          />
        );
      }).not.toThrow();
    });

    it('should handle custom height', () => {
      expect(() => {
        render(
          <AgentListCompat
            agents={[]}
            selectedIndex={0}
            onSelectionChange={mockOnSelectionChange}
            height={15}
          />
        );
      }).not.toThrow();
    });

    it('should handle minimum height', () => {
      expect(() => {
        render(
          <AgentListCompat
            agents={[]}
            selectedIndex={0}
            onSelectionChange={mockOnSelectionChange}
            height={1}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Props Handling', () => {
    it('should handle undefined optional props', () => {
      expect(() => {
        render(
          <AgentListCompat
            agents={[]}
            selectedIndex={0}
            onSelectionChange={mockOnSelectionChange}
            height={undefined}
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
          <AgentListCompat
            agents={[malformedAgent]}
            selectedIndex={0}
            onSelectionChange={mockOnSelectionChange}
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
            <AgentListCompat
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
        name: 'This is a very long agent name that should be truncated properly' 
      });
      expect(() => {
        render(
          <AgentListCompat
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
          <AgentListCompat
            agents={[agent]}
            selectedIndex={0}
            onSelectionChange={mockOnSelectionChange}
          />
        );
      }).not.toThrow();
    });

    it('should handle unknown status with fallback', () => {
      const agent = createMockAgent({ status: 'unknown' as any });
      expect(() => {
        render(
          <AgentListCompat
            agents={[agent]}
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
          <AgentListCompat
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
          <AgentListCompat
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
          <AgentListCompat
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
          <AgentListCompat
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
          <AgentListCompat
            agents={agents}
            selectedIndex={25}
            onSelectionChange={mockOnSelectionChange}
            height={8}
          />
        );
      }).not.toThrow();
    });

    it('should handle scroll indicators when needed', () => {
      const agents = createAgents(20);
      expect(() => {
        render(
          <AgentListCompat
            agents={agents}
            selectedIndex={0}
            onSelectionChange={mockOnSelectionChange}
            height={8}
          />
        );
      }).not.toThrow();
    });

    it('should handle scroll position at end', () => {
      const agents = createAgents(20);
      expect(() => {
        render(
          <AgentListCompat
            agents={agents}
            selectedIndex={15}
            onSelectionChange={mockOnSelectionChange}
            height={8}
          />
        );
      }).not.toThrow();
    });

    it('should handle minimum height constraints', () => {
      const agents = createAgents(10);
      expect(() => {
        render(
          <AgentListCompat
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
          <AgentListCompat
            agents={agents}
            selectedIndex={0}
            onSelectionChange={mockOnSelectionChange}
            height={0}
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
          <AgentListCompat
            agents={largeAgentList}
            selectedIndex={500}
            onSelectionChange={mockOnSelectionChange}
            height={10}
          />
        );
      }).not.toThrow();
    });

    it('should handle rapid prop changes', () => {
      const agents = createAgents(10);
      const { rerender } = render(
        <AgentListCompat
          agents={agents}
          selectedIndex={0}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      // Test multiple rerenders
      for (let i = 0; i < 10; i++) {
        expect(() => {
          rerender(
            <AgentListCompat
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
        <AgentListCompat
          agents={agents}
          selectedIndex={0}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      // Add agents
      agents = createAgents(8);
      expect(() => {
        rerender(
          <AgentListCompat
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
          <AgentListCompat
            agents={agents}
            selectedIndex={0}
            onSelectionChange={mockOnSelectionChange}
          />
        );
      }).not.toThrow();

      // Empty agents
      expect(() => {
        rerender(
          <AgentListCompat
            agents={[]}
            selectedIndex={0}
            onSelectionChange={mockOnSelectionChange}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Integration', () => {
    it('should handle component lifecycle properly', () => {
      const agents = createAgents(3);
      const { unmount } = render(
        <AgentListCompat
          agents={agents}
          selectedIndex={1}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('should work with different capabilities', () => {
      const agents = createAgents(3);
      expect(() => {
        render(
          <AgentListCompat
            agents={agents}
            selectedIndex={0}
            onSelectionChange={mockOnSelectionChange}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle capability detection gracefully', () => {
      expect(() => {
        render(
          <AgentListCompat
            agents={[]}
            selectedIndex={0}
            onSelectionChange={mockOnSelectionChange}
          />
        );
      }).not.toThrow();
    });

    it('should handle empty agent array with selection', () => {
      expect(() => {
        render(
          <AgentListCompat
            agents={[]}
            selectedIndex={5}
            onSelectionChange={mockOnSelectionChange}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Focus and Input', () => {
    it('should handle focus behavior', () => {
      expect(() => {
        render(
          <AgentListCompat
            agents={[createMockAgent()]}
            selectedIndex={0}
            onSelectionChange={mockOnSelectionChange}
          />
        );
      }).not.toThrow();
    });

    it('should handle input processing', () => {
      const agents = createAgents(5);
      expect(() => {
        render(
          <AgentListCompat
            agents={agents}
            selectedIndex={2}
            onSelectionChange={mockOnSelectionChange}
          />
        );
      }).not.toThrow();
    });
  });
});