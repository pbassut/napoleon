const blessed = require('blessed');
const TerminalUI = require('../../src/ui/index');
const AgentManager = require('../../src/core/agent-manager');
const FocusDebugger = require('../../src/utils/focus-debugger');
const CrossPlatformFocus = require('../../src/utils/cross-platform-focus');

// Mock blessed
jest.mock('blessed');
jest.mock('../../src/core/agent-manager');
jest.mock('../../src/utils/focus-debugger');
jest.mock('../../src/utils/cross-platform-focus');
jest.mock('../../src/core/config', () => ({
  loadConfig: jest.fn(() => ({
    maxAgents: 3,
    logLevel: 'info',
  })),
}));

describe('Focus Recovery Integration Tests', () => {
  let ui;
  let mockScreen;
  let mockAgentManager;
  let mockSpawnDialog;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Set up environment
    process.env.ANTHROPIC_API_KEY = 'test-key';

    // Mock screen
    mockScreen = {
      destroy: jest.fn(),
      render: jest.fn(),
      on: jest.fn(),
      key: jest.fn(),
      focus: jest.fn(),
      focused: null,
      constructor: { name: 'Screen' },
    };
    blessed.screen.mockReturnValue(mockScreen);

    // Mock blessed components with all required methods
    const createMockComponent = () => ({
      setContent: jest.fn(),
      style: { fg: 'white' },
      on: jest.fn(),
      show: jest.fn(),
      hide: jest.fn(),
      focus: jest.fn(),
      constructor: { name: 'MockComponent' },
      children: [],
    });

    const createMockList = () => ({
      ...createMockComponent(),
      setItems: jest.fn(),
      select: jest.fn(),
      children: [],
    });

    blessed.box = jest.fn(() => createMockComponent());
    blessed.list = jest.fn(() => createMockList());
    blessed.text = jest.fn(() => createMockComponent());
    blessed.textarea = jest.fn(() => createMockComponent());

    // Mock agent manager
    mockAgentManager = {
      initialize: jest.fn(),
      getActiveAgents: jest.fn(() => []),
      canSpawnAgent: jest.fn(() => true),
      getAgentCount: jest.fn(() => 0),
      spawnAgent: jest.fn(async () => ({ id: 'test-agent-1', worktreeName: 'test-worktree' })),
      getAgentRuntime: jest.fn(() => 120000), // 2 minutes
      formatRuntime: jest.fn((ms) => '2m'),
    };
    AgentManager.mockImplementation(() => mockAgentManager);

    // Mock focus debugger
    const mockFocusDebugger = {
      logFocusState: jest.fn(),
      validateFocusConsistency: jest.fn(() => true),
    };
    FocusDebugger.mockImplementation(() => mockFocusDebugger);

    // Mock cross-platform focus
    const mockCrossPlatformFocus = {
      getFocusValidationInterval: jest.fn(() => 2000),
      setupBlessedEventHandling: jest.fn(),
      setupResizeHandling: jest.fn(),
      recoverFocus: jest.fn(async () => true),
    };
    CrossPlatformFocus.mockImplementation(() => mockCrossPlatformFocus);

    ui = new TerminalUI();
    await ui.initialize();

    // Set up spawn dialog mock
    mockSpawnDialog = {
      show: jest.fn(),
      hide: jest.fn(),
      isShown: jest.fn(() => false),
      destroy: jest.fn(),
    };
    ui.spawnDialog = mockSpawnDialog;
  });

  afterEach(() => {
    jest.useRealTimers();
    delete process.env.ANTHROPIC_API_KEY;
  });

  describe('focus recovery during agent spawning workflow', () => {
    it('should maintain focus through complete spawn workflow', async () => {
      // Initial state - main screen has focus
      mockScreen.focused = mockScreen;
      
      // Simulate spawn dialog opening
      mockSpawnDialog.isShown.mockReturnValue(true);
      ui.showSpawnDialog();
      
      expect(mockSpawnDialog.show).toHaveBeenCalled();
      
      // Simulate spawning an agent (which might lose focus)
      mockScreen.focused = null; // Simulate focus loss during spawn
      await ui.handleSpawnAgent('Test instructions for agent');
      
      // Verify focus recovery was attempted through cross-platform focus
      const CrossPlatformFocusInstance = ui.crossPlatformFocus;
      expect(CrossPlatformFocusInstance.recoverFocus).toHaveBeenCalled();
      
      // Verify dialog was hidden and focus restored
      mockSpawnDialog.isShown.mockReturnValue(false);
      expect(ui.ensureFocusAfterSpawn).toBeDefined();
    });

    it('should handle focus loss during heavy UI operations', async () => {
      // Start with focus on main screen
      mockScreen.focused = mockScreen;
      
      // Simulate multiple agents for heavy rendering
      const mockAgents = [
        { id: 'agent-1', status: 'running', pid: 1001 },
        { id: 'agent-2', status: 'idle', pid: 1002 },
        { id: 'agent-3', status: 'spawning', pid: null },
      ];
      mockAgentManager.getActiveAgents.mockReturnValue(mockAgents);
      
      // Simulate focus loss during update
      mockScreen.focused = null;
      ui.updateAgentsList();
      
      // Focus validation should trigger after render
      const setupCall = ui.crossPlatformFocus.setupBlessedEventHandling.mock.calls[0];
      const handlers = setupCall[0];
      await handlers.onRender();
      
      // Verify focus restoration was attempted through cross-platform focus
      expect(ui.crossPlatformFocus.recoverFocus).toHaveBeenCalledWith(mockScreen);
    });

    it('should handle repeated focus loss with retry mechanism', async () => {
      // Initially no focus
      mockScreen.focused = null;
      
      // Trigger focus restoration
      await ui.restoreMainFocus();
      
      // Should have attempted cross-platform focus recovery
      expect(ui.crossPlatformFocus.recoverFocus).toHaveBeenCalledWith(mockScreen);
    });

    it('should validate focus state periodically', () => {
      const validateSpy = jest.spyOn(ui, 'validateFocusState');
      
      // Start focus validation
      ui.startFocusValidation();
      
      // Fast-forward through validation interval
      jest.advanceTimersByTime(2000);
      
      expect(validateSpy).toHaveBeenCalled();
    });

    it('should not interfere with dialog focus when dialogs are active', () => {
      // Simulate active dialog
      mockSpawnDialog.isShown.mockReturnValue(true);
      mockScreen.focused = null;
      
      ui.validateFocusState();
      
      // Should not attempt to restore focus when dialog is active
      expect(mockScreen.focus).not.toHaveBeenCalled();
    });

    it('should handle edge case with missing dialog methods', () => {
      // Create dialog without isShown method
      ui.spawnDialog = {};
      ui.terminationDialog = null;
      ui.detailView = undefined;
      ui.showingHelp = false;
      
      expect(() => ui.hasActiveDialog()).not.toThrow();
      expect(ui.hasActiveDialog()).toBe(false);
      
      // Should be able to restore focus safely
      mockScreen.focused = null;
      expect(() => ui.validateFocusState()).not.toThrow();
    });

    it('should clean up focus validation on quit', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      const originalInterval = ui.focusValidationInterval;
      
      ui.quit();
      
      expect(clearIntervalSpy).toHaveBeenCalledWith(originalInterval);
      expect(ui.focusValidationInterval).toBeNull();
    });
  });

  describe('cross-dialog focus management', () => {
    it('should handle focus transitions between multiple dialogs', () => {
      // Setup multiple dialogs
      const mockTermDialog = {
        isShown: jest.fn(() => false),
        show: jest.fn(),
        hide: jest.fn(),
      };
      const mockDetailView = {
        isShown: jest.fn(() => false),
        show: jest.fn(),
        hide: jest.fn(),
      };
      
      ui.terminationDialog = mockTermDialog;
      ui.detailView = mockDetailView;
      
      // Test spawn dialog -> termination dialog transition
      mockSpawnDialog.isShown.mockReturnValue(false);
      mockTermDialog.isShown.mockReturnValue(true);
      
      expect(ui.hasActiveDialog()).toBe(true);
      
      // Close termination dialog, open detail view
      mockTermDialog.isShown.mockReturnValue(false);
      mockDetailView.isShown.mockReturnValue(true);
      
      expect(ui.hasActiveDialog()).toBe(true);
      
      // Close all dialogs
      mockDetailView.isShown.mockReturnValue(false);
      
      expect(ui.hasActiveDialog()).toBe(false);
    });

    it('should handle help overlay focus correctly', async () => {
      ui.showingHelp = true;
      expect(ui.hasActiveDialog()).toBe(true);
      
      // Should not restore main focus when help is shown
      mockScreen.focused = null;
      await ui.validateFocusState();
      expect(ui.crossPlatformFocus.recoverFocus).not.toHaveBeenCalled();
      
      // Should restore focus when help is hidden
      ui.showingHelp = false;
      await ui.validateFocusState();
      expect(ui.crossPlatformFocus.recoverFocus).toHaveBeenCalledWith(mockScreen);
    });
  });

  describe('performance and timing requirements', () => {
    it('should restore focus within 100ms requirement', async () => {
      mockScreen.focused = null;
      
      const startTime = Date.now();
      await ui.restoreMainFocus();
      
      // Focus should be attempted immediately through cross-platform focus
      expect(ui.crossPlatformFocus.recoverFocus).toHaveBeenCalledWith(mockScreen);
      
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(100); // Should be well under 100ms
    });

    it('should throttle excessive focus validation calls', () => {
      const validateSpy = jest.spyOn(ui, 'validateFocusState');
      
      // Multiple rapid validation calls
      for (let i = 0; i < 10; i++) {
        ui.validateFocusAfterRender();
      }
      
      // Should not call validate more than necessary
      expect(validateSpy.mock.calls.length).toBeLessThan(10);
    });
  });
});