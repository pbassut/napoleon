const fs = require('fs');
const path = require('path');
const os = require('os');
const AgentLogManager = require('../src/core/logging/agent-log-manager');

// Mock logger to prevent console output during tests
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('AgentLogManager', () => {
  let manager;
  let testDir;
  let mockConfig;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = path.join(os.tmpdir(), `napoleon-test-${Date.now()}`);
    mockConfig = { napoleonDir: testDir };
    manager = new AgentLogManager(mockConfig);
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const defaultManager = new AgentLogManager();
      expect(defaultManager.napoleonDir).toBe(path.join(os.homedir(), '.napoleon'));
      expect(defaultManager.logsDir).toBe(path.join(os.homedir(), '.napoleon', 'logs', 'agents'));
      expect(defaultManager.maxPromptLength).toBe(50);
      expect(defaultManager.streams).toBeInstanceOf(Map);
      expect(defaultManager.initialized).toBe(false);
    });

    it('should create instance with custom config', () => {
      expect(manager.napoleonDir).toBe(testDir);
      expect(manager.logsDir).toBe(path.join(testDir, 'logs', 'agents'));
      expect(manager.maxPromptLength).toBe(50);
      expect(manager.streams).toBeInstanceOf(Map);
      expect(manager.initialized).toBe(false);
    });
  });

  describe('initialize', () => {
    it('should create logs directory and set initialized flag', async () => {
      await manager.initialize();
      
      expect(manager.initialized).toBe(true);
      expect(fs.existsSync(manager.logsDir)).toBe(true);
    });

    it('should handle directory creation errors gracefully', async () => {
      // Ensure test directory exists first
      await fs.promises.mkdir(testDir, { recursive: true });
      
      // Create a file where directory should be to cause ENOTDIR
      const invalidPath = path.join(testDir, 'invalidfile');
      await fs.promises.writeFile(invalidPath, 'test');
      
      const invalidManager = new AgentLogManager({ 
        napoleonDir: path.join(invalidPath, 'nested') 
      });

      await expect(invalidManager.initialize()).rejects.toThrow(/Parent path is not a directory/);
    });

    it('should handle permission errors gracefully', async () => {
      // Mock fs.promises.mkdir to throw EACCES error
      const originalMkdir = fs.promises.mkdir;
      fs.promises.mkdir = jest.fn().mockRejectedValue(Object.assign(new Error('Permission denied'), { code: 'EACCES' }));

      await expect(manager.initialize()).rejects.toThrow(/Permission denied accessing/);
      
      // Restore original function
      fs.promises.mkdir = originalMkdir;
    });
  });

  describe('createAgentLog', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should create log file with correct naming format', async () => {
      const agentId = 'test-agent-123';
      const instructions = 'Create a simple React component';
      
      const logPath = await manager.createAgentLog(agentId, instructions);
      
      expect(logPath).toBeTruthy();
      expect(fs.existsSync(logPath)).toBe(true);
      
      const filename = path.basename(logPath);
      const today = new Date().toISOString().split('T')[0];
      expect(filename).toMatch(new RegExp(`^${today}_${agentId}_create-a-simple-react-component\\.log$`));
    });

    it('should throw error if not initialized', async () => {
      const uninitializedManager = new AgentLogManager(mockConfig);
      
      await expect(uninitializedManager.createAgentLog('test', 'prompt'))
        .rejects.toThrow('AgentLogManager not initialized');
    });

    it('should throw error if agentId is missing', async () => {
      await expect(manager.createAgentLog('', 'prompt'))
        .rejects.toThrow('Agent ID is required');
      
      await expect(manager.createAgentLog(null, 'prompt'))
        .rejects.toThrow('Agent ID is required');
    });

    it('should write initial log entry to file', async () => {
      const agentId = 'test-agent-123';
      const instructions = 'Test instructions';
      
      const logPath = await manager.createAgentLog(agentId, instructions);
      
      const logContent = await fs.promises.readFile(logPath, 'utf8');
      const logLines = logContent.trim().split('\n');
      expect(logLines).toHaveLength(1);
      
      const initialEntry = JSON.parse(logLines[0]);
      expect(initialEntry.agentId).toBe(agentId);
      expect(initialEntry.type).toBe('system');
      expect(initialEntry.source).toBe('napoleon');
      expect(initialEntry.content).toBe('Agent log session started');
      expect(initialEntry.metadata.event).toBe('agent_spawn');
      expect(initialEntry.metadata.promptLength).toBe(instructions.length);
    });

    it('should store stream information correctly', async () => {
      const agentId = 'test-agent-123';
      const instructions = 'Test instructions';
      
      await manager.createAgentLog(agentId, instructions);
      
      expect(manager.streams.has(agentId)).toBe(true);
      const streamInfo = manager.streams.get(agentId);
      expect(streamInfo.logPath).toBeTruthy();
      expect(streamInfo.instructions).toBe(instructions);
      expect(streamInfo.startTime).toBeTruthy();
      expect(streamInfo.stream).toBeTruthy();
    });
  });

  describe('writeLogEntry', () => {
    let agentId;
    let logPath;

    beforeEach(async () => {
      await manager.initialize();
      agentId = 'test-agent-123';
      logPath = await manager.createAgentLog(agentId, 'Test instructions');
    });

    it('should write structured log entry with all fields', async () => {
      const entry = {
        type: 'sdk_request',
        source: 'claude_sdk',
        content: 'Test message',
        metadata: { model: 'claude-3-sonnet' }
      };

      await manager.writeLogEntry(agentId, entry);
      
      const logContent = await fs.promises.readFile(logPath, 'utf8');
      const logLines = logContent.trim().split('\n');
      expect(logLines).toHaveLength(2); // Initial + new entry
      
      const logEntry = JSON.parse(logLines[1]);
      expect(logEntry.agentId).toBe(agentId);
      expect(logEntry.type).toBe('sdk_request');
      expect(logEntry.source).toBe('claude_sdk');
      expect(logEntry.content).toBe('Test message');
      expect(logEntry.metadata.model).toBe('claude-3-sonnet');
      expect(logEntry.timestamp).toBeTruthy();
    });

    it('should handle missing fields with defaults', async () => {
      const entry = { content: 'Simple message' };

      await manager.writeLogEntry(agentId, entry);
      
      const logContent = await fs.promises.readFile(logPath, 'utf8');
      const logLines = logContent.trim().split('\n');
      const logEntry = JSON.parse(logLines[1]);
      
      expect(logEntry.type).toBe('info');
      expect(logEntry.source).toBe('napoleon');
      expect(logEntry.metadata).toEqual({});
    });

    it('should handle non-existent agent gracefully', async () => {
      // Should not throw, just log error
      await expect(manager.writeLogEntry('non-existent', { content: 'test' }))
        .resolves.toBeUndefined();
    });

    it('should handle missing agentId gracefully', async () => {
      // Should not throw, just log error
      await expect(manager.writeLogEntry('', { content: 'test' }))
        .resolves.toBeUndefined();
    });
  });

  describe('terminateAgentLog', () => {
    let agentId;
    let logPath;

    beforeEach(async () => {
      await manager.initialize();
      agentId = 'test-agent-123';
      logPath = await manager.createAgentLog(agentId, 'Test instructions');
    });

    it('should write termination entry and close stream', async () => {
      const returnedPath = await manager.terminateAgentLog(agentId);
      
      expect(returnedPath).toBe(logPath);
      expect(manager.streams.has(agentId)).toBe(false);
      
      const logContent = await fs.promises.readFile(logPath, 'utf8');
      const logLines = logContent.trim().split('\n');
      expect(logLines).toHaveLength(2);
      
      const terminationEntry = JSON.parse(logLines[1]);
      expect(terminationEntry.type).toBe('system');
      expect(terminationEntry.content).toBe('Agent log session terminated');
      expect(terminationEntry.metadata.event).toBe('agent_termination');
      expect(terminationEntry.metadata.duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle non-existent agent gracefully', async () => {
      const result = await manager.terminateAgentLog('non-existent');
      expect(result).toBeNull();
    });

    it('should handle missing agentId gracefully', async () => {
      const result = await manager.terminateAgentLog('');
      expect(result).toBeNull();
    });
  });

  describe('getLogPath', () => {
    it('should return log path for active agent', async () => {
      await manager.initialize();
      const agentId = 'test-agent-123';
      const logPath = await manager.createAgentLog(agentId, 'Test instructions');
      
      expect(manager.getLogPath(agentId)).toBe(logPath);
    });

    it('should return null for non-existent agent', () => {
      expect(manager.getLogPath('non-existent')).toBeNull();
    });

    it('should return null for empty agentId', () => {
      expect(manager.getLogPath('')).toBeNull();
    });
  });

  describe('sanitizePrompt', () => {
    it('should sanitize normal prompts correctly', () => {
      expect(manager.sanitizePrompt('Create a React component')).toBe('create-a-react-component');
      expect(manager.sanitizePrompt('Fix bug in user authentication')).toBe('fix-bug-in-user-authentication');
    });

    it('should handle special characters', () => {
      expect(manager.sanitizePrompt('Create @component with $variables!')).toBe('create-component-with-variables');
      expect(manager.sanitizePrompt('Test/path\\to\\file.js')).toBe('test-path-to-file.js');
    });

    it('should handle long prompts', () => {
      const longPrompt = 'This is a very long prompt that exceeds the maximum length limit and should be truncated';
      const result = manager.sanitizePrompt(longPrompt);
      expect(result.length).toBeLessThanOrEqual(50);
      expect(result).toBe('this-is-a-very-long-prompt-that-exceeds-the-maximu');
    });

    it('should handle edge cases', () => {
      expect(manager.sanitizePrompt('')).toBe('no-prompt');
      expect(manager.sanitizePrompt(null)).toBe('no-prompt');
      expect(manager.sanitizePrompt(undefined)).toBe('no-prompt');
      expect(manager.sanitizePrompt('   ')).toBe('no-prompt');
      expect(manager.sanitizePrompt('!@#$%^&*()')).toBe('no-prompt');
    });

    it('should handle Unicode characters', () => {
      expect(manager.sanitizePrompt('Create émoji 🚀 component')).toBe('create-moji-component');
    });

    it('should remove consecutive hyphens and trim', () => {
      expect(manager.sanitizePrompt('  ---test---multiple---hyphens---  ')).toBe('test-multiple-hyphens');
    });
  });

  describe('getActiveAgents', () => {
    it('should return empty array when no agents active', () => {
      expect(manager.getActiveAgents()).toEqual([]);
    });

    it('should return active agent information', async () => {
      await manager.initialize();
      const agentId1 = 'agent-1';
      const agentId2 = 'agent-2';
      const instructions1 = 'First task';
      const instructions2 = 'Second task';
      
      await manager.createAgentLog(agentId1, instructions1);
      await manager.createAgentLog(agentId2, instructions2);
      
      const active = manager.getActiveAgents();
      expect(active).toHaveLength(2);
      
      const agent1Info = active.find(a => a.agentId === agentId1);
      const agent2Info = active.find(a => a.agentId === agentId2);
      
      expect(agent1Info.instructions).toBe(instructions1);
      expect(agent2Info.instructions).toBe(instructions2);
      expect(agent1Info.logPath).toBeTruthy();
      expect(agent2Info.logPath).toBeTruthy();
    });
  });

  describe('isInitialized', () => {
    it('should return false before initialization', () => {
      expect(manager.isInitialized()).toBe(false);
    });

    it('should return true after initialization', async () => {
      await manager.initialize();
      expect(manager.isInitialized()).toBe(true);
    });
  });

  describe('concurrent operations', () => {
    it('should handle multiple agents concurrently', async () => {
      await manager.initialize();
      
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(manager.createAgentLog(`agent-${i}`, `Task ${i}`));
      }
      
      const logPaths = await Promise.all(promises);
      expect(logPaths).toHaveLength(10);
      expect(manager.streams.size).toBe(10);
      
      // Verify all files exist
      for (const logPath of logPaths) {
        expect(fs.existsSync(logPath)).toBe(true);
      }
    });

    it('should handle concurrent writes to same agent', async () => {
      await manager.initialize();
      const agentId = 'concurrent-agent';
      await manager.createAgentLog(agentId, 'Test');
      
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(manager.writeLogEntry(agentId, { content: `Message ${i}` }));
      }
      
      await Promise.all(promises);
      
      const logPath = manager.getLogPath(agentId);
      const content = await fs.promises.readFile(logPath, 'utf8');
      const lines = content.trim().split('\n');
      expect(lines).toHaveLength(6); // Initial + 5 messages
    });
  });

  describe('streaming functionality', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    describe('EventEmitter inheritance', () => {
      it('should extend EventEmitter', () => {
        expect(manager.on).toBeDefined();
        expect(manager.emit).toBeDefined();
        expect(manager.off).toBeDefined();
        expect(typeof manager.on).toBe('function');
        expect(typeof manager.emit).toBe('function');
        expect(typeof manager.off).toBe('function');
      });
    });

    describe('subscription management', () => {
      it('should allow subscribing to agent logs', () => {
        const agentId = 'test-agent';
        manager.subscribeToAgent(agentId);
        expect(manager.hasActiveSubscription(agentId)).toBe(true);
        expect(manager.getActiveSubscriptions()).toContain(agentId);
      });

      it('should allow unsubscribing from agent logs', () => {
        const agentId = 'test-agent';
        manager.subscribeToAgent(agentId);
        expect(manager.hasActiveSubscription(agentId)).toBe(true);
        
        manager.unsubscribeFromAgent(agentId);
        expect(manager.hasActiveSubscription(agentId)).toBe(false);
        expect(manager.getActiveSubscriptions()).not.toContain(agentId);
      });

      it('should handle subscription with invalid agent ID', () => {
        manager.subscribeToAgent(null);
        manager.subscribeToAgent(undefined);
        manager.subscribeToAgent('');
        expect(manager.getActiveSubscriptions()).toHaveLength(0);
      });

      it('should clean up subscriptions on agent termination', async () => {
        const agentId = 'cleanup-test-agent';
        await manager.createAgentLog(agentId, 'Test instructions');
        
        manager.subscribeToAgent(agentId);
        expect(manager.hasActiveSubscription(agentId)).toBe(true);
        
        await manager.terminateAgentLog(agentId);
        expect(manager.hasActiveSubscription(agentId)).toBe(false);
      });
    });

    describe('event emission', () => {
      it('should emit log-entry events when agent has active subscription', async () => {
        const agentId = 'streaming-agent';
        await manager.createAgentLog(agentId, 'Test instructions');
        
        // Subscribe to agent and listen for events
        manager.subscribeToAgent(agentId);
        
        const eventPromise = new Promise((resolve) => {
          manager.once('log-entry', resolve);
        });
        
        const testEntry = {
          content: 'Test streaming message',
          type: 'info',
          source: 'test',
        };
        
        await manager.writeLogEntry(agentId, testEntry);
        
        const emittedEvent = await eventPromise;
        expect(emittedEvent).toBeDefined();
        expect(emittedEvent.agentId).toBe(agentId);
        expect(emittedEvent.entry).toBeDefined();
        expect(emittedEvent.entry.content).toBe(testEntry.content);
        expect(emittedEvent.entry.type).toBe(testEntry.type);
        expect(emittedEvent.entry.source).toBe(testEntry.source);
        expect(emittedEvent.entry.id).toBeDefined();
        expect(emittedEvent.entry.timestamp).toBeDefined();
      });

      it('should not emit events when agent has no active subscription', async () => {
        const agentId = 'no-subscription-agent';
        await manager.createAgentLog(agentId, 'Test instructions');
        
        let eventEmitted = false;
        manager.once('log-entry', () => {
          eventEmitted = true;
        });
        
        const testEntry = {
          content: 'Test message without subscription',
          type: 'info',
          source: 'test',
        };
        
        await manager.writeLogEntry(agentId, testEntry);
        
        // Wait a bit to ensure no event is emitted
        await new Promise(resolve => setTimeout(resolve, 50));
        expect(eventEmitted).toBe(false);
      });

      it('should emit events for multiple subscribed agents', async () => {
        const agentId1 = 'multi-agent-1';
        const agentId2 = 'multi-agent-2';
        
        await manager.createAgentLog(agentId1, 'Agent 1 instructions');
        await manager.createAgentLog(agentId2, 'Agent 2 instructions');
        
        manager.subscribeToAgent(agentId1);
        manager.subscribeToAgent(agentId2);
        
        const events = [];
        manager.on('log-entry', (event) => events.push(event));
        
        await manager.writeLogEntry(agentId1, { content: 'Message from agent 1' });
        await manager.writeLogEntry(agentId2, { content: 'Message from agent 2' });
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        expect(events).toHaveLength(2);
        expect(events[0].agentId).toBe(agentId1);
        expect(events[1].agentId).toBe(agentId2);
        expect(events[0].entry.content).toBe('Message from agent 1');
        expect(events[1].entry.content).toBe('Message from agent 2');
      });
    });

    describe('performance and memory management', () => {
      it('should handle rapid log writes with streaming', async () => {
        const agentId = 'performance-agent';
        await manager.createAgentLog(agentId, 'Performance test');
        
        manager.subscribeToAgent(agentId);
        
        const events = [];
        manager.on('log-entry', (event) => events.push(event));
        
        // Write many log entries rapidly
        const promises = [];
        for (let i = 0; i < 100; i++) {
          promises.push(manager.writeLogEntry(agentId, {
            content: `Performance message ${i}`,
            type: 'info',
            source: 'performance-test',
          }));
        }
        
        await Promise.all(promises);
        
        // Wait for all events to be processed
        await new Promise(resolve => setTimeout(resolve, 100));
        
        expect(events).toHaveLength(100);
        expect(events[0].entry.content).toBe('Performance message 0');
        expect(events[99].entry.content).toBe('Performance message 99');
      });
    });
  });
});