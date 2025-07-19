# Napoleon (Agent Driven Development) - Project Brief

## Executive Summary

Napoleon is a terminal UI application designed to revolutionize development workflows by enabling developers to manage multiple Claude Code SDK sessions with git worktree isolation. This NPM CLI package provides a clean, intuitive interface for spawning, monitoring, and managing AI agents that work on isolated branches of your codebase.

**Vision**: Streamline agent-driven development by providing seamless multi-session management with git isolation.

**Mission**: Enable developers to efficiently coordinate multiple AI agents working on different aspects of a project simultaneously.

## Project Overview

### Core Details
- **Name**: Napoleon (Agent Driven Development)
- **Type**: NPM CLI package with terminal UI
- **Primary Function**: Manage multiple Claude Code SDK sessions with git worktree isolation
- **Installation Methods**: 
  - `npx napoleon` (quick usage)
  - `npm install -g napoleon` (global installation)
- **Target Launch**: MVP within 2-3 weeks

### Value Proposition
- **For Developers**: Coordinate multiple AI agents on different features/bugs simultaneously
- **For Teams**: Organize agent-driven development workflows with proper git isolation
- **For Projects**: Maintain clean git history while leveraging multiple AI sessions

## Target Users & Use Cases

### Primary Users: Developers
**Demographics**: 
- Software developers (all levels)
- DevOps engineers
- Technical leads managing multiple features

**Primary Use Cases**:
- Feature development with multiple agents on different branches
- Bug fixing with isolated agent sessions
- Code refactoring with parallel agent workstreams
- Documentation generation alongside feature development

### Secondary Users: Business Users
**Demographics**:
- Technical product managers
- Business analysts with coding knowledge
- Technical writers working with codebases

**Secondary Use Cases**:
- Managing documentation updates across multiple branches
- Coordinating requirements gathering with agent assistance
- Overseeing technical implementation progress

## Technical Specifications

### Technology Stack
- **Runtime**: Node.js (>= 16.0.0)
- **CLI Framework**: commander.js
- **Terminal UI**: blessed (for rich TUI experience)
- **Storage**: Basic file system (JSON files in ~/.napoleon/)
- **Git Integration**: Native git commands via child_process
- **Process Management**: Built-in Node.js process handling

### Architecture Overview
```
Napoleon
├── CLI Entry Point (commander.js)
├── TUI Interface (blessed)
├── Agent Manager (spawn/monitor/kill)
├── Git Worktree Handler
├── Session Storage (JSON)
└── Process Monitor
```

### Core Features

#### 1. Agent Spawning
- **Input Method**: Interactive prompts for agent instructions
- **Process Creation**: Spawn Claude CLI sessions in separate processes
- **Branch Association**: Automatically create/switch to git worktrees
- **Resource Limits**: Maximum 3 concurrent agents (MVP constraint)

#### 2. Session Management
- **Status Display**: Single-line status per agent (running/idle/error)
- **Detailed Logs**: Expandable log viewer for each session
- **Process Control**: Start, pause, resume, terminate agents
- **Session Persistence**: Basic session state (no persistence across restarts)

#### 3. Git Worktree Integration
- **Automatic Isolation**: Each agent gets its own worktree
- **Branch Management**: Create feature branches for agent work
- **Merge Coordination**: Tools to review and merge agent changes
- **Conflict Resolution**: Basic conflict detection and user alerts

#### 4. Terminal UI
- **Dashboard View**: Overview of all active agents
- **Detail View**: Individual agent logs and controls
- **Interactive Controls**: Keyboard shortcuts for common actions
- **Status Indicators**: Visual feedback for agent states

### Technical Constraints

#### MVP Limitations
- **Agent Limit**: Maximum 3 concurrent agents
- **No Persistence**: Sessions don't survive app restarts
- **Basic Error Handling**: Simple error messages, no advanced recovery
- **Local Only**: No remote agent management
- **Git Dependency**: Requires git repository context

#### Performance Requirements
- **Startup Time**: < 2 seconds to launch TUI
- **Memory Usage**: < 100MB for base application
- **CPU Usage**: Minimal overhead for monitoring
- **Storage**: < 10MB for session data

