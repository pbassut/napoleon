# ADD Manager Product Requirements Document (PRD)

## Goals and Background Context

### Goals

- Enable developers to efficiently manage multiple Claude CLI sessions with proper git isolation
- Provide a clean, intuitive terminal UI for spawning, monitoring, and managing AI agents
- Streamline agent-driven development workflows with git worktree integration
- Deliver a robust NPM CLI package that can be used via npx or global installation
- Ensure proper process lifecycle management for agent sessions
- Maintain clean git history while leveraging multiple AI sessions simultaneously

### Background Context

ADD Manager (Agent Driven Development) addresses the growing need for developers to coordinate multiple AI agents working on different aspects of a project simultaneously. Currently, developers struggle with managing multiple Claude CLI sessions while maintaining proper git isolation and avoiding conflicts between different AI workstreams.

The solution provides a terminal UI application that enables spawning AI agents in isolated git worktrees, monitoring their progress through a clean dashboard interface, and managing their lifecycle efficiently. This approach ensures that each agent works in its own branch context while providing developers with centralized control and visibility over all active sessions.

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-07-17 | 1.0 | Initial PRD creation | Claude Code |
| 2025-01-17 | 1.1 | Updated to note Napoleon enhancement project | John (PM) |

> **Note**: A brownfield enhancement project "Napoleon" has been initiated to replace the CLI child process spawning with Claude Code SDK integration. See [Napoleon Brownfield PRD](./napoleon-brownfield-prd.md) for details. The original ADD Manager will continue to be available while Napoleon is developed as a separate package.

## Requirements

### Functional

1. **FR1**: The system shall allow users to spawn new Claude CLI agent sessions through interactive prompts
2. **FR2**: The system shall create and manage git worktrees automatically for each agent session
3. **FR3**: The system shall provide a terminal UI dashboard showing all active agent sessions with their status
4. **FR4**: The system shall display single-line status per agent (running/idle/error) with expandable details
5. **FR5**: The system shall allow users to terminate, pause, and resume agent sessions
6. **FR6**: The system shall maintain a maximum of 3 concurrent agent sessions (MVP constraint)
7. **FR7**: The system shall store basic session data in JSON format in ~/.add-manager/
8. **FR8**: The system shall provide process monitoring capabilities for all active agents
9. **FR9**: The system shall support both npx and global npm installation methods
10. **FR10**: The system shall provide interactive controls via keyboard shortcuts for common actions
11. **FR11**: The system shall offer tools to review and merge agent changes from different worktrees
12. **FR12**: The system shall detect and alert users to potential git conflicts between agent branches

### Non Functional

1. **NFR1**: The application shall start up in less than 2 seconds
2. **NFR2**: The base application shall use less than 100MB of memory
3. **NFR3**: The terminal UI shall respond to user input within 100ms
4. **NFR4**: The system shall maintain CPU usage below 5% during idle monitoring
5. **NFR5**: Session data storage shall not exceed 10MB
6. **NFR6**: The system shall support Node.js version 16.0.0 or higher
7. **NFR7**: The system shall be compatible with macOS, Linux, and Windows 10+
8. **NFR8**: The system shall require git version 2.20.0 or higher
9. **NFR9**: The system shall gracefully handle process failures with <5% failure rate
10. **NFR10**: The system shall provide clean resource cleanup on application exit

## User Interface Design Goals

### Overall UX Vision

The ADD Manager terminal UI embraces a clean, developer-focused interface that prioritizes efficiency and clarity. The design follows terminal application conventions while providing modern interaction patterns familiar to developers using tools like htop, vim, or tmux. The interface emphasizes immediate visibility of agent status and quick access to essential controls.

### Key Interaction Paradigms

- **Dashboard-First Approach**: Primary view shows all active agents with essential information at a glance
- **Keyboard-Driven Navigation**: All operations accessible via keyboard shortcuts for maximum efficiency
- **Expandable Detail Views**: Single-line status with ability to drill down into detailed logs and controls
- **Context-Aware Actions**: Available actions change based on current selection and agent state
- **Real-time Updates**: Status information updates automatically without user intervention

### Core Screens and Views

- **Main Dashboard**: Overview of all active agents with status indicators and basic controls
- **Agent Detail View**: Individual agent logs, detailed status, and specific controls
- **Agent Spawn Dialog**: Interactive prompts for creating new agent sessions
- **Git Integration View**: Branch management and merge coordination tools
- **Settings/Configuration**: Basic application settings and preferences

### Accessibility: None

No specific accessibility requirements for MVP. Standard terminal accessibility through OS-level screen readers is sufficient.

### Branding

Clean, minimal terminal aesthetic with focus on functional clarity. Uses standard terminal colors and symbols for status indicators. No specific branding elements required for MVP.

### Target Device and Platforms: Cross-Platform

