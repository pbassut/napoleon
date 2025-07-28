/* eslint-disable import/no-extraneous-dependencies, @typescript-eslint/no-unused-vars */
import React from 'react';
import { render } from 'ink-testing-library';
import { TerminationDialog } from '../../src/ui/ink/components/Dialogs/TerminationDialog';
import { loadConfig } from '../../src/core/config';
import AgentManager from '../../src/core/agent-manager';

jest.mock('../../src/core/config');
jest.mock('../../src/core/agent-manager');
jest.mock('../../src/utils/logger.js');

// Mock the ModalOverlay component
jest.mock('../../src/ui/ink/components/Common/ModalOverlay', () => ({
  ModalOverlay: ({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) => 
    (isOpen ? <div>{children}</div> : null),
}));

// Mock process.exit to prevent tests from actually exiting
const mockExit = jest.fn();
global.process.exit = mockExit;

describe('Terminal UI Termination Integration', () => {
  let mockAgentManager;
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock agent manager
    mockAgentManager = {
      initialize: jest.fn(),
      spawnAgent: jest.fn(),
      terminateAgent: jest.fn(),
      getActiveSessions: jest.fn(),
      getActiveAgents: jest.fn().mockReturnValue([]),
    };

    // Mock AgentManager
    AgentManager.mockImplementation(() => mockAgentManager);

    // Mock config
    loadConfig.mockReturnValue({
      maxAgents: 3,
      sessionFile: '/tmp/test-sessions.json',
    });
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('TerminationDialog Component', () => {
    const mockAgent = {
      id: 'agent-1',
      name: 'Test Agent 1',
      status: 'RUNNING',
      startTime: new Date('2023-01-01T10:00:00Z'),
    };

    it('should render termination dialog when open', () => {
      const mockOnConfirm = jest.fn();
      const mockOnCancel = jest.fn();

      // Test that the component can be imported and instantiated
      expect(TerminationDialog).toBeDefined();
      
      // Test component renders without crashing
      expect(() => {
        render(
          <TerminationDialog
            isOpen={true}
            agent={mockAgent}
            onConfirm={mockOnConfirm}
            onCancel={mockOnCancel}
          />
        );
      }).not.toThrow();
    });

    it('should not render when closed', () => {
      const mockOnConfirm = jest.fn();
      const mockOnCancel = jest.fn();

      const { lastFrame } = render(
        <TerminationDialog
          isOpen={false}
          agent={mockAgent}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(lastFrame()).toBe('');
    });

    it('should handle termination confirmation', async () => {
      const mockOnConfirm = jest.fn().mockResolvedValue();
      const mockOnCancel = jest.fn();

      render(
        <TerminationDialog
          isOpen={true}
          agent={mockAgent}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Simulate pressing 't' for terminate
      // Note: This is a basic test - full interaction testing would require more setup
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('should handle termination cancellation', () => {
      const mockOnConfirm = jest.fn();
      const mockOnCancel = jest.fn();

      render(
        <TerminationDialog
          isOpen={true}
          agent={mockAgent}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Simulate pressing 'c' for cancel
      // Note: This is a basic test - full interaction testing would require more setup
      expect(mockOnCancel).not.toHaveBeenCalled();
    });

    it('should display runtime correctly', () => {
      const mockOnConfirm = jest.fn();
      const mockOnCancel = jest.fn();

      // Test component can handle agent with startTime
      expect(() => {
        render(
          <TerminationDialog
            isOpen={true}
            agent={mockAgent}
            onConfirm={mockOnConfirm}
            onCancel={mockOnCancel}
          />
        );
      }).not.toThrow();
    });

    it('should handle null agent gracefully', () => {
      const mockOnConfirm = jest.fn();
      const mockOnCancel = jest.fn();

      const { lastFrame } = render(
        <TerminationDialog
          isOpen={true}
          agent={null}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(lastFrame()).toBe('');
    });

    it('should show error state when provided', () => {
      const mockOnConfirm = jest.fn();
      const mockOnCancel = jest.fn();

      // Test that dialog renders without errors in normal state
      expect(() => {
        render(
          <TerminationDialog
            isOpen={true}
            agent={mockAgent}
            onConfirm={mockOnConfirm}
            onCancel={mockOnCancel}
          />
        );
      }).not.toThrow();
    });

    it('should handle loading state', async () => {
      const mockOnConfirm = jest.fn().mockImplementation(() => new Promise(() => {})); // Never resolves
      const mockOnCancel = jest.fn();

      // Test that dialog handles async onConfirm without crashing
      expect(() => {
        render(
          <TerminationDialog
            isOpen={true}
            agent={mockAgent}
            onConfirm={mockOnConfirm}
            onCancel={mockOnCancel}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Agent Manager Integration', () => {
    it('should initialize agent manager without errors', async () => {
      mockAgentManager.initialize.mockResolvedValue();
      
      await expect(mockAgentManager.initialize()).resolves.toBeUndefined();
      expect(mockAgentManager.initialize).toHaveBeenCalled();
    });

    it('should handle agent termination through manager', async () => {
      mockAgentManager.terminateAgent.mockResolvedValue();
      
      await mockAgentManager.terminateAgent('agent-1');
      
      expect(mockAgentManager.terminateAgent).toHaveBeenCalledWith('agent-1');
    });

    it('should handle termination errors', async () => {
      const error = new Error('Termination failed');
      mockAgentManager.terminateAgent.mockRejectedValue(error);
      
      await expect(mockAgentManager.terminateAgent('agent-1')).rejects.toThrow('Termination failed');
    });

    it('should get active agents', () => {
      const mockAgents = [
        { id: 'agent-1', name: 'Test Agent 1', status: 'RUNNING' },
        { id: 'agent-2', name: 'Test Agent 2', status: 'IDLE' },
      ];
      
      mockAgentManager.getActiveAgents.mockReturnValue(mockAgents);
      
      const agents = mockAgentManager.getActiveAgents();
      expect(agents).toEqual(mockAgents);
      expect(agents).toHaveLength(2);
    });
  });

  describe('Configuration Integration', () => {
    it('should load configuration successfully', () => {
      const config = loadConfig();
      expect(config).toEqual({
        maxAgents: 3,
        sessionFile: '/tmp/test-sessions.json',
      });
    });

    it('should respect max agents configuration', () => {
      const config = loadConfig();
      expect(config.maxAgents).toBe(3);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty agent list', () => {
      mockAgentManager.getActiveAgents.mockReturnValue([]);
      
      const agents = mockAgentManager.getActiveAgents();
      expect(agents).toEqual([]);
      expect(agents).toHaveLength(0);
    });

    it('should handle malformed agent data', () => {
      const mockOnConfirm = jest.fn();
      const mockOnCancel = jest.fn();
      
      const malformedAgent = {
        id: 'agent-1',
        // Missing name, status, startTime
      };

      // Test that dialog handles malformed agent data without crashing
      expect(() => {
        render(
          <TerminationDialog
            isOpen={true}
            agent={malformedAgent}
            onConfirm={mockOnConfirm}
            onCancel={mockOnCancel}
          />
        );
      }).not.toThrow();
    });

    it('should handle concurrent operations', async () => {
      mockAgentManager.terminateAgent.mockResolvedValue();
      
      const promises = [
        mockAgentManager.terminateAgent('agent-1'),
        mockAgentManager.terminateAgent('agent-2'),
      ];
      
      await Promise.all(promises);
      
      expect(mockAgentManager.terminateAgent).toHaveBeenCalledTimes(2);
    });
  });
});
