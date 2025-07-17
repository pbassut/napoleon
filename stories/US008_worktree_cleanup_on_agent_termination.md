# US008: Worktree Cleanup on Agent Termination

## Epic
**Epic 2: Git Integration & Worktree Management**

## Story
As a developer,
I want worktrees to be cleaned up when agents are terminated,
so that the repository remains clean and organized.

## Description
This story implements automatic worktree cleanup when agents are terminated, ensuring the repository remains clean and organized. It integrates with the agent termination process to handle proper git worktree removal while preserving branches for potential merge operations.

## Priority
**High** - Essential for repository cleanliness and resource management

## Acceptance Criteria

### AC1: Automatic Cleanup Trigger
- Agent termination triggers automatic worktree cleanup
- Cleanup is integrated into the termination process
- Cleanup happens after successful agent termination

### AC2: Proper Worktree Removal
- System uses git worktree remove to clean up worktree properly
- Worktree directory is removed from filesystem
- Git worktree references are cleaned up

### AC3: Branch Preservation
- Associated branch is preserved for potential merge/review
- Branch remains accessible for manual operations
- Branch cleanup is optional and user-controlled

### AC4: Graceful Cleanup Handling
- Cleanup process handles locked or dirty worktrees gracefully
- Automatic retry mechanisms for locked worktrees
- Force cleanup options for stubborn worktrees

### AC5: User Feedback
- User is notified of cleanup success/failure status
- Clear messages about what was cleaned up
- Progress indicators for cleanup operations

### AC6: Manual Cleanup Command
- Manual cleanup command is available for stuck worktrees
- Batch cleanup option for multiple worktrees
- Force cleanup option for emergency situations

### AC7: Cleanup Logging
- System maintains cleanup log for troubleshooting
- Detailed error information for failed cleanups
- Audit trail of cleanup operations

## Technical Requirements

### Worktree Cleanup Process
```javascript
// Worktree cleanup function
async function cleanupWorktree(agentId, worktreePath) {
  try {
    // First, try graceful removal
    await execAsync(`git worktree remove ${worktreePath}`);
    
    // Remove directory if it still exists
    if (fs.existsSync(worktreePath)) {
      await fs.promises.rmdir(worktreePath, { recursive: true });
    }
    
    log.info(`Worktree cleanup successful for agent ${agentId}`);
    return true;
  } catch (error) {
    log.error(`Worktree cleanup failed for agent ${agentId}: ${error.message}`);
    return false;
  }
}
```

### Cleanup States
- **SUCCESS**: Worktree removed successfully
- **LOCKED**: Worktree is locked, retry needed
- **DIRTY**: Worktree has uncommitted changes
- **FAILED**: Cleanup failed, manual intervention required

### Git Commands
- `git worktree remove <path>` - Remove worktree
- `git worktree remove --force <path>` - Force remove worktree
- `git worktree list` - List all worktrees
- `git worktree prune` - Prune invalid worktrees

## Definition of Done
- [ ] Automatic cleanup is triggered on agent termination
- [ ] Worktree removal works correctly
- [ ] Branch preservation is implemented
- [ ] Graceful cleanup handling is functional
- [ ] User feedback is clear and informative
- [ ] Manual cleanup commands are available
- [ ] Cleanup logging is comprehensive
- [ ] Error handling covers all failure scenarios
- [ ] Unit tests validate cleanup operations
- [ ] Integration tests cover termination workflow

## Notes
- This story complements the agent termination functionality
- Focus on robust cleanup that handles edge cases
- Ensure no repository corruption during cleanup
- Consider concurrent cleanup operations
- Test with various worktree states (dirty, locked, etc.)

## Related Stories
- US005: Basic Agent Termination (prerequisite)
- US006: Git Worktree Creation (counterpart)
- US007: Branch Isolation Management (integrates with this)
- US009: Basic Merge Coordination Tools (preserves branches for this)
- US013: Error Handling and Recovery (extends this)