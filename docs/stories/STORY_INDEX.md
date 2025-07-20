# Napoleon Project - Story Index

## Overview

This index provides a complete list of all user stories for the Napoleon project. The stories are organized in development sequence, with the Napoleon SDK integration stories coming first, followed by the original Napoleon functionality stories.

## Story Sequence

### Phase 1: Napoleon SDK Integration (US001-US010)

These stories focus on rebranding to Napoleon and replacing CLI child process spawning with SDK integration.

| Story ID | Title | Description | Priority | Status |
|----------|-------|-------------|----------|---------|
| US001 | Global Napoleon Rebrand | Rebrand application to Napoleon across entire codebase | HIGH | ✅ **Approved** |
| US002 | Node.js 18 Upgrade and SDK Setup | Upgrade to Node.js 18 and add Claude Code SDK dependency | HIGH | ✅ **Approved** |
| US003 | SDK Communication Manager Implementation | Implement SDK communication manager module | HIGH | ✅ **Approved** |
| US004 | Message Transformer Implementation | Implement message transformation between SDK and UI formats | HIGH | ✅ **Approved** |
| US005 | AgentManager SDK Integration | Replace process spawning with SDK calls in AgentManager | HIGH | ✅ **Approved** |
| US006 | End-to-End Testing and Validation | Comprehensive testing of SDK integration | HIGH | ✅ **Approved** |
| US007 | Create Migration Guide | Comprehensive guide for users migrating to Napoleon | MEDIUM | ✅ **Done** |
| US008 | Create API Key Setup Tutorial | Step-by-step tutorial for obtaining and configuring API keys | MEDIUM | ✅ **Done** |
| US009 | Create CLI to SDK Migration Helper | Automated script to migrate session data and configuration | MEDIUM | ✅ **Approved** |
| US010 | Update User Documentation | Update all user-facing documentation with Napoleon branding | MEDIUM | ✅ **Approved** |

### Phase 2: Core Napoleon Functionality (US011-US024)

These stories implement the core Napoleon functionality within the Napoleon framework.

| Story ID | Title | Description | Priority | Status |
|----------|-------|-------------|----------|---------|
| US011 | Project Setup and CLI Framework | Install and initialize the application with CLI framework | HIGH | ✅ **Approved** |
| US012 | Basic Terminal UI Foundation | Create clean terminal interface using blessed framework | HIGH | ✅ **Approved** |
| US013 | Agent Spawning Core Functionality | Spawn new agent sessions with proper isolation | HIGH | ✅ **Done** |
| US014 | Basic Agent Status Display | Display status of all active agents at a glance | HIGH | ✅ **Approved** |
| US015 | Basic Agent Termination | Terminate agent sessions and free up resources | HIGH | ✅ **Approved** |
| US016 | Git Worktree Creation | Automatically create git worktrees for each agent | HIGH | ✅ **Approved** |
| US017 | Branch Isolation Management | Ensure each agent works on its own feature branch | HIGH | ✅ **Approved** |
| US018 | Worktree Cleanup on Agent Termination | Clean up worktrees when agents are terminated | MEDIUM | ✅ **Approved** |
| US019 | Basic Merge Coordination Tools | Review and merge agent changes from different branches | MEDIUM | ✅ **Approved** |
| US020 | Enhanced Agent Detail View | See detailed information about individual agents | MEDIUM | ✅ **Approved** |
| US021 | Advanced Process Monitoring | Comprehensive monitoring of agent processes | MEDIUM | ✅ **Approved** |
| US022 | Session Persistence and Recovery | Basic session persistence across application restarts | MEDIUM | ✅ **Approved** |
| US023 | Error Handling and Recovery | Robust error handling when agents fail | MEDIUM | ✅ **Approved** |
| US024 | Enhanced Keyboard Shortcuts and Navigation | Efficient keyboard shortcuts for all operations | LOW | ✅ **Approved** |

### Phase 3: UX Improvements and Startup Reliability (US025-US028)

These stories address critical UX issues and startup reliability improvements for Napoleon.

| Story ID | Title | Description | Priority | Status |
|----------|-------|-------------|----------|---------|
| US025 | Git Working Tree Status Warning | Warn users about dirty git state on startup that prevents agent spawning | HIGH | ✅ **Approved** |
| US026 | Anthropic API Key Validation | Validate Anthropic API key before app startup to prevent SDK failures | HIGH | ✅ **Approved** |
| US027 | Terminal Focus Recovery After Agent Spawning | Fix terminal focus loss after agent spawning that breaks keyboard workflow | HIGH | ✅ **Approved** |
| US028 | Spawn Dialog UX Improvements | Improve agent spawn dialog with intuitive keyboard shortcuts and flexible validation | HIGH | ✅ **Approved** |

### Phase 4: Critical Bug Fixes (US029-US030)

These stories address critical bugs discovered in the agent spawn dialog functionality.

| Story ID | Title | Description | Priority | Status |
|----------|-------|-------------|----------|---------|
| US029 | Agent Spawn Dialog Modal Close Bug | Fix modal not closing immediately during agent spawn, causing poor UX | CRITICAL | 🐛 **Bug Report** |
| US030 | Agent Spawn Dialog Input Duplication Bug | Fix keystroke duplication on second modal use causing double input | CRITICAL | 🐛 **Bug Report** |

### Phase 5: Napoleon SDK Migration Epic (US032-US035)

