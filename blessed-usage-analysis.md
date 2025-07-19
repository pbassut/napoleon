# Blessed Usage Analysis for Napoleon Codebase

## Overview

This document provides a comprehensive analysis of how the Blessed library is used throughout the Napoleon codebase.

## Files Using Blessed

### Core UI Files

1. **src/ui/index.js** - Main Terminal UI Manager
2. **src/ui/components/agent-detail-view.js** - Agent Detail View Component
3. **src/ui/components/agent-spawn-dialog.js** - Agent Spawn Dialog Component
4. **src/ui/components/agent-termination-dialog.js** - Agent Termination Dialog Component

### Test Files

- Multiple test files in `__tests__/` directory mock Blessed components for testing

## Blessed Components Used

### 1. **blessed.screen**

- Main screen container for the entire UI
- Configured with terminal compatibility options
- Features:
  - Smart CSR (cursor save/restore)
  - Mouse support
  - Keyboard handling
  - Title: 'Napoleon'
  - Custom cursor settings

### 2. **blessed.box**

- Most frequently used component
- Used for:
  - Main header container
  - Content area container
  - Footer container
  - Dialog containers (spawn, termination, detail view)
  - Button containers
  - Help overlay
  - Search results overlay

### 3. **blessed.text**

- Used for static text display
- Instances:
  - Header text (app title and version)
  - Status messages
  - Instruction text
  - Footer text (keyboard shortcuts)
  - Agent information display
  - Log content display
  - Help content

### 4. **blessed.list**

- Main agents list display
- Features:
  - Scrollable
  - Keyboard navigation (vi mode)
  - Mouse support
  - Item selection with highlighting

### 5. **blessed.textarea**

- Used in agent spawn dialog for multi-line input
- Features:
  - Border styling
  - Focus indicators
  - Input handling
  - Mouse support

### 6. **blessed.textbox**

- Used for search functionality in agent detail view
- Single-line input with special handling

## UI Structure

### Main Layout

```
┌─ Napoleon ─────────────────────────────────┐
│ Napoleon v1.0.0 - Agent Driven Development │ (Header)
├─ Status ───────────────────────────────────┤
│                                             │
│          [Agents List or Status]            │ (Content)
│                                             │
├─────────────────────────────────────────────┤
│ Press 'n' to spawn | 'd' to terminate...   │ (Footer)
└─────────────────────────────────────────────┘
```

### Component Hierarchy

1. **Screen** (Root container)
   - **Header Box**
     - Header Text
   - **Content Box**
     - Status Text (when no agents)
     - Instruction Text
     - Agents List (when agents exist)
   - **Footer Box**
     - Footer Text
   - **Overlays** (conditionally shown)
     - Help Overlay
     - Spawn Dialog
     - Termination Dialog
     - Agent Detail View

## Key Features

### 1. Terminal Compatibility

- Extensive terminal detection and compatibility fixes
- Special handling for:
  - xterm/screen terminals
  - macOS specific adjustments
  - CI environments
  - Color support (256 colors)
  - Unicode handling

### 2. Focus Management

- Custom focus handling between components
- Focus history tracking
- Cross-platform focus utilities
- Focus restoration after dialogs

### 3. Real-time Updates

- Status update intervals
- Animation support (blinking indicators)
- Performance optimization with render throttling

### 4. Event Handling

- Keyboard shortcuts
- Mouse support
- Dialog interactions
- Navigation between agents

## Custom Styling

### Color Scheme

- **Blue**: Headers, selected items
- **White**: Default text
- **Gray**: Borders, inactive elements
- **Green**: Success indicators, active borders
- **Red**: Error indicators, termination dialog
- **Yellow**: Warning/status messages
- **Cyan**: Information text, keyboard shortcuts

### Border Types

- All components use 'line' border type
- Focus states change border colors
- Shadow effects on dialogs

## No Custom Widgets

The codebase does not create any custom Blessed widgets or extensions. It uses only the standard Blessed components with custom configuration and styling.

## Configuration

- Terminal options are dynamically generated based on environment
- No external Blessed configuration files
- All styling and behavior configured inline with component creation