Cross-platform terminal application supporting macOS, Linux, and Windows. Designed for modern terminals with Unicode support and standard terminal dimensions (80x24 minimum).

## Technical Assumptions

### Repository Structure: Monorepo

Single repository containing all ADD Manager components including CLI framework, TUI interface, agent management, and git integration modules.

### Service Architecture

Monolithic Node.js application with modular architecture:
- CLI entry point using commander.js
- Terminal UI layer using blessed framework
- Agent management module for process spawning and monitoring
- Git worktree handler for branch isolation
- Session storage using JSON file system
- Process monitor for resource management

### Testing Requirements

Unit testing for core functionality with focus on:
- Agent lifecycle management
- Git worktree operations
- Session storage and retrieval
- Process monitoring and cleanup
- Error handling and recovery

Integration testing for:
- CLI interface workflows
- Git integration scenarios
- Terminal UI interactions

### Additional Technical Assumptions and Requests

- Uses native Node.js child_process for spawning Claude CLI sessions
- Leverages native git commands for worktree management
- Implements blessed-based TUI for cross-platform terminal compatibility
- Stores session data in user home directory (~/.add-manager/)
- Requires git repository context for proper operation
- Uses commander.js for CLI argument parsing and command structure
- Implements graceful shutdown handling for process cleanup
- Supports both foreground and background agent operation modes

## Epic List

### Epic 1: Foundation & Core Infrastructure
Establish project setup, CLI framework, basic terminal UI, and core agent spawning capabilities while delivering initial agent management functionality.

### Epic 2: Git Integration & Worktree Management
Implement git worktree creation, branch isolation, and basic merge coordination tools to ensure proper git workflow integration.

### Epic 3: Advanced Terminal UI & Process Management
Enhance the terminal interface with comprehensive monitoring, detailed views, and robust process lifecycle management including error recovery.

## Epic 1: Foundation & Core Infrastructure

**Epic Goal**: Establish the foundational project infrastructure including CLI framework, basic terminal UI, and core agent spawning capabilities. This epic delivers a working MVP that can spawn, monitor, and terminate Claude CLI agents with basic status display.

### Story 1.1: Project Setup and CLI Framework

As a developer,
I want to install and initialize the ADD Manager application,
so that I can start using it to manage Claude CLI agents.

#### Acceptance Criteria

1. **AC1**: Package can be installed globally via `npm install -g add-manager`
2. **AC2**: Package can be run directly via `npx add-manager`
3. **AC3**: CLI framework initializes with commander.js and displays help information
4. **AC4**: Application creates ~/.add-manager/ directory for session storage
5. **AC5**: Application validates Node.js version (>=16.0.0) and git availability
6. **AC6**: Application displays appropriate error messages for missing dependencies
7. **AC7**: Basic CLI commands (start, status, help) are recognized and routed correctly

### Story 1.2: Basic Terminal UI Foundation

As a developer,
I want to see a clean terminal interface when I launch ADD Manager,
so that I can interact with the application effectively.

#### Acceptance Criteria

1. **AC1**: Terminal UI launches using blessed framework with responsive layout
2. **AC2**: Main dashboard view displays with header showing application name and version
3. **AC3**: Status area shows "No active agents" when no sessions are running
4. **AC4**: Basic keyboard shortcuts (q for quit, h for help) are functional
5. **AC5**: UI handles terminal resize events gracefully
6. **AC6**: Application exits cleanly when user presses 'q' or Ctrl+C
7. **AC7**: Help overlay displays available commands and keyboard shortcuts

### Story 1.3: Agent Spawning Core Functionality

As a developer,
I want to spawn a new Claude CLI agent session,
so that I can delegate tasks to AI agents with proper isolation.

#### Acceptance Criteria

1. **AC1**: Pressing 'n' or 'new' opens interactive agent spawn dialog
2. **AC2**: User can enter agent instructions/prompts through text input
3. **AC3**: System validates git repository context before spawning
4. **AC4**: Agent process spawns using child_process with Claude CLI
5. **AC5**: Basic session data is stored in ~/.add-manager/sessions.json
6. **AC6**: Agent appears in main dashboard with "running" status
7. **AC7**: System enforces maximum 3 concurrent agents limit
8. **AC8**: User receives clear error messages for spawn failures

### Story 1.4: Basic Agent Status Display

As a developer,
I want to see the status of all active agents at a glance,
so that I can monitor their progress and health.

#### Acceptance Criteria

1. **AC1**: Main dashboard displays list of active agents with basic info
2. **AC2**: Each agent shows: name/ID, status (running/idle/error), runtime duration
3. **AC3**: Status indicators use clear visual symbols (●, ○, ✗)
4. **AC4**: Agent list updates in real-time as status changes
5. **AC5**: User can navigate between agents using arrow keys
6. **AC6**: Selected agent is highlighted clearly in the interface
7. **AC7**: Empty state message displays when no agents are active

