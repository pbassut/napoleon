# Persistent Agent Logging Architecture

## Overview

This document outlines the architecture for implementing persistent logging of Napoleon agent sessions, including initial prompts in filenames for easy identification and complete SDK communication capture for debugging purposes.

## Current State Analysis

### Existing Logging System
- **Session Logs**: Stored in `~/.napoleon/sessions.json` with 1000-entry rolling buffer
- **Winston Logs**: Application-level logs in `~/.napoleon/logs/combined.log`
- **Agent Lifecycle**: Logs are lost when agents terminate
- **SDK Communication**: Captured in memory but not persisted to files

### Problem Statement
- Agent logs disappear when sessions terminate
- No historical debugging capability for completed agents
- Raw Claude SDK requests/responses not accessible for troubleshooting
- Difficult to correlate agent behavior with initial instructions

## Proposed Architecture

### Directory Structure
```
~/.napoleon/logs/agents/
├── 2024-01-15_agent-123_fix-auth-bug.log
├── 2024-01-15_agent-124_add-user-dashboard.log
├── 2024-01-15_agent-125_refactor-db-queries.log
└── ...
```

### File Naming Convention
```
{date}_{agent-id}_{sanitized-prompt}.log

Components:
- date: YYYY-MM-DD format for chronological sorting
- agent-id: Unique agent identifier 
- sanitized-prompt: First 50 chars of instructions, alphanumeric + hyphens

Examples:
- 2024-01-15_agent-12345_fix-bug-in-auth-system.log
- 2024-01-15_agent-12346_add-user-dashboard-component.log
```

### Log Entry Format
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "agentId": "agent-12345", 
  "type": "system|sdk_request|sdk_response|sdk_error|info",
  "source": "napoleon|claude_sdk|user",
  "content": "Raw message content or JSON",
  "metadata": {
    "event": "agent_spawn|agent_termination|message",
    "messageId": "msg_123",
    "model": "claude-3-sonnet",
    "duration": 1200,
    "promptLength": 150
  }
}
```

## Implementation Plan

### Phase 1: Core Infrastructure

#### 1. Agent Log Manager
**File**: `src/core/logging/agent-log-manager.js`

Core service responsible for:
- Creating log files with descriptive names
- Managing active log streams 
- Writing structured log entries
- Handling agent termination cleanup

```javascript
class AgentLogManager {
  constructor(config)
  async initialize()
  async createAgentLog(agentId, instructions)
  async writeLogEntry(agentId, entry) 
  async terminateAgentLog(agentId)
  getLogPath(agentId)
  sanitizePrompt(instructions)
}
```

#### 2. Agent Manager Integration
**File**: `src/core/agent-manager.js`

Integration points:
- Initialize AgentLogManager in constructor
- Create log file during agent spawn
- Write SDK messages to persistent log
- Close log file during agent termination

#### 3. SDK Communication Enhancement
**File**: `src/core/sdk/communication-manager.js`

Enhanced logging:
- Log raw SDK requests before execution
- Log raw SDK responses after completion  
- Log SDK errors with full stack traces
- Include timing and token usage metadata

### Phase 2: CLI and UI Integration

#### 4. Log Viewing Commands
**File**: `src/cli/commands/logs.js`

CLI commands for:
- Listing all agent logs with prompts
- Viewing specific log files
- Searching logs by prompt keywords
- Filtering logs by date range

#### 5. Agent Detail View Enhancement
**File**: `src/ui/components/agent-detail-view.js`

UI enhancements:
- Display persistent log file path
- Button to open log in external viewer
- Historical log access for terminated agents

### Phase 3: Advanced Features

#### 6. Log Retention Management
**File**: `src/core/logging/log-retention-manager.js`

Retention policies:
- Automatic cleanup of logs older than N days
- Log compression for space efficiency
- Configurable retention rules

#### 7. Log Search and Analysis
**File**: `src/core/logging/log-query-service.js`

Advanced capabilities:
- Full-text search across all logs
- Prompt-based log discovery
- Agent performance analytics
- Error pattern analysis

## Technical Design Details

### File Stream Management
- Use Node.js `createWriteStream` for efficient log writing
- Maintain Map of active streams keyed by agent ID
- Ensure streams are properly closed on termination
- Handle stream errors gracefully

### Prompt Sanitization
```javascript
sanitizePrompt(instructions) {
  return instructions
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special chars
    .trim()
    .substring(0, 50)               // Limit length
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .toLowerCase();                 // Normalize case
}
```

### SDK Logging Integration
- Intercept SDK requests/responses in communication manager
- Log complete request payloads with metadata
- Capture response timing and token usage
- Handle streaming responses appropriately

### Error Handling
- Graceful degradation if log directory creation fails
- Continue agent operation even if logging fails
- Log system errors to Winston logs
- Provide clear error messages for debugging

## Benefits

### For Debugging
- **Complete History**: Full agent execution trace preserved
- **SDK Transparency**: Raw Claude API communication visible  
- **Timeline Reconstruction**: Chronological view of agent behavior
- **Error Analysis**: Complete error context with stack traces

### For Operations
- **Stable Paths**: `tail -f` works throughout agent lifecycle
- **Easy Discovery**: Prompt-based filenames enable quick log location
- **Monitoring**: External tools can monitor log directories
- **Retention**: Configurable cleanup prevents disk space issues

### For Development
- **Non-Intrusive**: Existing logging system unchanged
- **Extensible**: Easy to add new log types and metadata
- **Searchable**: Full-text search capabilities
- **Analyzable**: Structured format enables log analysis tools

## Configuration

### Environment Variables
```bash
NAPOLEON_LOG_RETENTION_DAYS=30    # Days to keep logs
NAPOLEON_MAX_PROMPT_LENGTH=50     # Filename prompt length
NAPOLEON_LOG_SDK_REQUESTS=true    # Log raw SDK communication
```

### Config File Settings
```json
{
  "logging": {
    "agents": {
      "enabled": true,
      "retentionDays": 30,
      "maxPromptLength": 50,
      "logSDKRequests": true,
      "logSDKResponses": true
    }
  }
}
```

## Migration Strategy

### Backward Compatibility
- Existing session-based logging continues unchanged
- Agent Detail View shows both in-memory and persistent logs
- No breaking changes to existing API surface

### Rollout Plan
1. **Phase 1**: Core logging infrastructure
2. **Phase 2**: Basic CLI and UI integration  
3. **Phase 3**: Advanced features and retention
4. **Gradual Adoption**: Enable via feature flag initially

## Usage Examples

### Command Line Usage
```bash
# Monitor active agent log
tail -f ~/.napoleon/logs/agents/2024-01-15_agent-123_fix-auth-bug.log

