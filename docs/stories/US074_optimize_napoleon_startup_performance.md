# Story US074: Optimize Napoleon Startup Performance

## Status
📝 **Draft**

## Story

**As a** Napoleon CLI user,
**I want** Napoleon to start up in under 3 seconds,
**so that** I can begin working with agents immediately without waiting for slow initialization processes.

## Acceptance Criteria

1. **Startup Time Target**: Napoleon application startup must complete in under 3 seconds from command execution to fully functional UI
2. **Environment Validation Timeout**: All external command checks (git, claude) must have configurable timeouts (default: 5 seconds max)
3. **Non-blocking Validation**: Optional dependency checks (Claude SDK) must not block the main startup process
4. **Parallel Processing**: Environment validation steps that can run concurrently must be parallelized
5. **Startup Progress**: Users must see progress indicators during startup operations that take longer than 1 second
6. **Performance Monitoring**: Startup time must be logged for performance monitoring and regression detection
7. **Graceful Degradation**: Application must start successfully even if non-critical validations fail or timeout

## Tasks / Subtasks

- [ ] **Fix Critical Bottleneck - Claude SDK Check** (AC: 2, 3)
  - [ ] Add 5-second timeout to `execSync('claude --version')` call
  - [ ] Make Claude SDK check non-blocking (run asynchronously after main startup)
  - [ ] Add proper error handling for timeout scenarios
  - [ ] Update warning message to be less intrusive

- [ ] **Optimize Environment Validation** (AC: 2, 4)
  - [ ] Add timeouts to all `execSync` operations in environment.js
  - [ ] Parallelize git version check and git working tree validation
  - [ ] Cache git status results for 5 seconds to avoid repeated calls
  - [ ] Make environment validation steps run concurrently where possible

- [ ] **Optimize Git Operations** (AC: 4)
  - [ ] Add timeout to git operations in GitStatusChecker
  - [ ] Implement caching for frequently called git operations
  - [ ] Consider making git status checks asynchronous where safe

- [ ] **Optimize Agent Manager Initialization** (AC: 4)
  - [ ] Make session loading asynchronous in agent-manager.js
  - [ ] Optimize worktree discovery to run in parallel with other startup tasks
  - [ ] Implement lazy loading for non-critical startup operations

- [ ] **Add Startup Progress Indicators** (AC: 5)
  - [ ] Implement progress spinner/dots for operations taking >1 second
  - [ ] Add startup phase logging (Environment validation, UI initialization, etc.)
  - [ ] Display current operation to user during longer startup phases

- [ ] **Implement Performance Monitoring** (AC: 6)
  - [ ] Add startup time measurement and logging
  - [ ] Log timing for each major startup phase
  - [ ] Add performance regression detection in tests

- [ ] **Add Configuration Options** (AC: 2)
  - [ ] Add configurable timeouts for external command checks
  - [ ] Add option to skip non-essential validations for faster startup
  - [ ] Document performance-related configuration options

- [ ] **Update Tests** (AC: 7)
  - [ ] Add tests for timeout scenarios
  - [ ] Add tests for graceful degradation when validations fail
  - [ ] Add performance regression tests for startup time
  - [ ] Test startup behavior with missing external dependencies

## Dev Notes

### Current Performance Issues Analysis
[Source: agent analysis of startup code]

**Primary Bottleneck Identified:**
- **Location**: `src/cli/validators/environment.js:122`
- **Issue**: `execSync('claude --version')` runs synchronously without timeout
- **Impact**: Can cause 30-40 second delays if Claude CLI hangs or has network issues
- **Solution**: Add timeout and make non-blocking

**Secondary Bottlenecks:**
1. **Git Operations**: Multiple synchronous `execSync` calls in GitStatusChecker
2. **Worktree Discovery**: Three concurrent operations that could be optimized
3. **File I/O**: Synchronous filesystem operations in config and session loading

### Technical Implementation Details
[Source: architecture/tech-stack-alignment.md, architecture/coding-standards-and-conventions.md]

**File Locations for Changes:**
- `src/cli/validators/environment.js` - Primary bottleneck fix
- `src/core/git-status-checker.js` - Optimize git operations
- `src/core/worktree-discovery.js` - Parallelize discovery operations
- `src/core/agent-manager.js` - Async session loading
- `src/core/config.js` - Async file operations where possible

**Technology Stack:**
- Runtime: Node.js >=16.0.0
- Use existing winston logger for performance logging
- Maintain existing error handling patterns using EnvironmentValidationError

**Performance Requirements:**
- Target: <3 seconds startup time
- Timeout: 5 seconds max for external commands
- Progress feedback: Operations >1 second must show progress

### Testing Standards
[Source: architecture/coding-standards-and-conventions.md]

**Test Requirements:**
- **Test Location**: Adjacent to source files with `.test.js` suffix
- **Framework**: Jest with existing configuration
- **Mock Strategy**: Mock external dependencies (git, claude commands)
- **Performance Tests**: Add timing assertions for startup phases
- **Test Command**: `npm run test`

**Specific Test Cases Needed:**
1. Startup time measurement tests
2. Timeout behavior verification
3. Graceful degradation when external commands fail
4. Progress indicator functionality
5. Configuration option validation

**Integration Testing:**
- Test full startup flow with various system configurations
- Verify UI responsiveness during startup optimizations
- Test behavior with missing external dependencies

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-07-23 | 1.0 | Initial story creation based on 40-second startup performance issue | Scrum Master Bob |