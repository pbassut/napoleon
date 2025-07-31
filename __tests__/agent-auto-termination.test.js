const { spawn, execSync, exec } = require('child_process');
const fs = require('fs');
const AgentManager = require('../src/core/agent-manager');
const logger = require('../src/utils/logger');

// Mock dependencies
jest.mock('../src/utils/logger');
const mockConfig = {
  loadConfig: jest.fn().mockReturnValue({
    logLevel: 'info',
    napoleonDir: '/test/.napoleon',
    features: {
      autoCleanup: true,
    },
  }),
  SESSIONS_FILE: '/test/.napoleon/sessions.json',
  initializeSessionStorage: jest.fn(),
};

jest.mock('../src/core/config', () => mockConfig);

jest.mock('child_process', () => ({
  spawn: jest.fn(),
  execSync: jest.fn(),
  exec: jest.fn(),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn().mockReturnValue('{"sessions": []}'),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  statSync: jest.fn().mockReturnValue({
    isDirectory: jest.fn().mockReturnValue(true),
  }),
  rmSync: jest.fn(),
}));


// Mock SDKCommunicationManager
const mockSDKManager = {
  executeQuery: jest.fn(),
  executeQueryStream: jest.fn(),
  initializeSDKSession: jest.fn().mockResolvedValue({
    agentId: 'test-agent',
    sessionId: 'test-session',
    isActive: true,
  }),
  terminateSession: jest.fn().mockResolvedValue(true),
  getSession: jest.fn().mockReturnValue({
    agentId: 'test-agent',
    isActive: true,
  }),
  getActiveSessions: jest.fn().mockReturnValue([]),
};

jest.mock('../src/core/sdk/communication-manager', () => jest.fn().mockImplementation(() => mockSDKManager));

// Mock AgentLogManager
jest.mock('../src/core/logging/agent-log-manager', () => jest.fn().mockImplementation(() => ({
  initialize: jest.fn().mockResolvedValue(undefined),
})));

// Mock tool usage tracker
jest.mock('../src/core/tool-usage-tracker', () => ({
  initializeAgent: jest.fn(),
  trackTodoWrite: jest.fn(),
  getAgentTodos: jest.fn().mockReturnValue([]),
  cleanupAgent: jest.fn(),
}));

describe('Agent Auto-Termination', () => {
  let agentManager;
  let mockProcess;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create agent manager without full initialization to avoid timeouts
    agentManager = new AgentManager();

    // Manually set config to ensure autoCleanup is enabled
    agentManager.config = {
      features: {
        autoCleanup: true,
      },
    };

    // Initialize agents map
    agentManager.agents = new Map();

    // Mock terminateAgent method
    agentManager.terminateAgent = jest.fn().mockResolvedValue(true);

    // Reset SDK manager mocks
    mockSDKManager.executeQuery.mockClear();
    mockSDKManager.executeQueryStream.mockClear();
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
            },
          );

          // Verify termination log was added
          const session = agentManager.agents.get(agentId);
          expect(session.logs).toContainEqual(
            expect.objectContaining({
              content: 'Agent completed task and is waiting for input - auto-terminating',
              type: 'system',
            }),
          );

          done();
        } catch (error) {
          done(error);
        }
      });
    }, 15000);

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
        }),
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
              }),
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
