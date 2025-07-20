# US073: Implement DesktopCommander UI Testing Framework

## Status
**Status:** Draft  
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
- [ ] Framework implementation complete
- [ ] Core test suite implemented (10+ tests)
- [ ] Documentation for writing new tests
- [ ] Integration with npm test command
- [ ] CI/CD pipeline integration
- [ ] No impact on production code