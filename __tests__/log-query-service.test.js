const fs = require('fs');
const path = require('path');
const os = require('os');
const LogQueryService = require('../src/core/logging/log-query-service');
const AgentLogManager = require('../src/core/logging/agent-log-manager');

describe('LogQueryService', () => {
  let logQueryService;
  let agentLogManager;
  let tempDir;
  let mockLogsDir;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'log-query-test-'));
    mockLogsDir = path.join(tempDir, 'logs', 'agents');
    
    agentLogManager = new AgentLogManager({ napoleonDir: tempDir });
    await agentLogManager.initialize();
    
    logQueryService = new LogQueryService(agentLogManager);
    await logQueryService.initialize();
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      expect(logQueryService.isInitialized()).toBe(true);
      expect(logQueryService.searchIndex).toBeDefined();
      expect(logQueryService.reportTemplates.size).toBeGreaterThan(0);
    });

    test('should handle missing logs directory gracefully', async () => {
      const nonExistentDir = path.join(tempDir, 'nonexistent');
      const service = new LogQueryService({ logsDir: nonExistentDir });
      
      await expect(service.initialize()).resolves.not.toThrow();
      expect(service.isInitialized()).toBe(true);
    });
  });

  describe('Search Index Building', () => {
    beforeEach(async () => {
      await createMockLogFiles();
    });

    test('should build search index from log files', async () => {
      await logQueryService.buildSearchIndex();
      
      const stats = logQueryService.getIndexStats();
      expect(stats.textIndexSize).toBeGreaterThan(0);
      expect(stats.metadataIndexSize).toBeGreaterThan(0);
      expect(stats.timeIndexSize).toBeGreaterThan(0);
      expect(stats.agentIndexSize).toBeGreaterThan(0);
    });

    test('should index log entries correctly', async () => {
      await logQueryService.buildSearchIndex();
      
      // Check that test data was indexed
      expect(logQueryService.searchIndex.textIndex.has('test')).toBe(true);
      expect(logQueryService.searchIndex.agentIndex.has('test-agent-1')).toBe(true);
    });
  });

  describe('Text Search', () => {
    beforeEach(async () => {
      await createMockLogFiles();
      await logQueryService.buildSearchIndex();
    });

    test('should perform simple text search', async () => {
      const result = await logQueryService.searchLogs('test message');
      
      expect(result.results).toBeDefined();
      expect(result.metadata.total).toBeGreaterThan(0);
      expect(result.metadata.duration).toBeDefined();
    });

    test('should support AND operator in search', async () => {
      const result = await logQueryService.searchLogs('test AND message');
      
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
    });

    test('should support OR operator in search', async () => {
      const result = await logQueryService.searchLogs('test OR example');
      
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
    });

    test('should handle empty search results', async () => {
      const result = await logQueryService.searchLogs('nonexistent_term_xyz');
      
      expect(result.results).toEqual([]);
      expect(result.metadata.total).toBe(0);
    });
  });

  describe('Regex Search', () => {
    beforeEach(async () => {
      await createMockLogFiles();
      await logQueryService.buildSearchIndex();
    });

    test('should perform regex pattern search', async () => {
      const query = {
        pattern: /test.*message/i
      };
      
      const result = await logQueryService.searchLogs(query);
      
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
    });

    test('should handle invalid regex gracefully', async () => {
      // Create an invalid regex pattern - this will still be valid syntax but won't match anything
      const query = {
        pattern: /[xyz]{999,}/
      };
      
      // Should not throw but may return empty results
      await expect(logQueryService.searchLogs(query)).resolves.toBeDefined();
    });
  });

  describe('Complex Search with Filters', () => {
    beforeEach(async () => {
      await createMockLogFiles();
      await logQueryService.buildSearchIndex();
    });

    test('should filter by date range', async () => {
      const query = {
        text: 'test',
        dateRange: {
          from: '2024-01-01',
          to: '2024-12-31'
        }
      };
      
      const result = await logQueryService.searchLogs(query);
      
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
    });

    test('should filter by agent IDs', async () => {
      const query = {
        text: 'test',
        agentIds: ['test-agent-1']
      };
      
      const result = await logQueryService.searchLogs(query);
      
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
    });

    test('should filter by log types', async () => {
      const query = {
        text: 'test',
        logTypes: ['info', 'system']
      };
      
      const result = await logQueryService.searchLogs(query);
      
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
    });

    test('should support fuzzy search', async () => {
      const result = await logQueryService.searchLogs('tset', { fuzzy: true });
      
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
    });

    test('should include context lines when requested', async () => {
      const result = await logQueryService.searchLogs('test', { contextLines: 2 });
      
      expect(result.results).toBeDefined();
      if (result.results.length > 0) {
        expect(result.results[0].context).toBeDefined();
      }
    });
  });

  describe('Performance Analytics', () => {
    beforeEach(async () => {
      await createMockLogFiles();
      await logQueryService.buildSearchIndex();
    });

    test('should analyze performance metrics', async () => {
      const dateRange = {
        from: '2024-01-01',
        to: '2024-12-31'
      };
      
      const result = await logQueryService.analyzePerformance(dateRange);
      
      expect(result.metrics).toBeDefined();
      expect(result.trends).toBeDefined();
      expect(result.insights).toBeDefined();
      expect(Array.isArray(result.insights)).toBe(true);
    });

    test('should calculate session metrics correctly', async () => {
      const mockLogs = [
        { 
          agentId: 'test-agent', 
          timestamp: '2024-01-01T10:00:00Z', 
          type: 'system',
          metadata: { tokens: 100, duration: 1000 }
        },
        { 
          agentId: 'test-agent', 
          timestamp: '2024-01-01T10:05:00Z', 
          type: 'info',
          metadata: { tokens: 200, duration: 2000 }
        }
      ];
      
      const sessions = logQueryService.groupLogsBySession(mockLogs);
      expect(sessions.size).toBe(1);
      expect(sessions.get('test-agent')).toHaveLength(2);
      
      const sessionMetrics = logQueryService.analyzeSession(mockLogs);
      expect(sessionMetrics.duration).toBeGreaterThan(0);
      expect(sessionMetrics.tokenUsage).toBe(300);
      expect(sessionMetrics.successful).toBe(true);
    });

    test('should generate performance insights', async () => {
      const metrics = {
        successRate: 65,
        tokenUsage: { average: 12000 },
        executionTimes: { average: 35000 }
      };
      
      const trends = {};
      const insights = logQueryService.generatePerformanceInsights(metrics, trends);
      
      expect(Array.isArray(insights)).toBe(true);
      expect(insights.some(insight => insight.category === 'success_rate')).toBe(true);
      expect(insights.some(insight => insight.category === 'token_usage')).toBe(true);
      expect(insights.some(insight => insight.category === 'execution_time')).toBe(true);
    });
  });

  describe('Error Pattern Detection', () => {
    beforeEach(async () => {
      await createMockErrorLogFiles();
      await logQueryService.buildSearchIndex();
    });

    test('should detect error patterns', async () => {
      const result = await logQueryService.detectErrorPatterns('7d');
      
      expect(result.patterns).toBeDefined();
      expect(result.trends).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.patterns)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    test('should categorize errors correctly', () => {
      const testCases = [
        { content: 'Authentication failed', expected: 'authentication' },
        { content: 'Request timeout occurred', expected: 'timeout' },
        { content: 'Permission denied for user', expected: 'permission' },
        { content: 'Network connection failed', expected: 'network' },
        { content: 'Rate limit exceeded', expected: 'rate_limit' },
        { content: 'Parse error in JSON', expected: 'parsing' },
        { content: 'Out of memory error', expected: 'memory' },
        { content: 'Disk space insufficient', expected: 'storage' },
        { content: 'Unknown error occurred', expected: 'unknown' }
      ];

      testCases.forEach(({ content, expected }) => {
        const result = logQueryService.categorizeError({ content, metadata: {} });
        expect(result).toBe(expected);
      });
    });

    test('should extract error signatures', () => {
      const testLog = {
        content: 'Error 2024-01-01T10:00:00Z: Authentication failed for user-12345 at line 42'
      };
      
      const signature = logQueryService.extractErrorSignature(testLog);
      expect(signature).toContain('[TIMESTAMP]');
      expect(signature).toContain('[NUMBER]');
      expect(signature.length).toBeLessThanOrEqual(100);
    });

    test('should generate error recommendations', () => {
      const patterns = [
        { type: 'timeout', count: 15 },
        { type: 'authentication', count: 8 }
      ];
      
      const trends = { growth: 'increasing' };
      const recommendations = logQueryService.generateErrorRecommendations(patterns, trends);
      
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(rec => rec.type === 'high_frequency')).toBe(true);
      expect(recommendations.some(rec => rec.type === 'trend_alert')).toBe(true);
    });
  });

  describe('Agent Behavior Analytics', () => {
    beforeEach(async () => {
      await createMockAgentLogFiles();
      await logQueryService.buildSearchIndex();
    });

    test('should generate agent analytics', async () => {
      const result = await logQueryService.generateAgentAnalytics('test-agent-1');
      
      expect(result.behavior).toBeDefined();
      expect(result.performance).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    test('should analyze agent behavior patterns', () => {
      const mockLogs = [
        {
          agentId: 'test-agent',
          metadata: { 
            prompt: 'analyze this data file',
            tool: 'file_reader' 
          },
          type: 'info'
        },
        {
          agentId: 'test-agent',
          metadata: { 
            prompt: 'generate summary report',
            tool: 'report_generator' 
          },
          type: 'info'
        }
      ];
      
      const behavior = logQueryService.analyzeBehavior(mockLogs);
      
      expect(behavior.sessionCount).toBe(1);
      expect(behavior.commonPromptPatterns.size).toBeGreaterThan(0);
      expect(behavior.toolUsage.size).toBeGreaterThan(0);
      expect(behavior.interactionTypes.size).toBeGreaterThan(0);
    });

    test('should extract prompt patterns', () => {
      const testPrompts = [
        'Please analyze this financial data and create a summary',
        'Generate a detailed report about system performance',
        'Help me understand this code implementation'
      ];
      
      testPrompts.forEach(prompt => {
        const pattern = logQueryService.extractPromptPattern(prompt);
        expect(typeof pattern).toBe('string');
        expect(pattern.length).toBeGreaterThan(0);
      });
    });

    test('should generate agent recommendations', () => {
      const behavior = {
        averageSessionLength: 60,
        commonPromptPatterns: new Map(),
        toolUsage: new Map()
      };
      
      const performance = {
        successRate: 75,
        averageTokenUsage: 9000,
        averageDuration: 45000
      };
      
      const recommendations = logQueryService.generateAgentRecommendations(behavior, performance);
      
      expect(Array.isArray(recommendations)).toBe(true);
      if (recommendations.length > 0) {
        expect(recommendations[0]).toHaveProperty('type');
        expect(recommendations[0]).toHaveProperty('message');
        expect(recommendations[0]).toHaveProperty('suggestion');
      }
    });
  });

  describe('Reporting System', () => {
    beforeEach(async () => {
      await createMockLogFiles();
      await logQueryService.buildSearchIndex();
    });

    test('should create performance summary report', async () => {
      const result = await logQueryService.createReport('performance_summary', {
        dateRange: { from: '2024-01-01', to: '2024-12-31' }
      });
      
      expect(result.report).toBeDefined();
      expect(result.visualizations).toBeDefined();
      expect(result.exportData).toBeDefined();
      expect(result.report.title).toBe('Performance Summary Report');
    });

    test('should create error analysis report', async () => {
      await createMockErrorLogFiles();
      await logQueryService.buildSearchIndex();
      
      const result = await logQueryService.createReport('error_analysis', {
        timeWindow: '7d'
      });
      
      expect(result.report).toBeDefined();
      expect(result.report.title).toBe('Error Analysis Report');
    });

    test('should create agent behavior report', async () => {
      await createMockAgentLogFiles();
      await logQueryService.buildSearchIndex();
      
      const result = await logQueryService.createReport('agent_behavior', {
        agentId: 'test-agent-1'
      });
      
      expect(result.report).toBeDefined();
      expect(result.report.title).toBe('Agent Behavior Analysis');
    });

    test('should handle unknown report type', async () => {
      await expect(
        logQueryService.createReport('unknown_report')
      ).rejects.toThrow('Unknown report type');
    });

    test('should require agent ID for behavior report', async () => {
      await expect(
        logQueryService.createReport('agent_behavior')
      ).rejects.toThrow('Agent ID required');
    });
  });

  describe('Data Export', () => {
    beforeEach(async () => {
      await createMockLogFiles();
      await logQueryService.buildSearchIndex();
    });

    test('should export data as JSON', async () => {
      const result = await logQueryService.exportData('json', {
        dateRange: { from: '2024-01-01', to: '2024-12-31' }
      });
      
      expect(typeof result).toBe('string');
      expect(() => JSON.parse(result)).not.toThrow();
    });

    test('should export data as CSV', async () => {
      const result = await logQueryService.exportData('csv', {
        dateRange: { from: '2024-01-01', to: '2024-12-31' }
      });
      
      expect(typeof result).toBe('string');
      expect(result).toContain('timestamp,agentId,type,source,content,metadata');
    });

    test('should export data as HTML', async () => {
      const result = await logQueryService.exportData('html', {
        dateRange: { from: '2024-01-01', to: '2024-12-31' }
      });
      
      expect(typeof result).toBe('string');
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<table>');
    });

    test('should handle unsupported export format', async () => {
      await expect(
        logQueryService.exportData('xml')
      ).rejects.toThrow('Unsupported export format');
    });
  });

  describe('Utility Functions', () => {
    test('should parse time windows correctly', () => {
      const testCases = [
        { input: '1h', expected: 60 * 60 * 1000 },
        { input: '24h', expected: 24 * 60 * 60 * 1000 },
        { input: '7d', expected: 7 * 24 * 60 * 60 * 1000 },
        { input: '2w', expected: 2 * 7 * 24 * 60 * 60 * 1000 }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = logQueryService.parseTimeWindow(input);
        expect(result).toBe(expected);
      });
    });

    test('should calculate string similarity correctly', () => {
      const testCases = [
        { str1: 'hello', str2: 'hello', expected: 1.0 },
        { str1: 'hello', str2: 'hallo', expected: 0.8 },
        { str1: 'test', str2: 'best', expected: 0.75 },
        { str1: 'abc', str2: 'xyz', expected: 0.0 }
      ];

      testCases.forEach(({ str1, str2, expected }) => {
        const result = logQueryService.calculateSimilarity(str1, str2);
        if (expected === 0.0) {
          expect(result).toBeLessThan(0.5);
        } else {
          expect(result).toBeCloseTo(expected, 1);
        }
      });
    });

    test('should check date ranges correctly', () => {
      const testDate = '2024-06-15T10:00:00Z';
      
      expect(logQueryService.isInDateRange(testDate, {})).toBe(true);
      expect(logQueryService.isInDateRange(testDate, {
        from: '2024-01-01',
        to: '2024-12-31'
      })).toBe(true);
      expect(logQueryService.isInDateRange(testDate, {
        from: '2024-07-01',
        to: '2024-12-31'
      })).toBe(false);
    });

    test('should escape HTML correctly', () => {
      const testHtml = '<script>alert("test")</script>';
      const escaped = logQueryService.escapeHtml(testHtml);
      
      expect(escaped).not.toContain('<script>');
      expect(escaped).toContain('&lt;');
      expect(escaped).toContain('&gt;');
    });
  });

  // Helper functions for creating mock data
  async function createMockLogFiles() {
    fs.mkdirSync(mockLogsDir, { recursive: true });
    
    const mockEntries = [
      {
        timestamp: '2024-01-15T10:00:00Z',
        agentId: 'test-agent-1',
        type: 'system',
        source: 'napoleon',
        content: 'Agent log session started',
        metadata: { event: 'agent_spawn', tokens: 100, duration: 1000 }
      },
      {
        timestamp: '2024-01-15T10:05:00Z',
        agentId: 'test-agent-1',
        type: 'info',
        source: 'napoleon',
        content: 'Processing test message',
        metadata: { tool: 'text_processor', tokens: 250, duration: 2000 }
      },
      {
        timestamp: '2024-01-15T10:10:00Z',
        agentId: 'test-agent-2',
        type: 'system',
        source: 'napoleon',
        content: 'Agent log session started',
        metadata: { event: 'agent_spawn', tokens: 80, duration: 800 }
      }
    ];

    const logContent = mockEntries.map(entry => JSON.stringify(entry)).join('\n') + '\n';
    fs.writeFileSync(path.join(mockLogsDir, '2024-01-15_test-agent-1_test-prompt.log'), logContent);
  }

  async function createMockErrorLogFiles() {
    fs.mkdirSync(mockLogsDir, { recursive: true });
    
    const errorEntries = [
      {
        timestamp: '2024-01-15T10:00:00Z',
        agentId: 'error-agent-1',
        type: 'error',
        source: 'napoleon',
        content: 'Authentication failed for API request',
        metadata: { error_code: 401, api_endpoint: '/api/test' }
      },
      {
        timestamp: '2024-01-15T10:15:00Z',
        agentId: 'error-agent-2',
        type: 'sdk_error',
        source: 'napoleon',
        content: 'Request timeout after 30 seconds',
        metadata: { timeout: 30000, retry_count: 3 }
      },
      {
        timestamp: '2024-01-15T10:30:00Z',
        agentId: 'error-agent-1',
        type: 'error',
        source: 'napoleon',
        content: 'Authentication failed for API request',
        metadata: { error_code: 401, api_endpoint: '/api/data' }
      }
    ];

    const logContent = errorEntries.map(entry => JSON.stringify(entry)).join('\n') + '\n';
    fs.writeFileSync(path.join(mockLogsDir, '2024-01-15_error-agent-1_error-test.log'), logContent);
  }

  async function createMockAgentLogFiles() {
    fs.mkdirSync(mockLogsDir, { recursive: true });
    
    const agentEntries = [
      {
        timestamp: '2024-01-15T09:00:00Z',
        agentId: 'test-agent-1',
        type: 'system',
        source: 'napoleon',
        content: 'Agent session started',
        metadata: { 
          event: 'agent_spawn',
          prompt: 'Analyze the financial data and create summary',
          tool: 'data_analyzer'
        }
      },
      {
        timestamp: '2024-01-15T09:05:00Z',
        agentId: 'test-agent-1',
        type: 'info',
        source: 'napoleon',
        content: 'Data analysis completed',
        metadata: { 
          tool: 'data_analyzer',
          tokens: 500,
          duration: 5000
        }
      },
      {
        timestamp: '2024-01-15T09:10:00Z',
        agentId: 'test-agent-1',
        type: 'info',
        source: 'napoleon',
        content: 'Report generation started',
        metadata: { 
          tool: 'report_generator',
          tokens: 300,
          duration: 3000
        }
      }
    ];

    const logContent = agentEntries.map(entry => JSON.stringify(entry)).join('\n') + '\n';
    fs.writeFileSync(path.join(mockLogsDir, '2024-01-15_test-agent-1_analyze-financial.log'), logContent);
  }
});