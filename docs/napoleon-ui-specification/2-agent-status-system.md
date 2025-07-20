# 2. Agent Status System

## Status Circle Colors & Meanings

### 🟢 Green Circle
- **🟢 Running** - Agent actively processing instructions

### 🟡 Yellow Circle  
- **🟡 Spawning...** - Agent being created
- **🟡 Forking...** - Setting up git worktree
- **🟡 Starting...** - Agent connecting to Claude
- **🟡 Pending** - Agent waiting for instructions
- **🟡 Idle** - Agent completed task, waiting

### 🔴 Red Circle
- **🔴 Error** - Agent encountered an error
- **🔴 Failed** - Agent failed to complete task

### ⚪ Gray Circle
- **⚪ Terminated** - Agent cleanly stopped

## Status Flow
```
🟡 Spawning... → 🟡 Forking... → 🟡 Starting... → 🟢 Running → 🟡 Idle
                                                      ↓
                                               🔴 Error → ⚪ Terminated
```

---
