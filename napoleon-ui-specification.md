# Napoleon UI/UX Specification

## Overview
This document defines the enhanced UI/UX design for Napoleon Agent Manager - a terminal-based application for managing multiple Claude AI agents with git worktree isolation.

**Design Philosophy:**
- Clean, minimal interface optimized for developer productivity
- Full-screen terminal utilization with intuitive navigation
- Real-time status updates with clear visual hierarchy
- Keyboard-first interaction model

---

## 1. Main Dashboard (Agent List View)

### Layout
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   Napoleon                                      │
│                                                                                 │
│  Agent                                               Runtime    Status          │
│ ───────────────────────────────────────────────────────────────────────────── │
│                                                                                 │
│ ❯ agent-a7f2k1-auth-system                            2m 34s   🟢 Running      │
│                                                                                 │
│   agent-m9x4p3-memory-leak                            1m 12s   🟡 Pending      │
│                                                                                 │
│   agent-b5c8q7-api-cleanup                              45s    🔴 Error        │
│                                                                                 │
│                                                                                 │
│                                                                                 │
│                                                                                 │
│                                                                                 │
│                                                                                 │
│                                                                                 │
│                                                                                 │
│                                                                                 │
│                                                                                 │
│                                                                                 │
│                                                                                 │
│                                                                                 │
│ ───────────────────────────────────────────────────────────────────────────── │
│  [n]ew agent  [d]elete  [Enter] inspect  [q]uit     🔍 [/] search  [f] follow  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Key Features
- **Full-screen layout** utilizing entire terminal space
- **Three-column structure:** Agent, Runtime, Status
- **Selection indicator:** `❯` shows currently selected agent (cyan/blue highlight)
- **Agent naming convention:** `agent-{6char}-{worktree}` format
- **Real-time updates** for runtime and status
- **Scrollable content** for 10+ agents
- **Clean typography** with proper spacing

### Navigation Controls
| Key | Action |
|-----|--------|
| `↑` / `k` | Move selection up |
| `↓` / `j` | Move selection down |
| `Enter` / `i` | Inspect selected agent (detail view) |
| `n` | Spawn new agent |
| `d` | Delete selected agent |
| `q` | Quit application |
| `/` | Search (future feature) |
| `f` | Follow logs (future feature) |

---

## 2. Agent Status System

### Status Circle Colors & Meanings

#### 🟢 Green Circle
- **🟢 Running** - Agent actively processing instructions

#### 🟡 Yellow Circle  
- **🟡 Spawning...** - Agent being created
- **🟡 Forking...** - Setting up git worktree
- **🟡 Starting...** - Agent connecting to Claude
- **🟡 Pending** - Agent waiting for instructions
- **🟡 Idle** - Agent completed task, waiting

#### 🔴 Red Circle
- **🔴 Error** - Agent encountered an error
- **🔴 Failed** - Agent failed to complete task

#### ⚪ Gray Circle
- **⚪ Terminated** - Agent cleanly stopped

### Status Flow
```
🟡 Spawning... → 🟡 Forking... → 🟡 Starting... → 🟢 Running → 🟡 Idle
                                                      ↓
                                               🔴 Error → ⚪ Terminated
```

---

## 3. Agent Detail View (Log Viewer)

