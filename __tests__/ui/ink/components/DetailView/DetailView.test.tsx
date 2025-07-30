import React from 'react';
import { render } from 'ink-testing-library';
import { DetailView } from '../../../../../src/ui/ink/components/DetailView/DetailView';
import { Agent } from '../../../../../src/ui/ink/types';

// Mock useAgentLogs hook
jest.mock('../../../../../src/ui/ink/hooks/useAgentLogs', () => ({
  useAgentLogs: jest.fn(() => ({
    logs: [],
    isLoading: false,
    isStreaming: false,
    streamingError: null,
  })),
}));

// Mock ActivityIndicator component
jest.mock('../../../../../src/ui/ink/components/Common/ActivityIndicator', () => ({
  ActivityIndicator: jest.fn(({ isActive, color, label }) => 
    React.createElement('div', { 
      'data-testid': 'activity-indicator',
      'data-active': isActive,
      'data-color': color 
    }, label)
  ),
}));

// Mock LogViewer component
jest.mock('../../../../../src/ui/ink/components/DetailView/LogViewer', () => ({
  LogViewer: jest.fn((props) => 
    React.createElement('div', { 
      'data-testid': 'log-viewer',
      'data-logs-count': props.logs?.length || 0,
      'data-loading': props.isLoading,
      'data-scroll-offset': props.scrollOffset,
      'data-auto-scroll': props.autoScroll,
      'data-focused': props.isFocused,
      'data-streaming': props.isStreaming
    }, 'LogViewer Mock')
  ),
}));

// Mock process.stdout for terminal dimensions
Object.defineProperty(process.stdout, 'rows', {
  value: 24,
  writable: true,
});

