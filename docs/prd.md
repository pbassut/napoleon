# Napoleon Product Requirements Document (PRD)

## Goals and Background Context

### Goals

- Enable developers to run multiple Claude Code AI agents simultaneously in isolated workspaces, multiplying productivity through parallel task execution
- Reduce task completion time by 40% through intelligent orchestration and elimination of context switching overhead
- Provide zero-friction workspace creation with automatic git worktree setup, branch management, and Claude Code launching
- Deliver real-time visibility into all active AI agents through a unified monitoring dashboard
- Establish Napoleon as the de facto orchestration platform for AI-assisted development workflows
- Achieve 1,000 active users within 6 months with sustainable revenue growth

### Background Context

Napoleon addresses a fundamental bottleneck in AI-assisted development: the single-threaded limitation of tools like Claude Code that forces sequential task processing. In real-world scenarios where developers manage 10-20 open issues simultaneously, this constraint wastes 30-50% of potential AI assistant time on context switching and sequential waiting. By introducing an orchestration layer that leverages git worktrees for truly isolated workspaces, Napoleon transforms Claude Code from a single-agent tool into a parallel multi-agent development platform, enabling developers to work on features, bugs, and refactoring tasks concurrently without conflicts.

The solution succeeds where manual approaches fail by providing automatic workspace management, intelligent city-based naming for mental tracking, and native macOS integration through Tauri. This positions Napoleon as essential infrastructure for the rapidly growing AI-assisted development market, where developers increasingly rely on AI tools but face productivity ceilings due to architectural limitations.

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-10-16 | v1.0 | Initial PRD creation from Project Brief | John (PM) |

## Requirements

### Functional

- **FR1:** The system shall create isolated git worktree workspaces with single-click actions, automatically managing branch creation and directory setup
- **FR2:** The system shall launch Claude Code instances in specific workspaces with automatic authentication passthrough and proper file system isolation
- **FR3:** The system shall display a real-time dashboard grid view showing all active workspaces with status, current branch, task description, and git statistics
- **FR4:** The system shall automatically generate memorable city-based names for workspaces to aid mental tracking and organization
- **FR5:** The system shall import issues directly from Linear with bi-directional status synchronization
- **FR6:** The system shall execute repository-specific setup scripts (npm install, environment configuration) automatically on workspace creation
- **FR7:** The system shall allow viewing uncommitted changes, creating commits, and managing branches within each workspace
- **FR8:** The system shall support concurrent operation of 10+ workspaces on systems with 16GB RAM
- **FR9:** The system shall provide workspace deletion with automatic git worktree cleanup and resource deallocation
- **FR10:** The system shall detect and prevent conflicts when multiple workspaces modify the same files

### Non-Functional

- **NFR1:** Workspace creation shall complete in under 2 seconds for repositories up to 1GB in size
- **NFR2:** The application shall maintain base memory footprint under 500MB with sub-second dashboard update latency
- **NFR3:** The system shall operate entirely locally without cloud dependencies for core functionality
- **NFR4:** The application shall support macOS 12.0+ (Monterey and later) on both Apple Silicon and Intel architectures
- **NFR5:** All workspace operations shall maintain zero git corruption rate across 100+ operations
- **NFR6:** The system shall respect macOS sandboxing requirements with proper code signing and notarization
- **NFR7:** API keys and authentication tokens shall never be stored, only passed through to Claude Code instances
- **NFR8:** The application shall handle repository sizes over 10K files without performance degradation

## User Interface Design Goals

### Overall UX Vision

Napoleon embodies the principle of "invisible orchestration" - complex git worktree management and process coordination happen seamlessly behind an intuitive dashboard interface. The design philosophy centers on visual clarity and immediate comprehension, where developers can understand their entire parallel workspace state at a glance. The interface should feel native to macOS, leveraging familiar patterns while introducing the city-based workspace metaphor as a memorable organizational system.

### Key Interaction Paradigms

- **Single-Click Spawning**: Primary actions (create workspace, launch Claude Code) execute with one click, no wizards or multi-step flows
- **Grid-Based Monitoring**: Visual dashboard using cards/tiles showing live workspace status, similar to a mission control center
- **Drag-and-Drop Issue Import**: Direct dragging from Linear or paste of issue URLs to create new workspaces
- **Inline Actions**: Hover states reveal workspace controls (stop, delete, view diff) without navigation
- **Real-time Updates**: Live git statistics and status changes without refresh, using native macOS animations

