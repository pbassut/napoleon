# 4. New Agent Spawn Dialog

## Layout
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

## Key Features
- **Minimal title:** Simply "New"
- **Centered modal** overlay
- **Single text input** for agent instructions
- **Multi-line support** with Shift+Enter for new lines
- **Immediate close** on submission (no loading in modal)

## Input Controls
| Key | Action |
|-----|--------|
| `Enter` | Submit and create agent |
| `Shift+Enter` | New line in text input |
| `Esc` | Cancel and close dialog |

## User Flow
1. User presses `n` from main screen → Modal opens
2. User types instructions → Real-time character count
3. User presses `Enter` → Modal closes immediately
4. Progress shows in agent list → `🟡 Spawning...`
5. Agent becomes active → `🟢 Running`

---