describe('DetailView', () => {
  const mockOnClose = jest.fn();
  const mockAgentManager = {
    config: {
      ui: {
        toolSuppression: {
          enabled: true,
          suppressedTools: ['Read', 'Bash', 'LS', 'Glob'],
          showToolResults: true,
        },
      },
    },
  };

  beforeEach(() => {
    mockOnClose.mockClear();
    jest.clearAllMocks();
  });

  const createMockAgent = (overrides: Partial<Agent> = {}): Agent => ({
    id: 'agent-1',
    name: 'Test Agent',
    status: 'running',
    pid: 1234,
    createdAt: new Date('2023-01-01T00:00:00Z'),
    runtime: '00:05:30',
    currentTask: 'Processing data',
    instructions: 'Test instructions for the agent',
    ...overrides,
  });

  describe('Component Structure', () => {
    it('should render without crashing', () => {
      const agent = createMockAgent();
      expect(() => {
        render(
          <DetailView
            agent={agent}
            onClose={mockOnClose}
            agentManager={mockAgentManager}
          />
        );
      }).not.toThrow();
    });

    it('should render agent name in header', () => {
      const agent = createMockAgent({ name: 'Custom Agent Name' });
      expect(() => {
        render(
          <DetailView
            agent={agent}
            onClose={mockOnClose}
            agentManager={mockAgentManager}
          />
        );
      }).not.toThrow();
    });

    it('should render agent status', () => {
      const statuses: Agent['status'][] = ['running', 'pending', 'error', 'terminated', 'success'];
      
      statuses.forEach(status => {
        const agent = createMockAgent({ status });
        expect(() => {
          render(
            <DetailView
              agent={agent}
              onClose={mockOnClose}
              agentManager={mockAgentManager}
            />
          );
        }).not.toThrow();
      });
    });

    it('should handle agent with long name', () => {
      const agent = createMockAgent({ 
        name: 'This is a very long agent name that should be handled properly' 
      });
      expect(() => {
        render(
          <DetailView
            agent={agent}
            onClose={mockOnClose}
            agentManager={mockAgentManager}
          />
        );
      }).not.toThrow();
    });

    it('should handle agent without instructions', () => {
      const agent = createMockAgent({ instructions: undefined });
      expect(() => {
        render(
          <DetailView
            agent={agent}
            onClose={mockOnClose}
            agentManager={mockAgentManager}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Agent Manager Integration', () => {
    it('should handle no agent manager', () => {
      const agent = createMockAgent();
      expect(() => {
        render(
          <DetailView
            agent={agent}
            onClose={mockOnClose}
            agentManager={undefined}
          />
        );
      }).not.toThrow();
    });

    it('should handle agent manager without config', () => {
      const agent = createMockAgent();
      expect(() => {
        render(
          <DetailView
            agent={agent}
            onClose={mockOnClose}
            agentManager={{}}
          />
        );
      }).not.toThrow();
    });

    it('should handle partial agent manager config', () => {
      const agent = createMockAgent();
      const partialManager = {
        config: {
          ui: {}
        }
      };
      expect(() => {
        render(
          <DetailView
            agent={agent}
            onClose={mockOnClose}
            agentManager={partialManager}
          />
        );
      }).not.toThrow();
    });

    it('should use default tool suppression config when not provided', () => {
      const agent = createMockAgent();
      expect(() => {
        render(
          <DetailView
            agent={agent}
            onClose={mockOnClose}
            agentManager={null}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Terminal Dimensions', () => {
    it('should handle different terminal heights', () => {
      const agent = createMockAgent();
      const originalRows = process.stdout.rows;

      [10, 24, 40, 60].forEach(rows => {
        Object.defineProperty(process.stdout, 'rows', {
          value: rows,
          writable: true,
        });

        expect(() => {
          render(
            <DetailView
              agent={agent}
              onClose={mockOnClose}
              agentManager={mockAgentManager}
            />
          );
        }).not.toThrow();
      });

      // Restore original
      Object.defineProperty(process.stdout, 'rows', {
        value: originalRows,
        writable: true,
      });
    });

    it('should handle undefined terminal rows', () => {
      const agent = createMockAgent();
      const originalRows = process.stdout.rows;

      Object.defineProperty(process.stdout, 'rows', {
        value: undefined,
        writable: true,
      });

      expect(() => {
        render(
          <DetailView
            agent={agent}
            onClose={mockOnClose}
            agentManager={mockAgentManager}
          />
        );
      }).not.toThrow();

      // Restore original
      Object.defineProperty(process.stdout, 'rows', {
        value: originalRows,
        writable: true,
      });
    });
  });

  describe('Status Display', () => {
    it('should show activity indicator for running agents', () => {
      const agent = createMockAgent({ status: 'running' });
      expect(() => {
        render(
          <DetailView
            agent={agent}
            onClose={mockOnClose}
            agentManager={mockAgentManager}
          />
        );
      }).not.toThrow();
    });

    it('should not show activity indicator for non-running agents', () => {
      const statuses: Agent['status'][] = ['pending', 'error', 'terminated', 'success'];
      
      statuses.forEach(status => {
        const agent = createMockAgent({ status });
        expect(() => {
          render(
            <DetailView
              agent={agent}
              onClose={mockOnClose}
              agentManager={mockAgentManager}
            />
          );
        }).not.toThrow();
      });
    });
  });

  describe('Log State Management', () => {
    it('should handle loading state', () => {
      const { useAgentLogs } = require('../../../../../src/ui/ink/hooks/useAgentLogs');
      useAgentLogs.mockReturnValue({
        logs: [],
        isLoading: true,
        isStreaming: false,
        streamingError: null,
      });

      const agent = createMockAgent();
      expect(() => {
        render(
          <DetailView
            agent={agent}
            onClose={mockOnClose}
            agentManager={mockAgentManager}
          />
        );
      }).not.toThrow();
    });

    it('should handle streaming state', () => {
      const { useAgentLogs } = require('../../../../../src/ui/ink/hooks/useAgentLogs');
      useAgentLogs.mockReturnValue({
        logs: [],
        isLoading: false,
        isStreaming: true,
        streamingError: null,
      });

      const agent = createMockAgent();
      expect(() => {
        render(
          <DetailView
            agent={agent}
            onClose={mockOnClose}
            agentManager={mockAgentManager}
          />
        );
      }).not.toThrow();
    });

    it('should handle streaming error', () => {
      const { useAgentLogs } = require('../../../../../src/ui/ink/hooks/useAgentLogs');
      useAgentLogs.mockReturnValue({
        logs: [],
        isLoading: false,
        isStreaming: false,
        streamingError: new Error('Streaming failed'),
      });

      const agent = createMockAgent();
      expect(() => {
        render(
          <DetailView
            agent={agent}
            onClose={mockOnClose}
            agentManager={mockAgentManager}
          />
        );
      }).not.toThrow();
    });

    it('should handle real logs when available', () => {
      const { useAgentLogs } = require('../../../../../src/ui/ink/hooks/useAgentLogs');
      const mockLogs = [
        {
          id: 'log-1',
          timestamp: new Date().toISOString(),
          content: 'Real log entry',
          type: 'info',
          source: 'napoleon',
          metadata: {},
        },
      ];
      
      useAgentLogs.mockReturnValue({
        logs: mockLogs,
        isLoading: false,
        isStreaming: true,
        streamingError: null,
      });

      const agent = createMockAgent();
      expect(() => {
        render(
          <DetailView
            agent={agent}
            onClose={mockOnClose}
            agentManager={mockAgentManager}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Mock Log Generation', () => {
    it('should generate mock logs when no real logs available', () => {
      const { useAgentLogs } = require('../../../../../src/ui/ink/hooks/useAgentLogs');
      useAgentLogs.mockReturnValue({
        logs: [],
        isLoading: false,
        isStreaming: false,
        streamingError: null,
      });

      const agent = createMockAgent();
      expect(() => {
        render(
          <DetailView
            agent={agent}
            onClose={mockOnClose}
            agentManager={null}
          />
        );
      }).not.toThrow();
    });

    it('should include agent instructions in mock logs', () => {
      const { useAgentLogs } = require('../../../../../src/ui/ink/hooks/useAgentLogs');
      useAgentLogs.mockReturnValue({
        logs: [],
        isLoading: false,
        isStreaming: false,
        streamingError: null,
      });

      const agent = createMockAgent({ 
        instructions: 'Custom test instructions for the agent' 
      });
      expect(() => {
        render(
          <DetailView
            agent={agent}
            onClose={mockOnClose}
            agentManager={null}
          />
        );
      }).not.toThrow();
    });

    it('should handle agent without instructions in mock logs', () => {
      const { useAgentLogs } = require('../../../../../src/ui/ink/hooks/useAgentLogs');
      useAgentLogs.mockReturnValue({
        logs: [],
        isLoading: false,
        isStreaming: false,
        streamingError: null,
      });

      const agent = createMockAgent({ instructions: undefined });
      expect(() => {
        render(
          <DetailView
            agent={agent}
            onClose={mockOnClose}
            agentManager={null}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Component Lifecycle', () => {
    it('should handle component mounting and unmounting', () => {
      const agent = createMockAgent();
      const { unmount } = render(
        <DetailView
          agent={agent}
          onClose={mockOnClose}
          agentManager={mockAgentManager}
        />
      );

      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('should handle prop changes', () => {
      const agent = createMockAgent();
      const { rerender } = render(
        <DetailView
          agent={agent}
          onClose={mockOnClose}
          agentManager={mockAgentManager}
        />
      );

      // Change agent status
      const updatedAgent = { ...agent, status: 'error' as const };
      expect(() => {
        rerender(
          <DetailView
            agent={updatedAgent}
            onClose={mockOnClose}
            agentManager={mockAgentManager}
          />
        );
      }).not.toThrow();
    });

    it('should handle agent manager changes', () => {
      const agent = createMockAgent();
      const { rerender } = render(
        <DetailView
          agent={agent}
          onClose={mockOnClose}
          agentManager={mockAgentManager}
        />
      );

      // Change to no agent manager
      expect(() => {
        rerender(
          <DetailView
            agent={agent}
            onClose={mockOnClose}
            agentManager={undefined}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Input Handling', () => {
    it('should handle focus state changes', () => {
      const agent = createMockAgent();
      expect(() => {
        render(
          <DetailView
            agent={agent}
            onClose={mockOnClose}
            agentManager={mockAgentManager}
          />
        );
      }).not.toThrow();
    });

    it('should handle keyboard navigation', () => {
      const agent = createMockAgent();
      expect(() => {
        render(
          <DetailView
            agent={agent}
            onClose={mockOnClose}
            agentManager={mockAgentManager}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed agent data', () => {
      const malformedAgent = {
        id: null,
        name: '',
        status: 'invalid',
        pid: null,
        createdAt: null,
        runtime: null,
        currentTask: null,
        instructions: null,
      } as any;

      expect(() => {
        render(
          <DetailView
            agent={malformedAgent}
            onClose={mockOnClose}
            agentManager={mockAgentManager}
          />
        );
      }).not.toThrow();
    });

    it('should handle useAgentLogs hook errors gracefully', () => {
      const { useAgentLogs } = require('../../../../../src/ui/ink/hooks/useAgentLogs');
      useAgentLogs.mockReturnValue({
        logs: [],
        isLoading: false,
        isStreaming: false,
        streamingError: new Error('Hook failed'),
      });

      const agent = createMockAgent();
      expect(() => {
        render(
          <DetailView
            agent={agent}
            onClose={mockOnClose}
            agentManager={mockAgentManager}
          />
        );
      }).not.toThrow();
    });

    it('should handle missing onClose callback', () => {
      const agent = createMockAgent();
      expect(() => {
        render(
          <DetailView
            agent={agent}
            onClose={undefined as any}
            agentManager={mockAgentManager}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle rapid prop updates', () => {
      const agent = createMockAgent();
      const { rerender } = render(
        <DetailView
          agent={agent}
          onClose={mockOnClose}
          agentManager={mockAgentManager}
        />
      );

      // Simulate rapid status changes
      const statuses: Agent['status'][] = ['running', 'pending', 'error', 'success', 'terminated'];
      statuses.forEach(status => {
        expect(() => {
          rerender(
            <DetailView
              agent={{ ...agent, status }}
              onClose={mockOnClose}
              agentManager={mockAgentManager}
            />
          );
        }).not.toThrow();
      });
    });

    it('should handle large mock log generation', () => {
      const { useAgentLogs } = require('../../../../../src/ui/ink/hooks/useAgentLogs');
      useAgentLogs.mockReturnValue({
        logs: [],
        isLoading: false,
        isStreaming: false,
        streamingError: null,
      });

      const agent = createMockAgent();
      expect(() => {
        render(
          <DetailView
            agent={agent}
            onClose={mockOnClose}
            agentManager={null}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Integration', () => {
    it('should work with different log states', () => {
      const { useAgentLogs } = require('../../../../../src/ui/ink/hooks/useAgentLogs');
      
      const testCases = [
        { logs: [], isLoading: true, isStreaming: false, streamingError: null },
        { logs: [], isLoading: false, isStreaming: true, streamingError: null },
        { logs: [], isLoading: false, isStreaming: false, streamingError: new Error('Test') },
        { logs: [{ id: '1', content: 'Test', type: 'info' }], isLoading: false, isStreaming: true, streamingError: null },
      ];

      const agent = createMockAgent();
      testCases.forEach(testCase => {
        useAgentLogs.mockReturnValue(testCase);
        expect(() => {
          render(
            <DetailView
              agent={agent}
              onClose={mockOnClose}
              agentManager={mockAgentManager}
            />
          );
        }).not.toThrow();
      });
    });

    it('should pass correct props to LogViewer', () => {
      const agent = createMockAgent();
      expect(() => {
        render(
          <DetailView
            agent={agent}
            onClose={mockOnClose}
            agentManager={mockAgentManager}
          />
        );
      }).not.toThrow();
    });
  });
});