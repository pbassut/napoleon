const blessed = require('blessed');
const AgentTerminationDialog = require('../src/ui/components/agent-termination-dialog');
const logger = require('../src/utils/logger');

// Mock blessed components
jest.mock('blessed', () => ({
  screen: jest.fn(),
  box: jest.fn(),
  text: jest.fn(),
}));

// Mock logger
jest.mock('../src/utils/logger', () => ({
  debug: jest.fn(),
  error: jest.fn(),
}));

describe('AgentTerminationDialog', () => {
  let dialog;
  let mockParent;
  let mockOnConfirm;
  let mockOnCancel;
  let mockDialog;
  let mockAgentInfo;
  let mockConfirmButton;
  let mockCancelButton;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock parent
    mockParent = {
      render: jest.fn(),
    };

    // Create mock callbacks
    mockOnConfirm = jest.fn();
    mockOnCancel = jest.fn();

    // Create mock blessed components
    mockDialog = {
      show: jest.fn(),
      hide: jest.fn(),
      focus: jest.fn(),
      destroy: jest.fn(),
      key: jest.fn(),
      on: jest.fn(),
      style: {
        border: {
          fg: 'red',
        },
      },
    };

    mockAgentInfo = {
      setContent: jest.fn(),
      style: {
        fg: 'white',
      },
    };

    mockConfirmButton = {
      style: {
        border: {
          fg: 'gray',
        },
      },
    };

    mockCancelButton = {
      style: {
        border: {
          fg: 'green',
        },
      },
    };

    // Mock blessed.box to return different mocks based on label
    blessed.box.mockImplementation((options) => {
      if (options.label === ' Terminate Agent ') {
        return mockDialog;
      }
      if (options.content === ' [Y] Yes, terminate ') {
        return mockConfirmButton;
      }
      if (options.content === ' [N] No, cancel ') {
        return mockCancelButton;
      }
      return { style: { border: {} } };
    });

    blessed.text.mockReturnValue(mockAgentInfo);

    // Create dialog instance
    dialog = new AgentTerminationDialog(mockParent, mockOnConfirm, mockOnCancel);
  });
  
  afterEach(() => {
    // Clean up dialog instance
    if (dialog && typeof dialog.destroy === 'function') {
      dialog.destroy();
    }
    
    // Restore all mocks
    jest.restoreAllMocks();
  });


  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(dialog.parent).toBe(mockParent);
      expect(dialog.onConfirm).toBe(mockOnConfirm);
      expect(dialog.onCancel).toBe(mockOnCancel);
      expect(dialog.dialog).toBeNull();
      expect(dialog.isVisible).toBe(false);
      expect(dialog.selectedButton).toBe(0); // Default to cancel for safety
    });
  });

  describe('create', () => {
    it('should create dialog components', () => {
      const result = dialog.create();

      expect(blessed.box).toHaveBeenCalledWith(
        expect.objectContaining({
          parent: mockParent,
          label: ' Terminate Agent ',
          top: 'center',
          left: 'center',
          width: 60,
          height: 12,
          hidden: true,
        }),
      );

      expect(blessed.text).toHaveBeenCalledWith(
        expect.objectContaining({
          parent: mockDialog,
          top: 1,
          left: 2,
          width: '100%-4',
          height: 6,
        }),
      );

      expect(result).toBe(mockDialog);
    });

    it('should return existing dialog if already created', () => {
      dialog.create();
      const result = dialog.create();

      expect(result).toBe(mockDialog);
      expect(blessed.box).toHaveBeenCalledTimes(4); // Should not create new components
    });

    it('should set up event handlers', () => {
      dialog.create();

      expect(mockDialog.key).toHaveBeenCalledWith(['y', 'Y'], expect.any(Function));
      expect(mockDialog.key).toHaveBeenCalledWith(['n', 'N'], expect.any(Function));
      expect(mockDialog.key).toHaveBeenCalledWith(['escape'], expect.any(Function));
      expect(mockDialog.key).toHaveBeenCalledWith(['enter'], expect.any(Function));
      expect(mockDialog.key).toHaveBeenCalledWith(['tab', 'right'], expect.any(Function));
      expect(mockDialog.key).toHaveBeenCalledWith(['S-tab', 'left'], expect.any(Function));
    });
  });

  describe('show', () => {
    const mockAgent = {
      id: 'agent-123',
      name: 'Test Agent',
      status: 'running',
      sessionId: 'session-123',
      createdAt: new Date('2023-01-01T10:00:00Z'),
    };

    beforeEach(() => {
      dialog.create();
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2023-01-01T10:05:30Z')); // 5:30 after creation
    });


    it('should show dialog with agent information', () => {
      dialog.show(mockAgent);

      expect(mockDialog.show).toHaveBeenCalled();
      expect(mockDialog.focus).toHaveBeenCalled();
      expect(mockParent.render).toHaveBeenCalled();
      expect(dialog.isVisible).toBe(true);

      expect(mockAgentInfo.setContent).toHaveBeenCalledWith(
        expect.stringContaining('Are you sure you want to terminate Test Agent?'),
      );
      expect(mockAgentInfo.setContent).toHaveBeenCalledWith(
        expect.stringContaining('Status: running'),
      );
      expect(mockAgentInfo.setContent).toHaveBeenCalledWith(
        expect.stringContaining('Runtime: 5:30'),
      );
      expect(mockAgentInfo.setContent).toHaveBeenCalledWith(
        expect.stringContaining('Session ID: session-123'),
      );
    });

    it('should reset to default button selection (cancel)', () => {
      dialog.selectedButton = 1; // Set to confirm
      dialog.show(mockAgent);

      expect(dialog.selectedButton).toBe(0); // Should reset to cancel
    });

    it('should log debug message', () => {
      dialog.show(mockAgent);

      expect(logger.debug).toHaveBeenCalledWith('Agent termination dialog shown', {
        agentId: 'agent-123',
      });
    });

    it('should handle agent without name', () => {
      const agentWithoutName = { ...mockAgent, name: undefined };
      dialog.show(agentWithoutName);

      expect(mockAgentInfo.setContent).toHaveBeenCalledWith(
        expect.stringContaining('Are you sure you want to terminate agent-123?'),
      );
    });

    it('should handle agent without session ID', () => {
      const agentWithoutSessionId = { ...mockAgent, sessionId: undefined };
      dialog.show(agentWithoutSessionId);

      expect(mockAgentInfo.setContent).toHaveBeenCalledWith(
        expect.stringContaining('Session ID: agent-123'),
      );
    });
  });

  describe('hide', () => {
    beforeEach(() => {
      dialog.create();
    });

    it('should hide dialog', () => {
      dialog.isVisible = true;
      dialog.hide();

      expect(mockDialog.hide).toHaveBeenCalled();
      expect(mockParent.render).toHaveBeenCalled();
      expect(dialog.isVisible).toBe(false);
    });

    it('should log debug message', () => {
      dialog.hide();

      expect(logger.debug).toHaveBeenCalledWith('Agent termination dialog hidden');
    });
  });

  describe('handleConfirm', () => {
    beforeEach(() => {
      dialog.create();
    });

    it('should call onConfirm callback and hide dialog', async () => {
      await dialog.handleConfirm();

      expect(mockOnConfirm).toHaveBeenCalled();
      expect(mockDialog.hide).toHaveBeenCalled();
      expect(mockParent.render).toHaveBeenCalled();
    });

    it('should log debug message', async () => {
      await dialog.handleConfirm();

      expect(logger.debug).toHaveBeenCalledWith('Agent termination confirmed');
    });

    it('should handle errors in onConfirm callback', async () => {
      const error = new Error('Termination failed');
      mockOnConfirm.mockRejectedValue(error);

      await dialog.handleConfirm();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to handle termination confirmation',
        { error: error.message },
      );
    });
  });

  describe('handleCancel', () => {
    beforeEach(() => {
      dialog.create();
    });

    it('should call onCancel callback and hide dialog', () => {
      dialog.handleCancel();

      expect(mockOnCancel).toHaveBeenCalled();
      expect(mockDialog.hide).toHaveBeenCalled();
      expect(mockParent.render).toHaveBeenCalled();
    });

    it('should log debug message', () => {
      dialog.handleCancel();

      expect(logger.debug).toHaveBeenCalledWith('Agent termination cancelled');
    });
  });

  describe('updateButtonSelection', () => {
    beforeEach(() => {
      dialog.create();
    });

    it('should highlight cancel button when selectedButton is 0', () => {
      dialog.selectedButton = 0;
      dialog.updateButtonSelection();

      expect(mockCancelButton.style.border.fg).toBe('green');
      expect(mockConfirmButton.style.border.fg).toBe('gray');
      expect(mockParent.render).toHaveBeenCalled();
    });

    it('should highlight confirm button when selectedButton is 1', () => {
      dialog.selectedButton = 1;
      dialog.updateButtonSelection();

      expect(mockCancelButton.style.border.fg).toBe('gray');
      expect(mockConfirmButton.style.border.fg).toBe('red');
      expect(mockParent.render).toHaveBeenCalled();
    });
  });

  describe('formatRuntime', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2023-01-01T10:05:30Z'));
    });


    it('should format runtime in MM:SS format for times under 1 hour', () => {
      const createdAt = new Date('2023-01-01T10:00:00Z'); // 5:30 ago
      const runtime = dialog.formatRuntime(createdAt);

      expect(runtime).toBe('5:30');
    });

    it('should format runtime in H:MM:SS format for times over 1 hour', () => {
      const createdAt = new Date('2023-01-01T08:30:00Z'); // 1:35:30 ago
      const runtime = dialog.formatRuntime(createdAt);

      expect(runtime).toBe('1:35:30');
    });

    it('should return "Unknown" for invalid dates', () => {
      expect(dialog.formatRuntime(null)).toBe('Unknown');
      expect(dialog.formatRuntime(undefined)).toBe('Unknown');
      expect(dialog.formatRuntime('invalid')).toBe('Unknown');
    });

    it('should return "Unknown" for future dates', () => {
      const futureDate = new Date('2023-01-01T11:00:00Z');
      const runtime = dialog.formatRuntime(futureDate);

      expect(runtime).toBe('Unknown');
    });
  });

  describe('showError', () => {
    beforeEach(() => {
      dialog.create();
      jest.useFakeTimers();
    });


    it('should display error message', () => {
      dialog.showError('Test error message');

      expect(mockAgentInfo.setContent).toHaveBeenCalledWith(
        'Error: Test error message\n\nPress Escape to cancel',
      );
      expect(mockAgentInfo.style.fg).toBe('red');
      expect(mockParent.render).toHaveBeenCalled();
    });

    it('should reset error message after 3 seconds', () => {
      dialog.isVisible = true;
      dialog.showError('Test error message');

      jest.advanceTimersByTime(3000);

      expect(mockAgentInfo.style.fg).toBe('white');
      expect(mockParent.render).toHaveBeenCalledTimes(2);
    });

    it('should not reset if dialog is not visible', () => {
      dialog.isVisible = false;
      dialog.showError('Test error message');

      jest.advanceTimersByTime(3000);

      expect(mockAgentInfo.style.fg).toBe('red'); // Should remain red
      expect(mockParent.render).toHaveBeenCalledTimes(1);
    });
  });

  describe('isShown', () => {
    it('should return current visibility state', () => {
      expect(dialog.isShown()).toBe(false);

      dialog.isVisible = true;
      expect(dialog.isShown()).toBe(true);
    });
  });

  describe('destroy', () => {
    beforeEach(() => {
      dialog.create();
      jest.useFakeTimers();
    });


    it('should destroy dialog and clean up resources', () => {
      // Add some timers to clean up
      dialog.showError('Test error');

      dialog.destroy();

      expect(mockDialog.destroy).toHaveBeenCalled();
      expect(dialog.dialog).toBeNull();
      expect(dialog.agentInfo).toBeNull();
      expect(dialog.confirmButton).toBeNull();
      expect(dialog.cancelButton).toBeNull();
      expect(dialog.isVisible).toBe(false);
    });

    it('should clean up active timers', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      // Add some timers
      dialog.showError('Test error');
      
      dialog.destroy();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should handle destroy when dialog is null', () => {
      dialog.dialog = null;
      
      expect(() => dialog.destroy()).not.toThrow();
    });
  });
});