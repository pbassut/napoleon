# Napoleon Brownfield Enhancement PRD

## Intro Project Analysis and Context

### Existing Project Overview

#### Analysis Source
- IDE-based fresh analysis (current project loaded)
- Architecture document available at: `/docs/architecture.md`

#### Current Project State
Based on my analysis, ADD Manager is a CLI tool for managing multiple Claude CLI sessions with isolated git worktrees. It provides:
- Terminal UI dashboard for spawning and monitoring AI agents
- Git worktree isolation for each agent
- Process lifecycle management
- NPM package deployment (`add-manager`)

### Available Documentation Analysis
✓ Tech Stack Documentation (from package.json and source analysis)
✓ Source Tree/Architecture (comprehensive architecture.md available)
✓ Coding Standards (ESLint configuration found)
✓ API Documentation (internal APIs documented in code)
✗ External API Documentation (Claude CLI interface not formally documented)
✓ UX/UI Guidelines (terminal UI patterns in code)
✓ Technical Debt Documentation (identified in architecture.md)

### Enhancement Scope Definition

#### Enhancement Type
✓ Technology Stack Upgrade (replacing CLI with SDK)
✓ Major Feature Modification (core communication layer)

#### Enhancement Description
Replace the current child process spawning mechanism that executes Claude CLI with direct SDK integration using @anthropic-ai/claude-code, while maintaining all existing functionality and user experience.

#### Impact Assessment
✓ Moderate Impact (some existing code changes)
- Surgical replacement within AgentManager class
- No UI changes required
- Session structure simplified

### Goals and Background Context

#### Goals
- Enable more reliable agent communication through structured SDK API
- Eliminate dependency on Claude CLI installation
- Improve response handling and error management
- Maintain 100% feature compatibility with existing system
- Position for future enhancements (streaming, better recovery)

#### Background Context
The current ADD Manager relies on spawning Claude CLI as child processes, which introduces complexity in process management, stdin/stdout handling, and session recovery. The Claude Code SDK provides a cleaner, more reliable API that eliminates these pain points while maintaining all current functionality. This enhancement represents a core architectural improvement that will make the system more maintainable and extensible.

### Change Log
| Change | Date | Version | Description | Author |
|--------|------|---------|-------------|---------|
| Initial | 2025-01-17 | 1.0.0 | Created brownfield PRD for Napoleon SDK integration | John (PM) |

## Requirements

### Functional Requirements

- **FR1**: The system shall replace Claude CLI child process spawning with @anthropic-ai/claude-code SDK initialization while maintaining all existing agent management capabilities
- **FR2**: The system shall maintain the exact same terminal UI behavior, including all keyboard shortcuts, navigation, and status displays
- **FR3**: The system shall preserve git worktree creation and isolation for each agent session
- **FR4**: The system shall transform SDK responses to match the existing log format expected by the terminal UI
- **FR5**: The system shall handle SDK session lifecycle (create, query, abort) equivalent to current process management
- **FR6**: The system shall update session persistence to store SDK-specific fields while maintaining compatibility
- **FR7**: The system shall provide equivalent error handling and recovery mechanisms for SDK failures
- **FR8**: The system shall maintain the 3-agent concurrency limit with SDK sessions
- **FR9**: The system shall support API key configuration through environment variables
- **FR10**: The system shall complete global rebrand from "add-manager" to "napoleon" across all user-facing elements

### Non-Functional Requirements

- **NFR1**: The SDK integration shall maintain or improve upon the current 2-second startup time
- **NFR2**: The system shall reduce memory usage compared to child process spawning (target: <80MB base)
- **NFR3**: The SDK shall provide response times equal to or better than CLI parsing (<100ms overhead)
- **NFR4**: The system shall support Node.js 18.0.0 or higher (upgrade from 16.0.0)
- **NFR5**: The system shall handle API rate limits gracefully with exponential backoff
- **NFR6**: The system shall never log or expose API keys in any output
- **NFR7**: The SDK integration shall maintain the current 95%+ success rate for agent operations
- **NFR8**: The system shall provide clear migration documentation for existing users

### Compatibility Requirements

- **CR1**: All public methods in AgentManager class must maintain exact same signatures and behavior
- **CR2**: Session JSON structure must remain readable by existing code, with new fields being additive only
- **CR3**: Terminal UI must receive data in exact same format - no changes to UI data contracts
- **CR4**: Git worktree operations and branch naming must remain identical to preserve workflow compatibility

