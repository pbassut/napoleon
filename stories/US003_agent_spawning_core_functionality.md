# US003: Agent Spawning Core Functionality

## Epic
**Epic 1: Foundation & Core Infrastructure**

## Story
As a developer,
I want to spawn a new Claude CLI agent session,
so that I can delegate tasks to AI agents with proper isolation.

## Description
This story implements the core agent spawning functionality that allows users to create new Claude CLI agent sessions through an interactive dialog. It handles the process creation, basic session management, and enforces the MVP constraint of maximum 3 concurrent agents.

## Priority
**High** - Core functionality required for agent management

## Acceptance Criteria

### AC1: Agent Spawn Dialog
- Pressing 'n' or 'new' opens interactive agent spawn dialog
- Dialog provides clear prompts for user input
- Dialog can be cancelled and returns to main dashboard

### AC2: Agent Instructions Input
- User can enter agent instructions/prompts through text input
- Multi-line text input support for complex instructions
- Input validation for minimum instruction length

### AC3: Git Repository Validation
- System validates git repository context before spawning
- Checks for valid git repository in current directory
- Prevents spawning if not in a git repository

### AC4: Process Spawning
- Agent process spawns using child_process with Claude CLI
- Proper command-line argument construction
- Process spawning with correct environment variables

### AC5: Session Storage
- Basic session data is stored in ~/.add-manager/sessions.json
- Session includes: ID, instructions, spawn time, status
- Storage is atomic and handles concurrent access

### AC6: Dashboard Integration
- Agent appears in main dashboard with "running" status
- Status updates in real-time
- Clear visual indication of new agent

### AC7: Concurrent Agent Limit
- System enforces maximum 3 concurrent agents limit
- Clear error message when limit is reached
- Suggests terminating existing agents

### AC8: Error Handling
- User receives clear error messages for spawn failures
- Handles Claude CLI not found errors
- Provides troubleshooting guidance

## Technical Requirements

### Dependencies
- Node.js child_process module
- File system operations for session storage
- JSON parsing and serialization

### Process Management
```javascript
// Example agent spawn process
const spawn = require('child_process').spawn;
const agent = spawn('claude', ['--session-id', sessionId], {
  cwd: workingDirectory,
  stdio: ['pipe', 'pipe', 'pipe']
});
```

### Session Storage Format
```json
{
  "sessions": [
    {
      "id": "agent-1234567890",
      "instructions": "Help me implement a new feature",
      "spawnTime": "2025-07-17T10:00:00Z",
      "status": "running",
      "pid": 12345,
      "workingDirectory": "/path/to/project"
    }
  ]
}
```

### Error Scenarios
- Claude CLI not installed
- Git repository not found
- Maximum agents limit reached
- Process spawn failures
- File system permissions issues

## Definition of Done
- [x] Agent spawn dialog is functional and intuitive
- [x] Text input for instructions works properly
- [x] Git repository validation is implemented
- [x] Process spawning creates working Claude CLI sessions
- [x] Session data is persisted correctly
- [x] Dashboard shows new agents immediately
- [x] 3-agent limit is enforced properly
- [x] Error messages are clear and helpful
- [x] Unit tests cover all spawn scenarios
- [x] Integration tests validate end-to-end flow

## Implementation Summary
**Status: ✅ COMPLETED**

All acceptance criteria have been successfully implemented:

### Key Features Implemented:
1. **Agent Spawn Dialog** - Interactive dialog with text input for agent instructions
2. **Git Repository Validation** - Validates git context before spawning agents
3. **Process Spawning** - Creates Claude CLI processes with proper isolation
4. **Session Management** - Persistent storage of agent sessions in ~/.add-manager/sessions.json
5. **Dashboard Integration** - Real-time agent status updates with visual indicators
6. **3-Agent Limit** - Enforces maximum concurrent agents with clear error messages
7. **Error Handling** - Comprehensive error handling with user-friendly messages

### Test Coverage:
- **63 total tests** with **100% passing rate**
- **Agent Manager**: 24 tests covering spawning, validation, session management
- **Terminal UI**: 20 tests covering interface, keyboard shortcuts, dialog handling
- **CLI Integration**: 7 tests covering command-line interface functionality
- **Configuration**: 6 tests covering settings and storage
- **Environment**: 4 tests covering validation and requirements
- **Error Handling**: 2 tests covering custom error classes

### Files Created/Modified:
- `src/core/agent-manager.js` - Core agent lifecycle management
- `src/ui/components/agent-spawn-dialog.js` - Interactive spawn dialog
- `src/ui/index.js` - Updated with agent spawning integration
- `__tests__/agent-manager.test.js` - Comprehensive test suite
- `__tests__/ui.test.js` - Updated with blessed mock fixes

## Notes
- This is the first story that creates actual agent processes
- Focus on robust error handling and user feedback
- Ensure proper cleanup if spawning fails
- Consider process monitoring from the start
- Test with different Claude CLI versions

## Related Stories
- US001: Project Setup and CLI Framework (prerequisite)
- US002: Basic Terminal UI Foundation (prerequisite)
- US004: Basic Agent Status Display (works with this)
- US005: Basic Agent Termination (complements this)
- US006: Git Worktree Creation (extends this with git integration)