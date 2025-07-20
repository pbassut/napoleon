# 3. Agent Detail View (Log Viewer)

## Layout
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

## Key Features
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

## Navigation Controls
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

## Follow Mode States
- **`[f] follow: ON`** - Auto-scroll to newest logs (default)
- **`[f] follow: OFF`** - Manual scroll control, stays at current position

---