## Technical Constraints and Integration Requirements

### Existing Technology Stack

**Languages**: JavaScript (Node.js 16+, upgrading to 18+)
**Frameworks**: blessed (terminal UI), commander.js (CLI), winston (logging), joi (validation)
**Database**: None - JSON file-based session storage in ~/.add-manager/
**Infrastructure**: NPM package distribution, local file system for persistence
**External Dependencies**: Git (2.20.0+), Claude CLI (being replaced)

### Integration Approach

**Database Integration Strategy**: Session JSON files remain in same location (renamed to ~/.napoleon/), structure updated to remove process-specific fields (pid) and add SDK fields (sdkStatus, lastMessageId)

**API Integration Strategy**: All public AgentManager methods maintain identical interfaces. Internal implementation switches from spawn/stdin/stdout to SDK initialization and query methods. Message transformation layer converts SDK responses to expected format.

**Frontend Integration Strategy**: Zero changes to blessed terminal UI. Message transformer ensures SDK responses match exact format expected by UI components (agent-detail-view.js, etc.)

**Testing Integration Strategy**: Existing Jest tests updated to mock SDK instead of child_process. New tests added for SDK-specific functionality. Integration tests verify end-to-end flow with SDK.

### Code Organization and Standards

**File Structure Approach**: New SDK code organized in src/core/sdk/ directory. Existing file structure preserved. New files follow kebab-case naming (communication-manager.js, message-transformer.js).

**Naming Conventions**: Follow existing patterns - camelCase for variables/functions, PascalCase for classes, UPPER_SNAKE for constants. SDK-specific code prefixed appropriately.

**Coding Standards**: Maintain ESLint airbnb-base configuration. CommonJS modules (no ES6 imports). 2-space indentation, semicolons required. JSDoc for public methods.

**Documentation Standards**: Inline comments for complex SDK logic. README updated with SDK setup instructions. API key configuration documented prominently.

### Deployment and Operations

**Build Process Integration**: No changes to build process. SDK added as standard npm dependency. Node.js version bump handled in package.json engines field.

**Deployment Strategy**: Publish as new NPM package "napoleon" starting at v1.0.0. Not an update to add-manager. Users choose which package to use.

**Monitoring and Logging**: Winston logger continues for all operations. SDK errors wrapped in existing error classes. Additional logging for SDK session lifecycle.

**Configuration Management**: API key via ANTHROPIC_API_KEY environment variable. All other config remains in existing JSON structure. Config migration automatic.

### Risk Assessment and Mitigation

**Technical Risks**: SDK API changes could break integration. Mitigation: Pin SDK version, comprehensive test coverage, monitor SDK changelog.

**Integration Risks**: Message format mismatch could break UI. Mitigation: Extensive message transformation testing, UI contract tests.

**Deployment Risks**: Users might not set API key correctly. Mitigation: Clear error messages, setup validation, prominent documentation.

**Mitigation Strategies**: Incremental development with each story maintaining working state. Comprehensive testing at each stage. Clear rollback path via package versioning.

## Epic and Story Structure

### Epic Approach

**Epic Structure Decision**: Single comprehensive epic for the Napoleon enhancement

**Rationale**: This brownfield enhancement represents a cohesive change to the core communication layer. While it involves multiple steps (rebrand, SDK integration, testing), all changes are tightly coupled and work toward the single goal of replacing CLI with SDK. Breaking this into multiple epics would create artificial boundaries and complicate the integration process.

## Epic 1: Napoleon SDK Integration Enhancement

**Epic Goal**: Successfully migrate ADD Manager from CLI-based process spawning to SDK-based communication while rebranding to Napoleon, maintaining 100% feature compatibility and improving reliability.

**Integration Requirements**: All existing functionality must remain intact throughout the migration. Each story must leave the system in a working state. Changes must be reversible if issues arise.

### Story 1.1: Global Napoleon Rebrand

As a developer,
I want to rebrand ADD Manager to Napoleon across the entire codebase,
so that the new package has a distinct identity and avoids confusion with the CLI-based version.

#### Acceptance Criteria
1. Package.json name field updated from "add-manager" to "napoleon"
2. CLI command changed from `add-manager` to `napoleon` in bin/
3. All references to "add-manager" in code, comments, and documentation updated to "napoleon"
4. Configuration directory renamed from ~/.add-manager/ to ~/.napoleon/
5. Any ADD_MANAGER_* environment variables renamed to NAPOLEON_*
6. All user-facing messages updated with new branding
7. README and documentation reflect new name consistently

