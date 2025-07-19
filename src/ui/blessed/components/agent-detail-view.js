const blessed = require('blessed');
const logger = require('../../utils/logger');

/**
 * Agent Detail View Component
 * Provides comprehensive agent information display with real-time logs,
 * resource usage, and configuration details as per US010 requirements.
 */
class AgentDetailView {
  constructor(screen, agentManager) {
    this.screen = screen;
    this.agentManager = agentManager;
    this.currentAgent = null;

    // UI components
    this.overlay = null;
    this.headerBox = null;
    this.logsBox = null;
    this.footerBox = null;
    this.searchBox = null;

    // State management
    this.isVisible = false;
    this.isSearchMode = false;
    this.scrollPosition = 0;
    this.logs = [];
    this.searchResults = [];
    this.currentSearchIndex = 0;
    this.searchPattern = '';
    this.autoScroll = true;
    this.updateInterval = null;

    this.createComponents();
    this.setupEventHandlers();
  }

  /**
   * Create all UI components for the detail view
   */
  createComponents() {
    // Main overlay container
    this.overlay = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      style: {
        fg: 'white',
        bg: 'black',
      },
      hidden: true,
      border: {
        type: 'line',
      },
    });

    // Header section with agent info
    this.headerBox = blessed.box({
      parent: this.overlay,
      label: ' Agent Details ',
      top: 0,
      left: 0,
      width: '100%',
      height: 7,
      border: {
        type: 'line',
      },
      style: {
        fg: 'white',
        border: {
          fg: 'cyan',
        },
      },
    });

    // Agent info text
    this.agentInfoText = blessed.text({
      parent: this.headerBox,
      top: 1,
      left: 1,
      width: '100%-2',
      height: 5,
      content: '',
      style: {
        fg: 'white',
      },
      tags: true, // Enable color tags for status indicators
    });

    // Logs section with scrollable content
    this.logsBox = blessed.box({
      parent: this.overlay,
      label: ' Logs ',
      top: 7,
      left: 0,
      width: '100%',
      height: '100%-10',
      border: {
        type: 'line',
      },
      style: {
        fg: 'white',
        border: {
          fg: 'green',
        },
      },
      scrollable: true,
      alwaysScroll: true,
      mouse: true,
      keys: true,
    });

    // Logs content
    this.logsContent = blessed.text({
      parent: this.logsBox,
      top: 0,
      left: 1,
      width: '100%-2',
      height: 'shrink',
      content: '',
      style: {
        fg: 'white',
      },
      tags: true,
    });

    // Footer with keyboard shortcuts
    this.footerBox = blessed.box({
      parent: this.overlay,
      top: '100%-3',
      left: 0,
      width: '100%',
      height: 3,
      border: {
        type: 'line',
      },
      style: {
        fg: 'white',
        border: {
          fg: 'gray',
        },
      },
    });

    this.footerText = blessed.text({
      parent: this.footerBox,
      top: 0,
      left: 1,
      width: '100%-2',
      height: 1,
      content: '[/] Search | [j/k] Scroll | [G] Bottom | [gg] Top | [l] External | [h] History | [ESC/q] Back | [?] Help',
      style: {
        fg: 'cyan',
      },
      align: 'center',
    });

    // Search box (initially hidden)
    this.searchBox = blessed.textbox({
      parent: this.overlay,
      label: ' Search Logs ',
      top: 'center',
      left: 'center',
      width: 60,
      height: 3,
      border: {
        type: 'line',
      },
      style: {
        fg: 'white',
        bg: 'black',
        border: {
          fg: 'yellow',
        },
      },
      hidden: true,
      inputOnFocus: true,
    });
  }

  /**
   * Setup event handlers for keyboard navigation
   */
  setupEventHandlers() {
    // Close detail view
    if (this.overlay && this.overlay.key) {
      this.overlay.key(['escape', 'q'], () => {
        if (this.isSearchMode) {
          this.exitSearchMode();
        } else {
          this.hide();
        }
      });
    }

    // Only setup key handlers if they exist (for testing compatibility)
    if (this.overlay && this.overlay.key) {
      // Scroll navigation
      this.overlay.key(['j', 'down'], () => {
        this.scroll(1);
      });

      this.overlay.key(['k', 'up'], () => {
        this.scroll(-1);
      });

      // Page navigation
      this.overlay.key(['pagedown'], () => {
        this.scroll(10);
      });

      this.overlay.key(['pageup'], () => {
        this.scroll(-10);
      });

      // Go to bottom
      this.overlay.key(['G'], () => {
        this.scrollToBottom();
      });

      // Go to top (gg)
      this.overlay.key(['g'], () => {
        // Wait for second 'g'
        if (this.overlay.once) {
          this.overlay.once('keypress', (ch, key) => {
            if (key.name === 'g') {
              this.scrollToTop();
            }
          });
        }
      });

      // Search mode
      this.overlay.key(['/'], () => {
        this.enterSearchMode();
      });

      // Search navigation
      this.overlay.key(['n'], () => {
        this.nextSearchResult();
      });

      this.overlay.key(['N'], () => {
        this.previousSearchResult();
      });

      // Toggle auto-scroll
      this.overlay.key(['a'], () => {
        this.toggleAutoScroll();
      });

      // Open log file in external viewer
      this.overlay.key(['l'], () => {
        this.openLogInExternalViewer();
      });

      // Historical logs access
      this.overlay.key(['h'], () => {
        this.showHistoricalLogsDialog();
      });

      // Help (moved to different key)
      this.overlay.key(['?'], () => {
        this.showHelp();
      });
    }

    // Search box events
    if (this.searchBox && this.searchBox.on) {
      this.searchBox.on('submit', (text) => {
        this.performSearch(text);
        this.exitSearchMode();
      });

      this.searchBox.on('cancel', () => {
        this.exitSearchMode();
      });
    }
  }

  /**
   * Show the detail view for a specific agent
   */
  show(agent) {
    if (!agent) {
      logger.error('Cannot show detail view: no agent provided');
      return;
    }

    this.currentAgent = agent;
    this.isVisible = true;

    // Load agent logs
    this.loadAgentLogs();

    // Update agent information
    this.updateAgentInfo();

    // Show the overlay
    this.overlay.show();
    this.overlay.focus();

    // Start real-time updates
    this.startRealTimeUpdates();

    this.render();

    logger.debug('Agent detail view shown', { agentId: agent.id });
  }

  /**
   * Hide the detail view
   */
  hide() {
    this.isVisible = false;
    this.currentAgent = null;

    // Stop real-time updates
    this.stopRealTimeUpdates();

    // Clear search state
    this.clearSearch();

    // Hide the overlay
    this.overlay.hide();

    // Return focus to parent
    this.screen.realloc();
    this.render();

    logger.debug('Agent detail view hidden');
  }

  /**
   * Update agent information display
   */
  updateAgentInfo() {
    if (!this.currentAgent) return;

    const agent = this.currentAgent;
    const runtime = this.agentManager.formatRuntime(
      this.agentManager.getAgentRuntime(agent.id),
    );

    // Get additional agent details with error handling
    let agentDetails = null;
    try {
      agentDetails = this.agentManager.getAgentDetails(agent.id);
    } catch (error) {
      logger.error('Failed to get agent details', {
        agentId: agent.id,
        error: error.message,
      });
    }

    const branchInfo = agentDetails?.branch || 'N/A';

    // Get system resource usage (mock for now)
    const sdkStatus = agent.sdkStatus || 'N/A';
    const sessionId = agent.sessionId || agent.id;

    // Get persistent log file information
    const logInfo = this.getLogFileInfo(agent.id);

    const info = [
      `Agent: ${agent.id} [${branchInfo}] │ SDK Status: ${sdkStatus}`,
      `Started: ${AgentDetailView.formatTimestamp(agent.spawnTime || agent.startTime)} │ Runtime: ${runtime}`,
      `Session ID: ${sessionId} │ Status: ${agent.status} │ Instructions: "${agent.instructions || 'N/A'}"`,
      logInfo,
    ].join('\n');

    this.agentInfoText.setContent(info);
  }

  /**
   * Get persistent log file information for display
   * @param {string} agentId - Agent identifier
   * @returns {string} - Formatted log file information
   */
  getLogFileInfo(agentId) {
    try {
      // Get AgentLogManager instance from agent manager
      const agentLogManager = this.agentManager.agentLogManager;
      if (!agentLogManager) {
        return 'Log File: {red-fg}Persistent logging disabled{/red-fg}';
      }

      // Check if agent log manager is initialized
      if (!agentLogManager.isInitialized()) {
        return 'Log File: {yellow-fg}Logging system initializing{/yellow-fg}';
      }

      // Get current log file path for active agent
      const logPath = agentLogManager.getLogPath(agentId);
      if (!logPath) {
        const agentStatus = this.currentAgent?.status || 'unknown';
        if (agentStatus === 'terminated' || agentStatus === 'failed') {
          return 'Log File: {cyan-fg}Agent terminated - check historical logs{/cyan-fg}';
        }
        return 'Log File: {yellow-fg}No active log file (agent not logging){/yellow-fg}';
      }

      // Get detailed file information and status
      const fileStatus = this.getLogFileStatus(logPath);
      const path = require('path');
      const filename = path.basename(logPath);
      
      let statusIndicator;
      let sizeInfo = '';
      
      switch (fileStatus.status) {
        case 'active':
          statusIndicator = '{green-fg}●{/green-fg} Active';
          sizeInfo = ` ({green-fg}${fileStatus.sizeKB}KB{/green-fg})`;
          break;
        case 'readonly':
          statusIndicator = '{blue-fg}●{/blue-fg} Read-only';
          sizeInfo = ` ({blue-fg}${fileStatus.sizeKB}KB{/blue-fg})`;
          break;
        case 'missing':
          statusIndicator = '{red-fg}●{/red-fg} Missing';
          sizeInfo = '';
          break;
        case 'error':
          statusIndicator = '{red-fg}●{/red-fg} Error';
          sizeInfo = fileStatus.sizeKB ? ` (${fileStatus.sizeKB}KB)` : '';
          break;
        default:
          statusIndicator = '{yellow-fg}●{/yellow-fg} Unknown';
          sizeInfo = fileStatus.sizeKB ? ` (${fileStatus.sizeKB}KB)` : '';
      }

      return `Log File: ${filename}${sizeInfo} │ Status: ${statusIndicator} │ Path: ${logPath}`;
    } catch (error) {
      logger.error('Failed to get log file info', {
        agentId,
        error: error.message,
      });
      return 'Log File: {red-fg}Error retrieving log information{/red-fg}';
    }
  }

  /**
   * Get detailed log file status information
   * @param {string} logPath - Path to log file
   * @returns {Object} - File status object
   */
  getLogFileStatus(logPath) {
    try {
      const fs = require('fs');
      
      if (!fs.existsSync(logPath)) {
        return { status: 'missing', sizeKB: 0 };
      }

      const stats = fs.statSync(logPath);
      const sizeKB = Math.round(stats.size / 1024);
      
      // Check if file is writable (indicates active logging)
      try {
        fs.accessSync(logPath, fs.constants.W_OK);
        
        // Check if file was modified recently (within last 30 seconds)
        const now = Date.now();
        const lastModified = stats.mtime.getTime();
        const isRecentlyActive = (now - lastModified) < 30000;
        
        return {
          status: isRecentlyActive ? 'active' : 'readonly',
          sizeKB,
          lastModified: stats.mtime,
          accessible: true,
        };
      } catch (accessError) {
        // File exists but not writable
        return {
          status: 'readonly',
          sizeKB,
          lastModified: stats.mtime,
          accessible: false,
        };
      }
    } catch (error) {
      logger.warn('Failed to get log file status', {
        logPath,
        error: error.message,
      });
      return { status: 'error', sizeKB: 0 };
    }
  }

  /**
   * Load agent logs from the agent manager
   */
  loadAgentLogs() {
    if (!this.currentAgent) return;

    try {
      // Get logs from agent manager
      const allLogs = this.agentManager.getAgentLogs(this.currentAgent.id) || [];
      
      // Filter logs based on MESSAGE_TYPES environment variable
      this.logs = this.filterLogsByMessageTypes(allLogs);
      this.updateLogsDisplay();

      // Auto-scroll to bottom if enabled
      if (this.autoScroll) {
        this.scrollToBottom();
      }
    } catch (error) {
      logger.error('Failed to load agent logs', {
        agentId: this.currentAgent.id,
        error: error.message,
      });
      this.logs = [{
        timestamp: new Date(),
        content: `Error loading logs: ${error.message}`,
        line: 1,
      }];
      this.updateLogsDisplay();
    }
  }

  /**
   * Filter logs based on MESSAGE_TYPES environment variable
   * @param {Array} logs - Array of log entries
   * @returns {Array} - Filtered log entries
   */
  filterLogsByMessageTypes(logs) {
    // Get allowed message types from environment variable
    // Default to showing only 'assistant' type messages
    const messageTypesEnv = process.env.MESSAGE_TYPES || 'assistant';
    const allowedTypes = messageTypesEnv.split(',').map(type => type.trim().toLowerCase());

    return logs.filter(log => {
      if (!log || typeof log !== 'object') return false;

      // Check the log type field
      const logType = log.type ? log.type.toLowerCase() : '';
      
      // Check the SDK type in metadata
      const sdkType = log.metadata?.sdkType ? log.metadata.sdkType.toLowerCase() : '';

      // Include the log if either type matches the allowed types
      return allowedTypes.includes(logType) || allowedTypes.includes(sdkType);
    });
  }

  /**
   * Format log content based on message type
   * @param {Object} log - Log entry object
   * @returns {string} - Formatted content string
   */
  formatLogContent(log) {
    if (!log || !log.content) return '';

    // For assistant type messages, parse and extract text content
    if (log.type === 'assistant' || log.metadata?.sdkType === 'assistant') {
      try {
        const parsedContent = JSON.parse(log.content);
        if (parsedContent.message && parsedContent.message.content) {
          // Extract text from content array and join with newlines
          const textParts = parsedContent.message.content
            .filter(item => item.type === 'text')
            .map(item => item.text);
          return textParts.join('\n');
        }
      } catch (error) {
        // If parsing fails, fall back to original content
        return log.content;
      }
    }

    // For other message types, return content as-is
    return log.content;
  }

  /**
   * Update logs display with formatted content
   */
  updateLogsDisplay() {
    if (this.logs.length === 0) {
      // Show appropriate status indicators based on agent state
      if (this.currentAgent && this.currentAgent.status) {
        const statusContent = this.getStatusContent(this.currentAgent);
        this.logsContent.setContent(statusContent);
      } else {
        this.logsContent.setContent('No logs available for this agent.');
      }
      return;
    }

    const formattedLogs = this.logs.map((log, index) => {
      const lineNum = String(index + 1).padStart(3, ' ');
      const timestamp = AgentDetailView.formatLogTimestamp(log.timestamp);
      const isSearchResult = this.searchResults.includes(index);
      const isCurrentResult = this.searchResults[this.currentSearchIndex] === index;

      // Format content based on message type
      const formattedContent = this.formatLogContent(log);
      
      // Split content into lines and format each line with the same timestamp
      const contentLines = formattedContent.split('\n');
      const formattedLines = contentLines.map((line, lineIndex) => {
        // First line gets the full prefix, subsequent lines get indented alignment
        const prefix = lineIndex === 0 
          ? `${lineNum} │ ${timestamp} │ `
          : `${' '.repeat(3)} │ ${' '.repeat(timestamp.length)} │ `;
        
        let fullLine = `${prefix}${line}`;

        // Apply search highlighting to the entire line if this log entry is a search result
        if (isSearchResult) {
          if (isCurrentResult) {
            fullLine = `{inverse}${fullLine}{/inverse}`;
          } else {
            fullLine = `{yellow-fg}${fullLine}{/yellow-fg}`;
          }
        }

        return fullLine;
      });

      return formattedLines.join('\n');
    }).join('\n');

    this.logsContent.setContent(formattedLogs);
  }

  /**
   * Get status content display for agents with no logs
   */
  getStatusContent(agent) {
    const { status, progress = '' } = agent;

    switch (status) {
      case 'spawning': {
        const spinnerFrames = ['◐', '◑', '◒', '◓'];
        const frameIndex = Math.floor(Date.now() / 200) % 4;
        const spinner = spinnerFrames[frameIndex];
        return `${spinner} Agent is starting up - ${progress}\n\nLogs will appear here once the agent begins processing...`;
      }

      case 'running': {
        const runningFrames = ['●', '◉', '○', '◯'];
        const runningFrameIndex = Math.floor(Date.now() / 300) % 4;
        const runningSpinner = runningFrames[runningFrameIndex];
        return `${runningSpinner} Agent is processing - ${progress}\n\nLogs will appear here as the agent generates output...`;
      }

      case 'terminating': {
        const terminatingFrames = ['◢', '◣', '◤', '◥'];
        const terminatingFrameIndex = Math.floor(Date.now() / 250) % 4;
        const terminatingSpinner = terminatingFrames[terminatingFrameIndex];
        return `${terminatingSpinner} Agent is shutting down - ${progress}\n\nAgent termination in progress...`;
      }

      case 'error':
        return `✗ Agent error - ${progress}\n\nThe agent encountered an error and stopped running.\nCheck the system logs for more details.`;

      case 'idle':
        return `○ Agent is ready - ${progress}\n\nAgent is waiting for instructions.\nLogs from previous sessions may appear below.`;

      default:
        return 'No logs available for this agent.';
    }
  }

  /**
   * Start real-time updates for logs and agent info
   */
  startRealTimeUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = (global.setInterval || setInterval)(() => {
      if (this.isVisible && this.currentAgent) {
        const oldLogsLength = this.logs.length;
        this.loadAgentLogs();
        this.updateAgentInfo();

        // If new logs were added and auto-scroll is enabled, scroll to bottom
        if (this.autoScroll && this.logs.length > oldLogsLength) {
          this.scrollToBottom();
        }

        this.render();
      }
    }, 1000); // Update every second
  }

  /**
   * Stop real-time updates
   */
  stopRealTimeUpdates() {
    if (this.updateInterval) {
      (global.clearInterval || clearInterval)(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Scroll the logs view
   */
  scroll(lines) {
    this.autoScroll = false; // Disable auto-scroll when manually scrolling
    this.logsBox.scroll(lines);
    this.render();
  }

  /**
   * Scroll to bottom of logs
   */
  scrollToBottom() {
    this.logsBox.setScrollPerc(100);
    this.render();
  }

  /**
   * Scroll to top of logs
   */
  scrollToTop() {
    this.logsBox.setScrollPerc(0);
    this.render();
  }

  /**
   * Enter search mode
   */
  enterSearchMode() {
    this.isSearchMode = true;
    this.searchBox.show();
    this.searchBox.focus();
    this.searchBox.readInput();
    this.render();
  }

  /**
   * Exit search mode
   */
  exitSearchMode() {
    this.isSearchMode = false;
    this.searchBox.hide();
    this.overlay.focus();
    this.render();
  }

  /**
   * Perform search in logs
   */
  performSearch(pattern) {
    if (!pattern) {
      this.clearSearch();
      return;
    }

    this.searchPattern = pattern;
    this.searchResults = [];

    try {
      const regex = new RegExp(pattern, 'gi');
      this.logs.forEach((log, index) => {
        if (regex.test(log.content)) {
          this.searchResults.push(index);
        }
      });

      this.currentSearchIndex = 0;
      this.updateLogsDisplay();

      if (this.searchResults.length > 0) {
        this.scrollToSearchResult(this.searchResults[0]);
        this.updateFooterWithSearchResults();
      } else {
        this.footerText.setContent('No search results found. Press ESC to return.');
      }
    } catch (error) {
      this.footerText.setContent(`Invalid regex pattern: ${error.message}`);
    }

    this.render();
  }

  /**
   * Navigate to next search result
   */
  nextSearchResult() {
    if (this.searchResults.length === 0) return;

    this.currentSearchIndex = (this.currentSearchIndex + 1) % this.searchResults.length;
    this.scrollToSearchResult(this.searchResults[this.currentSearchIndex]);
    this.updateLogsDisplay();
    this.updateFooterWithSearchResults();
    this.render();
  }

  /**
   * Navigate to previous search result
   */
  previousSearchResult() {
    if (this.searchResults.length === 0) return;

    this.currentSearchIndex = this.currentSearchIndex === 0
      ? this.searchResults.length - 1
      : this.currentSearchIndex - 1;
    this.scrollToSearchResult(this.searchResults[this.currentSearchIndex]);
    this.updateLogsDisplay();
    this.updateFooterWithSearchResults();
    this.render();
  }

  /**
   * Scroll to specific search result
   */
  scrollToSearchResult(lineIndex) {
    // Calculate percentage position for the line
    const percentage = (lineIndex / Math.max(this.logs.length - 1, 1)) * 100;
    this.logsBox.setScrollPerc(percentage);
  }

  /**
   * Update footer with search results info
   */
  updateFooterWithSearchResults() {
    if (this.searchResults.length === 0) return;

    const current = this.currentSearchIndex + 1;
    const total = this.searchResults.length;
    this.footerText.setContent(
      `Search: "${this.searchPattern}" (${current}/${total}) | [n] Next | [N] Previous | [ESC] Clear`,
    );
  }

  /**
   * Clear search results
   */
  clearSearch() {
    this.searchPattern = '';
    this.searchResults = [];
    this.currentSearchIndex = 0;
    this.updateLogsDisplay();
    this.footerText.setContent(
      '[/] Search | [j/k] Scroll | [G] Bottom | [gg] Top | [l] External | [h] History | [ESC/q] Back | [?] Help',
    );
    this.render();
  }

  /**
   * Open the current agent's log file in external viewer
   */
  openLogInExternalViewer() {
    if (!this.currentAgent) {
      this.showStatusMessage('No agent selected', 'red');
      return;
    }

    try {
      // Get AgentLogManager instance from agent manager
      const agentLogManager = this.agentManager.agentLogManager;
      if (!agentLogManager) {
        this.showStatusMessage('Persistent logging not available', 'red');
        return;
      }

      // Get current log file path for active agent
      const logPath = agentLogManager.getLogPath(this.currentAgent.id);
      if (!logPath) {
        this.showStatusMessage('No persistent log file found for this agent', 'yellow');
        return;
      }

      // Check if file exists
      const fs = require('fs');
      if (!fs.existsSync(logPath)) {
        this.showStatusMessage('Log file does not exist yet', 'yellow');
        return;
      }

      // Open file with system default application
      this.openFileWithSystemDefault(logPath);
      this.showStatusMessage(`Opening log file: ${require('path').basename(logPath)}`, 'green');
    } catch (error) {
      logger.error('Failed to open log in external viewer', {
        agentId: this.currentAgent.id,
        error: error.message,
      });
      this.showStatusMessage(`Error opening log file: ${error.message}`, 'red');
    }
  }

  /**
   * Open file with system default application
   * @param {string} filePath - Path to file to open
   */
  openFileWithSystemDefault(filePath) {
    const { spawn } = require('child_process');
    const os = require('os');
    
    let command, args;
    
    // Determine command based on platform
    switch (os.platform()) {
      case 'darwin': // macOS
        command = 'open';
        args = [filePath];
        break;
      case 'win32': // Windows
        command = 'cmd';
        args = ['/c', 'start', '""', filePath];
        break;
      default: // Linux and others
        command = 'xdg-open';
        args = [filePath];
        break;
    }

    // Spawn process to open file
    const child = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
    });

    // Detach the child process so it can run independently
    child.unref();

    logger.info('Opening log file in external viewer', {
      filePath,
      command,
      platform: os.platform(),
    });
  }

  /**
   * Show temporary status message in footer
   * @param {string} message - Message to show
   * @param {string} color - Color for the message
   */
  showStatusMessage(message, color = 'cyan') {
    const originalContent = this.footerText.content;
    const originalColor = this.footerText.style.fg;

    this.footerText.setContent(message);
    this.footerText.style.fg = color;
    this.render();

    // Restore original footer after 3 seconds
    setTimeout(() => {
      this.footerText.setContent(originalContent);
      this.footerText.style.fg = originalColor;
      this.render();
    }, 3000);
  }

  /**
   * Toggle auto-scroll mode
   */
  toggleAutoScroll() {
    this.autoScroll = !this.autoScroll;
    const status = this.autoScroll ? 'enabled' : 'disabled';
    this.footerText.setContent(`Auto-scroll ${status} | [a] Toggle | [ESC/q] Back`);

    setTimeout(() => {
      this.footerText.setContent(
        '[/] Search | [j/k] Scroll | [G] Bottom | [gg] Top | [l] External | [h] History | [ESC/q] Back | [?] Help',
      );
      this.render();
    }, 2000);

    this.render();
  }

  /**
   * Show help overlay
   */
  showHelp() {
    // Create temporary help overlay
    const helpOverlay = blessed.box({
      parent: this.screen,
      label: ' Agent Detail View Help ',
      top: 'center',
      left: 'center',
      width: 75,
      height: 27,
      border: {
        type: 'line',
      },
      style: {
        fg: 'white',
        bg: 'black',
        border: {
          fg: 'yellow',
        },
      },
      shadow: true,
    });

    const helpContent = [
      'Agent Detail View - Keyboard Shortcuts:',
      '',
      'Navigation & Scrolling:',
      '  j/↓        - Scroll down one line',
      '  k/↑        - Scroll up one line',
      '  PageDown   - Scroll down one page',
      '  PageUp     - Scroll up one page',
      '  G          - Go to bottom of logs',
      '  gg         - Go to top of logs',
      '  a          - Toggle auto-scroll mode',
      '',
      'Search & Filter:',
      '  /          - Enter search mode (regex supported)',
      '  n          - Next search result',
      '  N          - Previous search result',
      '  ESC        - Clear search and return to normal mode',
      '',
      'Persistent Logging:',
      '  l          - Open current log file in external viewer',
      '  h          - Browse historical agent logs',
      '',
      'Status Indicators:',
      '  ● Green    - Active logging (file being written)',
      '  ● Blue     - Read-only log (agent terminated)',
      '  ● Red      - Error or missing log file',
      '  ● Yellow   - Unknown or initializing state',
      '',
      'General:',
      '  ?          - Show this help dialog',
      '  q/ESC      - Return to main dashboard',
      '',
      'Log file paths are shown in agent details header.',
      'External viewer uses system defaults (VS Code, etc.)',
      '',
      'Press any key to close this help...',
    ];

    blessed.text({
      parent: helpOverlay,
      top: 1,
      left: 2,
      width: '100%-4',
      height: '100%-2',
      content: helpContent.join('\n'),
      style: {
        fg: 'white',
      },
    });

    helpOverlay.focus();
    this.render();

    // Close on any key
    helpOverlay.once('keypress', () => {
      helpOverlay.destroy();
      this.overlay.focus();
      this.render();
    });
  }

  /**
   * Show historical logs dialog for browsing archived agent logs
   */
  showHistoricalLogsDialog() {
    try {
      // Create historical logs overlay
      const historyOverlay = blessed.box({
        parent: this.screen,
        label: ' Historical Agent Logs ',
        top: 'center',
        left: 'center',
        width: 90,
        height: 25,
        border: {
          type: 'line',
        },
        style: {
          fg: 'white',
          bg: 'black',
          border: {
            fg: 'magenta',
          },
        },
        shadow: true,
      });

      // Get available historical logs
      const historicalLogs = this.getHistoricalLogs();

      let content;
      if (historicalLogs.length === 0) {
        content = [
          'No historical agent logs found.',
          '',
          'Historical logs are created when agents terminate.',
          'Start and terminate some agents to see their logs here.',
          '',
          'Press any key to close...',
        ].join('\n');
      } else {
        content = [
          'Available Historical Logs:',
          '',
          ...historicalLogs.map((log, index) => {
            const date = new Date(log.date).toLocaleString();
            const duration = log.duration ? `${log.duration}ms` : 'unknown';
            const size = log.size ? `${Math.round(log.size / 1024)}KB` : 'unknown';
            return `${index + 1}. ${log.filename}`;
          }),
          '',
          'Features coming soon:',
          '• Select and view historical logs',
          '• Filter by date range or keywords',
          '• Open historical logs in external viewer',
          '',
          'Press any key to close...',
        ].join('\n');
      }

      blessed.text({
        parent: historyOverlay,
        top: 1,
        left: 2,
        width: '100%-4',
        height: '100%-2',
        content,
        style: {
          fg: 'white',
        },
      });

      historyOverlay.focus();
      this.render();

      // Close on any key
      historyOverlay.once('keypress', () => {
        historyOverlay.destroy();
        this.overlay.focus();
        this.render();
      });
    } catch (error) {
      logger.error('Failed to show historical logs dialog', {
        error: error.message,
      });
      this.showStatusMessage('Error accessing historical logs', 'red');
    }
  }

  /**
   * Get list of available historical log files
   * @returns {Array} - Array of historical log metadata
   */
  getHistoricalLogs() {
    try {
      const fs = require('fs');
      const path = require('path');
      const os = require('os');

      // Get logs directory path
      const napoleonDir = path.join(os.homedir(), '.napoleon');
      const logsDir = path.join(napoleonDir, 'logs', 'agents');

      if (!fs.existsSync(logsDir)) {
        return [];
      }

      // Read log files and extract metadata
      const files = fs.readdirSync(logsDir);
      const logFiles = files
        .filter(file => file.endsWith('.log'))
        .map(filename => {
          const filePath = path.join(logsDir, filename);
          try {
            const stats = fs.statSync(filePath);
            return {
              filename,
              filePath,
              date: stats.mtime,
              size: stats.size,
              created: stats.ctime,
            };
          } catch (error) {
            logger.warn('Failed to read log file stats', {
              filename,
              error: error.message,
            });
            return null;
          }
        })
        .filter(log => log !== null)
        .sort((a, b) => b.date - a.date); // Sort by most recent first

      return logFiles;
    } catch (error) {
      logger.error('Failed to get historical logs', {
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Format timestamp for display
   */
  static formatTimestamp(timestamp) {
    if (!timestamp) {
      return 'N/A';
    }

    try {
      const date = new Date(timestamp);
      if (Number.isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return date.toLocaleString();
    } catch (error) {
      return 'Invalid date';
    }
  }

  /**
   * Format log timestamp (shorter format)
   */
  static formatLogTimestamp(timestamp) {
    return new Date(timestamp).toLocaleTimeString();
  }

  /**
   * Render the detail view
   */
  render() {
    if (this.isVisible) {
      try {
        this.screen.render();
      } catch (error) {
        logger.error('Failed to render detail view', { error: error.message });
      }
    }
  }

  /**
   * Check if detail view is currently visible
   */
  isShowing() {
    return this.isVisible;
  }

  /**
   * Alias for isShowing() to match interface expected by main UI
   */
  isShown() {
    return this.isVisible;
  }

  /**
   * Get current agent being displayed
   */
  getCurrentAgent() {
    return this.currentAgent;
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stopRealTimeUpdates();
    this.updateInterval = null;
    if (this.overlay) {
      this.overlay.destroy();
    }
  }
}

module.exports = AgentDetailView;
