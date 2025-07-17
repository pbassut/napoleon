const blessed = require('blessed');
const AgentSpawnDialog = require('../src/ui/components/agent-spawn-dialog');

jest.mock('blessed');
jest.mock('../src/utils/logger');

describe('AgentSpawnDialog', () => {
  let dialog;
  let mockParent;
  let mockOnSpawn;
  let mockOnCancel;
  let mockScreen;
  let mockBox;
  let mockText;
  let mockTextarea;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockScreen = {
      render: jest.fn(),
      focus: jest.fn(),
    };

    mockBox = {
      show: jest.fn(),
      hide: jest.fn(),
      destroy: jest.fn(),
    };

    mockText = {
      setContent: jest.fn(),
      style: { fg: 'white' },
    };

    mockTextarea = {
      getValue: jest.fn(),
      setValue: jest.fn(),
      focus: jest.fn(),
      key: jest.fn(),
      on: jest.fn(),
      style: { border: { fg: 'gray' } },
    };

    mockParent = mockScreen;
    mockOnSpawn = jest.fn();
    mockOnCancel = jest.fn();

    blessed.box.mockReturnValue(mockBox);
    blessed.text.mockReturnValue(mockText);
    blessed.textarea.mockReturnValue(mockTextarea);

    dialog = new AgentSpawnDialog(mockParent, mockOnSpawn, mockOnCancel);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(dialog.parent).toBe(mockParent);
      expect(dialog.onSpawn).toBe(mockOnSpawn);
      expect(dialog.onCancel).toBe(mockOnCancel);
      expect(dialog.dialog).toBeNull();
      expect(dialog.textbox).toBeNull();
      expect(dialog.instructionsText).toBeNull();
      expect(dialog.isVisible).toBe(false);
      expect(dialog.activeTimers).toBeInstanceOf(Set);
    });
  });

  describe('create', () => {
    it('should create dialog components', () => {
      const createdDialog = dialog.create();

      expect(blessed.box).toHaveBeenCalledWith({
        parent: mockParent,
        label: ' Spawn New Agent ',
        top: 'center',
        left: 'center',
        width: 70,
        height: 18,
        border: { type: 'line' },
        style: {
          fg: 'white',
          bg: 'black',
          border: { fg: 'green' },
        },
        hidden: true,
        shadow: true,
      });

      expect(blessed.text).toHaveBeenCalledTimes(2); // Instructions and footer
      expect(blessed.textarea).toHaveBeenCalledWith({
        parent: mockBox,
        label: ' Agent Instructions ',
        top: 7,
        left: 2,
        width: '100%-4',
        height: 7,
        border: { type: 'line' },
        style: {
          fg: 'white',
          bg: 'black',
          border: { fg: 'gray' },
          focus: { border: { fg: 'green' } },
        },
        inputOnFocus: true,
        mouse: true,
        keys: true,
        vi: false,
        scrollable: true,
        alwaysScroll: true,
      });

      expect(createdDialog).toBe(mockBox);
    });

    it('should return existing dialog if already created', () => {
      dialog.create();
      const secondCall = dialog.create();
      
      expect(blessed.box).toHaveBeenCalledTimes(1);
      expect(secondCall).toBe(mockBox);
    });

    it('should set up event handlers', () => {
      dialog.create();
      
      expect(mockTextarea.key).toHaveBeenCalledWith(['C-s'], expect.any(Function));
      expect(mockTextarea.key).toHaveBeenCalledWith(['escape'], expect.any(Function));
      expect(mockTextarea.key).toHaveBeenCalledWith(['enter'], expect.any(Function));
      expect(mockTextarea.key).toHaveBeenCalledWith(['tab'], expect.any(Function));
      expect(mockTextarea.on).toHaveBeenCalledWith('focus', expect.any(Function));
      expect(mockTextarea.on).toHaveBeenCalledWith('blur', expect.any(Function));
      expect(mockTextarea.on).toHaveBeenCalledWith('submit', expect.any(Function));
    });
  });

  describe('show', () => {
    beforeEach(() => {
      dialog.create();
    });

    it('should show dialog and focus textbox', () => {
      dialog.footer = mockText; // Add footer mock
      dialog.show();

      expect(dialog.isVisible).toBe(true);
      expect(mockBox.show).toHaveBeenCalled();
      expect(mockTextarea.focus).toHaveBeenCalled();
      expect(mockTextarea.setValue).toHaveBeenCalledWith('');
      expect(mockText.setContent).toHaveBeenCalledWith('Press Ctrl+S to spawn agent | Escape to cancel');
      expect(mockText.style.fg).toBe('yellow');
      expect(mockParent.render).toHaveBeenCalled();
    });

    it('should create dialog if not already created', () => {
      const newDialog = new AgentSpawnDialog(mockParent, mockOnSpawn, mockOnCancel);
      newDialog.show();

      expect(blessed.box).toHaveBeenCalled();
      expect(newDialog.isVisible).toBe(true);
    });
  });

  describe('hide', () => {
    beforeEach(() => {
      dialog.create();
    });

    it('should hide dialog', () => {
      dialog.hide();

      expect(dialog.isVisible).toBe(false);
      expect(mockBox.hide).toHaveBeenCalled();
      expect(mockParent.render).toHaveBeenCalled();
    });

    it('should do nothing if dialog not created', () => {
      const newDialog = new AgentSpawnDialog(mockParent, mockOnSpawn, mockOnCancel);
      newDialog.hide();

      expect(mockBox.hide).not.toHaveBeenCalled();
    });
  });

  describe('handleSpawnAgent', () => {
    beforeEach(() => {
      dialog.create();
      dialog.footer = mockText;
    });

    it('should spawn agent with valid instructions', async () => {
      mockTextarea.getValue.mockReturnValue('Valid instructions for the agent');
      
      await dialog.handleSpawnAgent();

      expect(mockOnSpawn).toHaveBeenCalledWith('Valid instructions for the agent');
      expect(dialog.isVisible).toBe(false);
      expect(mockBox.hide).toHaveBeenCalled();
    });

    it('should show error for empty instructions', async () => {
      mockTextarea.getValue.mockReturnValue('');
      
      await dialog.handleSpawnAgent();

      expect(mockOnSpawn).not.toHaveBeenCalled();
      expect(mockText.setContent).toHaveBeenCalledWith('Error: Please enter instructions for the agent | Press Escape to cancel');
      expect(mockText.style.fg).toBe('red');
      expect(dialog.isVisible).toBe(false); // Dialog hides itself after error
    });

    it('should show error for instructions too short', async () => {
      mockTextarea.getValue.mockReturnValue('short');
      
      await dialog.handleSpawnAgent();

      expect(mockOnSpawn).not.toHaveBeenCalled();
      expect(mockText.setContent).toHaveBeenCalledWith('Error: Instructions must be at least 10 characters long | Press Escape to cancel');
      expect(mockText.style.fg).toBe('red');
    });

    it('should handle spawn callback errors', async () => {
      mockTextarea.getValue.mockReturnValue('Valid instructions for the agent');
      mockOnSpawn.mockRejectedValue(new Error('Spawn failed'));
      
      await dialog.handleSpawnAgent();

      expect(mockText.setContent).toHaveBeenCalledWith('Error: Failed to spawn agent: Spawn failed | Press Escape to cancel');
      expect(mockText.style.fg).toBe('red');
      expect(dialog.isVisible).toBe(false); // Dialog hides itself after error
    });

    it('should show processing message during spawn', async () => {
      mockTextarea.getValue.mockReturnValue('Valid instructions for the agent');
      mockOnSpawn.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      const spawnPromise = dialog.handleSpawnAgent();
      
      expect(mockText.setContent).toHaveBeenCalledWith('Creating git worktree and spawning agent...');
      expect(mockText.style.fg).toBe('yellow');
      
      jest.advanceTimersByTime(100);
      await spawnPromise;
    });
  });

  describe('handleCancel', () => {
    beforeEach(() => {
      dialog.create();
    });

    it('should hide dialog and call onCancel', () => {
      dialog.handleCancel();

      expect(dialog.isVisible).toBe(false);
      expect(mockBox.hide).toHaveBeenCalled();
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should work without onCancel callback', () => {
      const dialogWithoutCallback = new AgentSpawnDialog(mockParent, mockOnSpawn, null);
      dialogWithoutCallback.create();
      
      expect(() => dialogWithoutCallback.handleCancel()).not.toThrow();
    });
  });

  describe('showError', () => {
    beforeEach(() => {
      dialog.create();
      dialog.footer = mockText;
    });

    it('should display error message', () => {
      dialog.showError('Test error message');

      expect(mockText.setContent).toHaveBeenCalledWith('Error: Test error message | Press Escape to cancel');
      expect(mockText.style.fg).toBe('red');
      expect(mockParent.render).toHaveBeenCalled();
    });

    it('should reset error message after timeout', () => {
      dialog.isVisible = true;
      dialog.showError('Test error message');

      // Fast-forward time
      jest.advanceTimersByTime(3000);

      expect(mockText.setContent).toHaveBeenCalledWith('Press Ctrl+S to spawn agent | Escape to cancel');
      expect(mockText.style.fg).toBe('yellow');
    });

    it('should not reset message if dialog is hidden', () => {
      dialog.isVisible = false;
      dialog.showError('Test error message');

      jest.advanceTimersByTime(3000);

      expect(mockText.setContent).toHaveBeenCalledTimes(1); // Only the error message
    });

    it('should track timer for cleanup', () => {
      dialog.showError('Test error message');

      expect(dialog.activeTimers.size).toBe(1);

      jest.advanceTimersByTime(3000);

      expect(dialog.activeTimers.size).toBe(0);
    });
  });

  describe('getInstructions', () => {
    beforeEach(() => {
      dialog.create();
    });

    it('should return trimmed instructions', () => {
      mockTextarea.getValue.mockReturnValue('  Some instructions  ');
      
      const result = dialog.getInstructions();
      
      expect(result).toBe('Some instructions');
    });

    it('should return empty string if textbox not created', () => {
      const newDialog = new AgentSpawnDialog(mockParent, mockOnSpawn, mockOnCancel);
      
      const result = newDialog.getInstructions();
      
      expect(result).toBe('');
    });
  });

  describe('setInstructions', () => {
    beforeEach(() => {
      dialog.create();
    });

    it('should set instructions text', () => {
      dialog.setInstructions('New instructions');

      expect(mockTextarea.setValue).toHaveBeenCalledWith('New instructions');
      expect(mockParent.render).toHaveBeenCalled();
    });

    it('should do nothing if textbox not created', () => {
      const newDialog = new AgentSpawnDialog(mockParent, mockOnSpawn, mockOnCancel);
      
      expect(() => newDialog.setInstructions('test')).not.toThrow();
    });
  });

  describe('clearInstructions', () => {
    beforeEach(() => {
      dialog.create();
    });

    it('should clear instructions text', () => {
      dialog.clearInstructions();

      expect(mockTextarea.setValue).toHaveBeenCalledWith('');
      expect(mockParent.render).toHaveBeenCalled();
    });
  });

  describe('isShown', () => {
    it('should return visibility state', () => {
      expect(dialog.isShown()).toBe(false);
      
      dialog.isVisible = true;
      expect(dialog.isShown()).toBe(true);
    });
  });

  describe('destroy', () => {
    beforeEach(() => {
      dialog.create();
    });

    it('should clean up all resources', () => {
      dialog.destroy();

      expect(mockBox.destroy).toHaveBeenCalled();
      expect(dialog.dialog).toBeNull();
      expect(dialog.textbox).toBeNull();
      expect(dialog.instructionsText).toBeNull();
      expect(dialog.footer).toBeNull();
      expect(dialog.isVisible).toBe(false);
    });

    it('should clean up active timers', () => {
      // Add a timer to track
      const timerId = setTimeout(() => {}, 1000);
      dialog.activeTimers.add(timerId);
      
      dialog.destroy();

      expect(dialog.activeTimers.size).toBe(0);
    });

    it('should handle destroy when dialog not created', () => {
      const newDialog = new AgentSpawnDialog(mockParent, mockOnSpawn, mockOnCancel);
      
      expect(() => newDialog.destroy()).not.toThrow();
    });
  });

  describe('event handlers', () => {
    beforeEach(() => {
      dialog.create();
    });

    it('should handle Ctrl+S keypress', () => {
      const ctrlSHandler = mockTextarea.key.mock.calls.find(call => call[0][0] === 'C-s')[1];
      const handleSpawnSpy = jest.spyOn(dialog, 'handleSpawnAgent').mockImplementation(() => {});
      
      ctrlSHandler();
      
      expect(handleSpawnSpy).toHaveBeenCalled();
    });

    it('should handle Escape keypress', () => {
      const escapeHandler = mockTextarea.key.mock.calls.find(call => call[0][0] === 'escape')[1];
      const handleCancelSpy = jest.spyOn(dialog, 'handleCancel').mockImplementation(() => {});
      
      escapeHandler();
      
      expect(handleCancelSpy).toHaveBeenCalled();
    });

    it('should handle Enter keypress for newlines', () => {
      const enterHandler = mockTextarea.key.mock.calls.find(call => call[0][0] === 'enter')[1];
      mockTextarea.getValue.mockReturnValue('Current text');
      
      enterHandler();
      
      expect(mockTextarea.setValue).toHaveBeenCalledWith('Current text\n');
    });

    it('should handle Tab keypress for indentation', () => {
      const tabHandler = mockTextarea.key.mock.calls.find(call => call[0][0] === 'tab')[1];
      mockTextarea.getValue.mockReturnValue('Current text');
      
      tabHandler();
      
      expect(mockTextarea.setValue).toHaveBeenCalledWith('Current text  ');
    });

    it('should handle focus event', () => {
      const focusHandler = mockTextarea.on.mock.calls.find(call => call[0] === 'focus')[1];
      
      focusHandler();
      
      expect(mockTextarea.style.border.fg).toBe('green');
      expect(mockParent.render).toHaveBeenCalled();
    });

    it('should handle blur event', () => {
      const blurHandler = mockTextarea.on.mock.calls.find(call => call[0] === 'blur')[1];
      
      blurHandler();
      
      expect(mockTextarea.style.border.fg).toBe('gray');
      expect(mockParent.render).toHaveBeenCalled();
    });

    it('should handle submit event', () => {
      const submitHandler = mockTextarea.on.mock.calls.find(call => call[0] === 'submit')[1];
      const handleSpawnSpy = jest.spyOn(dialog, 'handleSpawnAgent').mockImplementation(() => {});
      
      submitHandler();
      
      expect(handleSpawnSpy).toHaveBeenCalled();
    });
  });
});