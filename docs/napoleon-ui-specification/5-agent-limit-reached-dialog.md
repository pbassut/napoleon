# 5. Agent Limit Reached Dialog

## Layout
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

## Key Features
- **Clear warning:** Shows current agent count
- **Helpful guidance:** Lists existing agents
- **Actionable information:** Suggests deletion before creating new
- **Simple dismiss:** Escape to close

---
