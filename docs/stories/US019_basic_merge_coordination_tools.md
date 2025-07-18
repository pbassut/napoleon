# US009: Basic Merge Coordination Tools

## Epic
**Epic 2: Git Integration & Worktree Management**

## Story
As a developer,
I want to review and merge agent changes from different branches,
so that I can integrate their work into the main codebase.

## Description
This story implements basic merge coordination tools that allow developers to review and integrate agent changes from different branches into the main codebase. It provides git workflow integration for managing multiple agent branches and coordinating their merge process.

## Priority
**High** - Essential for integrating agent work into main codebase

## Acceptance Criteria

### AC1: Agent Branch Listing
- System displays list of agent branches with change summaries
- Shows branch names, commit count, and last activity
- Filters to show only agent-created branches

### AC2: Git Diff Viewer
- User can view git diff for each agent branch
- Diff shows changes between agent branch and main branch
- Syntax highlighting and proper formatting

### AC3: Basic Merge Command
- Basic merge command is available for each agent branch
- Merge integrates agent changes into current branch
- Proper git merge workflow execution

### AC4: Merge Conflict Detection
- System detects potential merge conflicts before attempting merge
- Pre-merge analysis of conflicting files
- Warning messages for complex merges

### AC5: Merge Feedback
- User receives clear feedback on merge success/failure
- Detailed messages about merge results
- Summary of changes integrated

### AC6: Branch Cleanup Options
- Merged branches are optionally cleaned up after successful merge
- User can choose to keep or delete merged branches
- Cleanup confirmation dialogs

### AC7: Conflict Resolution Guidance
- System provides basic conflict resolution guidance
- Suggestions for resolving common conflicts
- Links to git documentation and resources

## Technical Requirements

### Merge Coordination UI
```
Branch Management View:
┌─────────────────────────────────────────────────────────────┐
│ Agent Branches                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ feature/agent-001  [3 commits]  Last: 2 hours ago         │
│ feature/agent-002  [7 commits]  Last: 30 minutes ago      │
│ feature/agent-003  [1 commit]   Last: 5 minutes ago       │
│                                                             │
│ [v] View diff  [m] Merge  [d] Delete  [q] Back             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Git Operations
```javascript
// Merge coordination functions
async function listAgentBranches() {
  const branches = await execAsync('git branch --list "feature/agent-*"');
  return branches.split('\n').filter(Boolean);
}

async function getBranchDiff(branchName) {
  return await execAsync(`git diff main...${branchName}`);
}

async function mergeBranch(branchName) {
  return await execAsync(`git merge ${branchName}`);
}
```

### Conflict Detection
- `git merge-tree` - Analyze merge conflicts
- `git diff --name-only` - List changed files
- `git log --oneline` - Get commit history

## Definition of Done
- [ ] Agent branch listing is functional
- [ ] Git diff viewer displays correctly
- [ ] Basic merge command works properly
- [ ] Merge conflict detection is implemented
- [ ] User feedback is clear and helpful
- [ ] Branch cleanup options are available
- [ ] Conflict resolution guidance is provided
- [ ] Error handling covers merge failures
- [ ] Unit tests validate merge operations
- [ ] Integration tests cover merge workflow

## Notes
- This story completes the basic git workflow integration
- Focus on safe merge operations and conflict detection
- Ensure proper backup mechanisms before merges
- Consider different merge strategies (fast-forward, no-ff)
- Test with various branch states and histories

## Related Stories
- US006: Git Worktree Creation (prerequisite)
- US007: Branch Isolation Management (prerequisite)
- US008: Worktree Cleanup on Agent Termination (complements this)
- US004: Basic Agent Status Display (could show merge status)
- US010: Enhanced Agent Detail View (could show merge information)

## Approval Status

**Status:** ✅ Approved - Ready for Implementation

**Priority:** High - Essential for integrating agent work into main codebase

**Approved by:** Scrum Master Bob

**Date:** 2025-07-18

**Approval Notes:**
- Critical merge coordination functionality
- Git diff viewer and merge conflict detection
- Branch listing and cleanup options
- Completes basic git workflow integration
- Essential for agent work integration