# Napoleon UI Tech Stack

> UI component library for Napoleon - A Tauri-based Mac desktop app for running multiple Claude Code agents in parallel with isolated git workspaces.

## Overview

This repository contains the extracted UI component library for Napoleon, a modern desktop application. The components are built with React and designed to integrate seamlessly with Tauri's native capabilities. This is a pure UI library without Next.js-specific features, ready for Tauri integration.

---

## Frontend Framework

### Core Technologies
- **React 19** - Component-based UI framework
- **TypeScript 5** - Type-safe JavaScript with strict mode
- **Tailwind CSS 4.1.9** - Utility-first CSS framework
- **ES Modules** - Modern JavaScript module system

### Tauri Integration Ready
This UI library is designed to work within a Tauri desktop application:
- No Next.js routing or server-side features
- Pure client-side React components
- Compatible with Tauri's WebView rendering
- Works with Tauri's IPC for backend communication

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
```json
react: ^19
react-dom: ^19
typescript: ^5
```

### Component Libraries
```json
@radix-ui/react-*: 1.x - 2.x (various versions)
lucide-react: ^0.454.0
sonner: ^1.7.4
framer-motion: latest
recharts: 2.15.4
```

### State & Forms
```json
zustand: latest
react-hook-form: ^7.60.0
@hookform/resolvers: ^3.10.0
zod: 3.25.76
```

### Terminal & Interactive
```json
xterm: 5.3.0
vaul: ^0.9.9
embla-carousel-react: 8.5.1
react-resizable-panels: ^2.1.7
```

### Styling
```json
tailwindcss: ^4.1.9
tailwindcss-animate: ^1.0.7
tailwind-merge: ^2.5.5
class-variance-authority: ^0.7.1
next-themes: ^0.4.6
```

### Utilities
```json
date-fns: 4.1.0
cmdk: 1.0.4
input-otp: 1.4.1
immer: latest
```

---

## Notable Exclusions

This UI library **does not include**:
- ❌ Next.js framework or routing
- ❌ Server-side rendering (SSR)
- ❌ API routes or backend code
- ❌ Vercel-specific integrations
- ❌ Build configurations (handled by parent Tauri app)

---

## Summary

This UI component library provides a complete set of modern, accessible React components for the Napoleon Tauri application. The architecture prioritizes:

1. **Reusability** - Modular components for Tauri integration
2. **Accessibility** - WCAG-compliant with Radix UI primitives
3. **Type Safety** - Strict TypeScript throughout
4. **Performance** - Lightweight components optimized for desktop
5. **Flexibility** - Composable primitives with theming support

The component library is framework-agnostic (no Next.js dependencies) and ready to be integrated into a Tauri desktop application with minimal configuration.