#### Integration Verification
- IV1: Existing git worktree functionality works with new directory structure
- IV2: Session persistence loads from new ~/.napoleon/ location
- IV3: All terminal UI elements display correctly with new branding

### Story 1.2: Node.js 18 Upgrade and SDK Setup

As a developer,
I want to upgrade to Node.js 18 and add the Claude Code SDK dependency,
so that the project is ready for SDK integration with modern runtime support.

#### Acceptance Criteria
1. Package.json engines field updated to require Node.js >=18.0.0
2. @anthropic-ai/claude-code dependency added at version ^1.0.53
3. All existing dependencies tested for Node.js 18 compatibility
4. SDK types and interfaces documented in new src/core/sdk/sdk-types.js
5. Environment variable setup documented for ANTHROPIC_API_KEY
6. Git ignored files updated to exclude any API key files

#### Integration Verification
- IV1: All existing tests pass under Node.js 18
- IV2: Blessed terminal UI renders correctly in Node.js 18
- IV3: No performance degradation observed in terminal responsiveness

### Story 1.3: SDK Communication Manager Implementation

As a developer,
I want to implement the SDK communication manager module,
so that we have a clean abstraction for SDK operations separate from the existing code.

#### Acceptance Criteria
1. Create src/core/sdk/communication-manager.js with SDK initialization logic
2. Implement initializeSDKSession(agentId, workingDirectory) method
3. Implement executeQuery(agentId, prompt, options) for sending instructions
4. Implement handleSDKMessage(agentId, message) for processing responses
5. Implement terminateSession(agentId) for clean shutdown
6. Add comprehensive error handling with existing error classes
7. Include session recovery logic using lastMessageId tracking
8. Unit tests achieve 80%+ coverage of SDK module

#### Integration Verification
- IV1: SDK module can be imported without affecting existing functionality
- IV2: Error handling follows existing application patterns
- IV3: Logging integrates seamlessly with winston logger

### Story 1.4: Message Transformer Implementation

As a developer,
I want to implement message transformation between SDK and UI formats,
so that the terminal UI continues to work without any modifications.

#### Acceptance Criteria
1. Create src/core/sdk/message-transformer.js module
2. Implement transformSDKMessage(sdkMessage) to convert SDK format to UI format
3. Implement extractContent(message) to pull text from SDK messages
4. Implement mapMessageType(sdkType) to map SDK types to UI log types
5. Handle all SDK message types (text, error, system, etc.)
6. Preserve exact formatting expected by terminal UI components
7. Unit tests verify all message type transformations

#### Integration Verification
- IV1: Transformed messages render correctly in agent-detail-view
- IV2: Log scrolling and search functionality work as before
- IV3: Status indicators update properly based on transformed messages

### Story 1.5: AgentManager SDK Integration

As a developer,
I want to replace process spawning with SDK calls in AgentManager,
so that agents use the SDK while maintaining the same external interface.

#### Acceptance Criteria
1. Replace spawnClaudeProcess() internals to use SDK initialization
2. Update sendInstructions() to use SDK executeQuery()
3. Modify handleAgentOutput() to process SDK responses via transformer
4. Update terminateAgent() to properly close SDK sessions
5. Maintain all existing method signatures unchanged
6. Update session structure to include SDK fields (remove pid, add sdkStatus)
7. Ensure status tracking accurately reflects SDK session states

#### Integration Verification
- IV1: All terminal UI interactions work identically (spawn, terminate, view logs)
- IV2: Git worktree creation and management unchanged
- IV3: Session persistence and recovery function correctly

### Story 1.6: End-to-End Testing and Validation

As a developer,
I want to comprehensively test the SDK integration,
so that we can confidently release Napoleon as a reliable replacement for ADD Manager.

#### Acceptance Criteria
1. Integration tests cover full agent lifecycle with SDK
2. Multiple concurrent agents tested up to 3-agent limit
3. Session recovery tested after application restart
4. Error scenarios tested (API key missing, network errors, SDK failures)
5. Performance benchmarks show improvement over CLI approach
6. Memory usage validated to be under 80MB base
7. Documentation updated with setup and migration instructions
8. Manual testing checklist completed for all UI interactions

#### Integration Verification
- IV1: Side-by-side testing shows identical functionality between versions
- IV2: No regressions identified in terminal UI behavior
- IV3: Git operations maintain full compatibility