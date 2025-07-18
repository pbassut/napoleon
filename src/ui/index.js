const blessed = require('blessed');
const { loadConfig } = require('../core/config');
const logger = require('../utils/logger');
const packageInfo = require('../../package.json');
const AgentManager = require('../core/agent-manager');
const { AgentStatus } = require('../core/agent-manager');
const AgentSpawnDialog = require('./components/agent-spawn-dialog');
const AgentTerminationDialog = require('./components/agent-termination-dialog');
const AgentDetailView = require('./components/agent-detail-view');
const FocusDebugger = require('../utils/focus-debugger');
const CrossPlatformFocus = require('../utils/cross-platform-focus');

/**
 * Main Terminal UI Manager
 * Handles the blessed-based terminal interface
 */
class TerminalUI {
  constructor() {
    this.screen = null;
    this.header = null;
    this.content = null;
    this.footer = null;
    this.helpOverlay = null;
    this.spawnDialog = null;
    this.terminationDialog = null;
    this.detailView = null;
    this.config = null;
    this.showingHelp = false;
    this.agentManager = null;
    this.agents = [];
    this.activeTimers = new Set(); // Track active timers for cleanup
    this.selectedAgentIndex = 0; // Track selected agent for navigation
    this.statusUpdateInterval = null; // For real-time updates
    this.animationInterval = null; // For smooth animation updates
    this.blinkCounter = 0; // Counter for blinking animation
    this.agentsCache = null; // Cache for performance optimization
    this.renderPending = false; // Throttle rendering

    // Focus management properties
    this.focusHistory = [];
    this.focusValidationInterval = null;
    this.focusDebugger = null;
    this.crossPlatformFocus = null;
  }

  /**
   * Initialize the terminal UI
   */
  async initialize() {
    try {
      // Load configuration
      this.config = loadConfig();

      // Initialize agent manager
      this.agentManager = new AgentManager();
      await this.agentManager.initialize();

      // Create blessed screen
      this.screen = blessed.screen({
        smartCSR: true,
        title: 'Napoleon',
        cursor: {
          artificial: true,
          shape: 'line',
          blink: true,
        },
        dockBorders: true,
        ignoreLocked: ['C-c'],
      });

      // Initialize focus debugging and cross-platform handling
      this.focusDebugger = new FocusDebugger(this.screen);
      this.crossPlatformFocus = new CrossPlatformFocus(this.screen);
      this.focusDebugger.logFocusState('initialization');

      // Create UI components
      this.createHeader();
      this.createContent();
      this.createFooter();
      this.createHelpOverlay();
      this.createSpawnDialog();
      this.createTerminationDialog();
      this.createDetailView();

      // Set up event handlers
      this.setupEventHandlers();

      // Start focus validation monitoring
      this.startFocusValidation();

      // Initial render and update
      this.updateAgentsList();
      this.render();

      // Start status polling for real-time updates
      this.startStatusPolling();

      logger.info('Terminal UI initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize terminal UI', { error: error.message });
      throw error;
    }
  }

  /**
   * Create the header component
   */
  createHeader() {
    this.header = blessed.box({
      parent: this.screen,
      label: ' Napoleon ',
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      border: {
        type: 'line',
      },
      style: {
        fg: 'white',
        bg: 'blue',
        border: {
          fg: 'blue',
        },
      },
    });

    // Add version and status text
    this.headerText = blessed.text({
      parent: this.header,
      top: 0,
      left: 1,
      width: '100%-2',
      height: 1,
      content: `Napoleon v${packageInfo.version} - Agent Driven Development`,
      style: {
        fg: 'white',
        bg: 'blue',
      },
    });
  }

