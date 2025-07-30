import { AGENT_STATUS, getStatusInfo, AgentStatusInfo } from '../../../../src/ui/ink/constants/agentStatus';

describe('agentStatus constants', () => {
  describe('AGENT_STATUS', () => {
    it('should contain all expected status types', () => {
      const expectedStatuses = [
        'SPAWNING', 'FORKING', 'STARTING', 'RUNNING', 'PENDING', 
        'IDLE', 'ERROR', 'FAILED', 'TERMINATED'
      ];
      
      expectedStatuses.forEach(status => {
        expect(AGENT_STATUS[status]).toBeDefined();
        expect(AGENT_STATUS[status]).toHaveProperty('emoji');
        expect(AGENT_STATUS[status]).toHaveProperty('text');
        expect(AGENT_STATUS[status]).toHaveProperty('color');
      });
    });

    it('should contain correct structure for each status', () => {
      Object.values(AGENT_STATUS).forEach((statusInfo: AgentStatusInfo) => {
        expect(typeof statusInfo.emoji).toBe('string');
        expect(typeof statusInfo.text).toBe('string');
        expect(typeof statusInfo.color).toBe('string');
        expect(statusInfo.emoji).toBeTruthy();
        expect(statusInfo.text).toBeTruthy();
        expect(statusInfo.color).toBeTruthy();
      });
    });

    it('should have specific values for known statuses', () => {
      expect(AGENT_STATUS.SPAWNING.emoji).toBe('🟡');
      expect(AGENT_STATUS.SPAWNING.text).toBe('Spawning...');
      expect(AGENT_STATUS.SPAWNING.color).toBe('yellow');

      expect(AGENT_STATUS.RUNNING.emoji).toBe('🟢');
      expect(AGENT_STATUS.RUNNING.text).toBe('Running');
      expect(AGENT_STATUS.RUNNING.color).toBe('green');

      expect(AGENT_STATUS.ERROR.emoji).toBe('🔴');
      expect(AGENT_STATUS.ERROR.text).toBe('Error');
      expect(AGENT_STATUS.ERROR.color).toBe('red');

      expect(AGENT_STATUS.TERMINATED.emoji).toBe('⚪');
      expect(AGENT_STATUS.TERMINATED.text).toBe('Terminated');
      expect(AGENT_STATUS.TERMINATED.color).toBe('gray');
    });
  });

  describe('getStatusInfo', () => {
    it('should return correct status info for known statuses', () => {
      const result = getStatusInfo('running');
      expect(result).toEqual({
        emoji: '🟢',
        text: 'Running',
        color: 'green'
      });
    });

    it('should handle uppercase input', () => {
      const result = getStatusInfo('RUNNING');
      expect(result).toEqual({
        emoji: '🟢',
        text: 'Running',
        color: 'green'
      });
    });

    it('should handle lowercase input', () => {
      const result = getStatusInfo('error');
      expect(result).toEqual({
        emoji: '🔴',
        text: 'Error',
        color: 'red'
      });
    });

    it('should handle mixed case input', () => {
      const result = getStatusInfo('SpAwNiNg');
      expect(result).toEqual({
        emoji: '🟡',
        text: 'Spawning...',
        color: 'yellow'
      });
    });

    it('should return default status for unknown statuses', () => {
      const result = getStatusInfo('unknown_status');
      expect(result).toEqual({
        emoji: '⚪',
        text: 'unknown_status',
        color: 'gray'
      });
    });

    it('should preserve original text for unknown statuses', () => {
      const customStatus = 'Custom Status Name';
      const result = getStatusInfo(customStatus);
      expect(result.text).toBe(customStatus);
      expect(result.emoji).toBe('⚪');
      expect(result.color).toBe('gray');
    });

    it('should handle empty string', () => {
      const result = getStatusInfo('');
      expect(result).toEqual({
        emoji: '⚪',
        text: '',
        color: 'gray'
      });
    });

    it('should handle all defined statuses', () => {
      const statuses = [
        'SPAWNING', 'FORKING', 'STARTING', 'RUNNING', 'PENDING',
        'IDLE', 'ERROR', 'FAILED', 'TERMINATED'
      ];

      statuses.forEach(status => {
        const result = getStatusInfo(status);
        expect(result.emoji).toBeTruthy();
        expect(result.text).toBeTruthy();
        expect(result.color).toBeTruthy();
        
        // Should match the predefined status
        expect(result).toEqual(AGENT_STATUS[status]);
      });
    });

    it('should handle special characters in status', () => {
      const result = getStatusInfo('status-with-special!@#');
      expect(result.text).toBe('status-with-special!@#');
      expect(result.emoji).toBe('⚪');
      expect(result.color).toBe('gray');
    });
  });
});