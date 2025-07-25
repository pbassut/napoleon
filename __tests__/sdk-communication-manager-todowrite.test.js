// Mock fs module BEFORE importing the communication manager
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  statSync: jest.fn().mockReturnValue({
    isDirectory: jest.fn().mockReturnValue(true)
  }),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn().mockReturnValue('{}'),
}));

// Mock tool usage tracker
const mockToolUsageTracker = {
  initializeAgent: jest.fn(),
  trackTodoWrite: jest.fn(),
  getAgentTodos: jest.fn().mockReturnValue([]),
  cleanupAgent: jest.fn(),
};

jest.mock('../src/core/tool-usage-tracker', () => mockToolUsageTracker);

const SDKCommunicationManager = require('../src/core/sdk/communication-manager');
const logger = require('../src/utils/logger');
const AgentLogManager = require('../src/core/logging/agent-log-manager');

// Mock Claude Code SDK
jest.mock('@anthropic-ai/claude-code', () => ({
  query: jest.fn(),
}));

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('../src/core/logging/agent-log-manager', () => {
  return jest.fn().mockImplementation(() => ({
    writeLogEntry: jest.fn().mockResolvedValue(true),
    isInitialized: jest.fn().mockReturnValue(true),
  }));
});

jest.mock('../src/core/config', () => ({
  loadConfig: jest.fn().mockReturnValue({
    napoleonDir: '/test/.napoleon',
    sessionStorage: '/test/.napoleon/sessions',
    maxPromptLength: 50
  }),
}));

// Mock console.error used by tool tracker
global.console.error = jest.fn();

