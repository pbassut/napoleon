# US031: Git Worktree Lifecycle Management

## Epic
**Epic 2: Git Integration & Worktree Management**

## Story
As a developer using Napoleon,
I want worktrees to be automatically resumed on startup and cleaned up when agents terminate unexpectedly,
so that I don't have dangling worktrees accumulating over time and can recover from application restarts.

## Description
This story implements comprehensive git worktree lifecycle management to prevent worktree accumulation and handle recovery scenarios. When Napoleon starts up, it will discover and resume existing worktrees for active agents. When agents terminate (gracefully or unexpectedly), their worktrees will be automatically cleaned up. This ensures a clean git repository state and prevents the buildup of abandoned worktrees over time.

## Priority
**High** - Critical for repository cleanliness and startup reliability

## Acceptance Criteria

### AC1: Startup Worktree Discovery and Resume
- System discovers existing worktrees in `.napoleon-worktrees/` directory on startup
- System validates which worktrees correspond to running agent processes
- System resumes valid worktrees and associates them with existing agent sessions
- System identifies orphaned worktrees (no corresponding running process)

### AC2: Orphaned Worktree Cleanup on Startup
- System automatically removes orphaned worktrees that have no running agent process
- System logs worktree cleanup operations for audit purposes
- System gracefully handles worktrees that are locked or have uncommitted changes
- System provides user notification of cleanup operations performed

### AC3: Graceful Agent Termination with Worktree Cleanup
- Agent termination (via UI or SIGTERM) triggers automatic worktree cleanup
- Worktree removal is integrated into the agent termination flow
- Branch preservation is handled according to user preferences
- Failed cleanup operations are logged and retried with force option

### AC4: Unexpected Agent Death Cleanup
- System detects when agent processes die unexpectedly (crash, kill -9, etc.)
- System automatically queues orphaned worktrees for cleanup
- System provides background cleanup mechanism that doesn't block UI
- System handles concurrent cleanup operations safely

### AC5: Worktree State Validation
- System validates git worktree consistency on startup
- System detects and handles corrupted worktree references
- System prunes invalid worktree entries from git metadata
- System reports worktree state issues to user with suggested actions

### AC6: Recovery and Error Handling
- System provides manual cleanup commands for stuck worktrees
- System handles permission issues and locked worktrees gracefully
- System maintains detailed cleanup logs for troubleshooting
- System prevents cleanup of worktrees with uncommitted changes (with override option)

### AC7: Performance and Resource Management
- Startup worktree discovery completes within 5 seconds for up to 50 worktrees
- Cleanup operations do not block agent spawning or termination UI
- System limits concurrent cleanup operations to prevent resource exhaustion
- System provides progress indicators for long-running cleanup operations

## Technical Requirements

### Startup Worktree Discovery
```javascript
// Worktree discovery and recovery process
async function discoverAndResumeWorktrees() {
  const worktreesDir = path.join(process.cwd(), '.napoleon-worktrees');
  const activeWorktrees = await discoverActiveWorktrees(worktreesDir);
  const orphanedWorktrees = await identifyOrphanedWorktrees(activeWorktrees);
  
  // Resume valid worktrees
  for (const worktree of activeWorktrees) {
    await resumeWorktreeSession(worktree);
  }
  
  // Queue orphaned worktrees for cleanup
  for (const worktree of orphanedWorktrees) {
    await queueWorktreeCleanup(worktree);
  }
}
```

### Worktree Discovery Algorithm
```javascript
// Discover worktrees and match to running processes
async function discoverActiveWorktrees(worktreesDir) {
  const worktreeDirs = await fs.readdir(worktreesDir);
  const gitWorktrees = await execAsync('git worktree list --porcelain');
  const runningProcesses = await getRunningProcesses();
  
  return worktreeDirs
    .filter(dir => dir.startsWith('agent-'))
    .map(dir => parseWorktreeInfo(dir))
    .filter(worktree => isWorktreeActive(worktree, runningProcesses));
}
```

