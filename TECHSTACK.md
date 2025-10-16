# Conductor Tech Stack

> Analysis of conductor.build (by Melty Labs) - A Mac desktop app for running multiple Claude Code agents in parallel with isolated git workspaces.

## Overview

Conductor is a modern desktop application built with web technologies and native capabilities, focused on developer productivity and Git workflow management. It enables running multiple Claude Code agents simultaneously, each in isolated git worktrees.

---

## Frontend Framework & Build Tools

### Core Technologies
- **React 16+** - Component-based UI framework
- **TypeScript** (strict mode) - Type-safe JavaScript
- **Vite** - Modern build tool and dev server
- **ES Modules** - Modern JavaScript module system

---

## Desktop Framework

### Tauri
- **Rust-based** desktop framework
- Lightweight alternative to Electron
- Security-focused architecture
- Native system integration capabilities
- Small bundle sizes with near-native performance

**Architecture:**
- Rust backend handles system calls, file operations, and git commands
- IPC (Inter-Process Communication) bridge between Rust and JavaScript
- WebView for rendering the UI

---

## UI Components & Libraries

### Component Framework
- **Radix UI** - Unstyled, accessible component primitives
  - Dialog/Modal components
  - Popover/Dropdown components
  - Tabs and navigation
  - Extensive ARIA attributes for accessibility

### Icons
- **Lucide React** - Modern SVG icon library
  - Consistent icon system throughout the app
  - Customizable stroke width and sizing

### Virtualization
- **React Virtuoso** - Virtual scrolling for large lists
  - Efficient rendering of long message/file lists

---

## Styling System

### Approach
- **CSS Variables** (Custom Properties) - Extensive theming system
- **Tailwind CSS** - Utility-first CSS framework
- **HSL Color System** - All colors defined in HSL for easy manipulation

### Design Tokens
```css
/* Color Palette */
--background, --foreground
--primary, --secondary, --accent
--muted, --helper
--success, --warning, --destructive
--sidebar-background, --sidebar-foreground

/* Git-specific colors */
--git-green, --git-red, --git-yellow, --git-gray
--git-new-line, --git-removed-line
```

### Typography
- **Geist** - Primary sans-serif font (system font)
- **Fira Code** - Monospace font for code and terminal
- **Font kerning disabled** for precise terminal rendering

---

## Terminal Integration

### Xterm.js
- Full-featured terminal emulator in the browser
- Components visible:
  - `xterm-viewport` - Scrollable terminal area
  - `xterm-dom-renderer` - DOM-based rendering
  - `xterm-screen` - Terminal display
  - `xterm-cursor` - Cursor management with blink animations

### Shell Integration
- **Fish shell** - Default interactive shell
- Real-time command execution
- Terminal state persistence across sessions

---

## State Management & Data

### Patterns
- **React Context** - For global state
- **Zustand** (implied) - Lightweight state management
- **Local Storage** - User preferences and settings
- **Component State** - For UI interactions

---

## Notifications & Feedback

### Sonner
- Toast notification system
- Rich notification types: success, error, warning, info
- Swipe-to-dismiss gestures
- Position configuration (top/bottom, left/right/center)
- Keyboard accessible

---

## Git Integration

### Core Git Features
- **Git Worktrees** - Isolated workspace creation
- **Branch Management** - Create, switch, and manage branches
- **Diff Visualization** - Side-by-side code comparison
- **Commit History** - View and navigate commits
- **Status Tracking** - Real-time git status updates

### Git Visual Language
```css
--git-green: #4ade80    /* Additions */
--git-red: #f87272      /* Deletions */
--git-yellow: #ffea80   /* Modified */
--git-gray: #a5a09c     /* Unchanged */
```

---

## Backend & System Integration

### Native APIs (via Tauri)
- **File System Access** - Read/write files and directories
- **Process Management** - Spawn and manage child processes
- **Shell Commands** - Execute git and other CLI tools
- **System Dialogs** - Native file pickers and alerts

### External API Integrations
- **Claude Code API** - AI agent orchestration
- **Linear API** - Issue tracking integration
- **Git CLI** - All git operations via native git

### Local-First Architecture
- All processing happens on user's Mac
- No cloud uploads of code
- Private data stays local

---

## Key Technical Features

### 1. Multi-Workspace Management
- Each workspace runs in an isolated git worktree
- Separate file trees for each Claude Code agent
- No interference between workspaces

### 2. Real-Time Status Monitoring
- Live updates of agent progress
- Visual indicators for workspace state
- Activity tracking per agent

### 3. Code Review Interface
- Inline diff viewing
- File change summary
- Git statistics (+additions/-deletions)

### 4. Keyboard-First Interface
Extensive keyboard shortcuts:
- `⌘L` - Focus message input
- `⌘N` - New workspace
- `⌘I` - Link Linear issue
- Custom shortcuts for common operations

### 5. Dark Theme
- Default dark mode optimized for developer workflows
- Custom color system for readability
- Terminal colors matching git operations

---

## Accessibility

### Standards Compliance
- **ARIA attributes** throughout the application
- **Role-based navigation** for screen readers
- **Keyboard navigation** for all interactions
- **Focus management** for modal dialogs
- **Live regions** for dynamic content updates

---

## Performance Optimizations

### Rendering
- Virtual scrolling for large lists (Virtuoso)
- Component-level code splitting
- Lazy loading of heavy components

### Build Optimization
- Vite for fast HMR (Hot Module Replacement)
- Tree-shaking for minimal bundle size
- Asset optimization and code splitting

### Tauri Benefits
- Native performance for system operations
- Small bundle size (~10-20MB vs 100MB+ for Electron)
- Low memory footprint

---

## Development Patterns

### Component Architecture
- Composition over inheritance
- Radix primitives for accessible base components
- Custom components built on top of primitives

### Type Safety
- Strict TypeScript configuration
- Type inference throughout
- Interface definitions for all props

### Responsive Design
- Container queries (`@container`)
- Flexible layouts with flexbox/grid
- Adaptive UI based on panel sizes

---

## Third-Party Dependencies

### UI Framework Stack
```
react
react-dom
typescript
vite
```

### Component Libraries
```
@radix-ui/react-*
lucide-react
sonner
react-virtuoso
```

### Terminal
```
xterm
xterm-addon-*
```

### Development Tools
```
@tauri-apps/api
@tauri-apps/cli
```

---

## Platform Support

### Current
- **macOS only** (as of initial release)

### Future Plans
- Windows support planned
- Linux support considered
- Additional IDE integrations beyond Claude Code

---

## Summary

Conductor leverages modern web technologies (React, TypeScript, Vite) combined with native capabilities (Tauri, Rust) to create a performant, secure desktop application. The architecture prioritizes:

1. **Developer Experience** - Fast, keyboard-driven workflows
2. **Performance** - Native speed with web flexibility
3. **Security** - Local-first, no cloud uploads
4. **Accessibility** - WCAG-compliant interface
5. **Maintainability** - Type-safe, component-based architecture

The tech stack reflects modern best practices in desktop application development, balancing web ecosystem advantages with native performance requirements.