describe('SDKCommunicationManager TodoWrite Integration', () => {
  let manager;
  let mockQuery;
  let mockAgentLogManager;

  const testAgentId = 'test-agent-123';
  const testWorkingDirectory = '/test/working/dir';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup Claude SDK mock
    const { query } = require('@anthropic-ai/claude-code');
    mockQuery = query;
    
    mockAgentLogManager = new AgentLogManager();
    manager = new SDKCommunicationManager(mockAgentLogManager);
  });

  afterEach(async () => {
    // Clean up any sessions
    if (manager.sessions.has(testAgentId)) {
      await manager.terminateSession(testAgentId);
    }
  });

  describe('TodoWrite Tool Tracking', () => {
    test('should track TodoWrite tool usage during message processing', async () => {
      // Initialize SDK session
      await manager.initializeSDKSession(testAgentId, testWorkingDirectory);

      const testTodos = [
        {
          id: 'task-1',
          content: 'Complete implementation',
          priority: 'high',
          status: 'pending'
        }
      ];

      // Mock SDK response with TodoWrite tool usage
      const mockMessages = [
        {
          id: 'msg_1',
          type: 'assistant',
          content: [
            {
              type: 'text',
              text: 'I will track the tasks using TodoWrite.'
            },
            {
              type: 'tool_use',
              id: 'tool_123',
              name: 'TodoWrite',
              input: {
                todos: testTodos
              }
            }
          ],
          usage: { input: 100, output: 50, total: 150 }
        }
      ];

      // Setup async generator mock - clear previous mocks first
      jest.clearAllMocks();
      mockQuery.mockImplementation(async function* () {
        for (const message of mockMessages) {
          yield message;
        }
      });

      // Execute query
      const result = await manager.executeQuery(testAgentId, 'Test prompt');

      // Verify tool tracking was called
      expect(mockToolUsageTracker.initializeAgent).toHaveBeenCalledWith(testAgentId);
      expect(mockToolUsageTracker.trackTodoWrite).toHaveBeenCalledWith(
        testAgentId,
        expect.objectContaining({
          id: 'tool_123',
          name: 'TodoWrite',
          input: { todos: testTodos }
        }),
        expect.objectContaining({
          id: 'msg_1',
          type: 'assistant'
        })
      );

      // Verify successful execution
      expect(result).toEqual(mockMessages);
      expect(logger.debug).toHaveBeenCalledWith(
        'TodoWrite usage tracked',
        expect.objectContaining({
          agentId: testAgentId,
          toolId: 'tool_123',
          messageId: 'msg_1',
          todoCount: 1
        })
      );
    });

    test('should handle multiple TodoWrite calls in single response', async () => {
      await manager.initializeSDKSession(testAgentId, testWorkingDirectory);

      const mockMessages = [
        {
          id: 'msg_1',
          content: [
            {
              type: 'tool_use',
              id: 'tool_1',
              name: 'TodoWrite',
              input: {
                todos: [
                  { id: '1', content: 'Task 1', priority: 'high', status: 'pending' }
                ]
              }
            }
          ]
        },
        {
          id: 'msg_2', 
          content: [
            {
              type: 'tool_use',
              id: 'tool_2',
              name: 'TodoWrite',
              input: {
                todos: [
                  { id: '1', content: 'Task 1', priority: 'high', status: 'completed' },
                  { id: '2', content: 'Task 2', priority: 'medium', status: 'pending' }
                ]
              }
            }
          ]
        }
      ];

      jest.clearAllMocks();
      mockQuery.mockImplementation(async function* () {
        for (const message of mockMessages) {
          yield message;
        }
      });

      await manager.executeQuery(testAgentId, 'Test prompt');

      expect(mockToolUsageTracker.trackTodoWrite).toHaveBeenCalledTimes(2);
      expect(mockToolUsageTracker.trackTodoWrite).toHaveBeenNthCalledWith(
        1,
        testAgentId,
        expect.objectContaining({ id: 'tool_1' }),
        expect.objectContaining({ id: 'msg_1' })
      );
      expect(mockToolUsageTracker.trackTodoWrite).toHaveBeenNthCalledWith(
        2,
        testAgentId,
        expect.objectContaining({ id: 'tool_2' }),
        expect.objectContaining({ id: 'msg_2' })
      );
    });

    test('should ignore non-TodoWrite tools', async () => {
      await manager.initializeSDKSession(testAgentId, testWorkingDirectory);

      const mockMessages = [
        {
          id: 'msg_1',
          content: [
            {
              type: 'tool_use',
              id: 'tool_other',
              name: 'SomeOtherTool',
              input: { data: 'test' }
            }
          ]
        }
      ];

      jest.clearAllMocks();
      mockQuery.mockImplementation(async function* () {
        for (const message of mockMessages) {
          yield message;
        }
      });

      await manager.executeQuery(testAgentId, 'Test prompt');

      expect(mockToolUsageTracker.trackTodoWrite).not.toHaveBeenCalled();
      expect(mockToolUsageTracker.initializeAgent).not.toHaveBeenCalled();
    });

    test('should handle tool tracking errors gracefully', async () => {
      await manager.initializeSDKSession(testAgentId, testWorkingDirectory);

      const mockMessages = [
        {
          id: 'msg_1',
          content: [
            {
              type: 'tool_use',
              id: 'tool_123',
              name: 'TodoWrite',
              input: { todos: [] }
            }
          ]
        }
      ];

      jest.clearAllMocks();
      // Make trackTodoWrite throw an error AFTER clearing mocks
      mockToolUsageTracker.trackTodoWrite.mockImplementation(() => {
        throw new Error('Tracking failed');
      });

      mockQuery.mockImplementation(async function* () {
        for (const message of mockMessages) {
          yield message;
        }
      });

      // Should not throw error - tracking failures should be non-blocking
      const result = await manager.executeQuery(testAgentId, 'Test prompt');

      expect(result).toEqual(mockMessages);
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to track tool usage',
        expect.objectContaining({
          agentId: testAgentId,
          error: 'Tracking failed',
          messageId: 'msg_1'
        })
      );
    });

    test('should handle messages without content gracefully', async () => {
      await manager.initializeSDKSession(testAgentId, testWorkingDirectory);

      const mockMessages = [
        {
          id: 'msg_1',
          type: 'assistant'
          // No content property
        },
        {
          id: 'msg_2',
          content: null
        },
        {
          id: 'msg_3',
          content: 'string content instead of array'
        }
      ];

      jest.clearAllMocks();
      mockQuery.mockImplementation(async function* () {
        for (const message of mockMessages) {
          yield message;
        }
      });

      // Should not throw error
      const result = await manager.executeQuery(testAgentId, 'Test prompt');

      expect(result).toEqual(mockMessages);
      expect(mockToolUsageTracker.trackTodoWrite).not.toHaveBeenCalled();
    });
  });

  describe('trackToolUsage method', () => {
    test('should call trackToolUsage method directly', () => {
      const mockMessage = {
        id: 'msg_test',
        content: [
          {
            type: 'tool_use',
            id: 'tool_direct',
            name: 'TodoWrite',
            input: {
              todos: [
                { id: 'direct', content: 'Direct test', priority: 'high', status: 'pending' }
              ]
            }
          }
        ]
      };

      manager.trackToolUsage(testAgentId, mockMessage);

      expect(mockToolUsageTracker.initializeAgent).toHaveBeenCalledWith(testAgentId);
      expect(mockToolUsageTracker.trackTodoWrite).toHaveBeenCalledWith(
        testAgentId,
        expect.objectContaining({
          id: 'tool_direct',
          name: 'TodoWrite'
        }),
        mockMessage
      );

      expect(logger.debug).toHaveBeenCalledWith(
        'TodoWrite usage tracked',
        expect.objectContaining({
          agentId: testAgentId,
          toolId: 'tool_direct',
          messageId: 'msg_test',
          todoCount: 1
        })
      );
    });
  });
});