### Cleanup Queue Management
```javascript
// Background cleanup queue for non-blocking operations
class WorktreeCleanupQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.maxConcurrent = 2;
  }
  
  async enqueue(worktreePath, options = {}) {
    this.queue.push({ worktreePath, options, timestamp: Date.now() });
    if (!this.processing) {
      this.processQueue();
    }
  }
  
  async processQueue() {
    this.processing = true;
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.maxConcurrent);
      await Promise.allSettled(
        batch.map(item => this.cleanupWorktree(item))
      );
    }
    this.processing = false;
  }
}
```

### Worktree State Validation
```javascript
// Validate and repair worktree state
async function validateWorktreeState() {
  try {
    // Check git worktree list consistency
    const gitWorktrees = await execAsync('git worktree list --porcelain');
    const filesystemWorktrees = await scanWorktreeDirectories();
    
    // Identify inconsistencies
    const inconsistencies = findWorktreeInconsistencies(
      gitWorktrees, 
      filesystemWorktrees
    );
    
    // Prune invalid entries
    for (const invalid of inconsistencies) {
      await execAsync(`git worktree prune`);
      logger.warn('Pruned invalid worktree entry', { path: invalid.path });
    }
    
    return { valid: true, inconsistencies: inconsistencies.length };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}
```

## Dev Notes

### Previous Story Context
- **US016 (Git Worktree Creation)**: Implemented worktree creation during agent spawn
- **US018 (Worktree Cleanup on Agent Termination)**: Basic cleanup on graceful termination
- Current gaps: No startup recovery, no handling of unexpected deaths, no orphaned worktree management

### Architecture Integration Points
- **Agent Manager**: Extend initialization to include worktree discovery
- **Session Persistence**: Add worktree lifecycle metadata to session files
- **Startup Sequence**: Integrate worktree discovery into application startup
- **Background Services**: Implement cleanup queue for non-blocking operations

