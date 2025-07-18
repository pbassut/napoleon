# Existing Project Analysis

## Current Project State

- **Primary Purpose:** Agent Driven Development Manager - A CLI tool for managing multiple Claude CLI sessions with isolated git worktrees
- **Current Tech Stack:** Node.js (16+), blessed (terminal UI), commander.js (CLI), winston (logging), git worktrees
- **Architecture Style:** Modular monolithic with clear separation between CLI, UI, Core logic, and utilities
- **Deployment Method:** NPM package with global CLI command (`add-manager`)

## Available Documentation

- Package.json with project metadata and dependencies
- Comprehensive inline code documentation
- Clear module separation with dedicated directories
- Well-structured error handling and logging system

## Identified Constraints

- Node.js 16.0.0+ requirement for modern JavaScript features
- Git 2.20.0+ required for worktree operations
- Claude CLI must be installed and accessible in PATH
- Maximum 3 concurrent agents (configurable)
- Process management complexity with stdin/stdout handling
- Limited ability to reattach to existing processes after restart