### Core Screens and Views

- Main Dashboard - Grid view of all active workspaces with status indicators and git statistics
- Workspace Detail Panel - Slide-out panel showing detailed git diff, commits, and file changes
- Setup Configuration - Repository-specific setup commands and environment configuration
- Linear Integration View - Issue browser with drag-to-create-workspace functionality
- Settings Screen - Claude Code path configuration, default branch settings, telemetry preferences
- Quick Launch Bar - Global hotkey-triggered overlay for rapid workspace creation

### Accessibility: WCAG AA

The application will meet WCAG AA standards with full keyboard navigation, screen reader support, and high contrast mode compatibility native to macOS accessibility features.

### Branding

Clean, professional aesthetic aligned with developer tools like Linear and Raycast. Subtle use of city-themed iconography for workspace identification. Dark mode as default with automatic OS theme detection. Monospace fonts for code-related content, system fonts for UI elements.

### Target Device and Platforms: Desktop Only

Native macOS desktop application optimized for 13" MacBook Pro minimum screen size and above. Responsive layout scales from single column on smaller displays to multi-column grid on larger monitors. No mobile or web versions for MVP.

## Technical Assumptions

### Repository Structure: Monorepo

Napoleon will use a monorepo structure containing the Tauri application, Rust core library, React UI, and shared TypeScript types. This enables atomic commits across the stack and simplifies dependency management.

### Service Architecture

**Monolithic Desktop Application** - Napoleon runs as a single native macOS application with embedded Rust backend and React frontend. The architecture uses:
- Tauri framework for native app wrapper and IPC bridge
- Rust core for performance-critical operations (git worktree management, file system operations)
- React/TypeScript UI running in embedded WebView
- SQLite for local workspace metadata storage
- Event-driven communication between frontend and backend via Tauri commands

### Testing Requirements

**Unit + Integration Testing** - The testing strategy includes:
- Unit tests for Rust core logic and git operations
- Integration tests for Tauri IPC commands and workspace lifecycle
- React component tests for UI logic
- End-to-end tests for critical user workflows (workspace creation, Linear sync)
- Manual testing convenience methods for debugging workspace states

### Additional Technical Assumptions and Requests

- **Frontend Stack**: React 18+ with TypeScript, Tailwind CSS for styling, Zustand for state management, React Query for data fetching
- **Backend Stack**: Rust with Tokio for async operations, libgit2 for git operations, Tauri 2.0+ for native integration
- **Build Tools**: Vite for frontend bundling, Cargo for Rust compilation, GitHub Actions for CI/CD
- **Claude Code Integration**: Subprocess spawning using Rust's Command API, inherit parent environment for authentication
- **Linear API**: REST API integration with exponential backoff for rate limiting
- **File System Watching**: Native FSEvents API on macOS for real-time workspace monitoring
- **Code Signing**: Apple Developer certificate required for distribution, automated notarization in CI pipeline
- **Performance Monitoring**: Built-in telemetry to PostHog (opt-in), local performance metrics in development
- **Error Handling**: Comprehensive error boundaries in React, Result types in Rust, user-friendly error messages
- **Data Persistence**: All workspace metadata in local SQLite, no cloud storage for MVP

## Epic List

- **Epic 1: Foundation & Core Workspace Engine**: Establish Tauri application foundation with basic git worktree operations and single workspace management
- **Epic 2: Multi-Workspace Orchestration & Dashboard**: Enable concurrent workspace management with real-time monitoring dashboard and city-based naming
- **Epic 3: Claude Code Integration & Automation**: Integrate Claude Code launching, authentication passthrough, and repository setup automation
- **Epic 4: Linear Integration & Issue Management**: Connect Linear API for issue import, workspace creation from issues, and bi-directional sync
- **Epic 5: Git Operations & Conflict Management**: Implement advanced git operations, diff viewing, commit management, and conflict detection

## Epic 1: Foundation & Core Workspace Engine

**Goal**: Establish the Tauri application foundation with Rust backend and React frontend, implementing basic git worktree operations for single workspace management. This epic delivers a functional desktop app that can create and manage one workspace at a time, proving the technical architecture while providing immediate value.

### Story 1.1: Initialize Tauri Application Structure

As a developer,
I want to set up the Tauri application with Rust backend and React frontend,
so that I have a working native macOS application foundation.

