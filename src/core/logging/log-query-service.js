const fs = require('fs');
const path = require('path');
const os = require('os');
const logger = require('../../utils/logger');

class LogQueryService {
  constructor(agentLogManager) {
    this.agentLogManager = agentLogManager;
    this.searchIndex = null;
    this.analyticsCache = new Map();
    this.reportTemplates = new Map();
    this.initialized = false;
    this.logsDir = agentLogManager ? agentLogManager.logsDir : path.join(os.homedir(), '.napoleon', 'logs', 'agents');
  }

  async initialize() {
    try {
      this.initialized = true;
      await this.buildSearchIndex();
      this.setupReportTemplates();
      logger.info('LogQueryService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize LogQueryService', { error: error.message });
      throw new Error(`LogQueryService initialization failed: ${error.message}`);
    }
  }

  async buildSearchIndex() {
    this.searchIndex = {
      textIndex: new Map(),
      metadataIndex: new Map(),
      timeIndex: new Map(),
      agentIndex: new Map(),
      lastBuilt: new Date().toISOString(),
    };

    try {
      if (!fs.existsSync(this.logsDir)) {
        logger.warn('Logs directory does not exist, creating empty index');
        return;
      }

      const logFiles = fs.readdirSync(this.logsDir).filter((file) => file.endsWith('.log'));

      // Use Promise.all for better performance while avoiding for-of loop
      await Promise.all(
        logFiles.map((logFile) => this.indexLogFile(path.join(this.logsDir, logFile))),
      );

      logger.info('Search index built successfully', {
        filesIndexed: logFiles.length,
        indexSize: this.searchIndex.textIndex.size,
      });
    } catch (error) {
      logger.error('Failed to build search index', { error: error.message });
      throw error;
    }
  }

  async indexLogFile(logFilePath) {
    try {
      const content = fs.readFileSync(logFilePath, 'utf8');
      const lines = content.split('\n').filter((line) => line.trim());

      lines.forEach((line, i) => {
        try {
          const entry = JSON.parse(line);
          this.addToIndex(entry, logFilePath, i);
        } catch (parseError) {
          logger.debug('Skipping non-JSON log line', { file: logFilePath, line: i });
        }
      });
    } catch (error) {
      logger.error('Failed to index log file', { file: logFilePath, error: error.message });
    }
  }

  addToIndex(entry, filePath, lineNumber) {
    const entryId = `${filePath}:${lineNumber}`;

    // Text indexing
    const textContent = `${entry.content || ''} ${JSON.stringify(entry.metadata || {})}`.toLowerCase();
    const words = textContent.split(/\s+/).filter((word) => word.length > 2);

    words.forEach((word) => {
      if (!this.searchIndex.textIndex.has(word)) {
        this.searchIndex.textIndex.set(word, new Set());
      }
      this.searchIndex.textIndex.get(word).add(entryId);
    });

    // Metadata indexing
    if (entry.agentId) {
      if (!this.searchIndex.agentIndex.has(entry.agentId)) {
        this.searchIndex.agentIndex.set(entry.agentId, new Set());
      }
      this.searchIndex.agentIndex.get(entry.agentId).add(entryId);
    }

    // Time indexing
    if (entry.timestamp) {
      const date = new Date(entry.timestamp).toISOString().split('T')[0];
      if (!this.searchIndex.timeIndex.has(date)) {
        this.searchIndex.timeIndex.set(date, new Set());
      }
      this.searchIndex.timeIndex.get(date).add(entryId);
    }

    // Metadata fields indexing
    Object.entries(entry.metadata || {}).forEach(([key, value]) => {
      const metaKey = `${key}:${value}`;
      if (!this.searchIndex.metadataIndex.has(metaKey)) {
        this.searchIndex.metadataIndex.set(metaKey, new Set());
      }
      this.searchIndex.metadataIndex.get(metaKey).add(entryId);
    });
  }

