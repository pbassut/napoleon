import { UITestContext } from '../framework/TestRunner';

export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForUIStable(context: UITestContext, delayMs: number = 300): Promise<void> {
  // Wait for UI to stabilize after an action
  await delay(delayMs);
}

export async function spawnAgent(
  context: UITestContext,
  prompt: string,
): Promise<void> {
  const { inputSimulator, pid } = context;

  // Press 'n' to open spawn dialog
  await inputSimulator.pressKey(pid, 'n');
  await waitForUIStable(context, 500); // Increased wait for dialog

  // Type the prompt
  await inputSimulator.typeText(pid, prompt);
  await waitForUIStable(context, 300);

  // Press Enter to spawn
  await inputSimulator.confirmDialog(pid);
  await waitForUIStable(context, 1500); // Extra time for agent to spawn and UI to update
}

export async function terminateAgent(
  context: UITestContext,
  agentId?: string,
): Promise<void> {
  const { inputSimulator, pid } = context;

  // If agentId provided, navigate to it first
  if (agentId) {
    // This would require navigation logic
    // For now, assume we're on the correct agent
  }

  // Press 't' to terminate
  await inputSimulator.pressKey(pid, 't');
  await waitForUIStable(context);

  // Confirm termination
  await inputSimulator.pressKey(pid, 'y');
  await waitForUIStable(context, 1000);
}

export async function navigateToAgent(
  context: UITestContext,
  direction: 'up' | 'down',
  count: number = 1,
): Promise<void> {
  const { inputSimulator, pid } = context;

  for (let i = 0; i < count; i++) {
    await inputSimulator.pressKey(pid, direction);
    await delay(200); // Increased delay between navigation
  }

  await waitForUIStable(context, 500); // More time for UI to update
}

export async function clearAllAgents(context: UITestContext): Promise<void> {
  const {
    outputParser, processManager, inputSimulator, pid,
  } = context;

  // Get current agent list
  const output = await processManager.readProcessOutput(pid, 500);
  const agents = outputParser.extractAgentList(output);

  // Terminate each agent
  for (let i = 0; i < agents.length; i++) {
    await inputSimulator.pressKey(pid, 't');
    await delay(200);
    await inputSimulator.pressKey(pid, 'y');
    await delay(500);
  }
}

export function generateTestPrompt(prefix: string = 'Test'): string {
  const timestamp = Date.now();
  return `${prefix} Agent ${timestamp}`;
}

export async function captureScreenshot(
  context: UITestContext,
  _testName: string,
): Promise<string> {
  const { processManager, pid } = context;
  const output = await processManager.readProcessOutput(pid, 100);

  // In a real implementation, this could save to a file
  // For now, just return the output
  return output;
}

export class TestDataBuilder {
  static createAgentPrompts(count: number): string[] {
    const prompts: string[] = [];
    for (let i = 0; i < count; i++) {
      prompts.push(`Test Agent ${i + 1}: ${Date.now()}`);
    }
    return prompts;
  }

  static createLongPrompt(length: number = 100): string {
    return 'A'.repeat(Math.max(0, length));
  }

  static createSpecialCharPrompt(): string {
    return 'Test with special chars: !@#$%^&*()_+-=[]{}|;\':",./<>?';
  }
}
