# 9. Technical Implementation Notes

## Component Structure
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

## State Management
- **Selection state:** Track currently selected agent
- **Modal state:** Control dialog visibility
- **Follow state:** Auto-scroll preference
- **Search state:** Query and results

## Real-time Updates
- **500ms polling** for agent status
- **Auto-scroll behavior** when following logs
- **Efficient re-rendering** for status changes
- **Background updates** without UI blocking

---