  async searchLogs(query, options = {}) {
    const startTime = Date.now();

    try {
      let results = new Set();

      if (typeof query === 'string') {
        results = await this.performTextSearch(query, options);
      } else if (query.pattern && query.pattern instanceof RegExp) {
        results = await this.performRegexSearch(query.pattern, options);
      } else {
        results = await this.performComplexSearch(query, options);
      }

      const resultArray = await LogQueryService.retrieveLogEntries(Array.from(results), options);

      return {
        results: resultArray,
        metadata: {
          total: resultArray.length,
          duration: Date.now() - startTime,
          query,
          options,
        },
      };
    } catch (error) {
      logger.error('Search failed', { query, error: error.message });
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  async performTextSearch(queryText, options) {
    const words = queryText.toLowerCase().split(/\s+/).filter((word) => word.length > 2);
    let results = new Set();

    // Handle AND/OR operators
    if (queryText.includes(' AND ')) {
      const andTerms = queryText.split(' AND ').map((term) => term.trim().toLowerCase());
      results = this.intersectSearchTerms(andTerms);
    } else if (queryText.includes(' OR ')) {
      const orTerms = queryText.split(' OR ').map((term) => term.trim().toLowerCase());
      results = this.unionSearchTerms(orTerms);
    } else {
      // Simple word search
      words.forEach((word) => {
        const wordResults = this.searchIndex.textIndex.get(word) || new Set();
        if (results.size === 0) {
          results = new Set(wordResults);
        } else {
          results = new Set([...results].filter((x) => wordResults.has(x)));
        }
      });
    }

    // Apply fuzzy search if enabled
    if (options.fuzzy && results.size < 10) {
      const fuzzyResults = this.performFuzzySearch(words);
      results = new Set([...results, ...fuzzyResults]);
    }

    return this.applyFilters(results, options);
  }

  async performRegexSearch(pattern, options) {
    const results = new Set();

    try {
      if (!fs.existsSync(this.logsDir)) {
        return results;
      }

      const logFiles = fs.readdirSync(this.logsDir).filter((file) => file.endsWith('.log'));

      logFiles.forEach((logFile) => {
        const filePath = path.join(this.logsDir, logFile);
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter((line) => line.trim());

        lines.forEach((line, i) => {
          try {
            const entry = JSON.parse(line);
            const searchText = `${entry.content || ''} ${JSON.stringify(entry.metadata || {})}`;

            if (pattern.test(searchText)) {
              results.add(`${filePath}:${i}`);
            }
          } catch (parseError) {
            // Skip non-JSON lines
          }
        });
      });
    } catch (error) {
      logger.error('Regex search failed', { pattern: pattern.toString(), error: error.message });
    }

    return this.applyFilters(results, options);
  }

  async performComplexSearch(query, options) {
    let results = new Set();

    // Start with all entries if no text query
    if (!query.text) {
      // Get all indexed entries
      this.searchIndex.textIndex.forEach((entrySet) => {
        entrySet.forEach((entryId) => results.add(entryId));
      });
    } else {
      results = await this.performTextSearch(query.text, {});
    }

    return this.applyFilters(results, { ...options, ...query });
  }

  applyFilters(results, filters) {
    let filtered = new Set(results);

    // Date range filter
    if (filters.dateRange) {
      const dateFiltered = new Set();
      const fromDate = filters.dateRange.from ? new Date(filters.dateRange.from) : null;
      const toDate = filters.dateRange.to ? new Date(filters.dateRange.to) : null;

      this.searchIndex.timeIndex.forEach((entrySet, dateKey) => {
        const date = new Date(dateKey);
        if ((!fromDate || date >= fromDate) && (!toDate || date <= toDate)) {
          entrySet.forEach((entryId) => {
            if (filtered.has(entryId)) {
              dateFiltered.add(entryId);
            }
          });
        }
      });
      filtered = dateFiltered;
    }

    // Agent ID filter
    if (filters.agentIds && filters.agentIds.length > 0) {
      const agentFiltered = new Set();
      filters.agentIds.forEach((agentId) => {
        const agentEntries = this.searchIndex.agentIndex.get(agentId) || new Set();
        agentEntries.forEach((entryId) => {
          if (filtered.has(entryId)) {
            agentFiltered.add(entryId);
          }
        });
      });
      filtered = agentFiltered;
    }

    // Log type filter
    if (filters.logTypes && filters.logTypes.length > 0) {
      const typeFiltered = new Set();
      filters.logTypes.forEach((logType) => {
        const typeEntries = this.searchIndex.metadataIndex.get(`type:${logType}`) || new Set();
        typeEntries.forEach((entryId) => {
          if (filtered.has(entryId)) {
            typeFiltered.add(entryId);
          }
        });
      });
      filtered = typeFiltered;
    }

    return filtered;
  }

  intersectSearchTerms(terms) {
    let results = null;

    terms.forEach((term) => {
      const termResults = this.searchIndex.textIndex.get(term) || new Set();
      if (results === null) {
        results = new Set(termResults);
      } else {
        results = new Set([...results].filter((x) => termResults.has(x)));
      }
    });

    return results || new Set();
  }

  unionSearchTerms(terms) {
    const results = new Set();

    terms.forEach((term) => {
      const termResults = this.searchIndex.textIndex.get(term) || new Set();
      termResults.forEach((entryId) => results.add(entryId));
    });

    return results;
  }

  performFuzzySearch(words) {
    const results = new Set();
    const threshold = 0.7;

    words.forEach((queryWord) => {
      this.searchIndex.textIndex.forEach((entrySet, indexedWord) => {
        if (LogQueryService.calculateSimilarity(queryWord, indexedWord) >= threshold) {
          entrySet.forEach((entryId) => results.add(entryId));
        }
      });
    });

    return results;
  }

  static calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = LogQueryService.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  static levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i += 1) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j += 1) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i += 1) {
      for (let j = 1; j <= str1.length; j += 1) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  static async retrieveLogEntries(entryIds, options) {
    const entries = [];
    const contextLines = options.contextLines || 0;

    try {
      entryIds.forEach((entryId) => {
        const [filePath, lineNumber] = entryId.split(':');
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter((line) => line.trim());

        const targetLine = parseInt(lineNumber, 10);
        const startLine = Math.max(0, targetLine - contextLines);
        const endLine = Math.min(lines.length - 1, targetLine + contextLines);

        const entryData = {
          file: path.basename(filePath),
          line: targetLine,
          entry: null,
          context: [],
        };

        for (let i = startLine; i <= endLine; i += 1) {
          try {
            const parsedEntry = JSON.parse(lines[i]);
            if (i === targetLine) {
              entryData.entry = parsedEntry;
            } else {
              entryData.context.push({
                line: i,
                entry: parsedEntry,
              });
            }
          } catch (parseError) {
            // Skip non-JSON lines
          }
        }

        if (entryData.entry) {
          entries.push(entryData);
        }
      });
    } catch (error) {
      logger.error('Failed to retrieve log entries', { error: error.message });
    }

    return entries.slice(0, options.limit || 100);
  }

  async analyzePerformance(dateRange, filters = {}) {
    try {
      const logs = await this.getAllLogsInRange(dateRange, filters);
      const metrics = LogQueryService.calculatePerformanceMetrics(logs);
      const trends = LogQueryService.analyzeTrends(logs);
      const insights = LogQueryService.generatePerformanceInsights(metrics);

      return { metrics, trends, insights };
    } catch (error) {
      logger.error('Performance analysis failed', { error: error.message });
      throw new Error(`Performance analysis failed: ${error.message}`);
    }
  }

  static calculatePerformanceMetrics(logs) {
    const metrics = {
      totalSessions: 0,
      averageSessionDuration: 0,
      successRate: 0,
      errorRate: 0,
      tokenUsage: { total: 0, average: 0 },
      executionTimes: { min: Infinity, max: 0, average: 0 },
      agentPerformance: new Map(),
    };

    const sessions = LogQueryService.groupLogsBySession(logs);
    metrics.totalSessions = sessions.size;

    let totalDuration = 0;
    let successfulSessions = 0;
    let totalExecutionTime = 0;
    let executionTimeCount = 0;

    sessions.forEach((sessionLogs, agentId) => {
      const sessionMetrics = LogQueryService.analyzeSession(sessionLogs);

      if (sessionMetrics.duration > 0) {
        totalDuration += sessionMetrics.duration;
      }

      if (sessionMetrics.successful) {
        successfulSessions += 1;
      }

      if (sessionMetrics.executionTime > 0) {
        totalExecutionTime += sessionMetrics.executionTime;
        executionTimeCount += 1;
        metrics.executionTimes.min = Math.min(
          metrics.executionTimes.min,
          sessionMetrics.executionTime,
        );
        metrics.executionTimes.max = Math.max(
          metrics.executionTimes.max,
          sessionMetrics.executionTime,
        );
      }

      metrics.tokenUsage.total += sessionMetrics.tokenUsage;
      metrics.agentPerformance.set(agentId, sessionMetrics);
    });

    metrics.averageSessionDuration = metrics.totalSessions > 0
      ? totalDuration / metrics.totalSessions : 0;
    metrics.successRate = metrics.totalSessions > 0
      ? (successfulSessions / metrics.totalSessions) * 100 : 0;
    metrics.errorRate = 100 - metrics.successRate;
    metrics.tokenUsage.average = metrics.totalSessions > 0
      ? metrics.tokenUsage.total / metrics.totalSessions : 0;
    metrics.executionTimes.average = executionTimeCount > 0
      ? totalExecutionTime / executionTimeCount : 0;

    if (metrics.executionTimes.min === Infinity) {
      metrics.executionTimes.min = 0;
    }

    return metrics;
  }

  static groupLogsBySession(logs) {
    const sessions = new Map();

    logs.forEach((log) => {
      if (log.agentId) {
        if (!sessions.has(log.agentId)) {
          sessions.set(log.agentId, []);
        }
        sessions.get(log.agentId).push(log);
      }
    });

    return sessions;
  }

  static analyzeSession(sessionLogs) {
    const sortedLogs = sessionLogs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const startTime = new Date(sortedLogs[0].timestamp);
    const endTime = new Date(sortedLogs[sortedLogs.length - 1].timestamp);

    const duration = endTime - startTime;
    const errorCount = sortedLogs.filter((log) => log.type === 'error' || log.type === 'sdk_error').length;
    const successful = errorCount === 0;

    let tokenUsage = 0;
    let executionTime = 0;

    sortedLogs.forEach((log) => {
      if (log.metadata) {
        if (log.metadata.tokens) {
          tokenUsage += log.metadata.tokens;
        }
        if (log.metadata.duration) {
          executionTime += log.metadata.duration;
        }
      }
    });

    return {
      duration,
      successful,
      errorCount,
      tokenUsage,
      executionTime,
      logCount: sortedLogs.length,
    };
  }

  static analyzeTrends(logs) {
    const trends = {
      dailyActivity: new Map(),
      errorTrends: new Map(),
      performanceTrends: new Map(),
      usagePatterns: new Map(),
    };

    logs.forEach((log) => {
      const date = new Date(log.timestamp).toISOString().split('T')[0];

      // Daily activity
      if (!trends.dailyActivity.has(date)) {
        trends.dailyActivity.set(date, { sessions: 0, errors: 0, tokens: 0 });
      }
      const dayData = trends.dailyActivity.get(date);
      dayData.sessions += 1;

      if (log.type === 'error' || log.type === 'sdk_error') {
        dayData.errors += 1;
      }

      if (log.metadata && log.metadata.tokens) {
        dayData.tokens += log.metadata.tokens;
      }
    });

    return trends;
  }

  static generatePerformanceInsights(metrics) {
    const insights = [];

    // Success rate insights
    if (metrics.successRate < 70) {
      insights.push({
        type: 'warning',
        category: 'success_rate',
        message: `Low success rate detected: ${metrics.successRate.toFixed(1)}%`,
        recommendation: 'Review error patterns and improve prompt quality',
      });
    } else if (metrics.successRate > 95) {
      insights.push({
        type: 'positive',
        category: 'success_rate',
        message: `Excellent success rate: ${metrics.successRate.toFixed(1)}%`,
        recommendation: 'Current configuration is performing well',
      });
    }

    // Token efficiency insights
    if (metrics.tokenUsage.average > 10000) {
      insights.push({
        type: 'optimization',
        category: 'token_usage',
        message: `High token usage per session: ${metrics.tokenUsage.average.toFixed(0)}`,
        recommendation: 'Consider optimizing prompts to reduce token consumption',
      });
    }

    // Execution time insights
    if (metrics.executionTimes.average > 30000) {
      insights.push({
        type: 'performance',
        category: 'execution_time',
        message: `Slow average execution time: ${(metrics.executionTimes.average / 1000).toFixed(1)}s`,
        recommendation: 'Investigate performance bottlenecks and optimize processing',
      });
    }

    return insights;
  }

  async detectErrorPatterns(timeWindow = '7d') {
    try {
      const logs = await this.getAllLogsInTimeWindow(timeWindow);
      const errorLogs = logs.filter((log) => log.type === 'error' || log.type === 'sdk_error');

      const patterns = LogQueryService.identifyErrorPatterns(errorLogs);
      const trends = LogQueryService.analyzeErrorTrends(errorLogs, timeWindow);
      const recommendations = LogQueryService.generateErrorRecommendations(patterns, trends);

      return { patterns, trends, recommendations };
    } catch (error) {
      logger.error('Error pattern detection failed', { error: error.message });
      throw new Error(`Error pattern detection failed: ${error.message}`);
    }
  }

  static identifyErrorPatterns(errorLogs) {
    const patterns = new Map();

    errorLogs.forEach((log) => {
      const errorType = LogQueryService.categorizeError(log);
      const errorKey = `${errorType}:${LogQueryService.extractErrorSignature(log)}`;

      if (!patterns.has(errorKey)) {
        patterns.set(errorKey, {
          type: errorType,
          signature: LogQueryService.extractErrorSignature(log),
          count: 0,
          examples: [],
          firstSeen: log.timestamp,
          lastSeen: log.timestamp,
          affectedAgents: new Set(),
        });
      }

      const pattern = patterns.get(errorKey);
      pattern.count += 1;
      pattern.lastSeen = log.timestamp;
      pattern.affectedAgents.add(log.agentId);

      if (pattern.examples.length < 3) {
        pattern.examples.push({
          timestamp: log.timestamp,
          agentId: log.agentId,
          content: log.content,
          metadata: log.metadata,
        });
      }
    });

    // Convert to array and sort by frequency
    return Array.from(patterns.values()).sort((a, b) => b.count - a.count);
  }

  static categorizeError(log) {
    const content = log.content.toLowerCase();
    const metadata = JSON.stringify(log.metadata || {}).toLowerCase();
    const combined = `${content} ${metadata}`;

    if (combined.includes('timeout') || combined.includes('time out')) return 'timeout';
    if (combined.includes('authentication') || combined.includes('auth')) return 'authentication';
    if (combined.includes('permission') || combined.includes('access denied')) return 'permission';
    if (combined.includes('network') || combined.includes('connection')) return 'network';
    if (combined.includes('rate limit') || combined.includes('quota')) return 'rate_limit';
    if (combined.includes('parse') || combined.includes('syntax')) return 'parsing';
    if (combined.includes('memory') || combined.includes('out of memory')) return 'memory';
    if (combined.includes('disk') || combined.includes('storage')) return 'storage';

    return 'unknown';
  }

  static extractErrorSignature(log) {
    // Extract key parts of error message for pattern matching
    const { content } = log;
    const lines = content.split('\n');
    const firstLine = lines[0] || '';

    // Remove timestamps, IDs, and variable data
    return firstLine
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, '[TIMESTAMP]')
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '[UUID]')
      .replace(/\d+/g, '[NUMBER]')
      .substring(0, 100);
  }

  static analyzeErrorTrends(errorLogs, timeWindow) {
    const trends = {
      frequency: new Map(),
      growth: 'stable',
      peakTimes: [],
      affectedAgents: new Set(),
    };

    // Group by time periods
    const timeUnit = LogQueryService.getTimeUnit(timeWindow);
    errorLogs.forEach((log) => {
      const timeKey = LogQueryService.getTimeKey(log.timestamp, timeUnit);
      if (!trends.frequency.has(timeKey)) {
        trends.frequency.set(timeKey, 0);
      }
      trends.frequency.set(timeKey, trends.frequency.get(timeKey) + 1);
      trends.affectedAgents.add(log.agentId);
    });

    // Determine growth trend
    const frequencies = Array.from(trends.frequency.values());
    if (frequencies.length > 1) {
      const recent = frequencies.slice(-3).reduce((a, b) => a + b, 0);
      const earlier = frequencies.slice(0, -3).reduce((a, b) => a + b, 0);

      if (recent > earlier * 1.5) {
        trends.growth = 'increasing';
      } else if (recent < earlier * 0.5) {
        trends.growth = 'decreasing';
      }
    }

    return trends;
  }

  static getTimeUnit(timeWindow) {
    if (timeWindow.includes('h')) return 'hour';
    if (timeWindow.includes('d')) return 'day';
    if (timeWindow.includes('w')) return 'week';
    return 'day';
  }

  static getTimeKey(timestamp, timeUnit) {
    const date = new Date(timestamp);
    switch (timeUnit) {
      case 'hour':
        return `${date.toISOString().split('T')[0]} ${date.getHours()}:00`;
      case 'day':
        return date.toISOString().split('T')[0];
      case 'week': {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return weekStart.toISOString().split('T')[0];
      }
      default:
        return date.toISOString().split('T')[0];
    }
  }

  static generateErrorRecommendations(patterns, trends) {
    const recommendations = [];

    patterns.forEach((pattern) => {
      if (pattern.count > 10) {
        recommendations.push({
          type: 'high_frequency',
          pattern: pattern.type,
          message: `${pattern.type} errors occurring frequently (${pattern.count} times)`,
          action: LogQueryService.getErrorRecommendation(pattern.type),
          priority: 'high',
        });
      }
    });

    if (trends.growth === 'increasing') {
      recommendations.push({
        type: 'trend_alert',
        message: 'Error frequency is increasing',
        action: 'Monitor system closely and investigate root causes',
        priority: 'high',
      });
    }

    return recommendations;
  }

  static getErrorRecommendation(errorType) {
    const recommendations = {
      timeout: 'Increase timeout values or optimize processing speed',
      authentication: 'Verify API keys and authentication configuration',
      permission: 'Check file permissions and user access rights',
      network: 'Investigate network connectivity and DNS resolution',
      rate_limit: 'Implement backoff strategies and reduce request frequency',
      parsing: 'Validate input formats and improve error handling',
      memory: 'Optimize memory usage or increase available memory',
      storage: 'Clean up disk space or optimize storage usage',
    };

    return recommendations[errorType] || 'Investigate error details and implement appropriate fixes';
  }

  async generateAgentAnalytics(agentId, options = {}) {
    try {
      const agentLogs = await this.getAgentLogs(agentId, options);
      const behavior = LogQueryService.analyzeBehavior(agentLogs);
      const performance = LogQueryService.analyzeAgentPerformance(agentLogs);
      const recommendations = LogQueryService.generateAgentRecommendations(behavior, performance);

      return { behavior, performance, recommendations };
    } catch (error) {
      logger.error('Agent analytics generation failed', { agentId, error: error.message });
      throw new Error(`Agent analytics failed: ${error.message}`);
    }
  }

  static analyzeBehavior(agentLogs) {
    const behavior = {
      sessionCount: 0,
      averageSessionLength: 0,
      commonPromptPatterns: new Map(),
      toolUsage: new Map(),
      interactionTypes: new Map(),
      successPatterns: [],
      failurePatterns: [],
    };

    const sessions = LogQueryService.groupLogsBySession(agentLogs);
    behavior.sessionCount = sessions.size;

    let totalSessionLength = 0;
    sessions.forEach((sessionLogs) => {
      const sessionLength = sessionLogs.length;
      totalSessionLength += sessionLength;

      // Analyze prompts and tool usage
      sessionLogs.forEach((log) => {
        if (log.metadata) {
          if (log.metadata.prompt) {
            const promptPattern = LogQueryService.extractPromptPattern(log.metadata.prompt);
            behavior.commonPromptPatterns.set(
              promptPattern,
              (behavior.commonPromptPatterns.get(promptPattern) || 0) + 1,
            );
          }

          if (log.metadata.tool) {
            behavior.toolUsage.set(
              log.metadata.tool,
              (behavior.toolUsage.get(log.metadata.tool) || 0) + 1,
            );
          }

          if (log.type) {
            behavior.interactionTypes.set(
              log.type,
              (behavior.interactionTypes.get(log.type) || 0) + 1,
            );
          }
        }
      });
    });

    behavior.averageSessionLength = behavior.sessionCount > 0
      ? totalSessionLength / behavior.sessionCount : 0;

    return behavior;
  }

  static extractPromptPattern(prompt) {
    // Simplified pattern extraction - could be enhanced with NLP
    const words = prompt.toLowerCase().split(/\s+/);
    const keyWords = words.filter((word) => word.length > 4
      && !['the', 'and', 'for', 'with', 'this', 'that', 'from', 'they', 'have', 'been'].includes(word));

    return keyWords.slice(0, 3).join(' ') || 'unknown';
  }

  static analyzeAgentPerformance(agentLogs) {
    const sessions = LogQueryService.groupLogsBySession(agentLogs);
    let totalDuration = 0;
    let successfulSessions = 0;
    let totalTokens = 0;
    let sessionCount = 0;

    sessions.forEach((sessionLogs) => {
      sessionCount += 1;
      const sessionMetrics = LogQueryService.analyzeSession(sessionLogs);
      totalDuration += sessionMetrics.duration;
      totalTokens += sessionMetrics.tokenUsage;

      if (sessionMetrics.successful) {
        successfulSessions += 1;
      }
    });

    return {
      averageDuration: sessionCount > 0 ? totalDuration / sessionCount : 0,
      successRate: sessionCount > 0 ? (successfulSessions / sessionCount) * 100 : 0,
      averageTokenUsage: sessionCount > 0 ? totalTokens / sessionCount : 0,
      totalSessions: sessionCount,
    };
  }

  static generateAgentRecommendations(behavior, performance) {
    const recommendations = [];

    if (performance.successRate < 80) {
      recommendations.push({
        type: 'performance',
        message: `Low success rate: ${performance.successRate.toFixed(1)}%`,
        suggestion: 'Review and optimize prompts for this agent',
      });
    }

    if (performance.averageTokenUsage > 8000) {
      recommendations.push({
        type: 'efficiency',
        message: 'High token usage detected',
        suggestion: 'Consider more concise prompts to reduce costs',
      });
    }

    if (behavior.averageSessionLength > 50) {
      recommendations.push({
        type: 'complexity',
        message: 'Long average session length',
        suggestion: 'Break down complex tasks into smaller steps',
      });
    }

    return recommendations;
  }

  async getAllLogsInRange(dateRange) {
    const logs = [];

    try {
      if (!fs.existsSync(this.logsDir)) {
        return logs;
      }

      const logFiles = fs.readdirSync(this.logsDir).filter((file) => file.endsWith('.log'));

      logFiles.forEach((logFile) => {
        const filePath = path.join(this.logsDir, logFile);
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter((line) => line.trim());

        lines.forEach((line) => {
          try {
            const entry = JSON.parse(line);
            if (LogQueryService.isInDateRange(entry.timestamp, dateRange)) {
              logs.push(entry);
            }
          } catch (parseError) {
            // Skip non-JSON lines
          }
        });
      });
    } catch (error) {
      logger.error('Failed to retrieve logs in range', { error: error.message });
    }

    return logs;
  }

  async getAllLogsInTimeWindow(timeWindow) {
    const now = new Date();
    const duration = LogQueryService.parseTimeWindow(timeWindow);
    const fromDate = new Date(now.getTime() - duration);

    return this.getAllLogsInRange({
      from: fromDate.toISOString(),
      to: now.toISOString(),
    });
  }

  static parseTimeWindow(timeWindow) {
    const match = timeWindow.match(/(\d+)([hdw])/);
    if (!match) return 24 * 60 * 60 * 1000; // Default 1 day

    const [, amount, unit] = match;
    const multipliers = { h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000, w: 7 * 24 * 60 * 60 * 1000 };

    return parseInt(amount, 10) * (multipliers[unit] || multipliers.d);
  }

  async getAgentLogs(agentId, options = {}) {
    const allLogs = await this.getAllLogsInRange(options.dateRange || {});
    return allLogs.filter((log) => log.agentId === agentId);
  }

  static isInDateRange(timestamp, dateRange) {
    if (!dateRange) return true;

    const date = new Date(timestamp);
    const fromDate = dateRange.from ? new Date(dateRange.from) : null;
    const toDate = dateRange.to ? new Date(dateRange.to) : null;

    return (!fromDate || date >= fromDate) && (!toDate || date <= toDate);
  }

  setupReportTemplates() {
    this.reportTemplates.set('performance_summary', {
      title: 'Performance Summary Report',
      sections: ['metrics', 'trends', 'insights', 'recommendations'],
      format: 'html',
    });

    this.reportTemplates.set('error_analysis', {
      title: 'Error Analysis Report',
      sections: ['patterns', 'trends', 'recommendations'],
      format: 'html',
    });

    this.reportTemplates.set('agent_behavior', {
      title: 'Agent Behavior Analysis',
      sections: ['behavior', 'performance', 'recommendations'],
      format: 'html',
    });
  }

  async createReport(reportType, options = {}) {
    try {
      const template = this.reportTemplates.get(reportType);
      if (!template) {
        throw new Error(`Unknown report type: ${reportType}`);
      }

      const reportData = await this.gatherReportData(reportType, options);
      const report = LogQueryService.formatReport(reportData, template, options);
      const visualizations = LogQueryService.generateVisualizations(reportData);
      const exportData = LogQueryService.prepareExportData(reportData, options);

      return { report, visualizations, exportData };
    } catch (error) {
      logger.error('Report creation failed', { reportType, error: error.message });
      throw new Error(`Report creation failed: ${error.message}`);
    }
  }

  async gatherReportData(reportType, options) {
    const dateRange = options.dateRange || LogQueryService.getDefaultDateRange();

    switch (reportType) {
      case 'performance_summary':
        return this.analyzePerformance(dateRange, options);
      case 'error_analysis':
        return this.detectErrorPatterns(options.timeWindow || '7d');
      case 'agent_behavior':
        if (!options.agentId) throw new Error('Agent ID required for behavior report');
        return this.generateAgentAnalytics(options.agentId, options);
      default:
        throw new Error(`Unsupported report type: ${reportType}`);
    }
  }

  static getDefaultDateRange() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return {
      from: weekAgo.toISOString(),
      to: now.toISOString(),
    };
  }

  static formatReport(reportData, template, options) {
    const report = {
      title: template.title,
      generatedAt: new Date().toISOString(),
      timeRange: options.dateRange || LogQueryService.getDefaultDateRange(),
      sections: {},
    };

    template.sections.forEach((section) => {
      if (reportData[section]) {
        report.sections[section] = reportData[section];
      }
    });

    return report;
  }

  static generateVisualizations(reportData) {
    const visualizations = [];

    // Generate simple text-based visualizations
    if (reportData.trends && reportData.trends.dailyActivity) {
      visualizations.push({
        type: 'timeline',
        title: 'Daily Activity',
        data: Array.from(reportData.trends.dailyActivity.entries()),
      });
    }

    if (reportData.metrics && reportData.metrics.agentPerformance) {
      visualizations.push({
        type: 'bar_chart',
        title: 'Agent Performance Comparison',
        data: Array.from(reportData.metrics.agentPerformance.entries()),
      });
    }

    return visualizations;
  }

  static prepareExportData(reportData, options) {
    const format = options.format || 'json';

    switch (format) {
      case 'json':
        return JSON.stringify(reportData, null, 2);
      case 'csv':
        return LogQueryService.convertToCSV(reportData);
      default:
        return reportData;
    }
  }

  static convertToCSV(data) {
    // Simple CSV conversion for metrics data
    const lines = ['timestamp,metric,value,agent_id'];

    if (data.metrics && data.metrics.agentPerformance) {
      data.metrics.agentPerformance.forEach((metrics, agentId) => {
        lines.push(`${new Date().toISOString()},duration,${metrics.duration},${agentId}`);
        lines.push(`${new Date().toISOString()},success_rate,${metrics.successful ? 1 : 0},${agentId}`);
        lines.push(`${new Date().toISOString()},token_usage,${metrics.tokenUsage},${agentId}`);
      });
    }

    return lines.join('\n');
  }

  async exportData(format, filters = {}) {
    try {
      const logs = await this.getAllLogsInRange(filters.dateRange || {}, filters);

      switch (format.toLowerCase()) {
        case 'json':
          return JSON.stringify(logs, null, 2);
        case 'csv':
          return LogQueryService.logsToCSV(logs);
        case 'html':
          return LogQueryService.logsToHTML(logs);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      logger.error('Data export failed', { format, error: error.message });
      throw new Error(`Data export failed: ${error.message}`);
    }
  }

  static logsToCSV(logs) {
    const headers = ['timestamp', 'agentId', 'type', 'source', 'content', 'metadata'];
    const lines = [headers.join(',')];

    logs.forEach((log) => {
      const row = [
        log.timestamp || '',
        log.agentId || '',
        log.type || '',
        log.source || '',
        `"${(log.content || '').replace(/"/g, '""')}"`,
        `"${JSON.stringify(log.metadata || {}).replace(/"/g, '""')}"`,
      ];
      lines.push(row.join(','));
    });

    return lines.join('\n');
  }

  static logsToHTML(logs) {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Agent Logs Export</title>
    <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .error { background-color: #ffebee; }
        .warning { background-color: #fff3e0; }
    </style>
</head>
<body>
    <h1>Agent Logs Export</h1>
    <p>Generated: ${new Date().toISOString()}</p>
    <p>Total Entries: ${logs.length}</p>
    <table>
        <thead>
            <tr>
                <th>Timestamp</th>
                <th>Agent ID</th>
                <th>Type</th>
                <th>Source</th>
                <th>Content</th>
                <th>Metadata</th>
            </tr>
        </thead>
        <tbody>
            ${logs.map((log) => `
                <tr class="${(() => {
    if (log.type === 'error') return 'error';
    if (log.type === 'warning') return 'warning';
    return '';
  })()}">
                    <td>${log.timestamp || ''}</td>
                    <td>${log.agentId || ''}</td>
                    <td>${log.type || ''}</td>
                    <td>${log.source || ''}</td>
                    <td>${LogQueryService.escapeHtml(log.content || '')}</td>
                    <td>${LogQueryService.escapeHtml(JSON.stringify(log.metadata || {}))}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>`;

    return html;
  }

  static escapeHtml(text) {
    const div = { innerHTML: text };
    return div.innerHTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  isInitialized() {
    return this.initialized;
  }

  getIndexStats() {
    if (!this.searchIndex) return null;

    return {
      textIndexSize: this.searchIndex.textIndex.size,
      metadataIndexSize: this.searchIndex.metadataIndex.size,
      timeIndexSize: this.searchIndex.timeIndex.size,
      agentIndexSize: this.searchIndex.agentIndex.size,
      lastBuilt: this.searchIndex.lastBuilt,
    };
  }
}

module.exports = LogQueryService;
