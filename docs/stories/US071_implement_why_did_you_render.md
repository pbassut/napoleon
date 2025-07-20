# User Story: Implement why-did-you-render for React Performance Debugging

## Story ID
US071

## Title
Implement why-did-you-render for React Performance Debugging

## Status
Approved

## Story
**As a** Napoleon developer,
**I want** to integrate why-did-you-render into the Ink UI components,
**so that** I can identify and fix unnecessary re-renders and performance issues in the React-based terminal UI

## Acceptance Criteria

1. why-did-you-render is properly installed and configured for the Ink React components
2. The tool only runs in development mode (NODE_ENV=development or NAPOLEON_DEBUG=true)
3. Console output from why-did-you-render appears in the terminal when components re-render unnecessarily
4. All major UI components are tracked (App, AgentList, AgentItem, Dialogs, etc.)
5. Configuration allows easy enabling/disabling of specific component tracking
6. No performance impact or console noise in production builds
7. Developer documentation includes instructions for using why-did-you-render
8. The tool helps identify the specific props/state changes causing re-renders

## Tasks / Subtasks

- [x] Install and configure why-did-you-render (AC: 1, 2)
  - [x] Add @welldone-software/why-did-you-render as a dev dependency
  - [x] Create wdyr.ts initialization file in src/ui/ink/
  - [x] Configure to only run in development mode
  - [x] Import wdyr.ts at the top of src/ui/ink/index.tsx

- [x] Configure component tracking (AC: 4, 5)
  - [x] Add whyDidYouRender static property to App component
  - [x] Add tracking to AgentList and AgentItem components
  - [x] Add tracking to Dialog components (SpawnDialog, TerminationDialog)
  - [x] Add tracking to Layout components (Header, Footer, MainContent)
  - [x] Configure custom tracking options for each component type

- [x] Set up development environment integration (AC: 3, 6)
  - [x] Ensure console output is properly formatted for terminal
  - [x] Add environment variable check (NAPOLEON_DEBUG_RENDERS)
  - [x] Verify no impact on production builds
  - [x] Test with npm run dev vs npm start

- [x] Add developer documentation (AC: 7)
  - [x] Create docs/development/debugging-react-performance.md
  - [x] Document how to enable/disable why-did-you-render
  - [x] Include examples of common re-render issues found
  - [x] Add troubleshooting section

- [x] Test and verify functionality (AC: 8)
  - [x] Test with existing performance issues (modal flickering)
  - [x] Verify prop change detection works correctly
  - [x] Ensure state change tracking functions properly
  - [x] Validate custom hooks tracking (useAgentManager, etc.)

## Dev Notes

### Technical Implementation Details
[Source: package.json, src/ui/ink structure analysis]

**React/Ink Setup:**
- Project uses React 18.2.0 with Ink 4.4.1 for terminal UI
- Components are TypeScript (.tsx) files
- Main entry point: src/ui/ink/index.tsx
- App component: src/ui/ink/App.tsx

**Component Structure:**
- Components use React.memo for optimization (e.g., AgentItem.tsx)
- Custom hooks in src/ui/ink/hooks/ (useAgentManager, useAgentLogs)
- Modal components use absolute positioning (potential re-render issues)

**File Locations:**
- Create: src/ui/ink/wdyr.ts (configuration file)
- Modify: src/ui/ink/index.tsx (import wdyr)
- Modify: All component files to add whyDidYouRender static property
- Create: docs/development/debugging-react-performance.md

**Environment Detection:**
- Check NODE_ENV === 'development'
- Check process.env.NAPOLEON_DEBUG_RENDERS
- Existing debug flag: process.env.NAPOLEON_DEBUG

### Testing Standards
[Source: docs/architecture/testing-strategy.md]
- Test location: __tests__/ parallel to source
- Framework: Jest with existing configuration
- No specific tests needed for why-did-you-render (dev tool only)
- Manual testing required to verify console output

## Change Log
| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-01-20 | 1.0 | Initial story creation | Bob (Scrum Master) |
| 2025-01-20 | 1.1 | Story approved for development | Bob (Scrum Master) |

## Dev Agent Record

### Agent Model Used
Claude 3.5 Sonnet

### Debug Log References
- Starting implementation of US071
- Developer Status: In Progress

### Completion Notes List
1. Successfully installed @welldone-software/why-did-you-render@^8.0.0 (compatible with React 18)
2. Created comprehensive wdyr.ts configuration with terminal-friendly output formatting
3. Added whyDidYouRender tracking to all major UI components:
   - App, AgentList, AgentItem (core components)
   - SpawnDialog, TerminationDialog (dialog components)  
   - Header, Footer, MainContent (layout components)
   - DetailView, ModalOverlay (additional components)
4. Configured environment variable support: NAPOLEON_DEBUG_RENDERS, NODE_ENV, NAPOLEON_DEBUG
5. Implemented custom notifier for clean terminal output with emojis and formatting
6. Added component filtering to only track Napoleon components (exclude ErrorBoundary)
7. Created comprehensive developer documentation with examples and troubleshooting
8. Verified no impact on production builds - tool only loads in development mode
9. All acceptance criteria met and tested

### File List
- **Created:**
  - src/ui/ink/wdyr.ts - why-did-you-render configuration
  - docs/development/debugging-react-performance.md - Developer documentation
  
- **Modified:**
  - package.json - Added @welldone-software/why-did-you-render dependency
  - src/ui/ink/index.tsx - Added wdyr.ts import
  - src/ui/ink/App.tsx - Added whyDidYouRender property
  - src/ui/ink/components/AgentList/AgentList.tsx - Added tracking
  - src/ui/ink/components/AgentList/AgentItem.tsx - Added tracking
  - src/ui/ink/components/Dialogs/SpawnDialog.tsx - Added tracking
  - src/ui/ink/components/Dialogs/TerminationDialog.tsx - Added tracking
  - src/ui/ink/components/Layout/Header.tsx - Added tracking
  - src/ui/ink/components/Layout/Footer.tsx - Added tracking
  - src/ui/ink/components/Layout/MainContent.tsx - Added tracking
  - src/ui/ink/components/DetailView/DetailView.tsx - Added tracking
  - src/ui/ink/components/Common/ModalOverlay.tsx - Added tracking

## QA Results
(To be filled by QA Agent)