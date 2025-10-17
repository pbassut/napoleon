# Project Brief: Napoleon

## Executive Summary

Napoleon is a macOS orchestration platform that enables developers to run multiple Claude Code AI agents simultaneously in isolated git worktrees. It solves the critical limitation of single-agent AI coding tools by allowing parallel task execution across independent workspaces. Targeting developers who manage multiple features, bugs, and refactoring tasks concurrently, Napoleon delivers multiplied productivity through its centralized monitoring dashboard and automated workspace management. The key value proposition is transforming Claude Code from a sequential single-agent tool into a parallel multi-agent development platform, reducing task completion time by up to 40% through intelligent parallelization.

## Problem Statement

The current state of AI-assisted development tools presents a fundamental bottleneck: developers using Claude Code or similar AI assistants can only work on one task at a time, creating an artificial constraint on productivity. This single-threaded limitation forces developers to process tasks sequentially—finishing one feature before starting a bug fix, completing refactoring before beginning new development.

The impact is significant: developers waste 30-50% of potential AI assistant time on context switching, waiting for sequential task completion, and managing mental overhead when juggling multiple priorities. In real-world development scenarios where teams manage 10-20 open issues simultaneously, this translates to days of lost productivity weekly.

Existing solutions fail because they either require complex manual setup (raw git worktrees with multiple terminal sessions), lack proper isolation (running multiple instances in the same directory causes conflicts), or don't provide adequate monitoring (no visibility into what each agent is doing). The market has no purpose-built orchestration layer for AI coding assistants.

The urgency is driven by the rapid adoption of AI coding tools—developers are increasingly relying on these assistants but hitting productivity ceilings due to architectural limitations. As codebases grow and issue backlogs expand, the need for parallel AI assistance becomes critical for maintaining development velocity.

## Proposed Solution

Napoleon introduces an orchestration layer that sits between developers and Claude Code, transforming single-agent limitations into multi-agent capabilities. The core concept leverages git worktrees to create truly isolated workspaces where each Claude Code instance operates independently, eliminating conflicts while sharing the same repository base.

Key differentiators from existing solutions include:
- **Zero-friction workspace creation**: One-click spawning of new isolated environments with automatic git worktree setup, branch management, and Claude Code launching
- **Intelligent city-named workspaces**: Memorable workspace naming (e.g., "krakow", "marseille") that makes mental tracking easier than generic IDs
- **Unified monitoring dashboard**: Real-time visibility into all active agents, their tasks, progress, and git statistics from a single interface
- **Native macOS integration**: Built with Tauri for optimal performance, using existing Claude Code authentication seamlessly

This solution succeeds where others haven't because it acknowledges that the problem isn't just running multiple instances—it's about orchestration, isolation, monitoring, and workflow integration. By handling the complex git worktree management automatically and providing a purpose-built UI for multi-agent coordination, Napoleon removes the technical barriers that prevented effective parallelization.

The high-level vision positions Napoleon as the essential orchestration platform for AI-assisted development, initially focused on Claude Code but architected to potentially support any AI coding assistant. It transforms AI coding from a single-player tool into a multiplayer development environment where one developer commands an army of AI agents.

## Target Users

### Primary User Segment: Solo Developers & Independent Contributors

**Profile:**
- Individual developers working on personal projects, open source, or as freelancers
- Typically managing 3-10 active projects with multiple features/bugs per project
- Working independently without dedicated team support
- Often context-switching between client work, maintenance, and new development

**Current behaviors:**
- Sequential processing of GitHub issues, often losing context between tasks
- Manual git stash/branch management when switching between features
- Running single Claude Code instance, closing and reopening for different tasks
- Mental overhead tracking what's in progress across projects

**Specific needs:**
- Maximize personal productivity without team infrastructure
- Maintain clear separation between different client/project work
- Ability to make progress on multiple fronts simultaneously
- Visual tracking of work-in-progress without complex project management tools

**Goals:**
- Ship features faster to clients or users
- Reduce time spent on context switching and setup
- Handle urgent bugs without disrupting feature work
- Maintain momentum across multiple initiatives

### Secondary User Segment: Small Development Teams & Technical Leads

**Profile:**
- Teams of 2-8 developers with technical leads coordinating work
- Managing 20-50 open issues across sprints
- Limited DevOps resources, preference for simple tooling
- Hybrid human/AI development workflows

**Current behaviors:**
- Distributing issues across team members and single AI assistant
- Bottlenecked by sequential AI processing for routine tasks
- Manual coordination of AI-assisted work through Slack/Discord
- Difficulty tracking what AI is working on versus human developers

**Specific needs:**
- Multiply AI assistance capacity without additional API costs
- Clear visibility into AI agent activity for coordination
- Standardized workspace setup across team members
- Integration with existing issue tracking (Linear, GitHub Issues)

**Goals:**
- Accelerate sprint velocity through parallel AI assistance
- Reduce lead time for bug fixes and small features
- Free human developers for high-value creative work
- Improve predictability of AI-assisted development

## Goals & Success Metrics

