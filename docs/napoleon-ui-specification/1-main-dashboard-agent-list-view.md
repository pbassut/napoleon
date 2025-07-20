# 1. Main Dashboard (Agent List View)

## Layout

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   Napoleon                                      │
│                                                                                 │
│  Agent                                               Runtime    Status          │
│ ─────────────────────────────────────────────────────────────────────────────── │
│                                                                                 │
│ ❯ agent-a7f2k1-auth-system                            2m 34s   🟢 Running       │
│                                                                                 │
│   agent-m9x4p3-memory-leak                            1m 12s   🟡 Pending       │
│                                                                                 │
│   agent-b5c8q7-api-cleanup                              45s    🔴 Error         │
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
│ ─────────────────────────────────────────────────────────────────────────────── │
│  [n]ew agent  [d]elete  [Enter] inspect  [q]uit     🔍 [/] search  [f] follow   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Key Features

- **Full-screen layout** utilizing entire terminal space
- **Three-column structure:** Agent, Runtime, Status
- **Selection indicator:** `❯` shows currently selected agent (cyan/blue highlight)
- **Agent naming convention:** `agent-{6char}-{worktree}` format
- **Real-time updates** for runtime and status
- **Scrollable content** for 10+ agents
- **Clean typography** with proper spacing

## Navigation Controls

| Key           | Action                               |
| ------------- | ------------------------------------ |
| `↑` / `k`     | Move selection up                    |
| `↓` / `j`     | Move selection down                  |
| `Enter` / `i` | Inspect selected agent (detail view) |
| `n`           | Spawn new agent                      |
| `d`           | Delete selected agent                |
| `q`           | Quit application                     |
| `/`           | Search (future feature)              |
| `f`           | Follow logs (future feature)         |

---
