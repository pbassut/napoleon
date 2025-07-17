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
      height: 6,
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
      height: 4,
      content: '',
      style: {
        fg: 'white',
      },
    });

    // Logs section with scrollable content
    this.logsBox = blessed.box({
      parent: this.overlay,
      label: ' Logs ',
      top: 6,
      left: 0,
      width: '100%',
      height: '100%-9',
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
      content: '[/] Search | [j/k] Scroll | [G] Bottom | [gg] Top | [ESC/q] Back | [h] Help',
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

      // Help
      this.overlay.key(['h'], () => {
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
      this.agentManager.getAgentRuntime(agent.id)
    );
    
    // Get additional agent details with error handling
    let agentDetails = null;
    try {
      agentDetails = this.agentManager.getAgentDetails(agent.id);
    } catch (error) {
      logger.error('Failed to get agent details', { 
        agentId: agent.id, 
        error: error.message 
      });
    }
    
    const worktreePath = agentDetails?.worktreePath || 'N/A';
    const branchInfo = agentDetails?.branch || 'N/A';
    
    // Get system resource usage (mock for now)
    const cpuUsage = this.getCpuUsage(agent);
    const memoryUsage = this.getMemoryUsage(agent);
    
    const info = [
      `Agent: ${agent.id} [${branchInfo}] │ CPU: ${cpuUsage}% │ RAM: ${memoryUsage}MB`,
      `Started: ${this.formatTimestamp(agent.startTime)} │ Runtime: ${runtime}`,
      `Worktree: ${worktreePath}`,
      `PID: ${agent.pid || 'N/A'} │ Status: ${agent.status} │ Instructions: "${agent.instructions || 'N/A'}"`,
    ].join('\n');

    this.agentInfoText.setContent(info);
  }

  /**
   * Load agent logs from the agent manager
   */
  loadAgentLogs() {
    if (!this.currentAgent) return;

    try {
      // Get logs from agent manager
      this.logs = this.agentManager.getAgentLogs(this.currentAgent.id) || [];
      this.updateLogsDisplay();
      
      // Auto-scroll to bottom if enabled
      if (this.autoScroll) {
        this.scrollToBottom();
      }
    } catch (error) {
      logger.error('Failed to load agent logs', { 
        agentId: this.currentAgent.id, 
        error: error.message 
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
   * Update logs display with formatted content
   */
  updateLogsDisplay() {
    if (this.logs.length === 0) {
      this.logsContent.setContent('No logs available for this agent.');
      return;
    }

    const formattedLogs = this.logs.map((log, index) => {
      const lineNum = String(index + 1).padStart(3, ' ');
      const timestamp = this.formatLogTimestamp(log.timestamp);
      const isSearchResult = this.searchResults.includes(index);
      const isCurrentResult = this.searchResults[this.currentSearchIndex] === index;
      
      let content = `${lineNum} │ ${timestamp} │ ${log.content}`;
      
      // Highlight search results
      if (isSearchResult) {
        if (isCurrentResult) {
          content = `{inverse}${content}{/inverse}`;
        } else {
          content = `{yellow-fg}${content}{/yellow-fg}`;
        }
      }
      
      return content;
    }).join('\n');

    this.logsContent.setContent(formattedLogs);
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
      `Search: "${this.searchPattern}" (${current}/${total}) | [n] Next | [N] Previous | [ESC] Clear`
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
      '[/] Search | [j/k] Scroll | [G] Bottom | [gg] Top | [ESC/q] Back | [h] Help'
    );
    this.render();
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
        '[/] Search | [j/k] Scroll | [G] Bottom | [gg] Top | [ESC/q] Back | [h] Help'
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
      width: 70,
      height: 20,
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
      'Navigation:',
      '  j/↓        - Scroll down one line',
      '  k/↑        - Scroll up one line', 
      '  PageDown   - Scroll down one page',
      '  PageUp     - Scroll up one page',
      '  G          - Go to bottom of logs',
      '  gg         - Go to top of logs',
      '  a          - Toggle auto-scroll mode',
      '',
      'Search:',
      '  /          - Enter search mode',
      '  n          - Next search result',
      '  N          - Previous search result',
      '  ESC        - Clear search',
      '',
      'General:',
      '  h          - Show this help',
      '  q/ESC      - Return to main dashboard',
      '',
      'Press any key to close this help...',
    ];

    const helpText = blessed.text({
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
   * Get CPU usage for agent (mock implementation)
   */
  getCpuUsage(agent) {
    // TODO: Implement actual CPU monitoring
    return Math.floor(Math.random() * 50) + 10; // Mock 10-60%
  }

  /**
   * Get memory usage for agent (mock implementation)
   */
  getMemoryUsage(agent) {
    // TODO: Implement actual memory monitoring  
    return Math.floor(Math.random() * 100) + 20; // Mock 20-120MB
  }

  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString();
  }

  /**
   * Format log timestamp (shorter format)
   */
  formatLogTimestamp(timestamp) {
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