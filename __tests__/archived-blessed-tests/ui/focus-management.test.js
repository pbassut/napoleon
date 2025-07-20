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

describe('Terminal UI Focus Management', () => {
  let ui;
  let mockScreen;
  let mockAgentManager;
  let mockFocusDebugger;
  let mockCrossPlatformFocus;

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

    // Mock blessed components
    blessed.box = jest.fn(() => ({
      setContent: jest.fn(),
      style: { fg: 'white' },
      on: jest.fn(),
      show: jest.fn(),
      hide: jest.fn(),
    }));
    blessed.list = jest.fn(() => ({
      setItems: jest.fn(),
      style: { fg: 'white' },
      on: jest.fn(),
      show: jest.fn(),
      hide: jest.fn(),
    }));
    blessed.text = jest.fn(() => ({
      setContent: jest.fn(),
      style: { fg: 'white' },
      show: jest.fn(),
      hide: jest.fn(),
    }));

    // Mock agent manager
    mockAgentManager = {
      initialize: jest.fn(),
      getActiveAgents: jest.fn(() => []),
      canSpawnAgent: jest.fn(() => true),
      getAgentCount: jest.fn(() => 0),
    };
    AgentManager.mockImplementation(() => mockAgentManager);

    // Mock focus debugger
    mockFocusDebugger = {
      logFocusState: jest.fn(),
      validateFocusConsistency: jest.fn(() => true),
    };
    FocusDebugger.mockImplementation(() => mockFocusDebugger);

    // Mock cross-platform focus
    mockCrossPlatformFocus = {
      getFocusValidationInterval: jest.fn(() => 2000),
      setupBlessedEventHandling: jest.fn(),
      setupResizeHandling: jest.fn(),
      recoverFocus: jest.fn(async () => true),
    };
    CrossPlatformFocus.mockImplementation(() => mockCrossPlatformFocus);

    ui = new TerminalUI();
    await ui.initialize();
  });

  afterEach(() => {
    jest.useRealTimers();
    delete process.env.ANTHROPIC_API_KEY;
  });

  describe('focus state tracking', () => {
    it('should initialize focus debugger on startup', () => {
      expect(FocusDebugger).toHaveBeenCalledWith(mockScreen);
      expect(mockFocusDebugger.logFocusState).toHaveBeenCalledWith('initialization');
    });

    it('should track focus history', () => {
      expect(ui.focusHistory).toEqual([]);
      
      const mockElement = { constructor: { name: 'TestElement' } };
      ui.trackFocusChange(mockElement, 'gained');

      expect(ui.focusHistory).toHaveLength(1);
      expect(ui.focusHistory[0]).toMatchObject({
        element: 'TestElement',
        action: 'gained',
      });
    });

    it('should maintain focus history size limit', () => {
      // Add 25 entries to exceed the 20 limit
      for (let i = 0; i < 25; i++) {
        const mockElement = { constructor: { name: `Element${i}` } };
        ui.trackFocusChange(mockElement, 'gained');
      }

      expect(ui.focusHistory).toHaveLength(20);
      expect(ui.focusHistory[0].element).toBe('Element5'); // First 5 should be removed
    });
  });

  describe('focus validation', () => {
    it('should start focus validation on initialization', () => {
      expect(ui.focusValidationInterval).toBeDefined();
    });

    it('should validate focus state periodically', async () => {
      mockScreen.focused = null; // Simulate lost focus
      
      await ui.validateFocusState();
      
      expect(mockCrossPlatformFocus.recoverFocus).toHaveBeenCalledWith(mockScreen);
    });

    it('should not restore focus when dialogs are active', async () => {
      // Mock active dialog
      ui.spawnDialog = { isShown: jest.fn(() => true) };
      mockScreen.focused = null;
      
      await ui.validateFocusState();
      
      expect(mockCrossPlatformFocus.recoverFocus).not.toHaveBeenCalled();
    });

    it('should validate focus after render', async () => {
      mockScreen.focused = null;
      ui.spawnDialog = { isShown: jest.fn(() => false) };
      
      await ui.validateFocusAfterRender();
      
      expect(mockCrossPlatformFocus.recoverFocus).toHaveBeenCalledWith(mockScreen);
    });
  });

  describe('focus restoration', () => {
    it('should restore main focus when called', async () => {
      await ui.restoreMainFocus();
      
      expect(mockCrossPlatformFocus.recoverFocus).toHaveBeenCalledWith(mockScreen);
      expect(mockFocusDebugger.logFocusState).toHaveBeenCalledWith('main-focus-restore-requested');
    });

    it('should retry focus restoration if it fails', async () => {
      // Simulate cross-platform focus recovery failing
      mockCrossPlatformFocus.recoverFocus.mockResolvedValueOnce(false);
      mockScreen.focused = null;
      
      await ui.restoreMainFocus();
      
      expect(mockCrossPlatformFocus.recoverFocus).toHaveBeenCalledWith(mockScreen);
      expect(mockScreen.focused).toBe(mockScreen); // Should be force-set as fallback
    });

    it('should ensure focus after spawn operations', async () => {
      const preFocusState = mockScreen;
      mockScreen.focused = null; // Simulate focus loss
      
      await ui.ensureFocusAfterSpawn(preFocusState);
      
      expect(mockCrossPlatformFocus.recoverFocus).toHaveBeenCalledWith(mockScreen);
    });
  });

  describe('dialog focus management', () => {
    it('should detect active dialogs correctly', () => {
      // No active dialogs
      ui.spawnDialog = { isShown: jest.fn(() => false) };
      ui.terminationDialog = { isShown: jest.fn(() => false) };
      ui.detailView = { isShown: jest.fn(() => false) };
      ui.showingHelp = false;
      
      expect(ui.hasActiveDialog()).toBe(false);
      
      // Active spawn dialog
      ui.spawnDialog.isShown.mockReturnValue(true);
      expect(ui.hasActiveDialog()).toBe(true);
      
      // Help shown
      ui.spawnDialog.isShown.mockReturnValue(false);
      ui.showingHelp = true;
      expect(ui.hasActiveDialog()).toBe(true);
    });

    it('should handle missing dialog methods defensively', () => {
      ui.spawnDialog = {}; // No isShown method
      ui.terminationDialog = null;
      ui.detailView = undefined;
      ui.showingHelp = false;
      
      expect(() => ui.hasActiveDialog()).not.toThrow();
      expect(ui.hasActiveDialog()).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should stop focus validation on quit', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      const originalInterval = ui.focusValidationInterval;
      
      ui.quit();
      
      expect(clearIntervalSpy).toHaveBeenCalledWith(originalInterval);
      expect(ui.focusValidationInterval).toBeNull();
    });
  });

  describe('event handling', () => {
    it('should set up focus event handlers', () => {
      expect(mockCrossPlatformFocus.setupBlessedEventHandling).toHaveBeenCalledWith({
        onFocus: expect.any(Function),
        onBlur: expect.any(Function),
        onRender: expect.any(Function),
      });
    });

    it('should track focus events when triggered', () => {
      // Get the onFocus handler from cross-platform setup
      const setupCall = mockCrossPlatformFocus.setupBlessedEventHandling.mock.calls[0];
      const handlers = setupCall[0];
      const mockElement = { constructor: { name: 'TestElement' } };
      
      handlers.onFocus(mockElement);
      
      expect(ui.focusHistory).toHaveLength(1);
      expect(mockFocusDebugger.logFocusState).toHaveBeenCalled();
    });

    it('should validate focus on render events', async () => {
      // Get the onRender handler from cross-platform setup
      const setupCall = mockCrossPlatformFocus.setupBlessedEventHandling.mock.calls[0];
      const handlers = setupCall[0];
      mockScreen.focused = null;
      ui.spawnDialog = { isShown: jest.fn(() => false) };
      
      await handlers.onRender();
      
      expect(mockCrossPlatformFocus.recoverFocus).toHaveBeenCalledWith(mockScreen);
    });
  });
});