**Acceptance Criteria:**
1. Monorepo structure created with packages for tauri-app, rust-core, and shared types
2. Tauri 2.0+ configured with React 18 and TypeScript frontend
3. Basic IPC communication working between Rust and React
4. Application builds and runs on macOS (Intel and Apple Silicon)
5. Basic window management with native macOS title bar and controls
6. Development hot-reload working for both Rust and React changes

### Story 1.2: Implement Git Worktree Core Operations

As a developer,
I want core git worktree management functionality in Rust,
so that I can programmatically create and manage isolated workspaces.

**Acceptance Criteria:**
1. Rust module created for git worktree operations using libgit2
2. Function to create new worktree with specified branch name
3. Function to list all worktrees for a repository
4. Function to delete worktree and clean up directory
5. Error handling for edge cases (invalid repo, existing branch names)
6. Unit tests covering all git worktree operations

### Story 1.3: Create Basic Workspace UI

As a user,
I want a simple interface to create and view a single workspace,
so that I can test the core workspace functionality.

**Acceptance Criteria:**
1. Main window displays current repository path and status
2. "Create Workspace" button that prompts for branch name
3. Display of active workspace information (path, branch, status)
4. "Delete Workspace" button with confirmation dialog
5. Loading states during workspace operations
6. Error messages displayed for failed operations

### Story 1.4: Implement SQLite Workspace Persistence

As a user,
I want my workspace information persisted between app sessions,
so that I don't lose track of created workspaces.

**Acceptance Criteria:**
1. SQLite database initialized on first app launch
2. Schema created for workspaces table (id, name, path, branch, created_at, status)
3. Workspace CRUD operations implemented in Rust
4. Workspace state restored on app launch
5. Database migrations framework in place for future schema changes
6. Data integrity maintained across app crashes

## Epic 2: Multi-Workspace Orchestration & Dashboard

**Goal**: Transform the single workspace system into a multi-workspace orchestration platform with concurrent operations and real-time monitoring. This epic delivers the core value proposition of Napoleon - the ability to run multiple AI agents in parallel with full visibility.

### Story 2.1: Enable Concurrent Workspace Management

As a developer,
I want to create and manage multiple workspaces simultaneously,
so that I can work on multiple tasks in parallel.

**Acceptance Criteria:**
1. Remove single workspace limitation from core engine
2. Support for 10+ concurrent workspaces without conflicts
3. Unique directory structure for each workspace (/.conductor/[city-name]/)
4. Thread-safe workspace operations in Rust
5. Resource pooling for git operations to prevent exhaustion
6. Performance remains under 2-second creation time per workspace

### Story 2.2: Implement City-Based Naming System

As a user,
I want workspaces automatically named with memorable city names,
so that I can easily track and reference different workspaces.

**Acceptance Criteria:**
1. Curated list of 100+ city names embedded in application
2. Random city selection without repeats in active session
3. City name displayed prominently in workspace UI
4. Ability to see city-to-branch mapping in interface
5. City names persist across app restarts
6. Fallback to numbered naming if city list exhausted

### Story 2.3: Build Grid Dashboard View

As a user,
I want a dashboard showing all active workspaces at a glance,
so that I can monitor parallel operations effectively.

**Acceptance Criteria:**
1. Grid layout with responsive cards for each workspace
2. Each card shows: city name, branch, status indicator, creation time
3. Color-coded status (active, idle, error, creating)
4. Grid auto-adjusts based on window size (1-5 columns)
5. Smooth animations for workspace creation/deletion
6. Empty state with helpful instructions when no workspaces

### Story 2.4: Add Real-Time Status Updates

As a user,
I want to see live updates of workspace status and git statistics,
so that I know what's happening in each workspace.

**Acceptance Criteria:**
1. File system watcher implemented for each workspace
2. Git statistics updated in real-time (+/- lines, file count)
3. Status changes reflected within 500ms of file system events
4. WebSocket or IPC channel for push updates to UI
5. Throttling to prevent UI flooding with rapid changes
6. Status indicators for: initializing, ready, active, error states

## Epic 3: Claude Code Integration & Automation

**Goal**: Integrate Claude Code launching and management within workspaces, including authentication passthrough and automated setup scripts. This epic makes Napoleon a true orchestration platform for Claude Code rather than just a workspace manager.

### Story 3.1: Implement Claude Code Process Management

As a developer,
I want to launch Claude Code instances in specific workspaces,
so that each AI agent operates in isolation.

