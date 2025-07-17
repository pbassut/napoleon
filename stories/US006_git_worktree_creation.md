# US006: Git Worktree Creation

## Epic
**Epic 2: Git Integration & Worktree Management**

## Story
As a developer,
I want each agent to automatically work in its own git worktree,
so that agents can work on different features without conflicts.

## Description
This story implements automatic git worktree creation for each agent session, providing proper git isolation so multiple agents can work simultaneously without interfering with each other's changes. It integrates with the agent spawning process to create dedicated worktrees before launching agents.

## Priority
**High** - Core git integration functionality

## Acceptance Criteria

### AC1: Unique Worktree Creation
- System creates unique worktree for each agent using git worktree add
- Worktree creation is automated during agent spawn process
- Each worktree is isolated from others

### AC2: Worktree Naming Convention
- Worktree names follow pattern: agent-{id}-{timestamp}
- Names are unique and sortable
- Valid git reference names

### AC3: Worktree Directory Structure
- Each worktree is created in .add-manager-worktrees/ directory
- Directory is created in project root if it doesn't exist
- Proper directory permissions and structure

### AC4: Agent Working Directory
- Agent process is spawned with working directory set to its worktree
- Environment variables are set correctly for git operations
- Agent has full access to project files in isolation

### AC5: Git Repository Validation
- System validates git repository state before worktree creation
- Checks for uncommitted changes and warns user
- Ensures repository is in clean state for worktree operations

### AC6: Worktree Creation Error Handling
- Worktree creation failures are handled gracefully with rollback
- Clear error messages for common git worktree issues
- Fallback mechanisms for edge cases

### AC7: Agent Spawn Integration
- Agent spawn dialog displays target worktree path for confirmation
- Worktree creation is part of the agent spawn process
- Agent doesn't spawn if worktree creation fails

## Technical Requirements

### Git Integration
```javascript
// Git worktree creation
const { exec } = require('child_process');

function createWorktree(agentId) {
  const timestamp = Date.now();
  const worktreeName = `agent-${agentId}-${timestamp}`;
  const worktreePath = `.add-manager-worktrees/${worktreeName}`;
  
  return new Promise((resolve, reject) => {
    exec(`git worktree add ${worktreePath}`, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Worktree creation failed: ${stderr}`));
      } else {
        resolve(worktreePath);
      }
    });
  });
}
```

### Directory Structure
```
project-root/
├── .git/
├── .add-manager-worktrees/
│   ├── agent-001-1642434567890/
│   ├── agent-002-1642434678901/
│   └── agent-003-1642434789012/
├── src/
└── package.json
```

### Git Commands
- `git worktree add <path>` - Create new worktree
- `git worktree list` - List existing worktrees
- `git status` - Check repository state
- `git branch` - Manage branches

## Definition of Done
- [x] Unique worktree creation is implemented
- [x] Naming convention is followed consistently
- [x] Directory structure is created properly
- [x] Agent working directory is set correctly
- [x] Git repository validation is functional
- [x] Error handling covers all failure scenarios
- [x] Agent spawn integration is seamless
- [x] Worktree cleanup is handled (basic)
- [x] Unit tests validate worktree operations
- [x] Integration tests cover git workflow

## Notes
- This is the first story to introduce git operations
- Focus on robust git integration and error handling
- Ensure compatibility with different git versions
- Consider edge cases like shallow clones
- Test with various repository states

## Related Stories
- US003: Agent Spawning Core Functionality (prerequisite)
- US007: Branch Isolation Management (extends this)
- US008: Worktree Cleanup on Agent Termination (complements this)
- US009: Basic Merge Coordination Tools (builds on this)
- US005: Basic Agent Termination (needs cleanup integration)