### Story 1.5: Basic Agent Termination

As a developer,
I want to terminate agent sessions that are no longer needed,
so that I can free up resources and manage my workflow.

#### Acceptance Criteria

1. **AC1**: User can select an agent and press 'd' or 'delete' to terminate
2. **AC2**: System displays confirmation dialog before termination
3. **AC3**: Agent process is terminated gracefully with proper cleanup
4. **AC4**: Session data is removed from storage after termination
5. **AC5**: Agent disappears from dashboard after successful termination
6. **AC6**: System handles force termination if graceful shutdown fails
7. **AC7**: User receives feedback on termination success/failure

## Epic 2: Git Integration & Worktree Management

**Epic Goal**: Implement comprehensive git worktree integration to ensure each agent operates in its own isolated branch context. This epic delivers proper git workflow support with branch management and basic merge coordination tools.

### Story 2.1: Git Worktree Creation

As a developer,
I want each agent to automatically work in its own git worktree,
so that agents can work on different features without conflicts.

#### Acceptance Criteria

1. **AC1**: System creates unique worktree for each agent using git worktree add
2. **AC2**: Worktree names follow pattern: agent-{id}-{timestamp}
3. **AC3**: Each worktree is created in .add-manager-worktrees/ directory
4. **AC4**: Agent process is spawned with working directory set to its worktree
5. **AC5**: System validates git repository state before worktree creation
6. **AC6**: Worktree creation failures are handled gracefully with rollback
7. **AC7**: Agent spawn dialog displays target worktree path for confirmation

### Story 2.2: Branch Isolation Management

As a developer,
I want each agent to work on its own feature branch,
so that their work remains isolated and mergeable.

#### Acceptance Criteria

1. **AC1**: System creates new branch for each agent: feature/agent-{id}
2. **AC2**: Branch is created from current HEAD of main/master branch
3. **AC3**: Agent worktree is automatically switched to its dedicated branch
4. **AC4**: Dashboard displays current branch name for each agent
5. **AC5**: System prevents agents from working on same branch simultaneously
6. **AC6**: Branch creation failures trigger appropriate error handling
7. **AC7**: Branch names are sanitized to ensure git compatibility

### Story 2.3: Worktree Cleanup on Agent Termination

As a developer,
I want worktrees to be cleaned up when agents are terminated,
so that the repository remains clean and organized.

#### Acceptance Criteria

1. **AC1**: Agent termination triggers automatic worktree cleanup
2. **AC2**: System uses git worktree remove to clean up worktree properly
3. **AC3**: Associated branch is preserved for potential merge/review
4. **AC4**: Cleanup process handles locked or dirty worktrees gracefully
5. **AC5**: User is notified of cleanup success/failure status
6. **AC6**: Manual cleanup command is available for stuck worktrees
7. **AC7**: System maintains cleanup log for troubleshooting

### Story 2.4: Basic Merge Coordination Tools

As a developer,
I want to review and merge agent changes from different branches,
so that I can integrate their work into the main codebase.

#### Acceptance Criteria

1. **AC1**: System displays list of agent branches with change summaries
2. **AC2**: User can view git diff for each agent branch
3. **AC3**: Basic merge command is available for each agent branch
4. **AC4**: System detects potential merge conflicts before attempting merge
5. **AC5**: User receives clear feedback on merge success/failure
6. **AC6**: Merged branches are optionally cleaned up after successful merge
7. **AC7**: System provides basic conflict resolution guidance

## Epic 3: Advanced Terminal UI & Process Management

**Epic Goal**: Enhance the terminal interface with comprehensive monitoring capabilities, detailed views, and robust process lifecycle management. This epic delivers a polished user experience with advanced features for managing agent sessions effectively.

### Story 3.1: Enhanced Agent Detail View

As a developer,
I want to see detailed information about individual agents,
so that I can monitor their progress and troubleshoot issues.

#### Acceptance Criteria

1. **AC1**: User can press Enter or 'i' to open detailed view for selected agent
2. **AC2**: Detail view shows agent logs, current task, and resource usage
3. **AC3**: Log output is scrollable with vim-like navigation keys
4. **AC4**: Real-time log updates are displayed as agent produces output
5. **AC5**: User can return to main dashboard using Escape or 'q'
6. **AC6**: Detail view includes agent configuration and spawn parameters
7. **AC7**: Search functionality allows finding specific log entries

### Story 3.2: Advanced Process Monitoring

As a developer,
I want comprehensive monitoring of agent processes,
so that I can ensure optimal performance and resource usage.

#### Acceptance Criteria