### Data Models and Structures
[Source: architecture/data-models.md#agent-session-structure]
```javascript
// Extended agent session structure
const agentSession = {
  id: 'agent-1234567890-abcdefg',
  worktreePath: '.napoleon-worktrees/agent-1234567890-abcdefg-1234567890',
  worktreeName: 'agent-1234567890-abcdefg-1234567890',
  worktreeState: 'active' | 'orphaned' | 'cleaning' | 'cleaned',
  lastWorktreeValidation: '2025-07-18T10:30:00Z',
  cleanupAttempts: 0,
  // ... existing fields
};
```

### File Locations and Structure
[Source: architecture/unified-project-structure.md#core-modules]
- **Core Module**: `src/core/worktree-lifecycle-manager.js`
- **Cleanup Queue**: `src/core/cleanup-queue.js`
- **Discovery Logic**: `src/core/worktree-discovery.js`
- **Integration Point**: `src/core/agent-manager.js` (extend initialization)
- **Tests**: `__tests__/worktree-lifecycle-integration.test.js`

### Git Integration Commands
- `git worktree list --porcelain` - Get structured worktree list
- `git worktree prune` - Remove invalid worktree references
- `git worktree remove --force <path>` - Force remove locked worktrees
- `git status --porcelain` - Check for uncommitted changes in worktree

### Error Handling Scenarios
- **Permission Denied**: Fallback to manual cleanup queue
- **Locked Worktrees**: Retry with force option after timeout
- **Corrupted Git State**: Prune and rebuild worktree references
- **Disk Space Issues**: Prioritize cleanup of largest worktrees
- **Concurrent Operations**: Use file locking to prevent conflicts

### Testing Requirements
[Source: architecture/testing-strategy.md#integration-testing]
- **Unit Tests**: Worktree discovery, cleanup queue, state validation
- **Integration Tests**: Full startup cycle with existing worktrees
- **Edge Case Tests**: Corrupted worktrees, permission issues, concurrent cleanup
- **Performance Tests**: Startup time with 50+ worktrees, cleanup throughput

### Performance Considerations
- Parallel worktree validation (max 5 concurrent)
- Lazy cleanup queue to prevent blocking startup
- Caching of git worktree list output for 30 seconds
- Batched filesystem operations for large worktree counts

## Tasks / Subtasks

### Task 1: Implement Worktree Discovery System (AC: 1, 5)
- [ ] Create `WorktreeDiscovery` class with filesystem scanning
- [ ] Implement git worktree list parsing and validation
- [ ] Add process matching logic to identify active vs orphaned worktrees
- [ ] Integrate worktree state validation and git prune operations
- [ ] Add comprehensive error handling for discovery failures

### Task 2: Build Cleanup Queue System (AC: 2, 4, 7)
- [ ] Create `WorktreeCleanupQueue` class with background processing
- [ ] Implement queue prioritization (oldest orphaned worktrees first)
- [ ] Add concurrent cleanup limiting and resource management
- [ ] Implement retry logic with exponential backoff for failed cleanups
- [ ] Add progress tracking and user notification system

### Task 3: Integrate Startup Recovery Process (AC: 1, 2, 5)
- [ ] Extend AgentManager initialization to include worktree discovery
- [ ] Implement session resumption for recovered worktrees
- [ ] Add startup logging and user notification of recovery operations
- [ ] Integrate worktree validation into startup health checks
- [ ] Add startup performance monitoring and optimization

### Task 4: Enhance Agent Termination Flow (AC: 3, 6)
- [ ] Update agent termination to use cleanup queue
- [ ] Implement branch preservation logic based on user preferences
- [ ] Add force cleanup option for stuck worktrees
- [ ] Enhance error logging and audit trail for cleanup operations
- [ ] Add manual cleanup commands for emergency situations

### Task 5: Implement Background Death Detection (AC: 4, 6)
- [ ] Create process monitoring system for unexpected agent deaths
- [ ] Implement periodic orphaned worktree scanning
- [ ] Add automatic queuing of orphaned worktrees for cleanup
- [ ] Implement safe concurrent cleanup with file locking
- [ ] Add detailed logging and recovery metrics

### Task 6: Testing and Validation (AC: 7)
- [ ] Create comprehensive unit tests for all new components
- [ ] Implement integration tests for startup recovery scenarios
- [ ] Add performance tests for large worktree counts
- [ ] Create edge case tests for corrupted git states
- [ ] Add manual testing scenarios for user acceptance

## Definition of Done
- [ ] Startup worktree discovery and resumption is implemented
- [ ] Orphaned worktree cleanup operates automatically and efficiently
- [ ] Agent termination includes reliable worktree cleanup
- [ ] Background cleanup queue handles unexpected agent deaths
- [ ] Worktree state validation and repair is functional
- [ ] Manual cleanup commands are available for emergencies
- [ ] Performance requirements are met (5-second startup discovery)
- [ ] Comprehensive error handling covers all edge cases
- [ ] Unit tests validate all worktree lifecycle operations
- [ ] Integration tests cover full startup and termination workflows
- [ ] Documentation includes troubleshooting guide for worktree issues

## Notes
- This story addresses a critical operational issue where worktrees accumulate over time
- Focus on reliability and performance - startup discovery must not significantly delay app launch
- Ensure backward compatibility with existing worktree structures
- Consider git repository corruption scenarios and provide recovery mechanisms
- Test thoroughly with various git repository states (dirty, locked, corrupted)

## Related Stories
- US016: Git Worktree Creation (foundation for this story)
- US018: Worktree Cleanup on Agent Termination (extends basic cleanup)
- US022: Session Persistence and Recovery (extends session recovery)
- US023: Error Handling and Recovery (integrates with error handling framework)
- US015: Basic Agent Termination (enhances termination flow)

## Approval Status

**Status:** ✅ Approved - Ready for Implementation

**Priority:** High - Critical for repository cleanliness and startup reliability

**Approved by:** Scrum Master Bob

**Date:** 2025-07-18

**Approval Notes:**
- Essential lifecycle management for preventing worktree accumulation
- Comprehensive startup recovery and cleanup automation
- Robust error handling for all termination scenarios
- Performance-optimized to prevent startup delays
- Critical for production reliability of Napoleon application