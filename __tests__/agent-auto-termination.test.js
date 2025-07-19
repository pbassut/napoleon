const AgentManager = require('../src/core/agent-manager');
const logger = require('../src/utils/logger');

// Mock dependencies
jest.mock('../src/utils/logger');
jest.mock('../src/core/config', () => ({
  loadConfig: () => ({
    maxAgents: 3,
    logging: { agents: { enabled: false } },
  }),
  SESSIONS_FILE: '/tmp/test-sessions.json',
}));

describe('Agent Auto-Termination', () => {
  let agentManager;

  beforeEach(async () => {
    agentManager = new AgentManager();
    await agentManager.initialize();

    // Mock terminateAgent method
    agentManager.terminateAgent = jest.fn().mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleSDKMessage with result type', () => {
    test('should auto-terminate agent when message type is "result"', (done) => {
      const agentId = 'test-agent-1';
      
      // Create a mock session
      agentManager.agents.set(agentId, {
        id: agentId,
        logs: [],
        lastActivity: new Date().toISOString(),
      });

      const resultMessage = {
        type: 'result',
        content: 'Task completed successfully. Please provide next instructions.',
        id: 'msg-123',
      };

      // Call handleSDKMessage
      agentManager.handleSDKMessage(agentId, resultMessage);

      // Use setImmediate to check async termination
      setImmediate(() => {
        try {
          // Verify termination was called
          expect(agentManager.terminateAgent).toHaveBeenCalledWith(agentId);
          
          // Verify logging
          expect(logger.info).toHaveBeenCalledWith(
            'Agent reached result state, auto-terminating',
            {
              agentId,
              resultContent: resultMessage.content,
            }
          );

          // Verify termination log was added
          const session = agentManager.agents.get(agentId);
          expect(session.logs).toContainEqual(
            expect.objectContaining({
              content: 'Agent completed task and is waiting for input - auto-terminating',
              type: 'system',
            })
          );

          done();
        } catch (error) {
          done(error);
        }
      });
    });

    test('should NOT auto-terminate agent for non-result message types', () => {
      const agentId = 'test-agent-2';
      
      // Create a mock session
      agentManager.agents.set(agentId, {
        id: agentId,
        logs: [],
        lastActivity: new Date().toISOString(),
      });

      const normalMessage = {
        type: 'info',
        content: 'Processing your request...',
        id: 'msg-456',
      };

      // Call handleSDKMessage
      agentManager.handleSDKMessage(agentId, normalMessage);

      // Verify termination was NOT called
      expect(agentManager.terminateAgent).not.toHaveBeenCalled();
      
      // Verify no termination log was added
      const session = agentManager.agents.get(agentId);
      expect(session.logs).not.toContainEqual(
        expect.objectContaining({
          content: 'Agent completed task and is waiting for input - auto-terminating',
          type: 'system',
        })
      );
    });

    test('should handle termination errors gracefully', (done) => {
      const agentId = 'test-agent-3';
      
      // Mock terminateAgent to reject
      agentManager.terminateAgent = jest.fn().mockRejectedValue(new Error('Termination failed'));
      
      // Create a mock session
      agentManager.agents.set(agentId, {
        id: agentId,
        logs: [],
        lastActivity: new Date().toISOString(),
      });

      const resultMessage = {
        type: 'result',
        content: 'Task completed.',
        id: 'msg-789',
      };

      // Call handleSDKMessage
      agentManager.handleSDKMessage(agentId, resultMessage);

      // Use setImmediate to check async error handling
      setImmediate(() => {
        setTimeout(() => {
          try {
            // Verify termination was attempted
            expect(agentManager.terminateAgent).toHaveBeenCalledWith(agentId);
            
            // Verify error was logged
            expect(logger.error).toHaveBeenCalledWith(
              'Failed to auto-terminate agent',
              expect.objectContaining({
                agentId,
                error: 'Termination failed',
              })
            );

            done();
          } catch (error) {
            done(error);
          }
        }, 10); // Small delay to allow promise rejection to be handled
      });
    });
  });
});