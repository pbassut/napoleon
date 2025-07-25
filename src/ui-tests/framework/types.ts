export interface TodoItem {
  id: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
}

export interface Agent {
  id: string;
  prompt: string;
  status: 'running' | 'stopped' | 'failed';
  output?: string;
  todos?: TodoItem[];
}

export interface UIState {
  agents: Agent[];
  selectedAgentId?: string;
  isDialogOpen: boolean;
  dialogType?: 'spawn' | 'confirm' | 'error';
  errorMessage?: string;
}

export interface KeyboardShortcut {
  key: string;
  modifiers?: ('ctrl' | 'alt' | 'shift')[];
  description: string;
}

export interface TestConfig {
  napoleonStartTimeout: number;
  defaultActionDelay: number;
  outputBufferSize: number;
  processCleanupTimeout: number;
}

export const DEFAULT_TEST_CONFIG: TestConfig = {
  napoleonStartTimeout: 5000,
  defaultActionDelay: 100,
  outputBufferSize: 1000,
  processCleanupTimeout: 2000,
};

export type AssertionResult = {
  passed: boolean;
  message: string;
  actual?: any;
  expected?: any;
};

export interface TestReport {
  suiteName: string;
  testName: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: Error;
  logs?: string[];
}