### Layout
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ❮ agent-a7f2k1-auth-system                              🟢 Running     2m 34s   │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                                 │
│ [14:23:45] Starting authentication system implementation...                    │
│ [14:23:47] Analyzing current auth flow in src/auth/                            │
│ [14:24:12] Creating JWT token validation middleware                            │
│ [14:24:45] Implementing user session management                                │
│ [14:25:23] ERROR: Missing bcrypt dependency in package.json                    │
│ [14:25:24] Installing required authentication packages...                     │
│ [14:25:45] SUCCESS: Added bcrypt@5.1.0 to dependencies                        │
│ [14:26:01] Creating password hashing utilities                                │
│ [14:26:34] Implementing login endpoint validation                              │
│ [14:27:12] Writing unit tests for auth middleware                              │
│ [14:27:45] Running test suite to verify implementation...                      │
│ [14:28:01] ✓ All authentication tests passing                                 │
│ [14:28:15] Updating API documentation for new endpoints                        │
│ [14:28:47] Ready for code review - implementation complete                    │
│                                                                                 │
│                                                                                 │
│                                  ↓ More below ↓                                │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ [q] back  [/] search  [f] follow: ON  [↑↓] scroll  🔍 Search: "auth" 3/7       │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Key Features
- **Back indicator:** `❮` shows this is a sub-view
- **Agent context:** Full agent ID, live status, and runtime in header
- **Clean log display:** No line numbers, timestamps only
- **Color-coded content:**
  - 🔴 **ERROR:** Red text for errors
  - 🟢 **SUCCESS:** Green text for successes
  - 🟡 **System messages:** Yellow text for system output
  - ⚪ **Default:** White text for regular content
- **Scroll indicators:** Show when more content available
- **Search integration:** Live search with match highlighting

### Navigation Controls
| Key | Action |
|-----|--------|
| `q` / `Esc` | Return to main agent list |
| `↑` / `k` | Scroll up one line |
| `↓` / `j` | Scroll down one line |
| `Page Up` | Scroll up one page |
| `Page Down` | Scroll down one page |
| `G` | Go to bottom (enable auto-scroll) |
| `g` | Go to top (disable auto-scroll) |
| `/` | Enter search mode |
| `n` | Next search match |
| `N` | Previous search match |
| `f` | Toggle auto-scroll follow mode |

### Follow Mode States
- **`[f] follow: ON`** - Auto-scroll to newest logs (default)
- **`[f] follow: OFF`** - Manual scroll control, stays at current position

---

## 4. New Agent Spawn Dialog

### Layout
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│                                  ┌─ New ─┐                                      │
│                                  │       │                                      │
│                                  │ Instructions:                                │
│                                  │ ┌───────────────┐                           │
│                                  │ │ Create a new  │                           │
│                                  │ │ authentication│                           │
│                                  │ │ system using  │                           │
│                                  │ │ JWT tokens.   │                           │
│                                  │ │ Include tests │                           │
│                                  │ │ and docs.     │                           │
│                                  │ │               │                           │
│                                  │ │               │                           │
│                                  │ └───────────────┘                           │
│                                  │                                             │
│                                  │ [Enter] Create Agent                        │
│                                  │ [Esc] Cancel                                │
│                                  └─────────────────┘                           │
│                                                                                 │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Key Features
- **Minimal title:** Simply "New"
- **Centered modal** overlay
- **Single text input** for agent instructions
- **Multi-line support** with Shift+Enter for new lines
- **Immediate close** on submission (no loading in modal)

### Input Controls
| Key | Action |
|-----|--------|
| `Enter` | Submit and create agent |
| `Shift+Enter` | New line in text input |
| `Esc` | Cancel and close dialog |

### User Flow
1. User presses `n` from main screen → Modal opens
2. User types instructions → Real-time character count
3. User presses `Enter` → Modal closes immediately
4. Progress shows in agent list → `🟡 Spawning...`
5. Agent becomes active → `🟢 Running`

---

## 5. Agent Limit Reached Dialog

### Layout
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              ┌─ Cannot Spawn Agent ─┐                           │
│                              │                       │                           │
│                              │  ⚠️  Agent limit reached (3/3)                   │
│                              │                       │                           │
│                              │  Delete an existing agent first:                 │
│                              │  • agent-a7f2k1-auth-system                     │
│                              │  • agent-m9x4p3-memory-leak                     │
│                              │  • agent-b5c8q7-api-cleanup                     │
│                              │                       │                           │
│                              │  [Esc] Close                                     │
│                              └───────────────────────┘                           │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Key Features
- **Clear warning:** Shows current agent count
- **Helpful guidance:** Lists existing agents
- **Actionable information:** Suggests deletion before creating new
- **Simple dismiss:** Escape to close

---

## 6. Spawn Progress States

