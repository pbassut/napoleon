const fs = require('fs');
const path = require('path');
const os = require('os');
const AgentLogManager = require('../../src/core/logging/agent-log-manager');

// Mock logger to prevent console output during tests
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('Real-Time Agent Monitoring Integration', () => {
  let manager;
  let testDir;
  let mockConfig;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = path.join(os.tmpdir(), `napoleon-integration-test-${Date.now()}`);
    mockConfig = { napoleonDir: testDir };
    manager = new AgentLogManager(mockConfig);
    await manager.initialize();
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('End-to-End Real-Time Streaming', () => {
    it('should provide real-time monitoring capabilities for agent execution', async () => {
      const agentId = 'monitoring-test-agent';
      const instructions = 'Test agent for real-time monitoring';
      
      // 1. Create agent log
      const logPath = await manager.createAgentLog(agentId, instructions);
      expect(logPath).toBeDefined();
      expect(fs.existsSync(logPath)).toBe(true);
      
      // 2. Setup real-time monitoring (simulating UI subscription)
      const receivedEvents = [];
      const eventHandler = (event) => {
        receivedEvents.push(event);
      };
      
      manager.on('log-entry', eventHandler);
      manager.subscribeToAgent(agentId);
      
      // 3. Simulate agent execution with various log types
      const testMessages = [
        { content: 'Starting task execution', type: 'system', source: 'napoleon' },
        { content: 'Analyzing user request', type: 'info', source: 'napoleon' },
        { content: 'User: Hello, I need help with...', type: 'user', source: 'claude_sdk' },
        { content: 'Assistant: I\'d be happy to help you with that. Let me analyze your request...', type: 'assistant', source: 'claude_sdk' },
        { content: 'Executing tool: file_search', type: 'info', source: 'napoleon' },
        { content: 'Tool result: Found 5 relevant files', type: 'info', source: 'napoleon' },
        { content: 'Assistant: Based on my analysis, here\'s what I found...', type: 'assistant', source: 'claude_sdk' },
        { content: 'Task completed successfully', type: 'system', source: 'napoleon' },
      ];
      
      // Write messages and verify real-time streaming
      for (let i = 0; i < testMessages.length; i++) {
        await manager.writeLogEntry(agentId, testMessages[i]);
        
        // Small delay to ensure event emission
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Verify event was emitted
        expect(receivedEvents.length).toBe(i + 1);
        expect(receivedEvents[i].agentId).toBe(agentId);
        expect(receivedEvents[i].entry.content).toBe(testMessages[i].content);
        expect(receivedEvents[i].entry.type).toBe(testMessages[i].type);
        expect(receivedEvents[i].entry.source).toBe(testMessages[i].source);
      }
      
      // 4. Verify persistent logging (file contents)
      const fileContent = await fs.promises.readFile(logPath, 'utf8');
      const lines = fileContent.trim().split('\n');
      
      // Should have initial entry + test messages
      expect(lines.length).toBe(1 + testMessages.length);
      
      // Verify each message was written to file
      for (let i = 1; i < lines.length; i++) {
        const entry = JSON.parse(lines[i]);
        const expectedMessage = testMessages[i - 1];
        expect(entry.content).toBe(expectedMessage.content);
        expect(entry.type).toBe(expectedMessage.type);
        expect(entry.source).toBe(expectedMessage.source);
      }
      
      // 5. Test subscription cleanup
      manager.unsubscribeFromAgent(agentId);
      
      // Write another message after unsubscribing
      await manager.writeLogEntry(agentId, { content: 'Post-unsubscribe message', type: 'info' });
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should not have received this event
      expect(receivedEvents.length).toBe(testMessages.length);
      
      // But message should still be in file
      const updatedFileContent = await fs.promises.readFile(logPath, 'utf8');
      const updatedLines = updatedFileContent.trim().split('\n');
      expect(updatedLines.length).toBe(1 + testMessages.length + 1);
      
      // 6. Clean up
      manager.off('log-entry', eventHandler);
      await manager.terminateAgentLog(agentId);
    });

    it('should handle concurrent agents with independent streaming', async () => {
      const agent1Id = 'concurrent-agent-1';
      const agent2Id = 'concurrent-agent-2';
      
      // Create logs for both agents
      await manager.createAgentLog(agent1Id, 'Agent 1 instructions');
      await manager.createAgentLog(agent2Id, 'Agent 2 instructions');
      
      // Setup monitoring for both agents
      const agent1Events = [];
      const agent2Events = [];
      const allEvents = [];
      
      manager.on('log-entry', (event) => {
        allEvents.push(event);
        if (event.agentId === agent1Id) {
          agent1Events.push(event);
        } else if (event.agentId === agent2Id) {
          agent2Events.push(event);
        }
      });
      
      manager.subscribeToAgent(agent1Id);
      manager.subscribeToAgent(agent2Id);
      
      // Write messages to both agents concurrently
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(manager.writeLogEntry(agent1Id, { 
          content: `Agent 1 message ${i}`, 
          type: 'info' 
        }));
        promises.push(manager.writeLogEntry(agent2Id, { 
          content: `Agent 2 message ${i}`, 
          type: 'info' 
        }));
      }
      
      await Promise.all(promises);
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Verify events were properly separated
      expect(agent1Events.length).toBe(5);
      expect(agent2Events.length).toBe(5);
      expect(allEvents.length).toBe(10);
      
      // Verify content is correct
      for (let i = 0; i < 5; i++) {
        expect(agent1Events[i].entry.content).toBe(`Agent 1 message ${i}`);
        expect(agent2Events[i].entry.content).toBe(`Agent 2 message ${i}`);
      }
      
      // Clean up
      await manager.terminateAgentLog(agent1Id);
      await manager.terminateAgentLog(agent2Id);
    });

    it('should handle high-volume logging with streaming performance', async () => {
      const agentId = 'performance-test-agent';
      await manager.createAgentLog(agentId, 'Performance test');
      
      const receivedEvents = [];
      manager.on('log-entry', (event) => {
        if (event.agentId === agentId) {
          receivedEvents.push(event);
        }
      });
      
      manager.subscribeToAgent(agentId);
      
      const messageCount = 1000;
      const startTime = Date.now();
      
      // Write many messages rapidly
      const promises = [];
      for (let i = 0; i < messageCount; i++) {
        promises.push(manager.writeLogEntry(agentId, {
          content: `Performance test message ${i}`,
          type: 'info',
          source: 'performance-test',
        }));
      }
      
      await Promise.all(promises);
      
      // Wait for all events to be processed
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Performance assertions
      expect(receivedEvents.length).toBe(messageCount);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Verify message order and content
      for (let i = 0; i < Math.min(10, messageCount); i++) {
        expect(receivedEvents[i].entry.content).toBe(`Performance test message ${i}`);
      }
      
      console.log(`Performance test: ${messageCount} messages processed in ${duration}ms (${(messageCount / duration * 1000).toFixed(2)} msgs/sec)`);
      
      await manager.terminateAgentLog(agentId);
    });

    it('should maintain data consistency between streaming and file storage', async () => {
      const agentId = 'consistency-test-agent';
      const logPath = await manager.createAgentLog(agentId, 'Consistency test');
      
      const streamedMessages = [];
      manager.on('log-entry', (event) => {
        if (event.agentId === agentId) {
          streamedMessages.push(event.entry);
        }
      });
      
      manager.subscribeToAgent(agentId);
      
      const testMessages = [];
      for (let i = 0; i < 50; i++) {
        const message = {
          content: `Consistency test message ${i}`,
          type: i % 3 === 0 ? 'system' : i % 3 === 1 ? 'info' : 'debug',
          source: i % 2 === 0 ? 'napoleon' : 'claude_sdk',
          metadata: { index: i, test: 'consistency' }
        };
        testMessages.push(message);
        await manager.writeLogEntry(agentId, message);
      }
      
      // Wait for all streaming events
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Read file content
      const fileContent = await fs.promises.readFile(logPath, 'utf8');
      const fileLines = fileContent.trim().split('\n');
      const fileMessages = fileLines.slice(1).map(line => JSON.parse(line)); // Skip initial entry
      
      // Verify consistency
      expect(streamedMessages.length).toBe(testMessages.length);
      expect(fileMessages.length).toBe(testMessages.length);
      
      for (let i = 0; i < testMessages.length; i++) {
        // Check streamed message
        expect(streamedMessages[i].content).toBe(testMessages[i].content);
        expect(streamedMessages[i].type).toBe(testMessages[i].type);
        expect(streamedMessages[i].source).toBe(testMessages[i].source);
        
        // Check file message
        expect(fileMessages[i].content).toBe(testMessages[i].content);
        expect(fileMessages[i].type).toBe(testMessages[i].type);
        expect(fileMessages[i].source).toBe(testMessages[i].source);
        expect(fileMessages[i].metadata).toEqual(testMessages[i].metadata);
      }
      
      await manager.terminateAgentLog(agentId);
    });
  });
});