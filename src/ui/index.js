const blessed = require('blessed');
const { loadConfig } = require('../core/config');
const logger = require('../utils/logger');
const packageInfo = require('../../package.json');
const AgentManager = require('../core/agent-manager');
const { AgentStatus } = require('../core/agent-manager');
const AgentSpawnDialog = require('./components/agent-spawn-dialog');

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
    this.config = null;
    this.showingHelp = false;
    this.agentManager = null;
    this.agents = [];
    this.activeTimers = new Set(); // Track active timers for cleanup
    this.selectedAgentIndex = 0; // Track selected agent for navigation
    this.statusUpdateInterval = null; // For real-time updates
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
        title: 'ADD Manager',
        cursor: {
          artificial: true,
          shape: 'line',
          blink: true,
        },
        dockBorders: true,
        ignoreLocked: ['C-c'],
      });

      // Create UI components
      this.createHeader();
      this.createContent();
      this.createFooter();
      this.createHelpOverlay();
      this.createSpawnDialog();

      // Set up event handlers
      this.setupEventHandlers();

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
      label: ' ADD Manager ',
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
      content: `ADD Manager v${packageInfo.version} - Agent Driven Development`,
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
      content: 'Press \'n\' to spawn new agent | \'d\' to terminate | \'↑↓\' to navigate | \'h\' for help | \'q\' to quit',
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
      this.handleSpawnCancel.bind(this)
    );
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
      'ADD Manager - Agent Driven Development',
      '',
      'Keyboard Shortcuts:',
      '  n - Spawn new agent',
      '  d - Terminate selected agent',
      '  ↑/k - Navigate up in agent list',
      '  ↓/j - Navigate down in agent list',
      '  h - Show/hide this help',
      '  q - Quit application',
      '  Ctrl+C - Force quit',
      '  Escape - Return to main view',
      '',
      'Features:',
      '  • Real-time agent status monitoring',
      '  • Keyboard navigation with selection',
      '  • Status indicators (●=running, ○=idle, ✗=error)',
      '  • Runtime tracking for each agent',
      '  • Git worktree isolation',
      '  • Session persistence',
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

    // Any key to close help when shown
    this.screen.on('keypress', (ch, key) => {
      if (this.showingHelp && key.name !== 'h') {
        this.toggleHelp();
      }
    });

    // Handle terminal resize
    this.screen.on('resize', () => {
      this.handleResize();
    });

    // Handle mouse events
    this.screen.on('mouse', (data) => {
      if (data.action === 'wheelup' || data.action === 'wheeldown') {
        this.content.scroll(data.action === 'wheelup' ? -3 : 3);
        this.render();
      }
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
        { fg: 'red', bold: true }
      );
      return;
    }

    if (this.spawnDialog) {
      this.spawnDialog.show();
    }
  }

  /**
   * Handle agent spawning
   */
  async handleSpawnAgent(instructions) {
    try {
      const session = await this.agentManager.spawnAgent(instructions);
      logger.info('Agent spawned successfully from UI', { agentId: session.id });
      
      // Update the UI
      this.updateAgentsList();
      this.updateStatus(`Agent ${session.id} spawned successfully`, { fg: 'green', bold: true });
      
      // Hide status message after 3 seconds
      this.setTimeout(() => {
        this.updateAgentsList();
      }, 3000);
    } catch (error) {
      logger.error('Failed to spawn agent from UI', { error: error.message });
      
      // Show error message
      this.updateStatus(`Failed to spawn agent: ${error.message}`, { fg: 'red', bold: true });
      
      // Hide error message after 5 seconds
      this.setTimeout(() => {
        this.updateAgentsList();
      }, 5000);
    }
  }

  /**
   * Handle spawn dialog cancel
   */
  handleSpawnCancel() {
    // Nothing special needed, just return to main view
    this.updateAgentsList();
  }

  /**
   * Start status polling for real-time updates
   */
  startStatusPolling() {
    // Poll every 1.5 seconds as per US004 requirement
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
  }

  /**
   * Navigate agents list with keyboard
   */
  navigateAgents(direction) {
    if (this.agents.length === 0) return;

    if (direction === 'up') {
      this.selectedAgentIndex = this.selectedAgentIndex > 0 
        ? this.selectedAgentIndex - 1 
        : this.agents.length - 1; // Wrap around to bottom
    } else if (direction === 'down') {
      this.selectedAgentIndex = this.selectedAgentIndex < this.agents.length - 1 
        ? this.selectedAgentIndex + 1 
        : 0; // Wrap around to top
    }

    // Update the list selection
    this.agentsList.select(this.selectedAgentIndex);
    this.render();
  }

  /**
   * Terminate selected agent
   */
  async terminateSelectedAgent() {
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
   * Update agents list display
   */
  updateAgentsList() {
    if (!this.agentManager) return;

    const agents = this.agentManager.getActiveAgents();
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

      // Update list items with proper formatting as per US004
      const items = agents.map((agent, index) => {
        const statusIcon = this.getStatusIcon(agent.status);
        const runtime = this.agentManager.formatRuntime(this.agentManager.getAgentRuntime(agent.id));
        const statusText = agent.status.padEnd(12); // Pad for alignment
        const isSelected = index === this.selectedAgentIndex;
        const prefix = isSelected ? '> ' : '  ';
        return `${prefix}${statusIcon} ${agent.id.padEnd(18)} [${statusText}] Runtime: ${runtime}`;
      });

      this.agentsList.setItems(items);
      
      // Update selection highlighting
      this.agentsList.select(this.selectedAgentIndex);
      
      // Update styling based on status
      this.agentsList.children.forEach((item, index) => {
        if (agents[index]) {
          const color = this.getStatusColor(agents[index].status);
          const isSelected = index === this.selectedAgentIndex;
          item.style = {
            ...item.style,
            fg: color,
            bg: isSelected ? 'blue' : 'black',
            bold: isSelected,
          };
        }
      });
    }

    this.render();
  }

  /**
   * Get status icon for agent as per US004 requirements
   */
  getStatusIcon(status) {
    switch (status) {
      case AgentStatus.RUNNING:
        return '●'; // Running - solid circle
      case AgentStatus.IDLE:
        return '○'; // Idle - hollow circle
      case AgentStatus.ERROR:
        return '✗'; // Error - X mark
      case AgentStatus.SPAWNING:
        return '◐'; // Spawning - half circle
      case AgentStatus.TERMINATING:
        return '◯'; // Terminating - hollow circle
      default:
        return '○'; // Default to idle
    }
  }

  /**
   * Get status color for agent
   */
  getStatusColor(status) {
    switch (status) {
      case AgentStatus.RUNNING:
        return 'green'; // Running - green
      case AgentStatus.IDLE:
        return 'yellow'; // Idle - yellow
      case AgentStatus.ERROR:
        return 'red'; // Error - red
      case AgentStatus.SPAWNING:
        return 'blue'; // Spawning - blue
      case AgentStatus.TERMINATING:
        return 'gray'; // Terminating - gray
      default:
        return 'white'; // Default
    }
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
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return `${seconds}s ago`;
    }
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

      // Clean up all active timers
      this.activeTimers.forEach(timerId => {
        clearTimeout(timerId);
      });
      this.activeTimers.clear();

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
}

module.exports = TerminalUI;