### Success Criteria

#### Technical Success Metrics
- **Functional Agent Lifecycle**: Spawn, monitor, terminate agents successfully
- **Git Isolation**: Each agent works in isolated worktree
- **UI Responsiveness**: TUI responds to user input within 100ms
- **Error Handling**: Graceful degradation on agent failures
- **Process Management**: Clean resource cleanup on exit

#### User Success Metrics
- **Ease of Use**: New user can spawn first agent within 2 minutes
- **Workflow Integration**: Seamless integration with existing git workflows
- **Productivity Gain**: Measurable improvement in multi-tasking development
- **Reliability**: < 5% failure rate for agent operations

## Implementation Strategy

### Development Phases

#### Phase 1: Core Infrastructure (Week 1)
- CLI framework setup with commander.js
- Basic TUI with blessed
- Agent process spawning
- Simple session storage

#### Phase 2: Git Integration (Week 2)
- Git worktree creation/management
- Branch isolation per agent
- Basic merge coordination

#### Phase 3: Polish & Testing (Week 3)
- Error handling improvements
- UI/UX refinements
- Testing and bug fixes
- Documentation

### Technical Approach
- **Rapid Prototyping**: Build minimal viable features first
- **Incremental Enhancement**: Add complexity gradually
- **User-Centric Design**: Focus on developer experience
- **Clean Architecture**: Maintainable code structure

## Risk Assessment

### Technical Risks
- **Process Management Complexity**: Managing multiple child processes
- **Git Worktree Conflicts**: Handling complex git scenarios
- **Terminal UI Limitations**: blessed library constraints
- **Cross-Platform Compatibility**: Windows/Mac/Linux differences

### Mitigation Strategies
- **Thorough Testing**: Automated testing for process management
- **Git Best Practices**: Follow established worktree patterns
- **Fallback Options**: Graceful degradation for TUI issues
- **Platform Testing**: Multi-platform validation

## Success Metrics & KPIs

### Technical KPIs
- **Agent Spawn Success Rate**: > 95%
- **Session Stability**: < 2% crashes per hour
- **Git Operations Success**: > 98%
- **Memory Efficiency**: < 50MB per agent

### User Experience KPIs
- **Time to First Agent**: < 2 minutes
- **User Retention**: > 70% return usage
- **Error Rate**: < 5% user-reported issues
- **Workflow Integration**: Seamless git workflow adoption

## Resource Requirements

### Development Resources
- **Time Investment**: 3 weeks for MVP
- **Technical Skills**: Node.js, git, terminal UI development
- **Testing Requirements**: Multi-platform validation
- **Documentation**: User guides and API documentation

### System Requirements
- **Operating System**: macOS, Linux, Windows 10+
- **Node.js**: Version 16.0.0 or higher
- **Git**: Version 2.20.0 or higher
- **Terminal**: Modern terminal with Unicode support
- **Memory**: 4GB RAM minimum
- **Storage**: 1GB available space

## Future Considerations

### Post-MVP Enhancements
- **Agent Persistence**: Sessions survive app restarts
- **Remote Agents**: Connect to remote Claude instances
- **Advanced Git Features**: Merge conflict resolution
- **Team Collaboration**: Multi-user agent coordination
- **Plugin System**: Extensible agent capabilities

### Scalability Planning
- **Agent Limit Increase**: Support 10+ concurrent agents
- **Enterprise Features**: Team management, audit logs
- **Performance Optimization**: Reduced resource usage
- **Cloud Integration**: Remote session storage

## Conclusion

Napoleon represents a significant opportunity to streamline agent-driven development workflows. By focusing on the core value proposition of multi-session management with git isolation, we can deliver a powerful tool that enhances developer productivity while maintaining code quality and project organization.

The MVP scope is deliberately constrained to ensure rapid delivery of core functionality, with a clear path for future enhancements based on user feedback and adoption patterns.

---

**Document Version**: 1.0  
**Last Updated**: July 17, 2025  
**Next Review**: Upon MVP completion