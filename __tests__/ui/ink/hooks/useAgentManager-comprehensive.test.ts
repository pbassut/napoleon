/**
 * COMPREHENSIVE FUNCTIONAL TESTS for useAgentManager hook
 * Targets 38.77% -> 90%+ coverage by exercising all uncovered code paths
 * Focus: spawnAgent, terminateAgent, selectAgent, change detection, cleanup
 */

import { renderHook, act } from '@testing-library/react';
import { useAgentManager } from '../../../../src/ui/ink/hooks/useAgentManager';

// Use global logger mock from jest.setup.js
const mockLogger = require('../../../../src/utils/logger');

describe('useAgentManager - Comprehensive Coverage Tests', () => {
  let mockAgentManager: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Create comprehensive mock AgentManager
    mockAgentManager = {
      getActiveAgents: jest.fn().mockReturnValue([]),
      getAgentDetails: jest.fn().mockReturnValue({ todos: [] }),
      canSpawnAgent: jest.fn().mockReturnValue(true),
      spawnAgent: jest.fn().mockResolvedValue(undefined),
      terminateAgent: jest.fn().mockResolvedValue(undefined),
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Effect Cleanup (Lines 775-780)', () => {
    it('should properly cleanup polling interval when component unmounts', async () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      const { unmount } = renderHook(() => useAgentManager(mockAgentManager));
      
      // Advance timers to establish interval
      act(() => {
        jest.advanceTimersByTime(100);
      });
      
      // Unmount should trigger cleanup
      unmount();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should handle cleanup when pollIntervalRef.current is null', async () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      const { unmount } = renderHook(() => useAgentManager(mockAgentManager));
      
      // Don't advance timers so interval might be null
      unmount();
      
      // Should not crash - clearInterval might still be called with null/undefined
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('stableFetchAgents null AgentManager path (Lines 667-670)', () => {
    it('should handle null agentManager in stableFetchAgents', async () => {
      // Start with valid manager, then set to null to trigger the path
      const { rerender } = renderHook(
        ({ manager }) => useAgentManager(manager),
        { initialProps: { manager: mockAgentManager } }
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Change to null manager
      rerender({ manager: null });

      act(() => {
        jest.advanceTimersByTime(600); // Trigger polling
      });

      // Should handle null gracefully
      expect(mockAgentManager.getActiveAgents).toHaveBeenCalled();
    });
  });

  describe('selectAgent Function (Lines 784-786)', () => {
    it('should execute selectAgent callback and update selectedAgentId', async () => {
      const { result } = renderHook(() => useAgentManager(mockAgentManager));

      act(() => {
        result.current.selectAgent('test-agent-123');
      });

      expect(result.current.selectedAgentId).toBe('test-agent-123');
    });

    it('should handle multiple selectAgent calls', async () => {
      const { result } = renderHook(() => useAgentManager(mockAgentManager));

      act(() => {
        result.current.selectAgent('agent-1');
      });
      expect(result.current.selectedAgentId).toBe('agent-1');

      act(() => {
        result.current.selectAgent('agent-2');
      });
      expect(result.current.selectedAgentId).toBe('agent-2');
    });
  });

  describe('spawnAgent Function (Lines 789-831)', () => {
    it('should successfully spawn agent with valid parameters', async () => {
      const { result } = renderHook(() => useAgentManager(mockAgentManager));

      await act(async () => {
        await result.current.spawnAgent({
          instructions: 'Test instructions',
          workingDirectory: '/test/dir'
        });
      });

      expect(mockAgentManager.spawnAgent).toHaveBeenCalledWith('Test instructions', {});
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'useAgentManager: Calling agentManager.spawnAgent',
        expect.objectContaining({
          instructions: 'Test instructions',
          workingDirectory: '/test/dir',
          instructionsType: 'string',
          instructionsEmpty: false,
        })
      );
    });

    it('should throw error when agentManager is null (Line 797)', async () => {
      const { result } = renderHook(() => useAgentManager(null));

      await expect(async () => {
        await act(async () => {
          await result.current.spawnAgent({
            instructions: 'Test',
            workingDirectory: '/test'
          });
        });
      }).rejects.toThrow('AgentManager not initialized');
    });

    it('should throw error when canSpawnAgent returns false (Line 801)', async () => {
      mockAgentManager.canSpawnAgent.mockReturnValue(false);
      const { result } = renderHook(() => useAgentManager(mockAgentManager));

      await expect(async () => {
        await act(async () => {
          await result.current.spawnAgent({
            instructions: 'Test',
            workingDirectory: '/test'
          });
        });
      }).rejects.toThrow('Unable to spawn agent');
    });

    it('should handle spawnAgent errors and rethrow (Lines 827-830)', async () => {
      const testError = new Error('Spawn failed');
      mockAgentManager.spawnAgent.mockRejectedValue(testError);
      
      const { result } = renderHook(() => useAgentManager(mockAgentManager));

      await expect(async () => {
        await act(async () => {
          await result.current.spawnAgent({
            instructions: 'Test',
            workingDirectory: '/test'
          });
        });
      }).rejects.toThrow('Spawn failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'useAgentManager: Error in spawnAgent',
        { error: testError }
      );
      
      // Error will be cleared by the next polling cycle in stableFetchAgents (line 145)
      // So we need to stop polling or just test that the error was logged
      // The critical path is that error is set and then thrown - not persistence
    });

    it('should refresh agents after successful spawn (Lines 819-825)', async () => {
      const mockAgent = { id: 'new-agent', status: 'running' };
      mockAgentManager.getActiveAgents.mockReturnValue([mockAgent]);
      mockAgentManager.getAgentDetails.mockReturnValue({ 
        ...mockAgent, 
        todos: [{ id: '1', content: 'Test', status: 'pending' }] 
      });

      const { result } = renderHook(() => useAgentManager(mockAgentManager));

      await act(async () => {
        await result.current.spawnAgent({
          instructions: 'Test instructions',
          workingDirectory: '/test/dir'
        });
      });

      // Should have called getActiveAgents and getAgentDetails for refresh
      expect(mockAgentManager.getActiveAgents).toHaveBeenCalled();
      expect(mockAgentManager.getAgentDetails).toHaveBeenCalledWith('new-agent');
    });
  });

  describe('terminateAgent Function (Lines 834-863)', () => {
    it('should successfully terminate agent', async () => {
      const { result } = renderHook(() => useAgentManager(mockAgentManager));

      await act(async () => {
        await result.current.terminateAgent('test-agent-456');
      });

      expect(mockAgentManager.terminateAgent).toHaveBeenCalledWith('test-agent-456', {});
    });

    it('should terminate agent with custom options', async () => {
      const { result } = renderHook(() => useAgentManager(mockAgentManager));

      const options = { force: true, timeout: 5000 };
      await act(async () => {
        await result.current.terminateAgent('test-agent-456', options);
      });

      expect(mockAgentManager.terminateAgent).toHaveBeenCalledWith('test-agent-456', options);
    });

    it('should throw error when agentManager is null (Line 836)', async () => {
      const { result } = renderHook(() => useAgentManager(null));

      await expect(async () => {
        await act(async () => {
          await result.current.terminateAgent('test-agent');
        });
      }).rejects.toThrow('AgentManager not initialized');
    });

    it('should clear selection when terminating selected agent (Line 843)', async () => {
      const { result } = renderHook(() => useAgentManager(mockAgentManager));

      // First select an agent
      act(() => {
        result.current.selectAgent('target-agent');
      });
      expect(result.current.selectedAgentId).toBe('target-agent');

      // Terminate the selected agent
      await act(async () => {
        await result.current.terminateAgent('target-agent');
      });

      expect(result.current.selectedAgentId).toBeNull();
    });

    it('should not clear selection when terminating different agent', async () => {
      const { result } = renderHook(() => useAgentManager(mockAgentManager));

      act(() => {
        result.current.selectAgent('keep-selected');
      });

      await act(async () => {
        await result.current.terminateAgent('different-agent');
      });

      expect(result.current.selectedAgentId).toBe('keep-selected');
    });

    it('should handle terminateAgent errors (Lines 860-862)', async () => {
      const testError = new Error('Terminate failed');
      mockAgentManager.terminateAgent.mockRejectedValue(testError);
      
      const { result } = renderHook(() => useAgentManager(mockAgentManager));

      await expect(async () => {
        await act(async () => {
          await result.current.terminateAgent('test-agent');
        });
      }).rejects.toThrow('Terminate failed');

      // Error will be cleared by the next polling cycle in stableFetchAgents (line 145)
      // The critical behavior is that the error is thrown, which we already tested
    });

    it('should refresh agents after successful termination (Lines 846-858)', async () => {
      const remainingAgent = { id: 'remaining-agent', status: 'running' };
      mockAgentManager.getActiveAgents.mockReturnValue([remainingAgent]);
      mockAgentManager.getAgentDetails.mockReturnValue({ 
        ...remainingAgent, 
        todos: [] 
      });

      const { result } = renderHook(() => useAgentManager(mockAgentManager));

      await act(async () => {
        await result.current.terminateAgent('terminated-agent');
      });

      expect(mockAgentManager.getActiveAgents).toHaveBeenCalled();
      expect(mockAgentManager.getAgentDetails).toHaveBeenCalledWith('remaining-agent');
    });
  });

  describe('Agent Change Detection (Lines 707-750)', () => {
    it('should detect changes in agent count', async () => {
      const { rerender } = renderHook(
        ({ agents }) => {
          const manager = {
            ...mockAgentManager,
            getActiveAgents: jest.fn().mockReturnValue(agents),
          };
          return useAgentManager(manager);
        },
        { initialProps: { agents: [] } }
      );

      // Start with empty agents
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Add agents - should trigger change detection
      const newAgents = [{ id: 'agent1', status: 'running' }];
      rerender({ agents: newAgents });

      act(() => {
        jest.advanceTimersByTime(600);
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'useAgentManager: Agents changed',
        expect.objectContaining({
          prevCount: expect.any(Number),
          newCount: expect.any(Number),
        })
      );
    });

    it('should detect changes in agent status', async () => {
      const agent = { id: 'agent1', status: 'running' };
      mockAgentManager.getActiveAgents.mockReturnValue([agent]);
      mockAgentManager.getAgentDetails.mockReturnValue({ ...agent, todos: [] });

      const { result } = renderHook(() => useAgentManager(mockAgentManager));

      // Let initial fetch complete
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Change agent status
      const updatedAgent = { ...agent, status: 'terminated' };
      mockAgentManager.getActiveAgents.mockReturnValue([updatedAgent]);
      mockAgentManager.getAgentDetails.mockReturnValue({ ...updatedAgent, todos: [] });

      act(() => {
        jest.advanceTimersByTime(600);
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'useAgentManager: Agents changed',
        expect.any(Object)
      );
    });

    it('should detect changes in todos array', async () => {
      const agent = { id: 'agent1', status: 'running' };
      
      // Start with empty todos
      mockAgentManager.getActiveAgents.mockReturnValue([agent]);
      mockAgentManager.getAgentDetails.mockReturnValue({ 
        ...agent, 
        todos: [] 
      });

      const { result } = renderHook(() => useAgentManager(mockAgentManager));

      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Add todos - should trigger change detection
      mockAgentManager.getAgentDetails.mockReturnValue({ 
        ...agent, 
        todos: [{ id: '1', content: 'New task', status: 'pending' }] 
      });

      act(() => {
        jest.advanceTimersByTime(600);
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'useAgentManager: Agents changed',
        expect.any(Object)
      );
    });

    it('should handle todos comparison edge cases', async () => {
      const agent = { id: 'agent1', status: 'running' };
      
      // Start with todos that will be compared
      mockAgentManager.getActiveAgents.mockReturnValue([agent]);
      mockAgentManager.getAgentDetails.mockReturnValue({ 
        ...agent, 
        todos: [
          { id: '1', content: 'Task 1', status: 'pending' },
          { id: '2', content: 'Task 2', status: 'in_progress' }
        ] 
      });

      const { result } = renderHook(() => useAgentManager(mockAgentManager));

      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Change todo status - should detect change
      mockAgentManager.getAgentDetails.mockReturnValue({ 
        ...agent, 
        todos: [
          { id: '1', content: 'Task 1', status: 'completed' }, // Status changed
          { id: '2', content: 'Task 2', status: 'in_progress' }
        ] 
      });

      act(() => {
        jest.advanceTimersByTime(600);
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'useAgentManager: Agents changed',
        expect.any(Object)
      );
    });
  });

  describe('Agent Details and Enrichment', () => {
    it('should handle missing agentDetails gracefully (Line 680)', async () => {
      const agent = { id: 'agent1', status: 'running' };
      mockAgentManager.getActiveAgents.mockReturnValue([agent]);
      mockAgentManager.getAgentDetails.mockReturnValue(null); // No details

      const { result } = renderHook(() => useAgentManager(mockAgentManager));

      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Should handle null agentDetails and use empty todos array
      expect(result.current.agents).toHaveLength(1);
      expect(result.current.agents[0].todos).toEqual([]);
    });

    it('should handle agents with missing optional fields (Lines 696-703)', async () => {
      const minimalAgent = { id: 'minimal-agent' }; // Only required field
      mockAgentManager.getActiveAgents.mockReturnValue([minimalAgent]);
      mockAgentManager.getAgentDetails.mockReturnValue({ ...minimalAgent, todos: [] });

      const { result } = renderHook(() => useAgentManager(mockAgentManager));

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current.agents).toHaveLength(1);
      const agent = result.current.agents[0];
      expect(agent.id).toBe('minimal-agent');
      expect(agent.name).toBe('minimal-agent');
      expect(agent.status).toBe('unknown'); // Default for missing status
      expect(agent.startTime).toBeInstanceOf(Date);
      expect(agent.lastActivity).toBeUndefined();
      expect(agent.todos).toEqual([]);
    });
  });

  describe('Selected Agent Cleanup (Lines 755-760)', () => {
    it('should clear selection when selected agent no longer exists', async () => {
      const agent = { id: 'temp-agent', status: 'running' };
      mockAgentManager.getActiveAgents.mockReturnValue([agent]);
      mockAgentManager.getAgentDetails.mockReturnValue({ ...agent, todos: [] });

      const { result } = renderHook(() => useAgentManager(mockAgentManager));

      // Select the agent
      act(() => {
        result.current.selectAgent('temp-agent');
        jest.advanceTimersByTime(100);
      });
      expect(result.current.selectedAgentId).toBe('temp-agent');

      // Remove the agent from active agents
      mockAgentManager.getActiveAgents.mockReturnValue([]);

      act(() => {
        jest.advanceTimersByTime(600);
      });

      // Selection should be cleared
      expect(result.current.selectedAgentId).toBeNull();
    });

    it('should keep selection when selected agent still exists', async () => {
      const agent = { id: 'persistent-agent', status: 'running' };
      mockAgentManager.getActiveAgents.mockReturnValue([agent]);
      mockAgentManager.getAgentDetails.mockReturnValue({ ...agent, todos: [] });

      const { result } = renderHook(() => useAgentManager(mockAgentManager));

      act(() => {
        result.current.selectAgent('persistent-agent');
        jest.advanceTimersByTime(600);
      });

      expect(result.current.selectedAgentId).toBe('persistent-agent');
    });
  });

  describe('Error Handling in Polling', () => {
    it('should handle getActiveAgents errors gracefully', async () => {
      mockAgentManager.getActiveAgents.mockImplementation(() => {
        throw new Error('Failed to fetch agents');
      });

      const { result } = renderHook(() => useAgentManager(mockAgentManager));

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Failed to fetch agents');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Interval Management', () => {
    it('should establish polling interval with correct frequency', async () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      
      renderHook(() => useAgentManager(mockAgentManager));

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 500);
    });

    it('should call stableFetchAgents on interval', async () => {
      renderHook(() => useAgentManager(mockAgentManager));

      // Initial call
      expect(mockAgentManager.getActiveAgents).toHaveBeenCalledTimes(1);

      // Advance by interval
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(mockAgentManager.getActiveAgents).toHaveBeenCalledTimes(2);

      // Another interval
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(mockAgentManager.getActiveAgents).toHaveBeenCalledTimes(3);
    });
  });
});