import { OutputParser } from '../framework/OutputParser';
import { ProcessManager } from '../framework/ProcessManager';

export class UIAssertions {
  constructor(
    private outputParser: OutputParser,
    private processManager: ProcessManager
  ) {}

  async assertTextInOutput(pid: number, expectedText: string, timeout: number = 5000): Promise<void> {
    const output = await this.processManager.waitForOutput(pid, expectedText, timeout);
    if (!this.outputParser.findInOutput(output, expectedText)) {
      throw new Error(`Expected text "${expectedText}" not found in output`);
    }
  }

  async assertPatternInOutput(pid: number, pattern: RegExp, timeout: number = 5000): Promise<void> {
    const output = await this.processManager.waitForOutput(pid, pattern, timeout);
    if (!this.outputParser.findInOutput(output, pattern)) {
      throw new Error(`Pattern ${pattern} not found in output`);
    }
  }

  async assertAgentExists(pid: number, prompt: string): Promise<void> {
    const output = await this.processManager.readProcessOutput(pid, 1000);
    const agents = this.outputParser.extractAgentList(output);
    
    const found = agents.some(agent => agent.prompt.includes(prompt));
    if (!found) {
      throw new Error(`Agent with prompt "${prompt}" not found. Found agents: ${JSON.stringify(agents)}`);
    }
  }

  async assertAgentCount(pid: number, expectedCount: number): Promise<void> {
    const output = await this.processManager.readProcessOutput(pid, 1000);
    const agents = this.outputParser.extractAgentList(output);
    
    if (agents.length !== expectedCount) {
      throw new Error(`Expected ${expectedCount} agents, but found ${agents.length}`);
    }
  }

  async assertDialogOpen(pid: number): Promise<void> {
    const output = await this.processManager.readProcessOutput(pid, 500);
    const dialogContent = this.outputParser.extractDialogContent(output);
    
    if (!dialogContent) {
      throw new Error('Expected dialog to be open, but no dialog found');
    }
  }

  async assertDialogClosed(pid: number): Promise<void> {
    const output = await this.processManager.readProcessOutput(pid, 500);
    const dialogContent = this.outputParser.extractDialogContent(output);
    
    if (dialogContent) {
      throw new Error('Expected dialog to be closed, but dialog is still open');
    }
  }

  async assertSelectedItem(pid: number, expectedItem: string): Promise<void> {
    const output = await this.processManager.readProcessOutput(pid, 100);
    const selectedItem = this.outputParser.findSelectedItem(output);
    
    if (!selectedItem) {
      throw new Error('No selected item found');
    }
    
    if (!selectedItem.includes(expectedItem)) {
      throw new Error(`Expected selected item to contain "${expectedItem}", but found "${selectedItem}"`);
    }
  }

  async assertNoErrors(pid: number): Promise<void> {
    const output = await this.processManager.readProcessOutput(pid, 500);
    const errorMessage = this.outputParser.extractErrorMessage(output);
    
    if (errorMessage) {
      throw new Error(`Unexpected error found: ${errorMessage}`);
    }
  }

  async assertScrollIndicator(pid: number, position: 'top' | 'bottom', shouldExist: boolean): Promise<void> {
    const output = await this.processManager.readProcessOutput(pid, 500);
    const hasIndicator = this.outputParser.hasScrollIndicator(output, position);
    
    if (shouldExist && !hasIndicator) {
      throw new Error(`Expected ${position} scroll indicator to be present`);
    }
    
    if (!shouldExist && hasIndicator) {
      throw new Error(`Expected ${position} scroll indicator to be absent`);
    }
  }

  async assertProgressIndicator(pid: number, shouldExist: boolean): Promise<void> {
    const output = await this.processManager.readProcessOutput(pid, 500);
    const progressIndicator = this.outputParser.extractProgressIndicator(output);
    
    if (shouldExist && !progressIndicator) {
      throw new Error('Expected progress indicator to be present');
    }
    
    if (!shouldExist && progressIndicator) {
      throw new Error('Expected progress indicator to be absent');
    }
  }
}

// Convenience function to create assertions instance
export function createAssertions(
  outputParser: OutputParser,
  processManager: ProcessManager
): UIAssertions {
  return new UIAssertions(outputParser, processManager);
}