  /**
   * Create the main content area
   */
  createContent() {
    this.content = blessed.box({
      parent: this.screen,
      label: ' Status ',
      top: 3,
      left: 0,
      width: '100%',
      height: '100%-6',
      border: {
        type: 'line',
      },
      style: {
        fg: 'white',
        border: {
          fg: 'gray',
        },
      },
      scrollable: true,
      alwaysScroll: true,
      mouse: true,
    });

    // Add initial status message
    this.statusText = blessed.text({
      parent: this.content,
      top: 'center',
      left: 'center',
      width: 'shrink',
      height: 'shrink',
      content: 'No active agents',
      style: {
        fg: 'yellow',
        bold: true,
      },
      align: 'center',
    });

    // Add instruction text
    this.instructionText = blessed.text({
      parent: this.content,
      top: 'center+2',
      left: 'center',
      width: 'shrink',
      height: 'shrink',
      content: 'Press \'n\' to spawn new agent',
      style: {
        fg: 'gray',
      },
      align: 'center',
    });

    // Add agents list (initially empty)
    this.agentsList = blessed.list({
      parent: this.content,
      top: 1,
      left: 1,
      width: '100%-2',
      height: '100%-2',
      border: {
        type: 'line',
      },
      style: {
        fg: 'white',
        border: {
          fg: 'gray',
        },
        selected: {
          bg: 'blue',
        },
      },
      keys: true,
      vi: true,
      mouse: true,
      items: [],
      hidden: true,
    });
  }

