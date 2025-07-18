# Data Models and Schema Changes

## New Data Models

### SDK Session Model
**Purpose:** Replace process-based session tracking with SDK-based session management  
**Integration:** Replaces process-specific fields in existing session structure

**Key Attributes:**
- `sessionId`: String - Unique SDK session identifier (reuses existing agent ID)
- `sdkStatus`: String - SDK-specific status tracking
- `lastMessageId`: String - Track last SDK message for recovery

**Relationships:**
- **With Existing:** Direct replacement of process-related fields
- **With New:** None - self-contained session structure

## Schema Integration Strategy

**Database Changes Required:**
- **New Tables:** None - using existing session storage
- **Modified Tables:** Session structure simplified
- **New Indexes:** None - existing lookup patterns unchanged
- **Migration Strategy:** Clean break - new sessions use new structure

**Breaking Changes:**
- Remove `pid` field entirely
- Remove `process` reference (was never persisted anyway)
- Simplify status tracking for SDK model

## Session Data Evolution

**New Session Structure:**
```javascript
{
  id: "agent-xxx",
  instructions: "...",
  spawnTime: "ISO-8601",
  status: "running",       // Simplified: running, idle, error
  workingDirectory: "/path",
  worktreePath: "/path",
  worktreeName: "agent-xxx",
  gitRoot: "/path",
  lastActivity: "ISO-8601",
  logs: [],
  
  // SDK-specific fields:
  sdkStatus: "active",     // active, aborted, completed
  lastMessageId: "msg-xxx" // For recovery/resume
}
```