### Business Objectives
- **Achieve 1,000 active users within 6 months**: Measured by weekly active users running at least 2 workspaces
- **Generate $10K MRR by month 9**: Through freemium model with pro features for power users
- **Establish market leadership in AI orchestration**: Become the de facto solution mentioned in Claude Code workflows and tutorials
- **Enable 50% productivity improvement**: Validated through user time tracking showing task completion acceleration

### User Success Metrics
- **Time to parallel execution < 30 seconds**: From clicking "new workspace" to having multiple Claude Code instances running
- **Average 3+ concurrent workspaces per session**: Users actively leveraging parallel capabilities
- **70% reduction in context switching time**: Measured via user surveys comparing before/after workflow
- **90% of users complete first PR within 24 hours**: Successfully merge AI-assisted work demonstrating full workflow completion

### Key Performance Indicators (KPIs)
- **Workspace Creation Rate**: 10+ workspaces per active user per week, indicating regular parallel usage
- **Task Completion Velocity**: 40% reduction in average time from issue creation to PR merge
- **User Retention (30-day)**: 60% of users who create 3+ workspaces return within 30 days
- **Workspace Success Rate**: 80% of created workspaces result in merged code changes
- **API Token Efficiency**: Same token consumption achieving 2x output through better orchestration

## MVP Scope

### Core Features (Must Have)

- **Workspace Management:** Create, name, and delete isolated git worktree workspaces with single-click actions, automatic branch creation, and cleanup on completion
- **Claude Code Integration:** Launch Claude Code instances in specific workspaces, automatic authentication passthrough, and workspace-aware file system isolation
- **Dashboard Interface:** Real-time grid view of all active workspaces showing status, current branch, task description, and basic git statistics (+/- lines)
- **Git Operations:** View uncommitted changes per workspace, create commits and branches within workspaces, and basic diff viewing for code review
- **Linear Integration:** Import issues directly from Linear, automatic workspace naming from issue titles, and bi-directional status updates
- **Setup Automation:** Run repository-specific setup scripts on workspace creation (npm install, environment configuration) with customizable per-repo setup commands

### Out of Scope for MVP

- Windows and Linux support (macOS only initially)
- Team collaboration features (shared workspaces, permissions)
- Support for AI assistants other than Claude Code
- Advanced workflow automation and templates
- Cloud synchronization or backup
- Custom workspace naming beyond city names
- Integration with project management tools beyond Linear
- Workspace resource limits or quotas
- Detailed performance analytics and reporting

### MVP Success Criteria

The MVP will be considered successful when a solo developer can:
1. Create 3+ parallel workspaces in under 2 minutes
2. Have all workspaces running Claude Code simultaneously without conflicts
3. Complete and merge at least 2 PRs from separate workspaces in a single session
4. Report 30%+ productivity improvement over sequential Claude Code usage
5. Successfully use Napoleon daily for one week without reverting to old workflow

Technical validation requires:
- Zero workspace conflicts or git corruption across 100+ workspace operations
- Sub-second dashboard updates reflecting workspace changes
- Successful operation with repositories over 1GB and 10K+ files
- Memory usage under 500MB with 5 active workspaces

## Post-MVP Vision

### Phase 2 Features

Following MVP validation, the immediate priority expansions include:
- **Multi-AI Platform Support**: Extend beyond Claude Code to support Cursor, GitHub Copilot Workspace, and other AI coding assistants
- **Workspace Templates**: Pre-configured workspace setups for common tasks (bug fix, feature, refactor, documentation)
- **Advanced Automation**: Workflow recipes that chain multiple workspace operations, automatic PR creation when tests pass, and scheduled workspace operations
- **Team Collaboration**: Shared workspace visibility, workspace handoff between developers, and centralized workspace management for teams
- **Enhanced Git Integration**: Interactive rebase support, cherry-pick between workspaces, and advanced merge conflict resolution

### Long-term Vision

Over the next 1-2 years, Napoleon evolves into a comprehensive AI development orchestration platform:
- **Intelligent Workspace Allocation**: AI-driven task distribution across workspaces based on complexity and dependencies
- **Cross-Platform Support**: Native applications for Windows and Linux, expanding market reach 3x
- **Enterprise Features**: SSO integration, audit logs, compliance controls, and centralized billing
- **Workflow Marketplace**: Community-contributed automation recipes and workspace templates
- **Performance Intelligence**: ML-based predictions of task completion times and optimal parallelization strategies

### Expansion Opportunities

- **IDE Agnostic Architecture**: Support for VS Code, JetBrains, and terminal-based workflows beyond just Claude Code
- **CI/CD Integration**: Automatic workspace creation from CI failures, continuous testing across workspaces
- **AI Model Flexibility**: Support for self-hosted LLMs and custom AI models for enterprise customers
- **Workspace-as-a-Service**: API for programmatic workspace management enabling third-party integrations
- **Educational Platform**: Built-in tutorials and best practices for parallel AI development workflows

## Technical Considerations