  /**
   * Create the footer component
   */
  createFooter() {
    this.footer = blessed.box({
      parent: this.screen,
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

    // Add keyboard shortcuts
    this.footerText = blessed.text({
      parent: this.footer,
      top: 0,
      left: 1,
      width: '100%-2',
      height: 1,
      content: 'Press \'n\' to spawn new agent | \'d\' to terminate | \'Enter/i\' for details | \'↑↓\' to navigate | \'h\' for help | \'q\' to quit',
      style: {
        fg: 'cyan',
      },
      align: 'center',
    });
  }

  /**
   * Create the agent spawn dialog
   */
  createSpawnDialog() {
    this.spawnDialog = new AgentSpawnDialog(
      this.screen,
      this.handleSpawnAgent.bind(this),
      this.handleSpawnCancel.bind(this),
    );
  }

  /**
   * Create the agent termination dialog
   */
  createTerminationDialog() {
    this.terminationDialog = new AgentTerminationDialog(
      this.screen,
      this.handleTerminationConfirm.bind(this),
      this.handleTerminationCancel.bind(this),
    );
  }

  /**
   * Create the agent detail view
   */
  createDetailView() {
    this.detailView = new AgentDetailView(this.screen, this.agentManager);
  }

  /**
   * Create the help overlay
   */
  createHelpOverlay() {
    this.helpOverlay = blessed.box({
      parent: this.screen,
      label: ' Help ',
      top: 'center',
      left: 'center',
      width: 60,
      height: 16,
      border: {
        type: 'line',
      },
      style: {
        fg: 'white',
        bg: 'black',
        border: {
          fg: 'green',
        },
      },
      hidden: true,
      shadow: true,
    });

    const helpContent = [
      'Napoleon - Agent Driven Development',
      '',
      'Keyboard Shortcuts:',
      '  n - Spawn new agent',
      '  d - Terminate selected agent',
      '  Enter/i - View detailed agent information',
      '  ↑/k - Navigate up in agent list',
      '  ↓/j - Navigate down in agent list',
      '  h - Show/hide this help',
      '  q - Quit application',
      '  Ctrl+C - Force quit',
      '  Escape - Return to main view',
      '',
      'Features:',
      '  • Real-time agent status monitoring',
      '  • Detailed agent view with logs and metrics',
      '  • Scrollable log output with search',
      '  • Keyboard navigation with selection',
      '  • Status indicators (●=running, ○=idle, ✗=error)',
      '  • Runtime tracking for each agent',
      '  • Git worktree isolation',
      '  • Session persistence',
      '  • Claude Code SDK integration',
      '  • Enhanced API key management',
      '',
      'Press any key to close this help...',
    ];

    this.helpText = blessed.text({
      parent: this.helpOverlay,
      top: 1,
      left: 2,
      width: '100%-4',
      height: '100%-2',
      content: helpContent.join('\n'),
      style: {
        fg: 'white',
      },
    });
  }

  /**
   * Set up event handlers
   */
  setupEventHandlers() {
    // Quit on 'q' or Ctrl+C
    this.screen.key(['q', 'C-c'], () => {
      this.quit();
    });

    // Help toggle on 'h'
    this.screen.key(['h'], () => {
      this.toggleHelp();
    });

    // Spawn agent on 'n'
    this.screen.key(['n'], () => {
      this.showSpawnDialog();
    });

    // Escape key to return to main view
    this.screen.key(['escape'], () => {
      if (this.showingHelp) {
        this.toggleHelp();
      }
    });

    // Arrow key navigation for agent selection
    this.screen.key(['up', 'k'], () => {
      this.navigateAgents('up');
    });

    this.screen.key(['down', 'j'], () => {
      this.navigateAgents('down');
    });

    // Agent termination (d key)
    this.screen.key(['d'], () => {
      this.terminateSelectedAgent();
    });

    // Agent detail view (Enter or i key)
    this.screen.key(['enter', 'i'], () => {
      this.showAgentDetail();
    });

    // Any key to close help when shown
    this.screen.on('keypress', (ch, key) => {
      if (this.showingHelp && key.name !== 'h') {
        this.toggleHelp();
      }
    });

    // Setup cross-platform resize handling
    this.crossPlatformFocus.setupResizeHandling(() => {
      this.handleResize();
    });

    // Handle mouse events
    this.screen.on('mouse', (data) => {
      if (data.action === 'wheelup' || data.action === 'wheeldown') {
        this.content.scroll(data.action === 'wheelup' ? -3 : 3);
        this.render();
      }
    });

    // Setup cross-platform focus event handling
    this.crossPlatformFocus.setupBlessedEventHandling({
      onFocus: (element) => this.trackFocusChange(element, 'gained'),
      onBlur: (element) => this.trackFocusChange(element, 'lost'),
      onRender: () => this.validateFocusAfterRender(),
    });
  }

  /**
   * Toggle help overlay
   */
  toggleHelp() {
    this.showingHelp = !this.showingHelp;

    if (this.showingHelp) {
      this.helpOverlay.show();
    } else {
      this.helpOverlay.hide();
    }

    this.render();
  }

  /**
   * Handle terminal resize
   */
  handleResize() {
    logger.debug('Terminal resize detected');

    // Blessed handles most resize logic automatically
    // but we can add custom handling here if needed

    this.render();
  }

  /**
   * Show the spawn dialog
   */
  showSpawnDialog() {
    if (!this.agentManager.canSpawnAgent()) {
      this.updateStatus(
        `Maximum ${this.agentManager.maxAgents} agents already running`,
        { fg: 'red', bold: true },
      );
      return;
    }

    if (this.spawnDialog) {
      this.spawnDialog.show();
    }
  }

  /**
   * Handle agent spawning with immediate UI feedback
   */
  async handleSpawnAgent(instructions) {
    try {
      // Add pending agent to UI immediately
      const agentId = this.agentManager.generateAgentId();
      const pendingAgent = this.agentManager.addPendingAgent({
        id: agentId,
        instructions: instructions,
        startTime: Date.now()
      });

      // Update UI immediately to show loading state
      this.updateAgentsList();

      // Ensure focus is maintained
      await this.ensureFocusAfterSpawn();

      // Start actual creation process in background
      this.performAgentCreation(pendingAgent)
        .then(agent => {
          // Update UI with completed agent
          this.agentManager.updatePendingAgentStatus(agent.id, 'idle');
          this.updateAgentsList();
          this.showSpawnSuccess(agent);
          logger.info('Agent spawned successfully from UI', { agentId: agent.id });
        })
        .catch(error => {
          // Update UI with error state
          this.agentManager.updatePendingAgentStatus(pendingAgent.id, 'error', error.message);
          this.updateAgentsList();
          this.updateStatus(`Failed to spawn agent: ${error.message}`, { fg: 'red', bold: true });
          logger.error('Failed to spawn agent from UI', { error: error.message });

          // Hide error message after 5 seconds
          this.setTimeout(() => {
            this.updateAgentsList();
          }, 5000);
        });

    } catch (error) {
      logger.error('Agent spawn initiation failed', { error: error.message });
      this.updateStatus(`Failed to start agent creation: ${error.message}`, { fg: 'red', bold: true });

      // Ensure focus is restored even on error
      await this.restoreMainFocus();

      // Hide error message after 5 seconds
      this.setTimeout(() => {
        this.updateAgentsList();
      }, 5000);
    }
  }

  /**
   * Perform actual agent creation in background
   */
  async performAgentCreation(pendingAgent) {
    try {
      // Update progress
      this.agentManager.updatePendingAgentStatus(pendingAgent.id, 'spawning');
      pendingAgent.progress = 'Creating git worktree...';
      this.updateAgentsList();

      // Call the actual spawn method
      const session = await this.agentManager.spawnAgent(pendingAgent.instructions);
      
      // Replace the pending agent with the real session
      this.agentManager.agents.delete(pendingAgent.id);
      this.agentManager.agents.set(session.id, session);
      
      return session;
    } catch (error) {
      logger.error('Background agent creation failed', { 
        agentId: pendingAgent.id,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Show spawn success message with focus restoration
   */
  showSpawnSuccess(session) {
    const worktreeInfo = session.worktreeName ? ` in worktree ${session.worktreeName}` : '';
    this.footerText.setContent(`Agent ${session.id} spawned successfully${worktreeInfo} | Press 'n' to spawn new agent | 'd' to terminate | '↑↓' to navigate | 'h' for help | 'q' to quit`);
    this.footerText.style.fg = 'green';
    this.render();

    // Reset footer and ensure focus
    this.setTimeout(async () => {
      this.footerText.setContent('Press \'n\' to spawn new agent | \'d\' to terminate | \'Enter/i\' for details | \'↑↓\' to navigate | \'h\' for help | \'q\' to quit');
      this.footerText.style.fg = 'cyan';
      await this.restoreMainFocus();
      this.render();
    }, 3000);
  }

  /**
   * Handle spawn dialog cancel
   */
  handleSpawnCancel() {
    // Nothing special needed, just return to main view
    this.updateAgentsList();
  }

  /**
   * Handle termination confirmation
   */
  async handleTerminationConfirm() {
    if (this.agents.length === 0) return;

    const selectedAgent = this.agents[this.selectedAgentIndex];
    if (!selectedAgent) return;

    try {
      await this.agentManager.terminateAgent(selectedAgent.id);
      this.updateStatus(`Agent ${selectedAgent.id} terminated`, { fg: 'yellow', bold: true });

      // Reset selection if needed
      if (this.selectedAgentIndex >= this.agents.length - 1) {
        this.selectedAgentIndex = Math.max(0, this.agents.length - 2);
      }

      // Hide status message after 3 seconds
      this.setTimeout(() => {
        this.updateAgentsList();
      }, 3000);
    } catch (error) {
      this.updateStatus(`Failed to terminate agent: ${error.message}`, { fg: 'red', bold: true });
      this.setTimeout(() => {
        this.updateAgentsList();
      }, 5000);
    }
  }

  /**
   * Handle termination dialog cancel
   */
  handleTerminationCancel() {
    // Nothing special needed, just return to main view
    this.updateAgentsList();
  }

  /**
   * Start status polling for real-time updates
   */
  startStatusPolling() {
    // Animation updates every 200ms for smooth animation
    this.animationInterval = setInterval(() => {
      this.blinkCounter += 1;
      this.updateAnimationOnly();
    }, 200);

    // Status updates every 1.5 seconds as per US004 requirement
    this.statusUpdateInterval = setInterval(() => {
      this.updateAgentsList();
    }, 1500);
  }

  /**
   * Stop status polling
   */
  stopStatusPolling() {
    if (this.statusUpdateInterval) {
      clearInterval(this.statusUpdateInterval);
      this.statusUpdateInterval = null;
    }
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
      this.animationInterval = null;
    }
  }

  /**
   * Navigate agents list with keyboard
   */
  navigateAgents(direction) {
    if (this.agents.length === 0) return;

    const oldIndex = this.selectedAgentIndex;

    if (direction === 'up') {
      this.selectedAgentIndex = this.selectedAgentIndex > 0
        ? this.selectedAgentIndex - 1
        : this.agents.length - 1; // Wrap around to bottom
    } else if (direction === 'down') {
      this.selectedAgentIndex = this.selectedAgentIndex < this.agents.length - 1
        ? this.selectedAgentIndex + 1
        : 0; // Wrap around to top
    }

    // Only update if selection actually changed
    if (oldIndex !== this.selectedAgentIndex && this.agents.length > 0) {
      this.updateSelectionHighlight();
    }
  }

  /**
   * Terminate selected agent (show confirmation dialog)
   */
  async terminateSelectedAgent() {
    if (this.agents.length === 0) return;

    const selectedAgent = this.agents[this.selectedAgentIndex];
    if (!selectedAgent) return;

    // Show confirmation dialog
    if (this.terminationDialog) {
      this.terminationDialog.show(selectedAgent);
    }
  }

  /**
   * Show agent detail view for selected agent
   */
  showAgentDetail() {
    if (this.agents.length === 0) return;

    const selectedAgent = this.agents[this.selectedAgentIndex];
    if (!selectedAgent) return;

    // Show detail view
    if (this.detailView) {
      this.detailView.show(selectedAgent);
    }
  }

  /**
   * Update only selection highlighting for immediate navigation
   */
  updateSelectionHighlight() {
    if (this.agentsList && this.agents.length > 0) {
      // Update the content with new arrows BEFORE updating selection highlight
      this.updateAgentListItems();
      this.updateAgentListStyling();
      this.agentsList.select(this.selectedAgentIndex);
      this.renderThrottled();
    }
  }

  /**
   * Update only animation frames without full re-render
   */
  updateAnimationOnly() {
    if (this.agents.length > 0) {
      this.updateAgentListItems();
      this.renderThrottled();
    }
  }

  /**
   * Throttled render function to prevent excessive re-renders
   */
  renderThrottled() {
    if (this.renderPending) return;
    this.renderPending = true;

    // Use requestAnimationFrame equivalent for terminal
    setTimeout(() => {
      this.render();
      this.renderPending = false;
    }, 16); // ~60fps
  }

  /**
   * Update agents list display
   */
  updateAgentsList() {
    if (!this.agentManager) return;

    const agents = this.agentManager.getActiveAgents();

    // Check if agents actually changed to avoid unnecessary updates
    if (this.agentsCache && this.agentsCache.length === agents.length && agents.length > 0) {
      let changed = false;
      for (let i = 0; i < agents.length; i += 1) {
        if (this.agentsCache[i].id !== agents[i].id
            || this.agentsCache[i].status !== agents[i].status) {
          changed = true;
          break;
        }
      }
      if (!changed) return; // No changes, skip expensive update
    }

    this.agentsCache = agents;
    this.agents = agents;

    if (agents.length === 0) {
      // Show empty state
      this.statusText.setContent('No active agents - Press \'n\' to spawn new agent');
      this.statusText.show();
      this.instructionText.hide();
      this.agentsList.hide();
      this.selectedAgentIndex = 0;
    } else {
      // Show agents list
      this.statusText.hide();
      this.instructionText.hide();
      this.agentsList.show();

      // Ensure selected index is within bounds
      if (this.selectedAgentIndex >= agents.length) {
        this.selectedAgentIndex = Math.max(0, agents.length - 1);
      }

      this.updateAgentListItems();
      this.updateAgentListStyling();

      // Update selection highlighting only if there are agents
      if (this.agents.length > 0) {
        this.agentsList.select(this.selectedAgentIndex);
      }
    }

    this.render();
  }

  /**
   * Update agent list items with current data
   */
  updateAgentListItems() {
    if (!this.agents || this.agents.length === 0) return;

    const items = this.agents.map((agent, index) => {
      const statusIcon = this.getStatusIcon(agent.status);
      const runtime = this.agentManager.formatRuntime(this.agentManager.getAgentRuntime(agent.id));
      const statusText = agent.status.padEnd(12); // Pad for alignment
      const pidText = agent.pid ? `PID: ${agent.pid}`.padEnd(10) : 'PID: N/A'.padEnd(10);
      const isSelected = index === this.selectedAgentIndex;
      const prefix = isSelected ? '> ' : '  ';
      
      // Show progress for spawning agents
      const progressText = agent.status === AgentStatus.SPAWNING && agent.progress 
        ? ` - ${agent.progress}` 
        : '';
      
      return `${prefix}${statusIcon} ${agent.id.padEnd(18)} [${statusText}] ${pidText} Runtime: ${runtime}${progressText}`;
    });

    this.agentsList.setItems(items);
  }

  /**
   * Update agent list styling based on status and selection
   */
  updateAgentListStyling() {
    if (!this.agents || this.agents.length === 0) return;

    this.agentsList.children.forEach((item, index) => {
      if (this.agents[index]) {
        const color = this.getStatusColor(this.agents[index].status);
        const isSelected = index === this.selectedAgentIndex;
        const itemStyle = {
          ...item.style,
          fg: color,
          bg: isSelected ? 'blue' : 'black',
          bold: isSelected,
        };
        item.style = itemStyle;
      }
    });
  }

  /**
   * Get status icon for agent as per US004 requirements with smooth animation
   */
  getStatusIcon(status) {
    switch (status) {
      case AgentStatus.RUNNING: {
        // 4-frame animation for smooth running indicator
        const runningFrames = ['●', '◉', '○', '◯'];
        return runningFrames[this.blinkCounter % 4];
      }
      case AgentStatus.IDLE:
        return '○'; // Idle - hollow circle
      case AgentStatus.ERROR:
        return '✗'; // Error - X mark
      case AgentStatus.SPAWNING: {
        // 4-frame spinning animation for spawning activity
        const spawnFrames = ['◐', '◑', '◒', '◓'];
        return spawnFrames[this.blinkCounter % 4];
      }
      case AgentStatus.TERMINATING: {
        // 2-frame fade animation for terminating
        const terminatingFrames = ['◯', '○'];
        return terminatingFrames[this.blinkCounter % 2];
      }
      default:
        return '○'; // Default to idle
    }
  }

  /**
   * Get status color for agent
   */
  getStatusColor(status) {
    const statusColors = {
      [AgentStatus.RUNNING]: 'green',
      [AgentStatus.IDLE]: 'yellow',
      [AgentStatus.ERROR]: 'red',
      [AgentStatus.SPAWNING]: 'blue',
      [AgentStatus.TERMINATING]: 'gray',
    };
    return statusColors[status] || 'white';
  }

  /**
   * Get time ago string
   */
  getTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ago`;
    }
    if (minutes > 0) {
      return `${minutes}m ago`;
    }
    return `${seconds}s ago`;
  }

  /**
   * Update the status display
   */
  updateStatus(message, style = { fg: 'yellow', bold: true }) {
    if (this.statusText) {
      this.statusText.setContent(message);
      this.statusText.style = { ...this.statusText.style, ...style };
      this.statusText.show();
      this.instructionText.hide();
      this.agentsList.hide();
      this.render();
    }
  }

  /**
   * Render the screen
   */
  render() {
    if (this.screen) {
      this.screen.render();
    }
  }

  /**
   * Set timeout with tracking for cleanup
   */
  setTimeout(callback, delay) {
    const timerId = setTimeout(() => {
      this.activeTimers.delete(timerId);
      callback();
    }, delay);
    this.activeTimers.add(timerId);
    return timerId;
  }

  /**
   * Clear timeout and remove from tracking
   */
  clearTimeout(timerId) {
    if (timerId) {
      clearTimeout(timerId);
      this.activeTimers.delete(timerId);
    }
  }

  /**
   * Clean up and quit the application
   */
  quit() {
    logger.info('Shutting down terminal UI');

    try {
      // Stop status polling
      this.stopStatusPolling();

      // Stop focus validation
      if (this.focusValidationInterval) {
        clearInterval(this.focusValidationInterval);
        this.focusValidationInterval = null;
      }

      // Clean up all active timers
      this.activeTimers.forEach((timerId) => {
        clearTimeout(timerId);
      });
      this.activeTimers.clear();

      // Clean up dialogs and detail view
      if (this.spawnDialog) {
        this.spawnDialog.destroy();
      }
      if (this.terminationDialog) {
        this.terminationDialog.destroy();
      }
      if (this.detailView) {
        this.detailView.destroy();
      }

      if (this.screen) {
        this.screen.destroy();
      }

      // Restore terminal state
      process.stdout.write('\x1b[?1000l'); // Disable mouse tracking
      process.stdout.write('\x1b[?1002l'); // Disable button event tracking

      logger.info('Terminal UI shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during terminal UI shutdown', { error: error.message });
      process.exit(1);
    }
  }

  /**
   * Get the current screen dimensions
   */
  getScreenDimensions() {
    return {
      width: this.screen.width,
      height: this.screen.height,
    };
  }

  /**
   * Check if terminal meets minimum requirements
   */
  checkTerminalRequirements() {
    const { width, height } = this.getScreenDimensions();

    if (width < 80 || height < 24) {
      logger.warn('Terminal size below recommended minimum (80x24)', {
        current: { width, height },
        minimum: { width: 80, height: 24 },
      });

      return false;
    }

    return true;
  }

  /**
   * Track focus change events
   */
  trackFocusChange(element, action) {
    const focusEvent = {
      timestamp: Date.now(),
      element: element.constructor.name,
      action,
      focused: this.screen.focused,
    };

    this.focusHistory.push(focusEvent);

    // Keep only recent history
    if (this.focusHistory.length > 20) {
      this.focusHistory.shift();
    }

    this.focusDebugger.logFocusState(`focus-${action}-${element.constructor.name}`);
  }

  /**
   * Validate focus state after render operations
   */
  async validateFocusAfterRender() {
    // Ensure main screen has focus when no dialogs are active
    if (!this.hasActiveDialog() && this.screen.focused !== this.screen) {
      logger.debug('Focus lost after render, restoring to main screen');
      await this.restoreMainFocus();
    }
  }

  /**
   * Check if any dialogs are currently active
   */
  hasActiveDialog() {
    return (
      (this.spawnDialog && typeof this.spawnDialog.isShown === 'function' && this.spawnDialog.isShown())
      || (this.terminationDialog && typeof this.terminationDialog.isShown === 'function' && this.terminationDialog.isShown())
      || (this.detailView && typeof this.detailView.isShown === 'function' && this.detailView.isShown())
      || this.showingHelp
    );
  }

  /**
   * Restore focus to main screen with cross-platform handling
   */
  async restoreMainFocus() {
    try {
      this.focusDebugger.logFocusState('main-focus-restore-requested');

      const success = await this.crossPlatformFocus.recoverFocus(this.screen);

      if (success) {
        this.focusDebugger.logFocusState('main-focus-restored');
      } else {
        logger.warn('Cross-platform focus recovery failed, using fallback');
        // Fallback to direct assignment
        this.screen.focused = this.screen;
        this.render();
        this.focusDebugger.logFocusState('main-focus-forced');
      }
    } catch (error) {
      logger.error('Failed to restore main focus', { error: error.message });
      // Last resort fallback
      this.screen.focused = this.screen;
    }
  }

  /**
   * Start periodic focus validation with cross-platform timing
   */
  startFocusValidation() {
    // Use platform-specific validation interval
    const validationInterval = this.crossPlatformFocus.getFocusValidationInterval();

    this.focusValidationInterval = setInterval(() => {
      this.validateFocusState();
    }, validationInterval);
  }

  /**
   * Validate current focus state
   */
  async validateFocusState() {
    if (!this.hasActiveDialog()) {
      // Main UI should have focus
      if (this.screen.focused !== this.screen) {
        logger.debug('Focus drift detected, correcting');
        await this.restoreMainFocus();
      }
    }
  }

  /**
   * Ensure focus is maintained after agent spawn operations
   */
  async ensureFocusAfterSpawn() {
    // Verify focus state hasn't been lost
    if (this.screen.focused !== this.screen) {
      logger.debug('Focus lost during spawn, restoring');
      await this.restoreMainFocus();
    }
  }
}

module.exports = TerminalUI;
