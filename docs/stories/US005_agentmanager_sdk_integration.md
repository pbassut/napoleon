# Story 1.5: AgentManager SDK Integration

## User Story

As a developer,
I want to replace process spawning with SDK calls in AgentManager,
so that agents use the SDK while maintaining the same external interface.

## Acceptance Criteria

1. Replace spawnClaudeProcess() internals to use SDK initialization
2. Update sendInstructions() to use SDK executeQuery()
3. Modify handleAgentOutput() to process SDK responses via transformer
4. Update terminateAgent() to properly close SDK sessions
5. Maintain all existing method signatures unchanged
6. Update session structure to include SDK fields (remove pid, add sdkStatus)
7. Ensure status tracking accurately reflects SDK session states

## Integration Verification

- IV1: All terminal UI interactions work identically (spawn, terminate, view logs)
- IV2: Git worktree creation and management unchanged
- IV3: Session persistence and recovery function correctly

## Status: ✅ Approved - Ready for Implementation

**Priority**: HIGH  
**Approved by**: Scrum Master Bob  
**Date**: 2025-07-18