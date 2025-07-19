const blessed = require('blessed');
const TerminalUI = require('../src/ui/index');
const { loadConfig } = require('../src/core/config');
const AgentManager = require('../src/core/agent-manager');
const AgentSpawnDialog = require('../src/ui/components/agent-spawn-dialog');
const AgentTerminationDialog = require('../src/ui/components/agent-termination-dialog');
const AgentDetailView = require('../src/ui/components/agent-detail-view');

jest.mock('blessed');
jest.mock('../src/core/config');
jest.mock('../src/core/agent-manager');
jest.mock('../src/utils/logger');
jest.mock('../src/ui/components/agent-spawn-dialog');
jest.mock('../src/ui/components/agent-termination-dialog');
jest.mock('../src/ui/components/agent-detail-view');

describe('Terminal UI', () => {
  let ui;
  let mockScreen;
  let mockBox;
  let mockText;
  let mockList;
  let mockTextarea;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Mock blessed components
    mockScreen = {
      key: jest.fn(),
      on: jest.fn(),
      render: jest.fn(),
      destroy: jest.fn(),
      focus: jest.fn(),
      width: 80,
      height: 24,
    };

    mockBox = {
      setContent: jest.fn(),
      style: {},
      show: jest.fn(),
      hide: jest.fn(),
      scroll: jest.fn(),
    };

    mockText = {
      setContent: jest.fn(),
      style: {},
      show: jest.fn(),
      hide: jest.fn(),
    };

    mockList = {
      setItems: jest.fn(),
      select: jest.fn(),
      children: [],
      show: jest.fn(),
      hide: jest.fn(),
      on: jest.fn(),
      key: jest.fn(),
      focus: jest.fn(),
    };

    mockTextarea = {
      getValue: jest.fn().mockReturnValue(''),
      setValue: jest.fn(),
      show: jest.fn(),
      hide: jest.fn(),
      focus: jest.fn(),
      on: jest.fn(),
      key: jest.fn(),
      style: { border: { fg: 'gray' } },
    };

    blessed.screen.mockReturnValue(mockScreen);
    blessed.box.mockReturnValue(mockBox);
    blessed.text.mockReturnValue(mockText);
    blessed.list.mockReturnValue(mockList);
    blessed.textarea.mockReturnValue(mockTextarea);

    // Mock AgentManager
    const mockAgentManager = {
      initialize: jest.fn().mockResolvedValue(),
      getActiveAgents: jest.fn().mockReturnValue([]),
      spawnAgent: jest.fn().mockResolvedValue({ id: 'test-agent', status: 'running' }),
      canSpawnAgent: jest.fn().mockReturnValue(true),
      maxAgents: 3,
      getAgentRuntime: jest.fn().mockReturnValue(300),
      formatRuntime: jest.fn().mockReturnValue('05min'),
    };
    AgentManager.mockImplementation(() => mockAgentManager);

    // Mock dialog components
    AgentSpawnDialog.mockImplementation(() => ({
      destroy: jest.fn(),
    }));
    
    AgentTerminationDialog.mockImplementation(() => ({
      destroy: jest.fn(),
    }));
    
    AgentDetailView.mockImplementation(() => ({
      destroy: jest.fn(),
    }));

    loadConfig.mockReturnValue({
      maxAgents: 3,
      logLevel: 'info',
    });

    ui = new TerminalUI();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize blessed screen with correct options', async () => {
      await ui.initialize();

      expect(blessed.screen).toHaveBeenCalledWith(expect.objectContaining({
        smartCSR: true,
        title: 'Napoleon',
        cursor: {
          artificial: true,
          shape: 'line',
          blink: true,
        },
        dockBorders: true,
        ignoreLocked: ['C-c'],
        warnings: false,
      }));
    });

    it('should load configuration during initialization', async () => {
      await ui.initialize();

      expect(loadConfig).toHaveBeenCalled();
      expect(ui.config).toEqual({
        maxAgents: 3,
        logLevel: 'info',
      });
    });

    it('should create all UI components', async () => {
      await ui.initialize();

      // Should create header, content, footer, and help overlay (dialog components are mocked)
      expect(blessed.box).toHaveBeenCalledTimes(4);
      expect(blessed.text).toHaveBeenCalled();
    });

    it('should set up event handlers', async () => {
      await ui.initialize();

      expect(mockScreen.key).toHaveBeenCalledWith(['q', 'C-c'], expect.any(Function));
      expect(mockScreen.key).toHaveBeenCalledWith(['h'], expect.any(Function));
      expect(mockScreen.key).toHaveBeenCalledWith(['escape'], expect.any(Function));
      expect(mockScreen.on).toHaveBeenCalledWith('keypress', expect.any(Function));
      expect(mockScreen.on).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(mockScreen.on).toHaveBeenCalledWith('mouse', expect.any(Function));
    });

    it('should render the screen after initialization', async () => {
      await ui.initialize();

      expect(mockScreen.render).toHaveBeenCalled();
    });
  });

  describe('keyboard shortcuts', () => {
    beforeEach(async () => {
      await ui.initialize();
    });

    it('should handle quit key (q)', () => {
      const quitSpy = jest.spyOn(ui, 'quit').mockImplementation(() => {});

      // Get the quit handler
      const quitHandler = mockScreen.key.mock.calls.find(
        call => call[0].includes('q')
      )[1];

      quitHandler();

      expect(quitSpy).toHaveBeenCalled();
    });

    it('should handle help key (h)', () => {
      const helpSpy = jest.spyOn(ui, 'toggleHelp').mockImplementation(() => {});

      // Get the help handler
      const helpHandler = mockScreen.key.mock.calls.find(
        call => call[0].includes('h')
      )[1];

      helpHandler();

      expect(helpSpy).toHaveBeenCalled();
    });

    it('should handle escape key', () => {
      const helpSpy = jest.spyOn(ui, 'toggleHelp').mockImplementation(() => {});
      ui.showingHelp = true;

      // Get the escape handler
      const escapeHandler = mockScreen.key.mock.calls.find(
        call => call[0].includes('escape')
      )[1];

      escapeHandler();

      expect(helpSpy).toHaveBeenCalled();
    });
  });

  describe('help system', () => {
    beforeEach(async () => {
      await ui.initialize();
      ui.helpOverlay = mockBox;
    });

    it('should show help overlay when toggled', () => {
      ui.showingHelp = false;

      ui.toggleHelp();

      expect(ui.showingHelp).toBe(true);
      expect(mockBox.show).toHaveBeenCalled();
      expect(mockScreen.render).toHaveBeenCalled();
    });

    it('should hide help overlay when toggled again', () => {
      ui.showingHelp = true;

      ui.toggleHelp();

      expect(ui.showingHelp).toBe(false);
      expect(mockBox.hide).toHaveBeenCalled();
      expect(mockScreen.render).toHaveBeenCalled();
    });
  });

  describe('status updates', () => {
    beforeEach(async () => {
      await ui.initialize();
      ui.statusText = mockText;
    });

    it('should update status message', () => {
      const message = 'Agent running';
      const style = { fg: 'green' };

      ui.updateStatus(message, style);

      expect(mockText.setContent).toHaveBeenCalledWith(message);
      expect(mockText.style).toEqual(expect.objectContaining(style));
      expect(mockScreen.render).toHaveBeenCalled();
    });

    it('should use default style if none provided', () => {
      const message = 'Test message';

      ui.updateStatus(message);

      expect(mockText.setContent).toHaveBeenCalledWith(message);
      expect(mockText.style).toEqual(expect.objectContaining({
        fg: 'yellow',
        bold: true,
      }));
    });
  });

  describe('resize handling', () => {
    beforeEach(async () => {
      await ui.initialize();
    });

    it('should handle resize events', () => {
      const renderSpy = jest.spyOn(ui, 'render').mockImplementation(() => {});

      ui.handleResize();

      expect(renderSpy).toHaveBeenCalled();
    });

    it('should get screen dimensions', () => {
      const dimensions = ui.getScreenDimensions();

      expect(dimensions).toEqual({
        width: 80,
        height: 24,
      });
    });

    it('should check terminal requirements', () => {
      // Test with adequate size
      expect(ui.checkTerminalRequirements()).toBe(true);

      // Test with inadequate size
      mockScreen.width = 60;
      mockScreen.height = 20;
      expect(ui.checkTerminalRequirements()).toBe(false);
    });
  });

  describe('cleanup and quit', () => {
    beforeEach(async () => {
      await ui.initialize();
      // Mock process.exit to prevent actual exit
      jest.spyOn(process, 'exit').mockImplementation(() => {});
      jest.spyOn(process.stdout, 'write').mockImplementation(() => {});
    });

    it('should destroy screen on quit', () => {
      ui.quit();

      expect(mockScreen.destroy).toHaveBeenCalled();
    });

    it('should restore terminal state on quit', () => {
      ui.quit();

      expect(process.stdout.write).toHaveBeenCalledWith('\x1b[?1000l');
      expect(process.stdout.write).toHaveBeenCalledWith('\x1b[?1002l');
    });

    it('should exit process on quit', () => {
      ui.quit();

      expect(process.exit).toHaveBeenCalledWith(0);
    });
  });

  describe('mouse events', () => {
    beforeEach(async () => {
      await ui.initialize();
      ui.content = mockBox;
    });

    it('should handle mouse wheel up', () => {
      const renderSpy = jest.spyOn(ui, 'render').mockImplementation(() => {});

      // Get the mouse handler
      const mouseHandler = mockScreen.on.mock.calls.find(
        call => call[0] === 'mouse'
      )[1];

      mouseHandler({ action: 'wheelup' });

      expect(mockBox.scroll).toHaveBeenCalledWith(-3);
      expect(renderSpy).toHaveBeenCalled();
    });

    it('should handle mouse wheel down', () => {
      const renderSpy = jest.spyOn(ui, 'render').mockImplementation(() => {});

      // Get the mouse handler
      const mouseHandler = mockScreen.on.mock.calls.find(
        call => call[0] === 'mouse'
      )[1];

      mouseHandler({ action: 'wheeldown' });

      expect(mockBox.scroll).toHaveBeenCalledWith(3);
      expect(renderSpy).toHaveBeenCalled();
    });
  });
});