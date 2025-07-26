/**
 * Tests for US080: Real-Time Streaming Logs from Claude SDK
 * Validates that messages stream in real-time with <100ms latency
 */

// Mock the Claude Code SDK
jest.mock('@anthropic-ai/claude-code', () => ({
  query: jest.fn(),
}));

jest.mock('../src/core/sdk/communication-manager');
jest.mock('../src/core/logging/agent-log-manager');
jest.mock('../src/utils/logger');
jest.mock('../src/core/config', () => ({
  loadConfig: jest.fn().mockReturnValue({
    logLevel: 'info',
    features: { autoCleanup: false }
  }),
}));

const { query } = require('@anthropic-ai/claude-code');
const AgentManager = require('../src/core/agent-manager');
const { AgentStatus } = require('../src/core/agent-manager');

describe('AgentManager Real-Time Streaming (US080)', () => {
  let agentManager;
  let mockMessages;
  let mockAsyncIterator;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock messages that would come from Claude SDK
    mockMessages = [
      { id: '1', type: 'text', content: 'Message 1' },
      { id: '2', type: 'text', content: 'Message 2' },
      { id: '3', type: 'text', content: 'Message 3' },
      { id: '4', type: 'result', content: 'Final result' },
    ];

    // Create mock async iterator
    let messageIndex = 0;
    mockAsyncIterator = {
      [Symbol.asyncIterator]: function() {
        return this;
      },
      next: jest.fn().mockImplementation(async () => {
        if (messageIndex < mockMessages.length) {
          return { value: mockMessages[messageIndex++], done: false };
        }
        return { done: true };
      })
    };

    // Mock the Claude Code SDK query function
    query.mockReturnValue(mockAsyncIterator);

    agentManager = new AgentManager();
    // Mock initialize to avoid timeout
    agentManager.initialize = jest.fn().mockResolvedValue();
  });

  afterEach(() => {
    jest.useRealTimers();
    // No cleanup method needed - just clear the test state
  });

  describe('Real-time message streaming', () => {
    test('should process messages immediately using for await pattern', async () => {
      const agentId = 'test-streaming-agent';
      const instructions = 'Test streaming instructions';
      const handleSDKMessageSpy = jest.spyOn(agentManager, 'handleSDKMessage');
      
      // Create agent session
      const session = {
        id: agentId,
        sessionId: agentId,
        instructions,
        workingDirectory: '/test/path',
        status: AgentStatus.RUNNING,
      };
      agentManager.agents.set(agentId, session);

      // Mock SDK session
      agentManager.sdkManager.getSession = jest.fn().mockReturnValue({
        isActive: true,
        abortController: new AbortController(),
      });

      // Track message processing times
      const messageProcessingTimes = [];
      const startTime = Date.now();

      handleSDKMessageSpy.mockImplementation((agentId, message) => {
        messageProcessingTimes.push({
          messageId: message.id,
          processedAt: Date.now() - startTime
        });
      });

      // Call sendInstructions which should use real-time streaming
      await agentManager.sendInstructions(agentId, instructions);

      // Fast-forward all timers to complete async operations
      await jest.runOnlyPendingTimersAsync();

      // Verify all messages were processed
      expect(handleSDKMessageSpy).toHaveBeenCalledTimes(4);
      
      // Verify messages were processed in order
      mockMessages.forEach((message, index) => {
        expect(handleSDKMessageSpy).toHaveBeenNthCalledWith(index + 1, agentId, message);
      });

      // Verify Claude SDK query was called with correct parameters
      expect(query).toHaveBeenCalledWith({
        prompt: instructions,
        options: {
          permissionMode: 'bypassPermissions',
          cwd: '/test/path',
          abortController: expect.any(AbortController),
        },
      });
    });

    test('should handle errors in streaming gracefully', async () => {
      const agentId = 'test-error-agent';
      const instructions = 'Test error handling';
      const errorMessage = 'SDK streaming error';

      // Create agent session
      const session = {
        id: agentId,
        sessionId: agentId,
        instructions,
        workingDirectory: '/test/path',
        status: AgentStatus.RUNNING,
      };
      agentManager.agents.set(agentId, session);

      // Mock SDK session
      agentManager.sdkManager.getSession = jest.fn().mockReturnValue({
        isActive: true,
        abortController: new AbortController(),
      });

      // Mock error in async iterator
      mockAsyncIterator.next.mockRejectedValueOnce(new Error(errorMessage));

      // Call sendInstructions
      await agentManager.sendInstructions(agentId, instructions);

      // Fast-forward timers
      await jest.runOnlyPendingTimersAsync();

      // Verify agent status was updated to ERROR
      const updatedSession = agentManager.agents.get(agentId);
      expect(updatedSession.status).toBe(AgentStatus.ERROR);
      expect(updatedSession.error).toBe(errorMessage);
    });

    test('should complete status update when streaming finishes', async () => {
      const agentId = 'test-completion-agent';
      const instructions = 'Test completion';

      // Create agent session
      const session = {
        id: agentId,
        sessionId: agentId,
        instructions,
        workingDirectory: '/test/path',
        status: AgentStatus.RUNNING,
      };
      agentManager.agents.set(agentId, session);

      // Mock SDK session
      agentManager.sdkManager.getSession = jest.fn().mockReturnValue({
        isActive: true,
        abortController: new AbortController(),
      });

      // Call sendInstructions
      await agentManager.sendInstructions(agentId, instructions);

      // Fast-forward timers
      await jest.runOnlyPendingTimersAsync();

      // Verify agent status was updated to IDLE after completion
      const updatedSession = agentManager.agents.get(agentId);
      expect(updatedSession.status).toBe(AgentStatus.IDLE);
    });

    test('should handle missing SDK session gracefully', async () => {
      const agentId = 'test-missing-session';
      const instructions = 'Test missing session';

      // Create agent session
      const session = {
        id: agentId,
        sessionId: agentId,
        instructions,
        workingDirectory: '/test/path',
        status: AgentStatus.RUNNING,
      };
      agentManager.agents.set(agentId, session);

      // Mock missing SDK session
      agentManager.sdkManager.getSession = jest.fn().mockReturnValue(null);

      // Call sendInstructions
      await agentManager.sendInstructions(agentId, instructions);

      // Fast-forward timers
      await jest.runOnlyPendingTimersAsync();

      // Verify agent status was updated to ERROR
      const updatedSession = agentManager.agents.get(agentId);
      expect(updatedSession.status).toBe(AgentStatus.ERROR);
      expect(updatedSession.error).toContain('No SDK session found');
    });
  });

  describe('Performance requirements', () => {
    test('should process messages with minimal latency', async () => {
      const agentId = 'test-performance-agent';
      const instructions = 'Performance test';
      
      // Create agent session
      const session = {
        id: agentId,
        sessionId: agentId,
        instructions,
        workingDirectory: '/test/path',
        status: AgentStatus.RUNNING,
      };
      agentManager.agents.set(agentId, session);

      // Mock SDK session
      agentManager.sdkManager.getSession = jest.fn().mockReturnValue({
        isActive: true,
        abortController: new AbortController(),
      });

      // Track processing time
      let firstMessageProcessed = false;
      const startTime = process.hrtime.bigint();
      let processingLatency = 0;

      jest.spyOn(agentManager, 'handleSDKMessage').mockImplementation((agentId, message) => {
        if (!firstMessageProcessed) {
          processingLatency = Number(process.hrtime.bigint() - startTime) / 1000000; // Convert to ms
          firstMessageProcessed = true;
        }
      });

      // Use real timers for performance measurement
      jest.useRealTimers();

      // Call sendInstructions
      await agentManager.sendInstructions(agentId, instructions);

      // Verify latency requirement (<100ms as per US080 acceptance criteria)
      expect(processingLatency).toBeLessThan(100);
    });
  });
});