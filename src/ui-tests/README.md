# Napoleon UI Testing Framework

This framework enables automated testing of Napoleon's terminal UI using DesktopCommander for process management and keyboard interaction.

## Overview

The UI testing framework spawns Napoleon instances as separate processes, sends keyboard input, and verifies UI behavior by parsing terminal output.

## Architecture

### Core Components

1. **ProcessManager** - Wraps DesktopCommander for spawning/terminating Napoleon instances
2. **InputSimulator** - Sends keyboard input (keys, text, shortcuts)
3. **OutputParser** - Parses terminal output, strips ANSI codes, extracts UI elements
4. **TestRunner** - Orchestrates test execution with proper lifecycle management

### Directory Structure

```
src/ui-tests/
├── framework/
│   ├── ProcessManager.ts      # Process lifecycle management
│   ├── InputSimulator.ts      # Keyboard input simulation
│   ├── OutputParser.ts        # Terminal output parsing
│   ├── TestRunner.ts          # Test orchestration
│   ├── types.ts              # TypeScript interfaces
│   └── index.ts              # Framework exports
├── tests/
│   ├── navigation.test.ts     # Navigation behavior tests
│   ├── agent-management.test.ts # Agent spawn/terminate tests
│   └── ui-state.test.ts      # UI state verification tests
├── helpers/
│   ├── assertions.ts         # Custom assertion helpers
│   └── utils.ts             # Test utilities
└── run-ui-tests.ts          # Main test runner

```

## Writing Tests

### Basic Test Structure

```typescript
import { UITestSuite } from '../framework';
import { createAssertions } from '../helpers/assertions';

export const myTestSuite: UITestSuite = {
  name: 'My Test Suite',
  
  tests: [
    {
      name: 'should do something',
      test: async (context) => {
        const assertions = createAssertions(context.outputParser, context.processManager);
        const { inputSimulator, pid } = context;
        
        // Your test logic here
        await inputSimulator.pressKey(pid, 'n');
        await assertions.assertDialogOpen(pid);
      }
    }
  ]
};
```

### Common Test Patterns

#### Spawning an Agent
```typescript
import { spawnAgent } from '../helpers/utils';

await spawnAgent(context, 'My Agent Prompt');
```

#### Keyboard Navigation
```typescript
await inputSimulator.pressKey(pid, 'up');
await inputSimulator.pressKey(pid, 'down');
await inputSimulator.sendKeySequence(pid, ['up', 'up', 'enter']);
```

#### Text Input
```typescript
await inputSimulator.typeText(pid, 'Hello World');
await inputSimulator.clearInput(pid); // Ctrl+U
```

#### Assertions
```typescript
// Text content
await assertions.assertTextInOutput(pid, 'Expected text');
await assertions.assertPatternInOutput(pid, /regex pattern/);

// Agent management
await assertions.assertAgentExists(pid, 'Agent prompt');
await assertions.assertAgentCount(pid, 3);

// UI state
await assertions.assertDialogOpen(pid);
await assertions.assertSelectedItem(pid, 'Item name');
await assertions.assertScrollIndicator(pid, 'bottom', true);
```

### Test Lifecycle

Each test automatically:
1. Spawns a fresh Napoleon instance
2. Waits for UI initialization
3. Runs test logic
4. Terminates the process
5. Cleans up resources

### Best Practices

1. **Use Descriptive Names**: Test names should clearly describe what they verify
2. **Keep Tests Focused**: Each test should verify one specific behavior
3. **Handle Timing**: Use `waitForUIStable()` after actions that trigger UI updates
4. **Clean State**: Tests run with fresh Napoleon instances - no shared state
5. **Proper Assertions**: Use specific assertions rather than generic text matching

## Running Tests

```bash
# Run all UI tests
npm run test:ui-framework

# Run with npm test (if integrated)
npm test -- --testPathPattern=ui-tests
```

## Debugging Tests

1. **Capture Output**: Tests automatically buffer process output for debugging
2. **Add Delays**: Use `delay()` helper to slow down test execution
3. **Log Output**: Add `console.log(await processManager.readProcessOutput(pid))` 
4. **Screenshot**: Use `captureScreenshot()` to save terminal state

## Adding New Test Suites

1. Create a new file in `src/ui-tests/tests/`
2. Export a `UITestSuite` object
3. Import and add to `run-ui-tests.ts`

Example:
```typescript
// src/ui-tests/tests/my-feature.test.ts
export const myFeatureTestSuite: UITestSuite = {
  name: 'My Feature Tests',
  tests: [
    // Add test cases
  ]
};

// In run-ui-tests.ts
import { myFeatureTestSuite } from './tests/my-feature.test';
const suites = [
  // ... existing suites
  myFeatureTestSuite
];
```

## Troubleshooting

### Common Issues

1. **Process not starting**: Ensure DesktopCommander is available globally
2. **Timing issues**: Increase delays or use `waitForOutput` with patterns
3. **ANSI parsing**: OutputParser handles most cases, but complex TUIs may need updates
4. **Flaky tests**: Add retries or increase timeouts for slower systems

### Platform Differences

- Windows: May need different key mappings for some special keys
- Linux: Ensure terminal emulator supports required escape sequences
- macOS: Default configuration should work out of the box