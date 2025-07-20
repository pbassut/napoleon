# Napoleon Blessed UI Complete Feature Documentation

This document comprehensively lists all features, keyboard shortcuts, UI behaviors, and edge cases implemented in the Blessed UI that must be replicated in the Ink UI for feature parity.

## Table of Contents
1. [Keyboard Shortcuts](#keyboard-shortcuts)
2. [UI Components](#ui-components)
3. [Agent Management Features](#agent-management-features)
4. [UI Behaviors](#ui-behaviors)
5. [Edge Cases](#edge-cases)
6. [Performance Characteristics](#performance-characteristics)

## Keyboard Shortcuts

### Global Shortcuts (Available in all views)
| Key | Action | Description |
|-----|--------|-------------|
| `q` | Quit | Exit the application |
| `Ctrl+C` | Force quit | Force exit the application |
| `h` | Help | Show/hide help overlay |
| `?` | Help (alternate) | Show help in detail view |

### Main Dashboard (Agent List View)
| Key | Action | Description |
|-----|--------|-------------|
| `n` | New agent | Open spawn dialog |
| `d` | Delete/terminate | Open termination dialog for selected agent |
| `Enter`/`i` | View details | Open detail view for selected agent |
| `↑`/`k` | Move up | Select previous agent |
| `↓`/`j` | Move down | Select next agent |
| `m` | Merge view | Open merge coordination (future) |
| `r` | Restart | Restart selected agent |
| `c` | Cleanup | Clean up resources |

### Agent Detail View
| Key | Action | Description |
|-----|--------|-------------|
| `Escape`/`q` | Back | Return to dashboard |
| `/` | Search | Enter search mode |
| `n` | Next match | Navigate to next search result |
| `N` | Previous match | Navigate to previous search result |
| `j`/`↓` | Scroll down | Scroll down one line |
| `k`/`↑` | Scroll up | Scroll up one line |
| `PageDown` | Page down | Scroll down one page |
| `PageUp` | Page up | Scroll up one page |
| `G` | Go to bottom | Jump to end of logs |
| `gg` | Go to top | Jump to beginning (double `g`) |
| `a` | Toggle auto-scroll | Enable/disable auto-scroll |
| `l` | External viewer | Open log in external application |
| `h` | Historical logs | Browse historical agent logs |
| `?` | Help | Show detail view help |

### Spawn Dialog
| Key | Action | Description |
|-----|--------|-------------|
| `Enter` | Spawn | Create agent with entered instructions |
| `Shift+Enter` | New line | Insert line break in instructions |
| `Escape` | Cancel | Close dialog without spawning |
| `Tab` | Indent | Insert indentation |

### Termination Dialog
| Key | Action | Description |
|-----|--------|-------------|
| `y`/`Y` | Yes | Confirm termination |
| `n`/`N` | No | Cancel termination |
| `Enter` | Select | Execute selected button |
| `Tab`/`→` | Next button | Move to next button |
| `Shift+Tab`/`←` | Previous button | Move to previous button |
| `Escape` | Cancel | Close dialog |

### Search Mode (in Detail View)
| Key | Action | Description |
|-----|--------|-------------|
| `Enter` | Search | Execute search |
| `Escape` | Cancel | Exit search mode |

## UI Components

### Main Dashboard Components
1. **Header**
   - Application title: "Napoleon - Agent Driven Development Manager"
   - Border style: cyan color, line type

2. **Agent List**
   - Shows all active agents
   - Displays: agent ID, status, runtime
   - Selection highlighting with inverse colors
   - Scrollable when list exceeds viewport

3. **Footer**
   - Shows keyboard shortcuts
   - Context-sensitive based on current view
   - Updates with status messages

### Agent Detail View Components
1. **Agent Info Header**
   - Agent ID and branch name
   - SDK status
   - Started time and runtime
   - Session ID and instructions
   - Log file path with status indicators

2. **Log Viewer**
   - Line numbers (3-digit padded)
   - Timestamps (HH:MM:SS format)
   - Scrollable content area
   - Search highlighting (yellow for matches, inverse for current)
   - Auto-scroll indicator

3. **Footer**
   - Shows available shortcuts
   - Search results counter when searching
   - Temporary status messages

### Dialog Components
1. **Spawn Dialog**
   - Title: "Spawn New Agent"
   - Instructions text area
   - Multi-line input support
   - Footer with shortcuts
   - Green border when focused

2. **Termination Dialog**
   - Title: "Terminate Agent"
   - Agent information display
   - Yes/No buttons with focus indicators
   - Red border for warning
   - Default selection on "No" for safety

## Agent Management Features

### Agent Spawning
1. **Validation**
   - Non-empty instructions required
   - No minimum character limit
   - Trim whitespace before validation

2. **Process**
   - Modal closes immediately after validation
   - Agent creation happens in background
   - Errors shown in agent list, not modal

3. **Focus Management**
   - Focus returns to main UI after spawn
   - Keyboard shortcuts restored

### Agent Termination
1. **Confirmation**
   - Shows agent name, status, runtime
   - Requires explicit confirmation
   - Default selection on "No"

2. **Process**
   - Immediate UI update
   - Background cleanup of resources
   - Log file persistence

### Agent Status Display
1. **Status Indicators**
   - `●` (green) - Running/active
   - `◌` (yellow) - Pending/starting
   - `×` (red) - Error/failed
   - `○` (gray) - Terminated
   - `✓` (green) - Success/completed

2. **Status Messages**
   - Show progress during spawning
   - Display error details on failure
   - Update in real-time

## UI Behaviors

### List Navigation
1. **Selection Memory**
   - Maintains selection when list updates
   - Adjusts selection if selected item removed
   - Wraps at boundaries (optional)

2. **Scrolling**
   - Smooth scrolling with keyboard
   - Auto-scroll to keep selection visible
   - Page-based scrolling with PgUp/PgDn

### Modal Interactions
1. **Focus Trapping**
   - Modals capture all input
   - Background UI doesn't respond
   - ESC always closes modal

2. **State Preservation**
   - UI state maintained when opening modals
   - Selection restored on modal close
   - Scroll positions preserved

### Real-time Updates
1. **Log Streaming**
   - 1-second update interval
   - Auto-scroll to new content (when enabled)
   - Efficient rendering of large logs

2. **Status Updates**
   - Agent list refreshes automatically
   - Status indicators update in real-time
   - No flicker during updates

### Search Functionality
1. **Search Mode**
   - Regex support
   - Case-insensitive by default
   - Highlights all matches
   - Shows match count

2. **Navigation**
   - Cycles through matches with n/N
   - Auto-scrolls to show matches
   - Current match highlighted differently

## Edge Cases

### Empty States
1. **No Agents**
   - Shows "No agents running"
   - Displays help text: "Press 'n' to spawn a new agent"
   - All shortcuts still work

2. **No Logs**
   - Shows appropriate status messages
   - Displays spinner for loading states
   - Different messages for different agent states

### Error Handling
1. **Spawn Failures**
   - Error shown in footer temporarily
   - Modal remains open for immediate failures
   - Background failures shown in agent list

2. **Log Access Errors**
   - Graceful fallback messages
   - Shows file access errors
   - Continues to function without crashes

### Resource Limits
1. **Log Size**
   - Handles 10,000+ lines efficiently
   - Virtual scrolling for performance
   - Memory-efficient log rotation

2. **Agent Count**
   - Supports 50+ agents without lag
   - Efficient list rendering
   - Smooth scrolling maintained

### Terminal Compatibility
1. **Size Handling**
   - Minimum 80x24 terminal size
   - Graceful degradation for smaller
   - Dynamic layout adjustment

2. **Character Support**
   - Unicode symbols with ASCII fallback
   - Cross-platform symbol compatibility
   - Consistent rendering across terminals

## Performance Characteristics

### Responsiveness
- Immediate keyboard response (<50ms)
- Smooth scrolling (60fps target)
- No lag with 50+ agents
- Efficient log rendering

### Resource Usage
- Low CPU usage when idle
- Minimal memory footprint
- Efficient update cycles
- Smart re-rendering

### Startup
- Fast application launch
- Quick UI initialization
- Immediate interaction capability
- No blocking operations

## Additional Features

### Log File Management
1. **Persistent Logging**
   - Logs saved to ~/.napoleon/logs/agents/
   - Automatic file creation per agent
   - Historical log browsing support

2. **External Viewer**
   - Opens with system default editor
   - Cross-platform support (macOS, Linux, Windows)
   - Non-blocking operation

### Help System
1. **Context-Sensitive**
   - Different help for each view
   - Shows relevant shortcuts only
   - Clear descriptions

2. **Accessibility**
   - Always available with 'h' or '?'
   - Well-formatted and readable
   - Comprehensive coverage

### Configuration
1. **Environment Variables**
   - `MESSAGE_TYPES` - Filter log types (default: "assistant")
   - `NAPOLEON_UI` - UI selection (blessed/ink)

2. **Future: Key Binding Customization**
   - Configurable shortcuts
   - Import/export settings
   - User preferences

## Implementation Priority

### Critical Features (Must Have)
1. All basic navigation (arrow keys, j/k)
2. Agent spawn/terminate dialogs
3. Detail view with logs
4. Search functionality
5. Real-time updates
6. Proper focus management

### Important Features (Should Have)
1. All keyboard shortcuts
2. Status indicators and colors
3. Help system
4. Auto-scroll toggle
5. External log viewer
6. Performance optimizations

### Nice-to-Have Features
1. Historical log browsing
2. Configuration options
3. Advanced animations
4. Terminal-specific optimizations