### Platform Requirements
- **Target Platforms:** macOS 12.0+ (Monterey and later) for MVP, with Apple Silicon and Intel support
- **Browser/OS Support:** Native macOS app, no browser dependency for core functionality
- **Performance Requirements:** < 2 second workspace creation, < 500MB base memory footprint, support for 10+ concurrent workspaces on 16GB RAM systems

### Technology Preferences
- **Frontend:** Tauri with React/TypeScript for native performance with web technology flexibility
- **Backend:** Rust for core workspace management, performance-critical git operations, and system integration
- **Database:** SQLite for local workspace metadata, configuration storage, and usage analytics
- **Hosting/Infrastructure:** Local-first architecture with no cloud dependencies for MVP, optional telemetry to Posthog for analytics

### Architecture Considerations
- **Repository Structure:** Monorepo with separate packages for Tauri app, Rust core, and shared types
- **Service Architecture:** Event-driven communication between UI and workspace manager, IPC bridge for Rust-JavaScript communication, filesystem watchers for real-time updates
- **Integration Requirements:** Claude Code CLI integration via subprocess, Git command execution through libgit2 and shell commands, Linear API for issue synchronization, native macOS APIs for file system operations
- **Security/Compliance:** Sandboxed workspace execution, no storage of API keys (passthrough only), local-only data storage respecting user privacy, code signing and notarization for macOS distribution

## Constraints & Assumptions

### Constraints
- **Budget:** Bootstrap/self-funded initially with < $10K available for development tools, hosting, and initial marketing
- **Timeline:** 3-month runway to MVP launch, 6 months to initial revenue generation
- **Resources:** Solo developer or small team (1-2 developers), leveraging existing Melty Labs infrastructure and experience
- **Technical:** Must work within Claude Code's existing authentication model, limited by macOS APIs and sandboxing requirements, git worktree limitations for repository structure

### Key Assumptions
- Claude Code will maintain CLI interface compatibility through Napoleon's development cycle
- Developers are willing to pay for productivity multipliers in AI-assisted development
- Git worktrees provide sufficient isolation without performance degradation at scale
- The Linear API will remain stable and accessible for integration
- macOS market share among developers (>50%) justifies platform-specific initial release
- Users have sufficient system resources (RAM/CPU) to run multiple Claude Code instances
- The Tauri framework will continue to mature and support required native integrations
- No significant competing solution will launch during the MVP development period
- Claude API rate limits won't significantly constrain parallel workspace usage
- Early adopters will tolerate some rough edges in exchange for productivity gains

## Risks & Open Questions

### Key Risks
- **Claude Code API Changes:** Breaking changes to Claude Code's CLI or authentication could require significant rework and delay launch
- **Performance Degradation:** Multiple Claude instances might overwhelm system resources or hit unexpected API throttling, degrading user experience
- **Market Competition:** Anthropic or competitors could release native multi-agent features, eliminating Napoleon's value proposition
- **Git Worktree Edge Cases:** Complex repository structures or large monorepos might expose worktree limitations we haven't anticipated
- **User Adoption Friction:** Developers might find managing multiple parallel workspaces more cognitive overhead than productivity gain

### Open Questions
- What's the optimal number of concurrent workspaces before diminishing returns?
- How do we handle API rate limits when multiple workspaces hit the same endpoint simultaneously?
- Should we implement workspace templates in MVP or wait for user patterns to emerge?
- What's the best pricing model—per workspace, flat subscription, or usage-based?
- How do we handle merge conflicts when multiple workspaces modify the same files?
- Can we auto-detect and prevent duplicate work across workspaces?
- What level of workspace resource monitoring and limits do users actually need?

### Areas Needing Further Research
- Competitive analysis of emerging AI orchestration tools and their roadmaps
- User research on workspace naming preferences and mental models
- Performance benchmarking with various repository sizes and complexities
- Legal review of Claude Code's terms regarding third-party integrations
- Market sizing for developer productivity tools in the AI-assisted development space
- Technical investigation of Windows/Linux git worktree implementations for future ports
- User workflow studies to identify most common parallelization patterns

## Next Steps

### Immediate Actions
1. Validate core technical assumptions by building a proof-of-concept with 3 concurrent git worktrees
2. Conduct user interviews with 10 active Claude Code users to validate pain points and workflow
3. Create detailed technical architecture document expanding on the technical considerations
4. Set up development environment with Tauri, Rust, and React toolchain
5. Implement minimal viable git worktree manager with basic UI
6. Test Claude Code CLI integration and authentication passthrough
7. Design and prototype the dashboard interface with mock data
8. Establish telemetry and analytics infrastructure for measuring KPIs

### PM Handoff

This Project Brief provides the full context for Napoleon. Please start in 'PRD Generation Mode', review the brief thoroughly to work with the user to create the PRD section by section as the template indicates, asking for any necessary clarification or suggesting improvements.

The brief establishes Napoleon as an orchestration platform that transforms Claude Code from a single-agent tool into a parallel multi-agent development environment. Key focus areas for the PRD should include detailed user workflows, technical specifications for workspace isolation, and specific UI/UX requirements for the dashboard interface.

---

**Project Brief Created By:** Mary, Business Analyst
**Date:** 2025-10-16
**Status:** Ready for PRD Development
