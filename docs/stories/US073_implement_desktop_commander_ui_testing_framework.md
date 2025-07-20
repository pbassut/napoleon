# US073: Implement DesktopCommander UI Testing Framework

## Status
**Status:** Ready for Review  
**Priority:** High  
**Type:** Feature  
**Assignee:** Unassigned  
**Estimated Effort:** Large (1-2 days)

## Description
Create an automated UI testing framework for Napoleon using DesktopCommander's process management capabilities. The framework will spawn Napoleon instances, interact with the terminal UI through keyboard input, and verify UI behavior by analyzing the terminal output.

## Acceptance Criteria
- [ ] Test framework can spawn Napoleon process using DesktopCommander
- [ ] Framework can send keyboard input to Napoleon (e.g., 'n', 'q', arrow keys)
- [ ] Framework can type text into dialogs (e.g., agent prompts)
- [ ] Framework can read and parse terminal output to verify UI state
- [ ] Basic test suite covering core user interactions
- [ ] Clear test result reporting
- [ ] Integration with existing test infrastructure

## Technical Approach

### Core Components
1. **ProcessManager**: Wrapper around DesktopCommander for Napoleon instances
2. **InputSimulator**: Send keyboard input via interact_with_process
3. **OutputParser**: Parse terminal output to verify UI state
4. **TestRunner**: Orchestrate test execution and reporting

### Example Test Flow
```typescript
// Spawn Napoleon
const pid = await dc.start_process('npm run start');

// Wait for UI to load
await dc.read_process_output(pid, 2000);

// Press 'n' to open spawn dialog
await dc.interact_with_process(pid, 'n');

// Type agent prompt
await dc.interact_with_process(pid, 'Create a hello world program');

// Press Enter to spawn
await dc.interact_with_process(pid, '\r');

// Read output and verify agent appears in list
const output = await dc.read_process_output(pid, 1000);
assert(output.includes('Create a hello world program'));
```

## Test Coverage Goals
1. **Navigation Tests**
   - Arrow key navigation in agent list
   - Focus management between components
   
2. **Agent Management Tests**
   - Spawn agent with various prompts
   - Terminate agent
   - View agent details
   
3. **UI State Tests**
   - Empty state display
   - Scroll indicators
   - Modal centering
   
4. **Error Handling Tests**
   - Invalid input handling
   - Process termination recovery

## Implementation Steps
1. Create test framework structure
2. Implement ProcessManager wrapper
3. Build OutputParser for terminal parsing
4. Create assertion helpers
5. Write initial test suite
6. Integrate with CI/CD

## Challenges & Considerations
- Terminal output parsing (ANSI escape codes)
- Timing issues with async UI updates
- Cross-platform compatibility (Windows, macOS, Linux)
- Flaky test prevention strategies
- Process cleanup after test failures

## Success Metrics
- [ ] 90%+ test reliability (no flaky tests)
- [ ] Core user flows covered
- [ ] Tests run in under 2 minutes
- [ ] Clear failure diagnostics

## Definition of Done
- [x] Framework implementation complete
- [x] Core test suite implemented (10+ tests)
- [x] Documentation for writing new tests
- [x] Integration with npm test command
- [ ] CI/CD pipeline integration
- [x] No impact on production code

## Dev Notes

### File Structure
Create the UI testing framework in the following structure:
```
src/
  ui-tests/
    framework/
      ProcessManager.ts      # Wrapper for DesktopCommander
      InputSimulator.ts      # Keyboard input handling
      OutputParser.ts        # Terminal output parsing
      TestRunner.ts          # Test orchestration
      types.ts              # TypeScript interfaces
    tests/
      navigation.test.ts     # Navigation tests
      agent-management.test.ts # Agent spawn/terminate tests
      ui-state.test.ts      # UI state verification tests
    helpers/
      assertions.ts         # Custom assertion helpers
      utils.ts             # Test utilities
```

### DesktopCommander Integration
DesktopCommander is available as a global tool per the user's CLAUDE.md configuration. Access it through the process management commands:
- Use for spawning Napoleon instances
- Send keyboard input via interact_with_process
- Read terminal output for assertions
- Ensure proper process cleanup in afterEach hooks

### Existing Test Infrastructure
- Napoleon uses Jest as the test runner (see package.json)
- Follow existing test patterns from src/testing/
- Use the existing test utilities where applicable
- Ensure new tests integrate with `npm test` command

### Technical Patterns
- Use async/await for all DesktopCommander interactions
- Implement proper timeouts for UI operations (default: 5000ms)
- Parse ANSI escape codes using existing terminal utilities
- Follow Napoleon's TypeScript conventions and linting rules

### Key Implementation Notes
1. **Process Isolation**: Each test should spawn its own Napoleon instance
2. **Output Buffering**: Buffer terminal output to handle async UI updates
3. **Timing**: Add configurable delays between actions for UI rendering
4. **Cleanup**: Always terminate processes in afterEach, even on test failure
5. **Cross-platform**: Test on macOS, Windows, and Linux in CI

### Testing the Test Framework
- Create unit tests for each framework component
- Mock DesktopCommander for framework unit tests
- Integration tests should use real Napoleon instances

## Dev Agent Record

### Agent Model Used
Claude Opus 4

### Change Log
- Developer Status: 'In Progress'
- Developer Status: 'Ready for Review'

### File List
- src/ui-tests/framework/ProcessManager.ts
- src/ui-tests/framework/InputSimulator.ts
- src/ui-tests/framework/OutputParser.ts
- src/ui-tests/framework/TestRunner.ts
- src/ui-tests/framework/types.ts
- src/ui-tests/framework/index.ts
- src/ui-tests/helpers/assertions.ts
- src/ui-tests/helpers/utils.ts
- src/ui-tests/tests/navigation.test.ts
- src/ui-tests/tests/agent-management.test.ts
- src/ui-tests/tests/ui-state.test.ts
- src/ui-tests/tests/framework-validation.test.ts
- src/ui-tests/run-ui-tests.ts
- src/ui-tests/README.md
- package.json (modified)

### Completion Notes
- Implemented complete UI testing framework with DesktopCommander integration
- Created 18 tests across 3 test suites (navigation, agent management, UI state)
- Framework supports process management, keyboard input simulation, and output parsing
- Added comprehensive assertion helpers and test utilities
- Integrated with npm test command via `npm run test:ui-framework`
- Created detailed documentation for writing new tests
- CI/CD integration left for future work as it requires GitHub Actions setup