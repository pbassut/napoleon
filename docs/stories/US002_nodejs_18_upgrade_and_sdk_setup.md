# Story 1.2: Node.js 18 Upgrade and SDK Setup

## User Story

As a developer,
I want to upgrade to Node.js 18 and add the Claude Code SDK dependency,
so that the project is ready for SDK integration with modern runtime support.

## Acceptance Criteria

1. Package.json engines field updated to require Node.js >=18.0.0
2. @anthropic-ai/claude-code dependency added at version ^1.0.53
3. All existing dependencies tested for Node.js 18 compatibility
4. SDK types and interfaces documented in new src/core/sdk/sdk-types.js
5. Environment variable setup documented for ANTHROPIC_API_KEY
6. Git ignored files updated to exclude any API key files

## Integration Verification

- IV1: All existing tests pass under Node.js 18
- IV2: Blessed terminal UI renders correctly in Node.js 18
- IV3: No performance degradation observed in terminal responsiveness