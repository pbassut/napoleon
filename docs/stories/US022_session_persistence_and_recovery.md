# US012: Session Persistence and Recovery

## Epic
**Epic 3: Advanced Terminal UI & Session Management**

## Story
As a developer,
I want basic session persistence across application restarts,
so that I can maintain continuity in my agent workflows.

## Description
This story implements session persistence and recovery capabilities that allow agent sessions to survive application restarts. It provides basic continuity features to reconnect to existing agent sessions and restore session state after application interruption.

## Priority
**High** - Important for workflow continuity and user experience

## Acceptance Criteria

### AC1: Automatic Session Saving
- Session state is automatically saved to ~/.napoleon/sessions.json
- Session data includes all necessary information for recovery
- Atomic writes to prevent data corruption

### AC2: Session Reconnection
- Application attempts to reconnect to existing agent sessions on startup
- Session validation to ensure agents are still running
- Proper session handle restoration

### AC3: Orphaned Session Detection
- Orphaned agent sessions are detected and handled appropriately
- Cleanup of stale session references
- Option to adopt or terminate orphaned sessions

### AC4: Recovery Status Notification
- User is notified of session recovery success/failure status
- Clear messaging about recovered vs. failed sessions
- Summary of recovery operations

### AC5: Session Data Completeness
- Session data includes worktree paths and branch information
- Complete agent configuration and runtime state
- Sufficient data for full session restoration

### AC6: Git Worktree Validation
- Recovery session validates git worktree state before reconnection
- Handles missing or corrupted worktrees gracefully
- Worktree consistency checks

### AC7: Recovery Error Logging
- Failed recovery attempts are logged with detailed error information
- Diagnostic information for troubleshooting
- Recovery operation audit trail

## Technical Requirements

### Session Data Structure
```javascript
// Persistent session data
const SessionData = {
  id: 'agent-001',
  pid: 12345,
  spawnTime: '2025-07-17T10:00:00Z',
  instructions: 'Help me implement a new feature',
  worktreePath: '.napoleon-worktrees/agent-001-1642434567890',
  branchName: 'feature/agent-001',
  status: 'running',
  lastActivity: '2025-07-17T10:23:45Z',
  metrics: {
    cpu: 25.5,
    memory: 45123456,
    uptime: 1425000
  }
};
```

### Recovery Session
```javascript
// Session recovery implementation
class SessionRecovery {
  async recoverSessions() {
    const sessionData = await this.loadSessionData();
    const recoveredSessions = [];
    
    for (const session of sessionData.sessions) {
      try {
        const recovered = await this.recoverSession(session);
        recoveredSessions.push(recovered);
      } catch (error) {
        logger.error(`Session recovery failed for ${session.id}: ${error.message}`);
      }
    }
    
    return recoveredSessions;
  }
  
  async recoverSession(sessionData) {
    // Validate session is still running
    const isRunning = await this.validateSession(sessionData.sessionId);
    if (!isRunning) {
      throw new Error('Session no longer running');
    }
    
    // Validate worktree exists
    const worktreeValid = await this.validateWorktree(sessionData.worktreePath);
    if (!worktreeValid) {
      throw new Error('Worktree no longer valid');
    }
    
    // Restore session
    return this.restoreSession(sessionData);
  }
}
```

### Recovery UI
```
Session Recovery Status:
┌─────────────────────────────────────────────────────────────┐
│ Recovering Sessions...                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ✓ agent-001   [recovered]     Session: 12345               │
│ ✗ agent-002   [failed]        Session not found            │
│ ✓ agent-003   [recovered]     Session: 12456               │
│                                                             │
│ Recovery Summary:                                           │
│ - 2 sessions recovered successfully                         │
│ - 1 session failed to recover                              │
│ - 0 orphaned sessions adopted                              │
│                                                             │
│ Press any key to continue...                               │
└─────────────────────────────────────────────────────────────┘
```

## Definition of Done
- [ ] Session data is saved automatically
- [ ] Session reconnection works correctly
- [ ] Orphaned sessions are detected and handled
- [ ] Recovery status is communicated clearly
- [ ] Session data is complete and accurate
- [ ] Git worktree validation is functional
- [ ] Recovery error logging is comprehensive
- [ ] Recovery session is robust and reliable
- [ ] Unit tests validate recovery logic
- [ ] Integration tests cover recovery scenarios

## Notes
- This story significantly enhances the user experience
- Focus on robustness and graceful failure handling
- Consider edge cases like system crashes and force quits
- Test recovery with various agent and worktree states
- Ensure data integrity during save/restore operations

## Related Stories
- US003: Agent Spawning Core Functionality (prerequisite)
- US006: Git Worktree Creation (integrates with this)
- US011: Advanced Session Monitoring (complements this)
- US013: Error Handling and Recovery (extends this)
- US001: Project Setup and CLI Framework (uses session storage)

## Approval Status

**Status:** ✅ Approved - Ready for Implementation

**Priority:** High - Important for workflow continuity and user experience

**Approved by:** Scrum Master Bob

**Date:** 2025-07-18

**Approval Notes:**
- Session persistence across application restarts
- Session reconnection and orphaned session detection
- Git worktree validation and recovery
- Complete session data preservation
- Essential for maintaining workflow continuity