### In-List Progress Display
When creating a new agent, progress is shown in the main agent list:

```
│ ❯ agent-k9x2m8-auth-system                               0s    🟡 Forking...   │
│ ❯ agent-k9x2m8-auth-system                               1s    🟡 Spawning...  │
│ ❯ agent-k9x2m8-auth-system                               3s    🟡 Starting...  │
│ ❯ agent-k9x2m8-auth-system                               5s    🟢 Running      │
```

### Progress States
1. **🟡 Forking...** - Setting up git worktree (0-2s)
2. **🟡 Spawning...** - Initializing agent process (1-3s)
3. **🟡 Starting...** - Agent connecting to Claude (2-5s)
4. **🟢 Running** - Agent ready and active
5. **🔴 Failed** - Creation failed (with error details)

---

## 7. Design System

### Typography
- **Headers:** Bold white text
- **Labels:** Regular white text
- **Help text:** Yellow text
- **Errors:** Red text
- **Success:** Green text
- **System:** Yellow text
- **Borders:** Dim white/gray

### Color Palette
- **Primary:** White (#FFFFFF)
- **Success:** Green (#00FF00)
- **Warning:** Yellow (#FFFF00)
- **Error:** Red (#FF0000)
- **Info:** Cyan (#00FFFF)
- **Muted:** Gray (#808080)
- **Selection:** Bright Blue (#0080FF)

### Spacing
- **Generous padding:** 1-2 lines between sections
- **Clean margins:** Consistent border spacing
- **Readable line height:** Single-spaced with blank lines for separation

### Responsive Behavior
- **Minimum width:** 80 characters
- **Scalable content:** Adjusts to terminal size
- **Scroll indicators:** Show when content exceeds view
- **Modal centering:** Always centered regardless of terminal size

---

## 8. Accessibility & Usability

### Keyboard Navigation
- **Arrow keys:** Universal up/down navigation
- **Vim bindings:** j/k support for power users
- **Escape key:** Universal cancel/back action
- **Enter key:** Universal confirm/select action

### Visual Indicators
- **Selection highlighting:** Clear visual selection state
- **Status consistency:** Same icons across all views
- **Progress feedback:** Real-time status updates
- **Error communication:** Clear error messages and states

### Performance
- **Virtual scrolling:** Efficient large log handling
- **Minimal redraws:** Only update changed sections
- **Responsive input:** No input lag or blocking operations
- **Memory efficiency:** Bounded log storage

---

## 9. Technical Implementation Notes

### Component Structure
```
src/ui/ink/
├── App.js                    # Main application state
├── components/
│   ├── Layout/
│   │   ├── Header.js         # Enhanced header with status
│   │   └── Footer.js         # Enhanced footer with controls
│   ├── AgentList/
│   │   ├── AgentList.js      # Main list component
│   │   └── AgentItem.js      # Individual agent row
│   ├── DetailView/
│   │   └── DetailView.js     # Enhanced log viewer
│   └── Dialogs/
│       ├── SpawnDialog.js    # Simplified spawn dialog
│       └── LimitDialog.js    # New limit reached dialog
```

### State Management
- **Selection state:** Track currently selected agent
- **Modal state:** Control dialog visibility
- **Follow state:** Auto-scroll preference
- **Search state:** Query and results

### Real-time Updates
- **500ms polling** for agent status
- **Auto-scroll behavior** when following logs
- **Efficient re-rendering** for status changes
- **Background updates** without UI blocking

---

## 10. Future Enhancements

### Short-term (Next Sprint)
- **Search functionality** in main list and detail view
- **Agent templates** for common tasks
- **Keyboard shortcuts help** overlay

### Medium-term
- **Theming system** for customizable colors
- **Agent grouping** and filtering
- **Export logs** functionality
- **Configuration management**

### Long-term
- **Plugin system** for extensions
- **Multi-terminal support** 
- **Collaboration features**
- **Performance metrics** visualization

---

This specification provides a complete foundation for implementing Napoleon's enhanced UI/UX with a focus on developer productivity, clean design, and intuitive interactions.