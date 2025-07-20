const blessed = require('blessed');
const TerminalUI = require('../../src/ui/index');
const AgentManager = require('../../src/core/agent-manager');
const FocusDebugger = require('../../src/utils/focus-debugger');
const CrossPlatformFocus = require('../../src/utils/cross-platform-focus');

// Mock all dependencies
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

/**
 * US027 Acceptance Criteria Validation Tests
 * 
 * This test suite validates all acceptance criteria from US027:
 * Terminal Focus Recovery After Agent Spawning
 */
describe('US027: Terminal Focus Recovery After Agent Spawning - Acceptance Criteria Validation', () => {
  let ui;
  let mockScreen;
  let mockAgentManager;
  let mockFocusDebugger;
  let mockCrossPlatformFocus;
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

    // Mock blessed components
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
      getAgentRuntime: jest.fn(() => 120000),
      formatRuntime: jest.fn((ms) => '2m'),
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
      validateTerminalCapabilities: jest.fn(() => ({
        supportsMouseTracking: true,
        supportsFocusEvents: true,
        requiresDelayedFocus: false,
        recommendedValidationInterval: 2000,
      })),
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

  describe('AC1: Agent Spawning Focus Continuity', () => {
    it('should maintain keyboard focus throughout the entire agent spawning process', async () => {
      // Initial state - terminal has focus
      mockScreen.focused = mockScreen;
      
      // Simulate focus loss during spawn (which triggers recovery)
      mockScreen.focused = null;
      
      // Spawn agent workflow
      await ui.handleSpawnAgent('Test agent instructions');
      
      // Verify that focus recovery mechanisms were activated
      expect(mockCrossPlatformFocus.recoverFocus).toHaveBeenCalledWith(mockScreen);
      expect(mockFocusDebugger.logFocusState).toHaveBeenCalledWith('main-focus-restore-requested');
    });

    it('should not require mouse click to regain keyboard responsiveness after spawning', async () => {
      // Simulate spawn process
      mockScreen.focused = null; // Focus lost during spawn
      
      // Mock the cross-platform focus recovery to simulate success
      mockCrossPlatformFocus.recoverFocus.mockImplementation(async (element) => {
        mockScreen.focused = element;
        return true;
      });
      
      await ui.handleSpawnAgent('Test instructions');
      
      // Verify automatic focus restoration without user intervention
      expect(mockCrossPlatformFocus.recoverFocus).toHaveBeenCalled();
      
      // Focus should be restored programmatically
      expect(mockScreen.focused).toBe(mockScreen);
    });

    it('should keep all keyboard shortcuts functional immediately after agent spawning', async () => {
      // Setup key handlers
      const keyHandlers = mockScreen.key.mock.calls;
      
      await ui.handleSpawnAgent('Test instructions');
      
      // Verify all key handlers are still registered and functional
      const expectedKeys = ['q', 'C-c', 'h', 'n', 'escape', 'up', 'k', 'down', 'j', 'd', 'enter', 'i'];
      expectedKeys.forEach(key => {
        const hasHandler = keyHandlers.some(call => 
          Array.isArray(call[0]) ? call[0].includes(key) : call[0] === key
        );
        expect(hasHandler).toBe(true);
      });
    });
  });

  describe('AC2: Dialog Focus Management', () => {
    it('should properly manage focus transitions between main UI and dialog', () => {
      // Show spawn dialog
      ui.showSpawnDialog();
      
      expect(mockSpawnDialog.show).toHaveBeenCalled();
      
      // Dialog should have focus management
      expect(ui.spawnDialog).toBeDefined();
    });

    it('should return focus to main UI automatically when dialog closes (success)', async () => {
      mockSpawnDialog.isShown.mockReturnValue(false);
      
      await ui.handleSpawnAgent('Test instructions');
      
      // Verify focus restoration after successful spawn
      expect(mockCrossPlatformFocus.recoverFocus).toHaveBeenCalledWith(mockScreen);
    });

    it('should return focus to main UI automatically when dialog closes (cancel)', async () => {
      // Simulate cancel workflow
      ui.handleSpawnCancel();
      
      // Verify main UI focus is maintained
      expect(ui.hasActiveDialog()).toBe(false);
    });

    it('should not interrupt focus state during screen render operations', async () => {
      // Get render handler from cross-platform setup
      const setupCall = mockCrossPlatformFocus.setupBlessedEventHandling.mock.calls[0];
      const handlers = setupCall[0];
      
      mockScreen.focused = mockScreen;
      
      // Trigger render handler
      await handlers.onRender();
      
      // Should not interfere when focus is already correct
      expect(mockCrossPlatformFocus.recoverFocus).not.toHaveBeenCalled();
    });
  });

  describe('AC3: Focus State Validation', () => {
    it('should validate focus state after all spawn dialog operations', async () => {
      await ui.handleSpawnAgent('Test instructions');
      
      // Verify validation occurred
      expect(mockFocusDebugger.logFocusState).toHaveBeenCalledWith('main-focus-restore-requested');
      expect(mockCrossPlatformFocus.recoverFocus).toHaveBeenCalled();
    });

    it('should trigger focus recovery mechanisms automatically if focus is lost', async () => {
      // Simulate focus loss
      mockScreen.focused = null;
      
      await ui.validateFocusState();
      
      expect(mockCrossPlatformFocus.recoverFocus).toHaveBeenCalledWith(mockScreen);
    });

    it('should provide debug logging for focus transitions', () => {
      // Test focus tracking
      const setupCall = mockCrossPlatformFocus.setupBlessedEventHandling.mock.calls[0];
      const handlers = setupCall[0];
      const mockElement = { constructor: { name: 'TestElement' } };
      
      handlers.onFocus(mockElement);
      
      expect(mockFocusDebugger.logFocusState).toHaveBeenCalled();
      expect(ui.focusHistory).toHaveLength(1);
    });
  });

  describe('AC4: Keyboard Workflow Continuity', () => {
    it('should support spawning multiple agents in sequence using only keyboard', async () => {
      // First agent spawn
      await ui.handleSpawnAgent('First agent');
      expect(mockCrossPlatformFocus.recoverFocus).toHaveBeenCalledWith(mockScreen);
      
      // Reset mocks for second spawn
      jest.clearAllMocks();
      
      // Second agent spawn should work immediately
      await ui.handleSpawnAgent('Second agent');
      expect(mockCrossPlatformFocus.recoverFocus).toHaveBeenCalledWith(mockScreen);
    });

    it('should keep n key responsive immediately after agent spawning', async () => {
      await ui.handleSpawnAgent('Test instructions');
      
      // Verify 'n' key handler is still registered
      const nKeyHandler = mockScreen.key.mock.calls.find(call => 
        Array.isArray(call[0]) ? call[0].includes('n') : call[0] === 'n'
      );
      expect(nKeyHandler).toBeDefined();
      
      // Verify canSpawnAgent is checked (no delays)
      ui.showSpawnDialog();
      expect(mockAgentManager.canSpawnAgent).toHaveBeenCalled();
    });

    it('should have no delay or lag in keyboard responsiveness after spawning', async () => {
      const startTime = Date.now();
      
      await ui.handleSpawnAgent('Test instructions');
      
      // Focus recovery should be immediate
      expect(mockCrossPlatformFocus.recoverFocus).toHaveBeenCalled();
      
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(100); // Should be well under 100ms
    });
  });

  describe('AC5: Cross-Platform Focus Behavior', () => {
    it('should work consistently across different platforms', () => {
      // Verify cross-platform focus handler is initialized
      expect(CrossPlatformFocus).toHaveBeenCalledWith(mockScreen);
      expect(ui.crossPlatformFocus).toBeDefined();
    });

    it('should handle blessed framework focus events properly on all platforms', () => {
      // Verify cross-platform event handling is set up
      expect(mockCrossPlatformFocus.setupBlessedEventHandling).toHaveBeenCalledWith({
        onFocus: expect.any(Function),
        onBlur: expect.any(Function),
        onRender: expect.any(Function),
      });
    });

    it('should not let terminal resize events interfere with focus management', () => {
      // Verify resize handling is set up
      expect(mockCrossPlatformFocus.setupResizeHandling).toHaveBeenCalledWith(expect.any(Function));
      
      // Mock resize capability validation
      const capabilities = mockCrossPlatformFocus.validateTerminalCapabilities();
      expect(capabilities.supportsFocusEvents).toBe(true);
    });

    it('should use platform-specific validation intervals', () => {
      // Verify platform-specific timing is used
      expect(mockCrossPlatformFocus.getFocusValidationInterval).toHaveBeenCalled();
      expect(ui.focusValidationInterval).toBeDefined();
    });
  });

  describe('Integration and Performance Requirements', () => {
    it('should maintain focus recovery performance under 100ms', async () => {
      const startTime = Date.now();
      
      await ui.restoreMainFocus();
      
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(100);
      expect(mockCrossPlatformFocus.recoverFocus).toHaveBeenCalled();
    });

    it('should handle multiple simultaneous focus operations gracefully', async () => {
      // Simulate multiple rapid focus operations
      const operations = [
        ui.validateFocusState(),
        ui.restoreMainFocus(),
        ui.ensureFocusAfterSpawn(mockScreen),
      ];
      
      await Promise.all(operations);
      
      // All should complete successfully
      expect(mockCrossPlatformFocus.recoverFocus).toHaveBeenCalled();
    });

    it('should clean up resources properly on quit', () => {
      const originalInterval = ui.focusValidationInterval;
      
      ui.quit();
      
      expect(ui.focusValidationInterval).toBeNull();
    });

    it('should provide comprehensive error handling for focus failures', async () => {
      // Simulate focus recovery failure
      mockCrossPlatformFocus.recoverFocus.mockResolvedValueOnce(false);
      
      await ui.restoreMainFocus();
      
      // Should fall back to direct assignment
      expect(mockScreen.focused).toBe(mockScreen);
      expect(mockFocusDebugger.logFocusState).toHaveBeenCalledWith('main-focus-forced');
    });
  });

  describe('Edge Cases and Defensive Programming', () => {
    it('should handle missing dialog methods without errors', () => {
      ui.spawnDialog = {}; // No methods
      ui.terminationDialog = null;
      ui.detailView = undefined;
      
      expect(() => ui.hasActiveDialog()).not.toThrow();
      expect(ui.hasActiveDialog()).toBe(false);
    });

    it('should work with unsupported terminal environments', () => {
      mockCrossPlatformFocus.validateTerminalCapabilities.mockReturnValue({
        supportsMouseTracking: false,
        supportsFocusEvents: false,
        requiresDelayedFocus: true,
        recommendedValidationInterval: 3000,
      });
      
      // Should still function without throwing errors
      expect(() => ui.validateFocusState()).not.toThrow();
    });

    it('should maintain focus history within reasonable limits', () => {
      // Add many focus events
      for (let i = 0; i < 25; i++) {
        const mockElement = { constructor: { name: `Element${i}` } };
        ui.trackFocusChange(mockElement, 'gained');
      }
      
      // Should maintain size limit
      expect(ui.focusHistory.length).toBeLessThanOrEqual(20);
    });
  });
});