# List recent agent logs
ls -la ~/.napoleon/logs/agents/ | head -10

# Find logs by prompt
ls ~/.napoleon/logs/agents/*auth*.log

# Clean old logs
find ~/.napoleon/logs/agents/ -name "*.log" -mtime +30 -delete

# Search log content
grep -r "error" ~/.napoleon/logs/agents/
```

### Programmatic Access
```javascript
// Get log path for active agent
const logPath = agentLogManager.getLogPath(agentId);

// List all agent logs  
const logs = await agentLogManager.listAllLogs();

// Search logs by prompt
const authLogs = logs.filter(log => log.prompt.includes('auth'));
```

## Testing Strategy

### Unit Tests
- AgentLogManager file operations
- Prompt sanitization logic
- Log entry formatting
- Stream management

### Integration Tests  
- End-to-end agent lifecycle logging
- SDK communication capture
- UI log display functionality
- CLI command execution

### Performance Tests
- Log writing performance under load
- Disk space usage patterns
- Stream cleanup verification
- Large log file handling

## Future Enhancements

### Advanced Analytics
- Agent performance metrics
- Common error pattern detection
- Success/failure rate tracking
- Resource usage analysis

### Export Capabilities
- Export logs to external systems
- JSON/CSV export formats
- Log shipping to centralized logging
- Integration with monitoring tools

### Real-time Features
- WebSocket log streaming to UI
- Live log filtering and search
- Real-time agent monitoring dashboards
- Alert system for agent failures

---

This architecture provides a robust foundation for persistent agent logging while maintaining simplicity and extensibility for future enhancements.