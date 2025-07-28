/**
 * Tests for UI Test Assertions Helper
 */

import { UIAssertions, createAssertions } from '../../../src/ui-tests/helpers/assertions';
import { OutputParser } from '../../../src/ui-tests/framework/OutputParser';
import { ProcessManager } from '../../../src/ui-tests/framework/ProcessManager';

// Mock dependencies
jest.mock('../../../src/ui-tests/framework/OutputParser');
jest.mock('../../../src/ui-tests/framework/ProcessManager');

describe('UIAssertions', () => {
  let uiAssertions: UIAssertions;
  let mockOutputParser: jest.Mocked<OutputParser>;
  let mockProcessManager: jest.Mocked<ProcessManager>;
  const testPid = 12345;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOutputParser = {
      findInOutput: jest.fn(),
      extractAgentList: jest.fn(),
      extractDialogContent: jest.fn(),
      findSelectedItem: jest.fn(),
      extractErrorMessage: jest.fn(),
      hasScrollIndicator: jest.fn(),
      extractProgressIndicator: jest.fn(),
    } as any as jest.Mocked<OutputParser>;

    mockProcessManager = {
      waitForOutput: jest.fn(),
      readProcessOutput: jest.fn(),
    } as any as jest.Mocked<ProcessManager>;

    uiAssertions = new UIAssertions(mockOutputParser, mockProcessManager);
  });

  describe('Constructor', () => {
    it('should create instance with dependencies', () => {
      expect(uiAssertions).toBeInstanceOf(UIAssertions);
      expect((uiAssertions as any).outputParser).toBe(mockOutputParser);
      expect((uiAssertions as any).processManager).toBe(mockProcessManager);
    });
  });

  describe('assertTextInOutput', () => {
    it('should pass when expected text is found in output', async () => {
      const expectedText = 'Hello World';
      const mockOutput = 'Some output containing Hello World text';
      
      mockProcessManager.waitForOutput.mockResolvedValue(mockOutput);
      mockOutputParser.findInOutput.mockReturnValue(true);

      await expect(uiAssertions.assertTextInOutput(testPid, expectedText)).resolves.toBeUndefined();
      
      expect(mockProcessManager.waitForOutput).toHaveBeenCalledWith(testPid, expectedText, 5000);
      expect(mockOutputParser.findInOutput).toHaveBeenCalledWith(mockOutput, expectedText);
    });

    it('should use custom timeout', async () => {
      const expectedText = 'Hello World';
      const customTimeout = 10000;
      const mockOutput = 'Output';
      
      mockProcessManager.waitForOutput.mockResolvedValue(mockOutput);
      mockOutputParser.findInOutput.mockReturnValue(true);

      await uiAssertions.assertTextInOutput(testPid, expectedText, customTimeout);
      
      expect(mockProcessManager.waitForOutput).toHaveBeenCalledWith(testPid, expectedText, customTimeout);
    });

    it('should throw error when expected text is not found', async () => {
      const expectedText = 'Missing Text';
      const mockOutput = 'Different output without the expected text';
      
      mockProcessManager.waitForOutput.mockResolvedValue(mockOutput);
      mockOutputParser.findInOutput.mockReturnValue(false);

      await expect(uiAssertions.assertTextInOutput(testPid, expectedText))
        .rejects.toThrow('Expected text "Missing Text" not found in output');
    });

    it('should propagate process manager errors', async () => {
      const expectedText = 'Test';
      const error = new Error('Process timeout');
      
      mockProcessManager.waitForOutput.mockRejectedValue(error);

      await expect(uiAssertions.assertTextInOutput(testPid, expectedText))
        .rejects.toThrow('Process timeout');
    });
  });

  describe('assertPatternInOutput', () => {
    it('should pass when pattern matches output', async () => {
      const pattern = /Hello \d+/;
      const mockOutput = 'Hello 123 World';
      
      mockProcessManager.waitForOutput.mockResolvedValue(mockOutput);
      mockOutputParser.findInOutput.mockReturnValue(true);

      await expect(uiAssertions.assertPatternInOutput(testPid, pattern)).resolves.toBeUndefined();
      
      expect(mockProcessManager.waitForOutput).toHaveBeenCalledWith(testPid, pattern, 5000);
      expect(mockOutputParser.findInOutput).toHaveBeenCalledWith(mockOutput, pattern);
    });

    it('should use custom timeout for pattern matching', async () => {
      const pattern = /test/i;
      const customTimeout = 8000;
      const mockOutput = 'TEST output';
      
      mockProcessManager.waitForOutput.mockResolvedValue(mockOutput);
      mockOutputParser.findInOutput.mockReturnValue(true);

      await uiAssertions.assertPatternInOutput(testPid, pattern, customTimeout);
      
      expect(mockProcessManager.waitForOutput).toHaveBeenCalledWith(testPid, pattern, customTimeout);
    });

    it('should throw error when pattern does not match', async () => {
      const pattern = /nonexistent/;
      const mockOutput = 'Different output';
      
      mockProcessManager.waitForOutput.mockResolvedValue(mockOutput);
      mockOutputParser.findInOutput.mockReturnValue(false);

      await expect(uiAssertions.assertPatternInOutput(testPid, pattern))
        .rejects.toThrow('Pattern /nonexistent/ not found in output');
    });

    it('should handle complex regex patterns', async () => {
      const pattern = /^Error:\s+\w+\s+failed$/;
      const mockOutput = 'Error: operation failed';
      
      mockProcessManager.waitForOutput.mockResolvedValue(mockOutput);
      mockOutputParser.findInOutput.mockReturnValue(true);

      await expect(uiAssertions.assertPatternInOutput(testPid, pattern)).resolves.toBeUndefined();
    });
  });

  describe('assertAgentExists', () => {
    it('should pass when agent with matching prompt exists', async () => {
      const prompt = 'test task';
      const mockOutput = 'Agent list output';
      const mockAgents = [
        { id: '1', prompt: 'test task description', status: 'running' },
        { id: '2', prompt: 'other task', status: 'completed' }
      ];
      
      mockProcessManager.readProcessOutput.mockResolvedValue(mockOutput);
      mockOutputParser.extractAgentList.mockReturnValue(mockAgents);

      await expect(uiAssertions.assertAgentExists(testPid, prompt)).resolves.toBeUndefined();
      
      expect(mockProcessManager.readProcessOutput).toHaveBeenCalledWith(testPid, 1000);
      expect(mockOutputParser.extractAgentList).toHaveBeenCalledWith(mockOutput);
    });

    it('should throw error when no matching agent found', async () => {
      const prompt = 'missing task';
      const mockOutput = 'Agent list output';
      const mockAgents = [
        { id: '1', prompt: 'different task', status: 'running' },
        { id: '2', prompt: 'another task', status: 'completed' }
      ];
      
      mockProcessManager.readProcessOutput.mockResolvedValue(mockOutput);
      mockOutputParser.extractAgentList.mockReturnValue(mockAgents);

      await expect(uiAssertions.assertAgentExists(testPid, prompt))
        .rejects.toThrow('Agent with prompt "missing task" not found. Found agents: [{"id":"1","prompt":"different task","status":"running"},{"id":"2","prompt":"another task","status":"completed"}]');
    });

    it('should handle empty agent list', async () => {
      const prompt = 'any task';
      const mockOutput = 'Empty output';
      const mockAgents: any[] = [];
      
      mockProcessManager.readProcessOutput.mockResolvedValue(mockOutput);
      mockOutputParser.extractAgentList.mockReturnValue(mockAgents);

      await expect(uiAssertions.assertAgentExists(testPid, prompt))
        .rejects.toThrow('Agent with prompt "any task" not found. Found agents: []');
    });

    it('should match partial prompt strings', async () => {
      const prompt = 'analyze';
      const mockOutput = 'Agent list';
      const mockAgents = [
        { id: '1', prompt: 'analyze data from file.csv', status: 'running' }
      ];
      
      mockProcessManager.readProcessOutput.mockResolvedValue(mockOutput);
      mockOutputParser.extractAgentList.mockReturnValue(mockAgents);

      await expect(uiAssertions.assertAgentExists(testPid, prompt)).resolves.toBeUndefined();
    });
  });

  describe('assertAgentCount', () => {
    it('should pass when agent count matches expected', async () => {
      const expectedCount = 3;
      const mockOutput = 'Agent list output';
      const mockAgents = [
        { id: '1', prompt: 'task 1', status: 'running' },
        { id: '2', prompt: 'task 2', status: 'completed' },
        { id: '3', prompt: 'task 3', status: 'pending' }
      ];
      
      mockProcessManager.readProcessOutput.mockResolvedValue(mockOutput);
      mockOutputParser.extractAgentList.mockReturnValue(mockAgents);

      await expect(uiAssertions.assertAgentCount(testPid, expectedCount)).resolves.toBeUndefined();
    });

    it('should throw error when agent count does not match', async () => {
      const expectedCount = 2;
      const mockOutput = 'Agent list output';
      const mockAgents = [
        { id: '1', prompt: 'task 1', status: 'running' }
      ];
      
      mockProcessManager.readProcessOutput.mockResolvedValue(mockOutput);
      mockOutputParser.extractAgentList.mockReturnValue(mockAgents);

      await expect(uiAssertions.assertAgentCount(testPid, expectedCount))
        .rejects.toThrow('Expected 2 agents, but found 1');
    });

    it('should handle zero agent count', async () => {
      const expectedCount = 0;
      const mockOutput = 'No agents';
      const mockAgents: any[] = [];
      
      mockProcessManager.readProcessOutput.mockResolvedValue(mockOutput);
      mockOutputParser.extractAgentList.mockReturnValue(mockAgents);

      await expect(uiAssertions.assertAgentCount(testPid, expectedCount)).resolves.toBeUndefined();
    });
  });

  describe('assertDialogOpen', () => {
    it('should pass when dialog is open', async () => {
      const mockOutput = 'UI with dialog';
      const mockDialogContent = '┌─ Dialog Title ─┐\n│ Content here   │\n└────────────────┘';
      
      mockProcessManager.readProcessOutput.mockResolvedValue(mockOutput);
      mockOutputParser.extractDialogContent.mockReturnValue(mockDialogContent);

      await expect(uiAssertions.assertDialogOpen(testPid)).resolves.toBeUndefined();
      
      expect(mockProcessManager.readProcessOutput).toHaveBeenCalledWith(testPid, 500);
      expect(mockOutputParser.extractDialogContent).toHaveBeenCalledWith(mockOutput);
    });

    it('should throw error when no dialog is found', async () => {
      const mockOutput = 'UI without dialog';
      
      mockProcessManager.readProcessOutput.mockResolvedValue(mockOutput);
      mockOutputParser.extractDialogContent.mockReturnValue(null);

      await expect(uiAssertions.assertDialogOpen(testPid))
        .rejects.toThrow('Expected dialog to be open, but no dialog found');
    });

    it('should handle empty dialog content', async () => {
      const mockOutput = 'UI output';
      
      mockProcessManager.readProcessOutput.mockResolvedValue(mockOutput);
      mockOutputParser.extractDialogContent.mockReturnValue('');

      await expect(uiAssertions.assertDialogOpen(testPid))
        .rejects.toThrow('Expected dialog to be open, but no dialog found');
    });
  });

  describe('assertDialogClosed', () => {
    it('should pass when no dialog is present', async () => {
      const mockOutput = 'UI without dialog';
      
      mockProcessManager.readProcessOutput.mockResolvedValue(mockOutput);
      mockOutputParser.extractDialogContent.mockReturnValue(null);

      await expect(uiAssertions.assertDialogClosed(testPid)).resolves.toBeUndefined();
    });

    it('should throw error when dialog is still open', async () => {
      const mockOutput = 'UI with dialog';
      const mockDialogContent = '┌─ Dialog ─┐\n│ Content  │\n└──────────┘';
      
      mockProcessManager.readProcessOutput.mockResolvedValue(mockOutput);
      mockOutputParser.extractDialogContent.mockReturnValue(mockDialogContent);

      await expect(uiAssertions.assertDialogClosed(testPid))
        .rejects.toThrow('Expected dialog to be closed, but dialog is still open');
    });

    it('should handle empty string as closed dialog', async () => {
      const mockOutput = 'UI output';
      
      mockProcessManager.readProcessOutput.mockResolvedValue(mockOutput);
      mockOutputParser.extractDialogContent.mockReturnValue('');

      await expect(uiAssertions.assertDialogClosed(testPid)).resolves.toBeUndefined();
    });
  });

  describe('assertSelectedItem', () => {
    it('should pass when expected item is selected', async () => {
      const expectedItem = 'Option 1';
      const mockOutput = 'Menu output';
      const mockSelectedItem = '▶ Option 1 - Description';
      
      mockProcessManager.readProcessOutput.mockResolvedValue(mockOutput);
      mockOutputParser.findSelectedItem.mockReturnValue(mockSelectedItem);

      await expect(uiAssertions.assertSelectedItem(testPid, expectedItem)).resolves.toBeUndefined();
      
      expect(mockProcessManager.readProcessOutput).toHaveBeenCalledWith(testPid, 100);
      expect(mockOutputParser.findSelectedItem).toHaveBeenCalledWith(mockOutput);
    });

    it('should throw error when no item is selected', async () => {
      const expectedItem = 'Option 1';
      const mockOutput = 'Menu without selection';
      
      mockProcessManager.readProcessOutput.mockResolvedValue(mockOutput);
      mockOutputParser.findSelectedItem.mockReturnValue(null);

      await expect(uiAssertions.assertSelectedItem(testPid, expectedItem))
        .rejects.toThrow('No selected item found');
    });

    it('should throw error when different item is selected', async () => {
      const expectedItem = 'Option 1';
      const mockOutput = 'Menu output';
      const mockSelectedItem = '▶ Option 2 - Different';
      
      mockProcessManager.readProcessOutput.mockResolvedValue(mockOutput);
      mockOutputParser.findSelectedItem.mockReturnValue(mockSelectedItem);

      await expect(uiAssertions.assertSelectedItem(testPid, expectedItem))
        .rejects.toThrow('Expected selected item to contain "Option 1", but found "▶ Option 2 - Different"');
    });

    it('should handle partial matches in selected item', async () => {
      const expectedItem = 'Create';
      const mockOutput = 'Menu';
      const mockSelectedItem = '▶ Create new file';
      
      mockProcessManager.readProcessOutput.mockResolvedValue(mockOutput);
      mockOutputParser.findSelectedItem.mockReturnValue(mockSelectedItem);

      await expect(uiAssertions.assertSelectedItem(testPid, expectedItem)).resolves.toBeUndefined();
    });
  });

  describe('assertNoErrors', () => {
    it('should pass when no errors are found', async () => {
      const mockOutput = 'Normal output without errors';
      
      mockProcessManager.readProcessOutput.mockResolvedValue(mockOutput);
      mockOutputParser.extractErrorMessage.mockReturnValue(null);

      await expect(uiAssertions.assertNoErrors(testPid)).resolves.toBeUndefined();
      
      expect(mockProcessManager.readProcessOutput).toHaveBeenCalledWith(testPid, 500);
      expect(mockOutputParser.extractErrorMessage).toHaveBeenCalledWith(mockOutput);
    });

    it('should throw error when error message is found', async () => {
      const mockOutput = 'Output with error';
      const mockErrorMessage = 'Error: Something went wrong\nDetails about the error';
      
      mockProcessManager.readProcessOutput.mockResolvedValue(mockOutput);
      mockOutputParser.extractErrorMessage.mockReturnValue(mockErrorMessage);

      await expect(uiAssertions.assertNoErrors(testPid))
        .rejects.toThrow('Unexpected error found: Error: Something went wrong\nDetails about the error');
    });

    it('should handle empty error messages', async () => {
      const mockOutput = 'Output';
      
      mockProcessManager.readProcessOutput.mockResolvedValue(mockOutput);
      mockOutputParser.extractErrorMessage.mockReturnValue('');

      await expect(uiAssertions.assertNoErrors(testPid)).resolves.toBeUndefined();
    });
  });

  describe('assertScrollIndicator', () => {
    it('should pass when expected scroll indicator is present', async () => {
      const mockOutput = 'UI with scroll indicator';
      
      mockProcessManager.readProcessOutput.mockResolvedValue(mockOutput);
      mockOutputParser.hasScrollIndicator.mockReturnValue(true);

      await expect(uiAssertions.assertScrollIndicator(testPid, 'top', true)).resolves.toBeUndefined();
      
      expect(mockProcessManager.readProcessOutput).toHaveBeenCalledWith(testPid, 500);
      expect(mockOutputParser.hasScrollIndicator).toHaveBeenCalledWith(mockOutput, 'top');
    });

    it('should pass when expected scroll indicator is absent', async () => {
      const mockOutput = 'UI without scroll indicator';
      
      mockProcessManager.readProcessOutput.mockResolvedValue(mockOutput);
      mockOutputParser.hasScrollIndicator.mockReturnValue(false);

      await expect(uiAssertions.assertScrollIndicator(testPid, 'bottom', false)).resolves.toBeUndefined();
      
      expect(mockOutputParser.hasScrollIndicator).toHaveBeenCalledWith(mockOutput, 'bottom');
    });

    it('should throw error when indicator should exist but is missing', async () => {
      const mockOutput = 'UI without indicator';
      
      mockProcessManager.readProcessOutput.mockResolvedValue(mockOutput);
      mockOutputParser.hasScrollIndicator.mockReturnValue(false);

      await expect(uiAssertions.assertScrollIndicator(testPid, 'top', true))
        .rejects.toThrow('Expected top scroll indicator to be present');
    });

    it('should throw error when indicator should be absent but is present', async () => {
      const mockOutput = 'UI with indicator';
      
      mockProcessManager.readProcessOutput.mockResolvedValue(mockOutput);
      mockOutputParser.hasScrollIndicator.mockReturnValue(true);

      await expect(uiAssertions.assertScrollIndicator(testPid, 'bottom', false))
        .rejects.toThrow('Expected bottom scroll indicator to be absent');
    });
  });

  describe('assertProgressIndicator', () => {
    it('should pass when progress indicator should exist and is present', async () => {
      const mockOutput = 'UI with progress';
      const mockProgressIndicator = '⠋ Loading...';
      
      mockProcessManager.readProcessOutput.mockResolvedValue(mockOutput);
      mockOutputParser.extractProgressIndicator.mockReturnValue(mockProgressIndicator);

      await expect(uiAssertions.assertProgressIndicator(testPid, true)).resolves.toBeUndefined();
      
      expect(mockProcessManager.readProcessOutput).toHaveBeenCalledWith(testPid, 500);
      expect(mockOutputParser.extractProgressIndicator).toHaveBeenCalledWith(mockOutput);
    });

    it('should pass when progress indicator should be absent and is not present', async () => {
      const mockOutput = 'UI without progress';
      
      mockProcessManager.readProcessOutput.mockResolvedValue(mockOutput);
      mockOutputParser.extractProgressIndicator.mockReturnValue(null);

      await expect(uiAssertions.assertProgressIndicator(testPid, false)).resolves.toBeUndefined();
    });

    it('should throw error when indicator should exist but is missing', async () => {
      const mockOutput = 'UI without progress';
      
      mockProcessManager.readProcessOutput.mockResolvedValue(mockOutput);
      mockOutputParser.extractProgressIndicator.mockReturnValue(null);

      await expect(uiAssertions.assertProgressIndicator(testPid, true))
        .rejects.toThrow('Expected progress indicator to be present');
    });

    it('should throw error when indicator should be absent but is present', async () => {
      const mockOutput = 'UI with progress';
      const mockProgressIndicator = '⠙ Processing...';
      
      mockProcessManager.readProcessOutput.mockResolvedValue(mockOutput);
      mockOutputParser.extractProgressIndicator.mockReturnValue(mockProgressIndicator);

      await expect(uiAssertions.assertProgressIndicator(testPid, false))
        .rejects.toThrow('Expected progress indicator to be absent');
    });

    it('should handle empty progress indicator string', async () => {
      const mockOutput = 'UI output';
      
      mockProcessManager.readProcessOutput.mockResolvedValue(mockOutput);
      mockOutputParser.extractProgressIndicator.mockReturnValue('');

      await expect(uiAssertions.assertProgressIndicator(testPid, false)).resolves.toBeUndefined();
    });
  });

  describe('createAssertions', () => {
    it('should create UIAssertions instance with provided dependencies', () => {
      const assertions = createAssertions(mockOutputParser, mockProcessManager);
      
      expect(assertions).toBeInstanceOf(UIAssertions);
      expect((assertions as any).outputParser).toBe(mockOutputParser);
      expect((assertions as any).processManager).toBe(mockProcessManager);
    });
  });

  describe('Error Handling', () => {
    it('should propagate process manager errors in all methods', async () => {
      const error = new Error('Process manager error');
      mockProcessManager.readProcessOutput.mockRejectedValue(error);

      await expect(uiAssertions.assertAgentCount(testPid, 1)).rejects.toThrow('Process manager error');
      await expect(uiAssertions.assertDialogOpen(testPid)).rejects.toThrow('Process manager error');
      await expect(uiAssertions.assertSelectedItem(testPid, 'item')).rejects.toThrow('Process manager error');
      await expect(uiAssertions.assertNoErrors(testPid)).rejects.toThrow('Process manager error');
      await expect(uiAssertions.assertScrollIndicator(testPid, 'top', true)).rejects.toThrow('Process manager error');
      await expect(uiAssertions.assertProgressIndicator(testPid, true)).rejects.toThrow('Process manager error');
    });

    it('should handle output parser method failures', async () => {
      const mockOutput = 'test output';
      mockProcessManager.readProcessOutput.mockResolvedValue(mockOutput);
      
      const error = new Error('Parser error');
      mockOutputParser.extractAgentList.mockImplementation(() => { throw error; });

      await expect(uiAssertions.assertAgentExists(testPid, 'test')).rejects.toThrow('Parser error');
    });
  });
});