These stories complete the process-to-SDK architecture migration for Napoleon (formerly numbered 1.1-1.4).

| Story ID | Title | Description | Priority | Status |
|----------|-------|-------------|----------|---------|
| US032 | Remove PID Display from Agent UI | Eliminates process references from agent UI components | HIGH | ✅ **Done** |
| US033 | Remove Process Management from Agent Core | Replaces process spawning with SDK session lifecycle | HIGH | ✅ **Done** |
| US034 | Update Documentation and Configuration for SDK | Removes process references from documentation and config | HIGH | ✅ **Done** |
| US035 | Remove CPU/Memory Monitoring and Process Tracking | Eliminates process-based resource monitoring | HIGH | ✅ **Done** |

### Phase 6: Persistent Agent Logging Epic (US036-US042)

These stories implement comprehensive logging infrastructure for agent sessions.

| Story ID | Title | Description | Priority | Status |
|----------|-------|-------------|----------|---------|
| US036 | Agent Log Manager Core | Core logging infrastructure for capturing agent outputs | HIGH | ✅ **Approved** |
| US037 | Agent Manager Integration | Integrate logging with AgentManager lifecycle | HIGH | ✅ **Approved** |
| US038 | SDK Communication Logging | Log all SDK communication events | HIGH | ✅ **Approved** |
| US039 | CLI Log Viewing Commands | Command-line interface for viewing logs | MEDIUM | ✅ **Approved** |
| US040 | Agent Detail View Log Integration | Integrate logs into UI detail view | MEDIUM | ✅ **Approved** |
| US041 | Log Retention Management | Manage log storage and cleanup | LOW | ✅ **Approved** |
| US042 | Log Search and Analytics | Advanced search and analytics capabilities | LOW | ✅ **Approved** |

### Phase 7: Blessed to Ink Migration Epic (US043-US049)

These stories migrate the terminal UI from Blessed to Ink for a modern React-based architecture.

| Story ID | Title | Description | Priority | Status |
|----------|-------|-------------|----------|---------|
| US043 | Ink Environment Setup | Set up Ink React framework with TypeScript support | HIGH | ✅ **Approved** |
| US044 | Core Layout Components | Implement Header, Footer, and MainContent in Ink | HIGH | ✅ **Approved** |
| US045 | Agent List Implementation | Create scrollable agent list with keyboard navigation | HIGH | ✅ **Approved** |
| US046 | Agent Manager Integration | Connect Ink UI to existing AgentManager | HIGH | ✅ **Approved** |
| US047 | Spawn Dialog Implementation | Modal dialog for spawning new agents | HIGH | ✅ **Approved** |
| US048 | Termination Dialog Implementation | Confirmation dialog for agent termination | HIGH | ✅ **Approved** |
| US049 | Detail View Implementation | Real-time log viewer with search functionality | HIGH | ✅ **Approved** |

### Technical Debt Stories

| Story | Title | Description | Priority | Status |
|-------|-------|-------------|----------|---------|
| US050 | TypeScript ESLint Configuration | Configure ESLint to properly parse TypeScript and React files | MEDIUM | 📝 **Draft** |
| US051 | TypeScript Build Configuration | Fix TypeScript module resolution and build configuration | MEDIUM | 📝 **Draft** |
| US052 | Test Suite Component Relocation | Update test imports for relocated UI components | LOW | 📝 **Draft** |

## Development Notes

1. **Phase 1 Must Complete First**: The Napoleon SDK integration stories (US001-US010) must be completed before Phase 2, as they establish the new foundation.

2. **Story Dependencies**:
   - US002 depends on US001 (rebrand must happen first)
   - US003-US005 depend on US002 (SDK setup required)
   - US006 depends on US001-US005 (testing requires all components)
   - US011-US024 can proceed after US006 is complete

3. **Testing Approach**:
   - Each story includes integration verification criteria
   - US006 provides comprehensive end-to-end testing
   - Phase 2 stories should be tested against the SDK implementation

4. **Migration Support**:
   - US007-US010 provide user migration support
   - These can be developed in parallel with Phase 2 if needed

## Approval Status Summary

- **✅ 46 stories approved**: US001-US028, US032-US049 approved by Scrum Master Bob
- **📝 3 technical debt stories created**: US050-US052 address technical debt from US043 implementation
- **🐛 2 critical bug reports**: US029-US030 created on 2025-07-18 for agent spawn dialog issues  
- **7 stories already completed**: US007, US008, US013, US032-US035
- **4 epic stories integrated**: US032-US035 represent completed Napoleon SDK Migration Epic (formerly 1.1-1.4)
- **39 stories ready for implementation**: US001-US006, US009-US012, US014-US028, US036-US049
- **3 technical debt stories ready**: US050-US052 improve TypeScript/ESLint configuration and test suite
- **2 critical bug fixes needed**: US029-US030 address modal close and input duplication bugs
- **New Epic 6 (Logging)**: US036-US042 provide comprehensive agent logging infrastructure
- **New Epic 7 (Blessed to Ink)**: US043-US049 migrate UI to modern React architecture
- **Ready for development handoff**: All approved stories include detailed acceptance criteria and integration verification requirements

## File Locations

All story files are located in: `/docs/stories/`

Format: `US###_story_title.md`

## Related Documents

- [Napoleon Brownfield PRD](/docs/napoleon-brownfield-prd.md)
- [Architecture Document](/docs/architecture.md)
- [Original Napoleon PRD](/docs/prd.md)