1. **AC1**: System monitors CPU and memory usage for each agent process
2. **AC2**: Dashboard displays resource usage indicators for each agent
3. **AC3**: System tracks agent runtime statistics and performance metrics
4. **AC4**: Resource usage alerts trigger when thresholds are exceeded
5. **AC5**: Historical performance data is maintained for analysis
6. **AC6**: Process health checks detect and report unresponsive agents
7. **AC7**: System provides process restart capability for failed agents

### Story 3.3: Session Persistence and Recovery

As a developer,
I want basic session persistence across application restarts,
so that I can maintain continuity in my agent workflows.

#### Acceptance Criteria

1. **AC1**: Session state is automatically saved to ~/.add-manager/sessions.json
2. **AC2**: Application attempts to reconnect to existing agent processes on startup
3. **AC3**: Orphaned agent processes are detected and handled appropriately
4. **AC4**: User is notified of session recovery success/failure status
5. **AC5**: Session data includes worktree paths and branch information
6. **AC6**: Recovery process validates git worktree state before reconnection
7. **AC7**: Failed recovery attempts are logged with detailed error information

### Story 3.4: Error Handling and Recovery

As a developer,
I want robust error handling when agents fail or encounter issues,
so that I can maintain stable workflows and troubleshoot problems.

#### Acceptance Criteria

1. **AC1**: System detects agent process failures and updates status accordingly
2. **AC2**: Failed agents display error status with diagnostic information
3. **AC3**: User can view error logs and troubleshooting suggestions
4. **AC4**: System provides restart option for failed agents
5. **AC5**: Critical errors trigger automatic cleanup of associated resources
6. **AC6**: Error reporting includes system state and configuration details
7. **AC7**: Recovery procedures are documented and accessible through help system

### Story 3.5: Enhanced Keyboard Shortcuts and Navigation

As a developer,
I want efficient keyboard shortcuts for all common operations,
so that I can manage agents quickly without mouse interaction.

#### Acceptance Criteria

1. **AC1**: Comprehensive keyboard shortcuts are available for all major functions
2. **AC2**: Help overlay displays all available shortcuts with descriptions
3. **AC3**: Navigation between agents uses arrow keys and vim-like bindings
4. **AC4**: Quick actions (spawn, terminate, view) are accessible via single keystrokes
5. **AC5**: Context-sensitive shortcuts change based on current view
6. **AC6**: Keyboard shortcuts are configurable through settings
7. **AC7**: System provides visual feedback for keyboard actions

## Checklist Results Report

### Executive Summary

- **Overall PRD completeness**: 85%
- **MVP scope appropriateness**: Just Right
- **Readiness for architecture phase**: Ready
- **Most critical gaps**: Missing user research/competitive analysis, limited user feedback mechanisms, incomplete business metrics

### Category Analysis

| Category                         | Status  | Critical Issues |
| -------------------------------- | ------- | --------------- |
| 1. Problem Definition & Context  | PARTIAL | Missing user research, no competitive analysis |
| 2. MVP Scope Definition          | PASS    | Well-defined boundaries, clear constraints |
| 3. User Experience Requirements  | PASS    | Comprehensive UI design goals, clear user flows |
| 4. Functional Requirements       | PASS    | Complete feature set, testable requirements |
| 5. Non-Functional Requirements   | PASS    | Specific performance metrics, clear constraints |
| 6. Epic & Story Structure        | PASS    | Logical progression, well-sized stories |
| 7. Technical Guidance            | PASS    | Clear architecture direction, tech stack defined |
| 8. Cross-Functional Requirements | PARTIAL | Limited operational requirements |
| 9. Clarity & Communication       | PASS    | Well-structured, clear language |

### Key Findings

**Strengths:**
- Clear problem definition and solution approach
- Appropriate MVP scope with 3-agent constraint
- Comprehensive functional and non-functional requirements
- Well-structured epic and story breakdown
- Strong technical guidance for architecture phase

**Areas for Improvement:**
- Limited user research and competitive analysis
- Missing explicit business success metrics
- Incomplete operational requirements (monitoring, deployment)
- Could benefit from user feedback mechanisms

### Final Decision

**READY FOR ARCHITECT**: The PRD is comprehensive, properly structured, and ready for architectural design. The identified gaps are minor and don't block progress to the next phase.

## Next Steps

### UX Expert Prompt

"Please review the ADD Manager PRD and create a comprehensive UX architecture document focusing on the terminal UI design patterns, interaction flows, and user experience optimization for the blessed-based terminal interface. Consider the developer-focused user base and terminal application conventions."

### Architect Prompt

"Please use the ADD Manager PRD to create a detailed technical architecture document. Focus on the Node.js application structure, process management architecture, git integration patterns, and terminal UI implementation using blessed. Ensure the architecture supports the 3-agent limit and provides clean separation between CLI, TUI, and core functionality modules."