**Acceptance Criteria:**
1. Detect Claude Code installation path on system
2. Launch Claude Code with workspace directory as working path
3. Process tracking for each Claude Code instance
4. Ability to terminate Claude Code process from dashboard
5. Handle Claude Code crashes gracefully with status updates
6. Support for both CLI and desktop Claude Code variants

### Story 3.2: Enable Authentication Passthrough

As a user,
I want Claude Code to automatically authenticate using my existing credentials,
so that I don't need to log in for each workspace.

**Acceptance Criteria:**
1. Inherit parent shell environment variables for auth tokens
2. Pass through Claude Code configuration from user home directory
3. No storage or logging of authentication credentials
4. Graceful handling of authentication failures
5. Instructions provided for initial Claude Code setup if not configured
6. Support for both API key and browser-based authentication

### Story 3.3: Create Repository Setup Automation

As a user,
I want repository-specific setup commands to run automatically,
so that each workspace is ready for development immediately.

**Acceptance Criteria:**
1. Configuration UI for repository setup commands
2. Support for multiple commands (npm install, bundle install, etc.)
3. Setup runs automatically after workspace creation
4. Progress indication during setup execution
5. Error handling with detailed logs for failed setup
6. Option to retry setup or continue without it

### Story 3.4: Add Workspace Quick Actions

As a user,
I want quick action buttons for common workspace operations,
so that I can efficiently manage Claude Code sessions.

**Acceptance Criteria:**
1. "Open in Claude Code" button on each workspace card
2. "Restart Claude Code" action for stuck sessions
3. "View Logs" to see Claude Code output
4. "Copy Path" to get workspace directory
5. Keyboard shortcuts for frequent actions
6. Batch actions for multiple workspaces

## Epic 4: Linear Integration & Issue Management

**Goal**: Connect Napoleon with Linear for seamless issue import and tracking, enabling developers to create workspaces directly from their task management system. This epic bridges project management with AI-assisted development.

### Story 4.1: Implement Linear API Authentication

As a user,
I want to connect Napoleon to my Linear workspace,
so that I can import issues directly.

**Acceptance Criteria:**
1. Settings page for Linear API key configuration
2. Secure storage of API key in macOS Keychain
3. Test connection button to validate credentials
4. Support for multiple Linear workspaces
5. Clear error messages for authentication failures
6. Option to disconnect and clear credentials

### Story 4.2: Build Issue Import Interface

As a user,
I want to browse and select Linear issues to work on,
so that I can create workspaces from my task list.

**Acceptance Criteria:**
1. List view of Linear issues assigned to user
2. Filter by project, status, and priority
3. Search functionality for issue title/description
4. Issue details preview panel
5. Multi-select for batch workspace creation
6. Refresh button to sync latest issues

### Story 4.3: Enable Drag-and-Drop Workspace Creation

As a user,
I want to drag Linear issues onto the dashboard to create workspaces,
so that starting work is effortless.

**Acceptance Criteria:**
1. Drag-and-drop from Linear integration view to dashboard
2. Accept Linear issue URLs pasted into app
3. Automatic branch naming from issue title
4. Workspace description populated from issue
5. Visual feedback during drag operation
6. Support for multiple simultaneous drops

### Story 4.4: Implement Bi-directional Status Sync

As a user,
I want workspace status to sync back to Linear,
so that my team sees progress automatically.

**Acceptance Criteria:**
1. Update Linear issue status when workspace created (→ In Progress)
2. Update when commits made in workspace
3. Update when PR created from workspace (→ In Review)
4. Comment on Linear issue with PR link
5. Configurable status mappings
6. Manual sync trigger for status updates

## Epic 5: Git Operations & Conflict Management

**Goal**: Implement advanced git operations within Napoleon, including diff viewing, commit management, and intelligent conflict detection. This epic ensures safe and efficient parallel development without git corruption or lost work.

### Story 5.1: Create Git Diff Viewer

As a user,
I want to view changes in each workspace,
so that I can review work before committing.

**Acceptance Criteria:**
1. Slide-out panel showing git diff for workspace
2. Syntax highlighting for common languages
3. File tree of changed files
4. Inline diff with additions/deletions highlighted
5. Stats summary (files changed, insertions, deletions)
6. Refresh button to update diff view

### Story 5.2: Implement Commit Interface

As a user,
I want to create commits directly from Napoleon,
so that I can checkpoint work without leaving the app.

