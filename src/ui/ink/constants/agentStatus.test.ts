import { AGENT_STATUS, getStatusInfo } from './agentStatus.ts';

describe('Agent Status Constants', () => {
  describe('AGENT_STATUS', () => {
    it('should have all required status types', () => {
      const expectedStatuses = [
        'SPAWNING',
        'FORKING',
        'STARTING',
        'RUNNING',
        'PENDING',
        'IDLE',
        'ERROR',
        'FAILED',
        'TERMINATED',
      ];

      expectedStatuses.forEach((status) => {
        expect(AGENT_STATUS).toHaveProperty(status);
      });
    });

    it('should have correct emoji for each status', () => {
      expect(AGENT_STATUS.SPAWNING.emoji).toBe('🟡');
      expect(AGENT_STATUS.FORKING.emoji).toBe('🟡');
      expect(AGENT_STATUS.STARTING.emoji).toBe('🟡');
      expect(AGENT_STATUS.RUNNING.emoji).toBe('🟢');
      expect(AGENT_STATUS.PENDING.emoji).toBe('🟡');
      expect(AGENT_STATUS.IDLE.emoji).toBe('🟡');
      expect(AGENT_STATUS.ERROR.emoji).toBe('🔴');
      expect(AGENT_STATUS.FAILED.emoji).toBe('🔴');
      expect(AGENT_STATUS.TERMINATED.emoji).toBe('⚪');
    });

    it('should have correct text for each status', () => {
      expect(AGENT_STATUS.SPAWNING.text).toBe('Spawning...');
      expect(AGENT_STATUS.FORKING.text).toBe('Forking...');
      expect(AGENT_STATUS.STARTING.text).toBe('Starting...');
      expect(AGENT_STATUS.RUNNING.text).toBe('Running');
      expect(AGENT_STATUS.PENDING.text).toBe('Pending');
      expect(AGENT_STATUS.IDLE.text).toBe('Idle');
      expect(AGENT_STATUS.ERROR.text).toBe('Error');
      expect(AGENT_STATUS.FAILED.text).toBe('Failed');
      expect(AGENT_STATUS.TERMINATED.text).toBe('Terminated');
    });

    it('should have correct color for each status', () => {
      expect(AGENT_STATUS.SPAWNING.color).toBe('yellow');
      expect(AGENT_STATUS.FORKING.color).toBe('yellow');
      expect(AGENT_STATUS.STARTING.color).toBe('yellow');
      expect(AGENT_STATUS.RUNNING.color).toBe('green');
      expect(AGENT_STATUS.PENDING.color).toBe('yellow');
      expect(AGENT_STATUS.IDLE.color).toBe('yellow');
      expect(AGENT_STATUS.ERROR.color).toBe('red');
      expect(AGENT_STATUS.FAILED.color).toBe('red');
      expect(AGENT_STATUS.TERMINATED.color).toBe('gray');
    });
  });

  describe('getStatusInfo', () => {
    it('should return correct status info for lowercase input', () => {
      const statusInfo = getStatusInfo('running');
      expect(statusInfo).toEqual({
        emoji: '🟢',
        text: 'Running',
        color: 'green',
      });
    });

    it('should return correct status info for uppercase input', () => {
      const statusInfo = getStatusInfo('ERROR');
      expect(statusInfo).toEqual({
        emoji: '🔴',
        text: 'Error',
        color: 'red',
      });
    });

    it('should return correct status info for mixed case input', () => {
      const statusInfo = getStatusInfo('Spawning');
      expect(statusInfo).toEqual({
        emoji: '🟡',
        text: 'Spawning...',
        color: 'yellow',
      });
    });

    it('should return default status info for unknown status', () => {
      const statusInfo = getStatusInfo('unknown-status');
      expect(statusInfo).toEqual({
        emoji: '⚪',
        text: 'unknown-status',
        color: 'gray',
      });
    });

    it('should return default status info for empty string', () => {
      const statusInfo = getStatusInfo('');
      expect(statusInfo).toEqual({
        emoji: '⚪',
        text: '',
        color: 'gray',
      });
    });

    it('should handle all defined statuses correctly', () => {
      Object.keys(AGENT_STATUS).forEach((statusKey) => {
        const statusInfo = getStatusInfo(statusKey.toLowerCase());
        expect(statusInfo).toEqual(AGENT_STATUS[statusKey]);
      });
    });
  });
});
