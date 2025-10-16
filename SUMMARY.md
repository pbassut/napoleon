# Napoleon Summary

## What is Napoleon?

Napoleon is a macOS desktop application that enables developers to run multiple Claude Code AI agents simultaneously, each working in isolated copies of your codebase. Think of it as an orchestration layer for AI-assisted development, allowing you to parallelize coding tasks across multiple AI agents.

## The Problem It Solves

### Traditional Single-Agent Limitations
When using Claude Code alone:
- You can only work on one task at a time
- Context switching between different features is manual and time-consuming
- Large projects with multiple issues/features require sequential processing
- You must wait for one agent to finish before starting another task

### Napoleon's Solution
Napoleon transforms Claude Code from a single-agent tool into a multi-agent orchestration platform:
- **Parallel Execution**: Run multiple Claude Code agents simultaneously
- **Task Isolation**: Each agent works in its own git worktree, preventing conflicts
- **Workflow Efficiency**: Start new workspaces for different features/bugs in seconds
- **Centralized Monitoring**: See all active agents, their progress, and what they're working on from one interface

## Key Benefits

### 1. Speed Through Parallelization
Instead of working on issues sequentially, tackle multiple tasks at once:
- Agent 1: Fixing a critical bug
- Agent 2: Implementing a new feature
- Agent 3: Writing tests
- Agent 4: Refactoring legacy code

All running simultaneously without interfering with each other.

### 2. Git Worktree Management Made Simple
Napoleon handles the complexity of git worktrees automatically:
- Creates isolated workspace for each agent
- Manages branches and checkouts
- Prevents conflicts between workspaces
- Simplifies cleanup when tasks complete

### 3. Enhanced Visibility
Monitor all your AI agents from a single interface:
- Real-time status of each workspace
- See what each agent is working on
- Identify stuck or completed agents quickly
- Review changes before merging

### 4. Integrated Workflow
Seamlessly integrates with your existing tools:
- **Linear Integration**: Start new workspaces directly from Linear issues
- **Git Operations**: Create PRs, review diffs, merge changes
- **Terminal Access**: Full terminal for each workspace
- **Code Review**: Side-by-side diff viewing for all changes

### 5. Local-First Privacy
All processing happens on your Mac:
- No code uploaded to cloud servers
- Your codebase stays private
- Works with existing Claude Code authentication
- Respects your organization's security requirements

## Use Cases

### 1. Feature Development
Create separate workspaces for each feature branch:
```
Workspace 1: SC-12345 - User authentication
Workspace 2: SC-12346 - Payment integration
Workspace 3: SC-12347 - Email notifications
```

### 2. Bug Triage
Tackle multiple bugs in parallel:
- Critical bug fixes in production
- Edge case handling
- Test coverage improvements
- Documentation updates

### 3. Code Review Assistance
Use Claude Code to help review PRs:
- One agent analyzing security implications
- Another checking test coverage
- Third reviewing code quality
- All providing insights simultaneously

### 4. Refactoring Projects
Break large refactoring into parallel workstreams:
- Component modernization
- Type safety improvements
- Performance optimizations
- API updates

### 5. Exploration & Learning
Experiment with different approaches:
- Test multiple implementation strategies
- Compare different architectural patterns
- Evaluate various libraries or frameworks
- Prototype features without affecting main work

## How It Works

### Workspace Creation
1. Click to create a new workspace
2. Napoleon creates a git worktree with a unique name (e.g., "krakow", "marseille")
3. Optionally run setup scripts (install dependencies, configure env)
4. Claude Code launches in the isolated workspace

### Work Execution
1. Each Claude Code agent works independently in its workspace
2. File changes are isolated to that workspace's directory
3. Git operations (commits, branches) are scoped to the workspace
4. Terminal commands execute in the workspace context

### Monitoring & Review
1. Dashboard shows all active workspaces
2. View real-time status and progress
3. Review changes with inline diffs
4. Check git statistics (+additions, -deletions)

### Completion & Merge
1. Review completed work in each workspace
2. Create pull requests for review
3. Merge changes to main branch
4. Archive or delete workspace when done

## Comparison

### Before Napoleon
```
Time: 9:00 AM - Start work on feature A
Time: 10:30 AM - Feature A complete
Time: 10:35 AM - Switch to bug B
Time: 11:15 AM - Bug B fixed
Time: 11:20 AM - Begin refactoring C
```
**Total: 3 tasks in 2.5 hours (sequential)**

### With Napoleon
```
Time: 9:00 AM - Start all three tasks in parallel
  - Workspace 1: Feature A
  - Workspace 2: Bug B
  - Workspace 3: Refactoring C
Time: 10:30 AM - All tasks complete
```
**Total: 3 tasks in 1.5 hours (parallel)**

## Who Should Use Napoleon?

### Ideal Users
- **Solo developers** managing multiple issues/features
- **Small teams** wanting to maximize AI assistance
- **Technical leads** coordinating AI agents across workstreams
- **Open source maintainers** triaging and fixing multiple issues
- **Consultants** juggling client projects

### When to Use Napoleon
- Working on projects with multiple independent tasks
- Need to maintain separate feature branches
- Want to experiment without disrupting main work
- Managing high-volume issue backlogs
- Testing different implementation approaches

### When You Might Not Need It
- Single-task focused work
- Projects where all work must be strictly sequential
- Extremely limited compute resources
- Simple scripts or one-file projects

## Technical Advantages

### 1. Git Worktree Architecture
Each workspace is a true git worktree, not just a copy:
- Shares the same git repository (saves disk space)
- Independent working directories
- Separate HEAD pointers and branches
- Clean isolation without duplication

### 2. Native Performance
Built with Tauri (Rust + Web):
- Fast startup and low memory footprint
- Native file system operations
- Efficient process management
- Small application size

### 3. Authentication Reuse
Uses your existing Claude Code credentials:
- No separate login required
- API keys work automatically
- Claude Pro/Max plans supported
- Same rate limits as Claude Code

## Future Possibilities

Based on the platform's architecture, potential expansions include:
- Support for other AI coding assistants (GitHub Copilot, Cursor, etc.)
- Windows and Linux versions
- Team collaboration features
- Workspace templates and presets
- Advanced workflow automation
- Integration with more project management tools

## Getting Started

### Requirements
- macOS (current version)
- Git repository cloned locally
- Claude Code account (API key or subscription)

### Quick Start
1. Add your repository to Napoleon
2. Click "New workspace"
3. Give it a name or use the suggested city name
4. Start working with Claude Code in the isolated environment
5. Monitor progress from the main dashboard
6. Review and merge when complete

## Conclusion

Napoleon transforms Claude Code from a powerful single-agent tool into a multi-agent orchestration platform. By handling the complexity of parallel workspaces, git worktree management, and progress monitoring, it enables developers to multiply their productivity and tackle multiple tasks simultaneously.

The combination of AI assistance parallelization, git isolation, and centralized monitoring makes Napoleon an essential tool for developers looking to maximize their effectiveness with AI coding assistants.

---

**Napoleon** - Run a bunch of Claude Codes in parallel. Each Claude gets an isolated workspace.

Built by [Melty Labs](https://meltylabs.com) | [conductor.build](https://conductor.build)