**Acceptance Criteria:**
1. Commit dialog with message input field
2. List of staged and unstaged changes
3. Ability to stage/unstage individual files
4. Commit message templates/suggestions
5. Commit history view for workspace
6. Push to remote option after commit

### Story 5.3: Add Conflict Detection System

As a user,
I want to be warned about potential conflicts between workspaces,
so that I can avoid integration problems.

**Acceptance Criteria:**
1. Monitor file modifications across all workspaces
2. Detect when multiple workspaces modify same files
3. Visual warning indicator on conflicting workspaces
4. Detailed conflict report showing affected files
5. Suggestions for conflict resolution order
6. Option to merge or rebase between workspaces

### Story 5.4: Build Branch Management Tools

As a user,
I want to manage git branches within Napoleon,
so that I have full control over workspace versions.

**Acceptance Criteria:**
1. Create new branches from existing workspaces
2. Switch branches within a workspace
3. Merge branches with conflict resolution UI
4. Delete local and remote branches
5. Branch visualization showing relationships
6. Protection against deleting active workspace branches

## Checklist Results Report

### Executive Summary

- **Overall PRD Completeness**: 92% - The PRD is comprehensive and well-structured
- **MVP Scope Appropriateness**: Just Right - Scope delivers core value without overreach
- **Readiness for Architecture Phase**: Ready - Requirements are clear enough for architectural design
- **Most Critical Gaps**: No blocking issues identified, minor gaps in operational requirements

### Category Analysis Table

| Category | Status | Critical Issues |
|----------|--------|-----------------|
| 1. Problem Definition & Context | PASS | None - Clear problem statement, business goals, and target users defined |
| 2. MVP Scope Definition | PASS | None - Core functionality well-defined with clear boundaries |
| 3. User Experience Requirements | PASS | None - UI goals, interaction paradigms, and accessibility covered |
| 4. Functional Requirements | PASS | None - Clear functional and non-functional requirements |
| 5. Non-Functional Requirements | PASS | None - Performance, security, reliability requirements specified |
| 6. Epic & Story Structure | PASS | None - Well-structured epics with sized stories and clear ACs |
| 7. Technical Guidance | PASS | None - Architecture direction and tech stack clearly defined |
| 8. Cross-Functional Requirements | PARTIAL | Missing detailed data migration and operational monitoring specs |
| 9. Clarity & Communication | PASS | None - Clear language, well-organized structure |

### Top Issues by Priority

**BLOCKERS**: None identified

**HIGH**:
- Data schema evolution strategy not explicitly defined
- Monitoring and alerting specifications need more detail

**MEDIUM**:
- No explicit rollback strategy for failed deployments
- Missing detailed error recovery procedures for Linear API failures

**LOW**:
- Could benefit from visual diagrams for architecture
- User personas could be more detailed

### MVP Scope Assessment

**Features appropriately included in MVP**:
- Core workspace management with git worktrees
- Multi-workspace orchestration and dashboard
- Claude Code integration
- Linear integration for issue management
- Basic git operations and conflict detection

**Features that could potentially be deferred**:
- Advanced conflict resolution UI (Story 5.3/5.4 could be post-MVP)
- Full bi-directional Linear sync (could start with one-way)

**Complexity concerns**: None - stories are well-sized for AI agent execution

**Timeline realism**: 3-month MVP timeline is achievable with the defined scope

### Technical Readiness

**Clarity of technical constraints**: Excellent - Tauri, Rust, React stack clearly defined

**Identified technical risks**:
- Claude Code API stability acknowledged
- Git worktree edge cases noted
- Performance with multiple workspaces identified

**Areas needing architect investigation**:
- Optimal IPC communication patterns for real-time updates
- Resource pooling strategy for git operations
- File system watching implementation details

### Recommendations

1. **Add operational requirements section** detailing monitoring, alerting, and deployment procedures
2. **Define data migration strategy** for SQLite schema changes
3. **Document error recovery procedures** for external API failures
4. **Consider adding architecture diagrams** in the architecture document phase
5. **Review Epic 5 scope** - consider moving advanced git operations to post-MVP

## Next Steps

### UX Expert Prompt

Review the Napoleon PRD to create comprehensive UI/UX specifications, focusing on the dashboard interface, workspace card design, and user flows for creating and managing parallel workspaces.

### Architect Prompt

Using this PRD, create a detailed technical architecture document for Napoleon, defining the Tauri/Rust/React system design, IPC communication patterns, and git worktree management implementation strategy.