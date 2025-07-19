# Napoleon SDK Migration - Brownfield Enhancement Epic

## Epic Title
Napoleon Process-to-SDK Architecture Migration - Brownfield Enhancement

## Epic Goal
Completely eliminate operating system process dependencies from Napoleon agent management and transition to a single-process SDK-based architecture that maintains all existing functionality while removing PID displays, process monitoring, and process lifecycle management.

## Epic Description

**Existing System Context:**
- Current relevant functionality: Napoleon agent management using OS processes with PID tracking, spawn/kill operations, and process-based resource monitoring
- Technology stack: Node.js with child_process management, React UI components, Jest testing framework
- Integration points: Agent Manager core, UI components (agent list, detail view, termination dialog), Worktree Discovery, test suites

**Enhancement Details:**
- What's being added/changed: Complete replacement of process-based agent management with SDK session management, removal of all PID references, elimination of CPU/Memory monitoring tied to processes
- How it integrates: SDK sessions replace process objects throughout the system while maintaining existing agent lifecycle, status, and management capabilities
- Success criteria: No process dependencies remain, all UI components display SDK-appropriate information, existing agent functionality preserved

## Stories

1. **Story 1:** Remove PID Display from Agent UI Components - Eliminates process references from agent list, detail view, and termination dialog while maintaining visual consistency and information clarity

2. **Story 2:** Remove Process Management from Agent Core - Replaces process spawning, validation, and termination with SDK session lifecycle management while preserving all agent management capabilities

3. **Story 3:** Update Documentation and Configuration for SDK Architecture - Removes process references from documentation, schemas, and migration scripts while maintaining development workflow integration

4. **Story 4:** Remove CPU/Memory Monitoring and Process Resource Tracking - Eliminates process-based resource monitoring and updates QA scripts while preserving agent status information display

## Compatibility Requirements

- [x] Existing agent management APIs remain functionally unchanged
- [x] Agent session data structures maintain backward compatibility where possible
- [x] UI components follow existing design patterns and layouts
- [x] Performance impact is minimal (actually improved by removing process overhead)

## Risk Mitigation

- **Primary Risk:** Breaking existing agent lifecycle management during transition from processes to SDK
- **Mitigation:** Incremental story implementation with thorough testing at each step, maintaining parallel functionality during transition where possible
- **Rollback Plan:** Each story is isolated and can be reverted independently; process-based code is commented out rather than deleted until SDK implementation is verified

## Definition of Done

- [ ] All 4 stories completed with acceptance criteria met
- [ ] Existing agent functionality verified through comprehensive testing
- [ ] SDK integration points working correctly for agent lifecycle
- [ ] Documentation updated to reflect SDK architecture
- [ ] No regression in existing agent management features
- [ ] All 89+ PID references eliminated from codebase
- [ ] 26 test files updated for SDK-based assertions
- [ ] QA scripts updated for single-process architecture

## Technical Impact Summary

**Files Requiring Updates:** 26+ core files including agent-manager.js, UI components, test suites
**Architecture Change:** Single-process SDK communication replaces multi-process spawning
**Data Model Changes:** Session objects replace process references, SDK status replaces PID validation
**UI Updates:** Agent information displays use SDK session data instead of process metrics
**Testing Impact:** All process-related test assertions updated for SDK session management

## Detailed Story Breakdown

### Story 1: Remove PID Display from Agent UI Components

**Files to Modify:**
- `/src/ui/index.js:804` - Remove pidText formatting and display
- `/src/ui/components/agent-detail-view.js:357` - Remove PID field display
- `/src/ui/components/agent-termination-dialog.js:212` - Remove PID from confirmation dialog

**Acceptance Criteria:**
- Agent list display shows SDK status instead of PID information
- Agent detail view removes PID field and process-related resource monitoring
- Termination dialog displays agent name and session ID instead of PID
- All UI tests updated and passing

### Story 2: Remove Process Management from Agent Core

**Files to Modify:**
- `/src/core/agent-manager.js:90-119` - Replace process validation with SDK status
- `/src/core/agent-manager.js:287-294` - Remove `isProcessRunning()` method entirely
- `/src/core/agent-manager.js:680-682` - Replace process assignment with SDK session ID
- `/src/core/agent-manager.js:1011-1021` - Replace process termination with SDK abort
- `/src/core/worktree-discovery.js:217-273` - Remove process detection logic

**Acceptance Criteria:**
- Replace `spawnClaudeProcess()` with SDK session initialization
- Remove `isProcessRunning(pid)` validation and replace with SDK status checking
- Update agent termination to use SDK session abort instead of process.kill()
- Session restoration logic adapted for SDK sessions

### Story 3: Update Documentation and Configuration for SDK Architecture

**Files to Modify:**
- `/docs/prd/data-models-and-schema-changes.md:27` - Remove PID field documentation
- `/docs/napoleon-brownfield-prd.md:104,248` - Update session structure documentation
- `/bin/migrate-to-napoleon.js:208,215` - Update migration for SDK sessions

**Acceptance Criteria:**
- Remove PID field documentation from data model schemas
- Update Napoleon brownfield PRD to reflect SDK architecture
- Update migration script to handle SDK sessions instead of process references
- All documentation internally consistent

### Story 4: Remove CPU/Memory Monitoring and Process Resource Tracking

**Files to Modify:**
- `/src/ui/components/agent-detail-view.js:350-351,696-709` - Remove CPU/Memory methods
- `/QA_COMPREHENSIVE_REPORT.md:235-239` - Remove pidusage references
- `/qa_test_comprehensive.js` & `/qa_test_improved.js` - Update process monitoring tests

**Acceptance Criteria:**
- Remove CPU/Memory usage methods from agent detail view
- Remove pidusage library references and dependencies
- Replace or remove resource monitoring in QA test scripts
- No broken resource monitoring references remain

---

**Story Manager Handoff:**

"Please develop detailed user stories for this brownfield epic. Key considerations:

- This is an enhancement to an existing system running Node.js with React UI components and Jest testing
- Integration points: Agent Manager core lifecycle, UI agent information display, Worktree Discovery process detection, comprehensive test suites
- Existing patterns to follow: Agent session management patterns, UI agent information display patterns, status tracking approaches
- Critical compatibility requirements: Maintain all existing agent management functionality, preserve UI information clarity, ensure no regression in agent lifecycle operations
- Each story must include verification that existing agent management functionality remains intact

The epic should maintain system integrity while delivering complete elimination of operating system process dependencies from Napoleon agent architecture."