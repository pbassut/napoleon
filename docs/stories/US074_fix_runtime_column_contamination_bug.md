# US074: Fix Runtime Column Contamination Bug

## Status
**Status:** Draft  
**Priority:** High  
**Type:** Bug Fix  
**Assignee:** Unassigned  
**Estimated Effort:** Small (2-4 hours)

## Story
**As a** Napoleon user managing multiple agents,  
**I want** each agent to display its own accurate runtime in the UI,  
**so that** I can properly monitor individual agent execution times without confusion.

## Acceptance Criteria
1. When multiple agents are spawned at different times, each agent displays its individual runtime starting from its actual spawn time
2. Runtime columns show distinct, accurate values for each agent reflecting their true spawn times  
3. All agents no longer show the same contaminated runtime value
4. Single agent runtime display continues to work correctly
5. Runtime updates continue to refresh every second as expected

## Tasks / Subtasks
- [ ] Fix data mapping in UI hook to use correct spawn time field (AC: 1, 2, 3)
  - [ ] Update `useAgentManager.ts` line 35 to use `spawnTime` instead of `createdAt`
  - [ ] Update `useAgentManager.ts` line 91 to use `spawnTime` instead of `createdAt` 
  - [ ] Verify both pending and active agents use consistent timing field
- [ ] Test runtime display with multiple agents (AC: 1, 2, 3)
  - [ ] Spawn 2-3 agents at different times (5-10 seconds apart)
  - [ ] Verify each shows correct individual runtime
  - [ ] Confirm no runtime value contamination between agents
- [ ] Regression test single agent runtime display (AC: 4)
- [ ] Verify runtime counter updates correctly (AC: 5)

## Dev Notes

### Previous Story Insights
No directly related previous stories found for runtime display functionality.

### Root Cause Analysis
The bug is caused by a **data mapping inconsistency** between backend agent storage and frontend UI processing:

**Backend Agent Manager** (`src/core/agent-manager.js`):
- Stores agent data with `spawnTime` field (line 996)
- Uses `spawnTime` for runtime calculations in `getAgentRuntime()` (line 1635)
- **Does NOT set a `createdAt` field** for regular spawned agents

**Frontend UI Hook** (`src/ui/ink/hooks/useAgentManager.ts`):
- Maps agent data in `convertAgent()` function (lines 31-40)
- **Incorrectly uses `createdAt` field** as source for `startTime` (line 35)
- Falls back to `new Date()` when `createdAt` is missing, causing all agents to get the same timestamp

**Contamination Mechanism**: When multiple agents are spawned, all get their `startTime` set to approximately the same timestamp (when the UI processes them), not their actual spawn time.

### File Locations
**Primary Fix Required**:
- `/src/ui/ink/hooks/useAgentManager.ts` - Lines 35 and 91 [Source: codebase analysis]

**Related Files**:
- `/src/core/agent-manager.js` - Agent spawn time storage (lines 993-1008) [Source: codebase analysis]
- `/src/ui/ink/components/AgentList/AgentItem.tsx` - Runtime display component (uses contaminated `startTime`) [Source: codebase analysis]

### Technical Implementation Details
**Specific Code Change Required**:
```typescript
// In useAgentManager.ts, lines 35 and 91:
// Change from:
startTime: agentData.createdAt ? new Date(agentData.createdAt) : new Date(),

// To:
startTime: agentData.spawnTime ? new Date(agentData.spawnTime) : new Date(),
```

**Data Fields Available**:
- `spawnTime`: Available on all spawned agents (ISO string format) [Source: agent-manager.js:996]
- `createdAt`: Only available on pending agents, not on active/spawned agents [Source: agent-manager.js:1454]

### Testing Requirements

**Testing Standards from Architecture**:
- Test file location: Following existing pattern in `/src/` directory with `.test.ts` extensions
- Test frameworks: Use existing Jest/testing framework as configured in project
- Focus on UI hook behavior with different agent states
- Manual testing required for visual runtime display verification

**Specific Test Cases**:
1. Multiple agents spawned at different intervals show different runtimes
2. Runtime values increase independently for each agent  
3. Single agent continues to work correctly
4. Edge case: agents spawned very close together still show distinct times

### Technical Constraints
- Maintain backward compatibility with existing agent data structure
- Preserve real-time runtime update functionality (1-second intervals)
- No changes required to backend agent storage since `spawnTime` already exists correctly

## Change Log
| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-07-23 | 1.0 | Initial story creation for runtime column contamination bug | Scrum Master |

## Dev Agent Record
*This section will be populated by the development agent during implementation*

## QA Results
*This section will be populated by the QA agent after testing*