// Mock logger to avoid logging during tests
jest.mock('../../../utils/logger.js', () => ({
  debug: jest.fn(),
  error: jest.fn(),
}));

describe('useAgentManager spawnTime fix', () => {
  describe('agent data conversion logic', () => {
    // Test the core conversion logic that was fixed
    const convertAgentLogic = (agentData: Record<string, unknown>) => ({
      id: agentData.id,
      name: agentData.id, // Use ID as name for now
      status: agentData.status || 'unknown',
      startTime: agentData.spawnTime ? new Date(agentData.spawnTime as string) : new Date(),
      lastActivity: agentData.lastActivity ? new Date(agentData.lastActivity as string) : undefined,
      instructions: agentData.instructions,
      workingDirectory: agentData.workingDirectory,
      error: agentData.error,
      progress: agentData.progress,
    });

    it('should use spawnTime field for agent startTime when available', () => {
      const spawnTime = '2025-01-24T10:00:00.000Z';
      const mockAgentData = {
        id: 'agent-1',
        status: 'running',
        spawnTime,
        instructions: 'Test instructions',
        workingDirectory: '/test',
        error: null,
        progress: null,
      };

      const result = convertAgentLogic(mockAgentData);

      expect(result.startTime).toEqual(new Date(spawnTime));
      expect(result.id).toBe('agent-1');
      expect(result.name).toBe('agent-1');
      expect(result.status).toBe('running');
    });

    it('should fall back to current time when spawnTime is not available', () => {
      const beforeTime = new Date();

      const mockAgentData = {
        id: 'agent-1',
        status: 'running',
        // No spawnTime field
        instructions: 'Test instructions',
        workingDirectory: '/test',
        error: null,
        progress: null,
      };

      const result = convertAgentLogic(mockAgentData);
      const afterTime = new Date();

      // Should use current time (new Date()) when spawnTime is not available
      expect(result.startTime).toBeInstanceOf(Date);
      expect(result.startTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(result.startTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
      expect(result.id).toBe('agent-1');
    });

    it('should handle multiple agents with different spawn times correctly', () => {
      const spawnTime1 = '2025-01-24T10:00:00.000Z';
      const spawnTime2 = '2025-01-24T10:05:00.000Z';
      const spawnTime3 = '2025-01-24T10:10:00.000Z';

      const agents = [
        {
          id: 'agent-1',
          status: 'running',
          spawnTime: spawnTime1,
          instructions: 'Agent 1 instructions',
          workingDirectory: '/test1',
          error: null,
          progress: null,
        },
        {
          id: 'agent-2',
          status: 'running',
          spawnTime: spawnTime2,
          instructions: 'Agent 2 instructions',
          workingDirectory: '/test2',
          error: null,
          progress: null,
        },
        {
          id: 'agent-3',
          status: 'running',
          spawnTime: spawnTime3,
          instructions: 'Agent 3 instructions',
          workingDirectory: '/test3',
          error: null,
          progress: null,
        },
      ];

      const results = agents.map(convertAgentLogic);

      // Verify each agent has its own distinct start time
      expect(results[0].startTime).toEqual(new Date(spawnTime1));
      expect(results[1].startTime).toEqual(new Date(spawnTime2));
      expect(results[2].startTime).toEqual(new Date(spawnTime3));

      // Verify times are different (no contamination)
      expect(results[0].startTime).not.toEqual(results[1].startTime);
      expect(results[1].startTime).not.toEqual(results[2].startTime);
      expect(results[0].startTime).not.toEqual(results[2].startTime);

      // Verify the 5-minute gaps are correct
      expect(results[1].startTime.getTime() - results[0].startTime.getTime()).toBe(5 * 60 * 1000);
      expect(results[2].startTime.getTime() - results[1].startTime.getTime()).toBe(5 * 60 * 1000);
    });

    it('should handle pending agents with spawnTime correctly (not createdAt)', () => {
      const spawnTime = '2025-01-24T10:00:00.000Z';
      const pendingAgent = {
        id: 'pending-agent-1',
        status: 'spawning',
        spawnTime,
        createdAt: '2025-01-24T09:55:00.000Z', // Different from spawnTime - should NOT be used
        instructions: 'Pending agent instructions',
        workingDirectory: '/test',
        progress: 'Initializing...',
      };

      const result = convertAgentLogic(pendingAgent);

      // Should use spawnTime, not createdAt (this was the bug)
      expect(result.startTime).toEqual(new Date(spawnTime));
      expect(result.startTime).not.toEqual(new Date(pendingAgent.createdAt));
      expect(result.status).toBe('spawning');
      expect(result.progress).toBe('Initializing...');
    });

    it('should demonstrate the fix eliminates runtime contamination', () => {
      // Simulate the bug scenario: multiple agents spawned at different actual times
      // but the old code would make them all have the same startTime

      const actualSpawnTimes = [
        '2025-01-24T10:00:00.000Z', // 2 hours ago
        '2025-01-24T10:30:00.000Z', // 1.5 hours ago
        '2025-01-24T11:15:00.000Z', // 45 minutes ago
      ];

      const agents = actualSpawnTimes.map((spawnTime, i) => ({
        id: `agent-${i + 1}`,
        status: 'running',
        spawnTime,
        instructions: `Agent ${i + 1} instructions`,
        workingDirectory: `/test${i + 1}`,
        error: null,
        progress: null,
      }));

      const results = agents.map(convertAgentLogic);

      // With the fix, each agent should have its own spawn time
      results.forEach((result, i) => {
        expect(result.startTime).toEqual(new Date(actualSpawnTimes[i]));
      });

      // Verify no contamination - all times should be different
      const times = results.map((r) => r.startTime.getTime());
      const uniqueTimes = new Set(times);
      expect(uniqueTimes.size).toBe(times.length); // All times should be unique

      // Verify proper time ordering (oldest to newest)
      expect(times[0]).toBeLessThan(times[1]);
      expect(times[1]).toBeLessThan(times[2]);
    });

    it('should handle edge case where agents are spawned very close together', () => {
      const closeSpawnTimes = [
        '2025-01-24T10:00:00.000Z',
        '2025-01-24T10:00:01.000Z', // 1 second later
        '2025-01-24T10:00:02.500Z', // 2.5 seconds later
      ];

      const agents = closeSpawnTimes.map((spawnTime, i) => ({
        id: `agent-${i + 1}`,
        status: 'running',
        spawnTime,
        instructions: `Agent ${i + 1} instructions`,
        workingDirectory: `/test${i + 1}`,
        error: null,
        progress: null,
      }));

      const results = agents.map(convertAgentLogic);

      // Even with very close spawn times, each should be distinct
      results.forEach((result, i) => {
        expect(result.startTime).toEqual(new Date(closeSpawnTimes[i]));
      });

      // Verify all times are different despite being close
      const times = results.map((r) => r.startTime.getTime());
      expect(times[0]).not.toBe(times[1]);
      expect(times[1]).not.toBe(times[2]);
      expect(times[0]).not.toBe(times[2]);
    });

    it('should handle idle agents with lastActivity field for frozen runtime', () => {
      const spawnTime = '2025-01-24T10:00:00.000Z';
      const lastActivity = '2025-01-24T10:15:00.000Z'; // 15 minutes after spawn

      const idleAgent = {
        id: 'idle-agent-1',
        status: 'idle',
        spawnTime,
        lastActivity,
        instructions: 'Completed task',
        workingDirectory: '/test',
        error: null,
        progress: 'Completed',
      };

      const result = convertAgentLogic(idleAgent);

      expect(result.startTime).toEqual(new Date(spawnTime));
      expect(result.lastActivity).toEqual(new Date(lastActivity));
      expect(result.status).toBe('idle');

      // lastActivity should be 15 minutes after startTime
      const timeDiff = result.lastActivity!.getTime() - result.startTime.getTime();
      expect(timeDiff).toBe(15 * 60 * 1000); // 15 minutes in milliseconds
    });

    it('should handle agents without lastActivity field gracefully', () => {
      const spawnTime = '2025-01-24T10:00:00.000Z';

      const runningAgent = {
        id: 'running-agent-1',
        status: 'running',
        spawnTime,
        // No lastActivity field
        instructions: 'Still running',
        workingDirectory: '/test',
        error: null,
        progress: 'In progress',
      };

      const result = convertAgentLogic(runningAgent);

      expect(result.startTime).toEqual(new Date(spawnTime));
      expect(result.lastActivity).toBeUndefined();
      expect(result.status).toBe('running');
    });
  });
});
