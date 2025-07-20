# 6. Spawn Progress States

## In-List Progress Display
When creating a new agent, progress is shown in the main agent list:

```
│ ❯ agent-k9x2m8-auth-system                               0s    🟡 Forking...   │
│ ❯ agent-k9x2m8-auth-system                               1s    🟡 Spawning...  │
│ ❯ agent-k9x2m8-auth-system                               3s    🟡 Starting...  │
│ ❯ agent-k9x2m8-auth-system                               5s    🟢 Running      │
```

## Progress States
1. **🟡 Forking...** - Setting up git worktree (0-2s)
2. **🟡 Spawning...** - Initializing agent process (1-3s)
3. **🟡 Starting...** - Agent connecting to Claude (2-5s)
4. **🟢 Running** - Agent ready and active
5. **🔴 Failed** - Creation failed (with error details)

---
