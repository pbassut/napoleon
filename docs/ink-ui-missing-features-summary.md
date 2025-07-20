# Ink UI Missing Features Summary

This document summarizes the key features from the Blessed UI that are missing or need improvement in the Ink UI implementation.

## Critical Missing Features

### 1. Help System (HIGH PRIORITY)
The Blessed UI has a comprehensive help system that is completely missing from the Ink UI:

- **Global Help (`h` key)**
  - Shows overlay with all keyboard shortcuts
  - Context-sensitive based on current view
  - Can be toggled on/off

- **Detail View Help (`?` key)**
  - Specific help for detail view shortcuts
  - Shows search commands, navigation options
  - Includes status indicator explanations

**Implementation Needed:**
- Create HelpOverlay component
- Add `h` key handler in main App
- Add `?` key handler in DetailView
- Context-aware help content

### 2. External Log Viewer (`l` key)
Blessed UI can open log files in external applications (VS Code, etc.):

- Opens current agent's log file
- Cross-platform support (macOS, Windows, Linux)
- Non-blocking operation
- Shows status message

**Implementation Needed:**
- Add `l` key handler in DetailView
- Integrate with AgentLogManager to get log paths
- Use child_process.spawn for cross-platform opening

### 3. Historical Logs Browser (`h` key in Detail View)
Blessed UI shows list of historical agent logs:

- Browse terminated agent logs
- Show file sizes and dates
- Future: ability to open historical logs

**Implementation Needed:**
- Create HistoricalLogsDialog component
- Read from ~/.napoleon/logs/agents/
- Add `h` key handler in DetailView

### 4. Advanced Agent Management Shortcuts

- **Restart Agent (`r` key)**: Restart selected agent
- **Cleanup (`c` key)**: Clean up agent resources
- **Force Quit (`Ctrl+C`)**: Force exit application

**Implementation Needed:**
- Add keyboard handlers in main App
- Implement restart/cleanup in AgentManager
- Handle Ctrl+C for force quit

### 5. Complete Status Indicators
Ink UI is missing some status symbols:

- Success indicator (✓) for completed agents
- Proper terminated vs failed distinction
- SDK status display in detail view

### 6. Log File Information Display
Detail view should show:

- Current log file path
- Log file size
- Active/inactive status indicator
- SDK connection status

## UI Behavior Improvements Needed

### 1. Double-Key Shortcuts
- **`gg` for go to top**: Currently triggers on single `g`
- Need proper double-key detection with timeout

### 2. Search Enhancements
- **Regex support**: Current search is basic text matching
- **Search history**: Remember previous searches
- **Case sensitivity toggle**: Currently always case-insensitive

### 3. Multi-line Input Enhancement
Spawn dialog needs better multi-line support:
- Proper cursor positioning
- Text selection
- Copy/paste support
- Visible line breaks

### 4. Error Handling Display
- Show spawn errors in dialog footer
- Display log access errors gracefully
- Better error recovery feedback

### 5. Terminal Compatibility
- Test and fix Unicode fallbacks
- Verify in different terminals (iTerm2, Terminal.app, Hyper, WSL)
- Handle minimum terminal size gracefully

## Performance Optimizations Needed

### 1. Log Update Debouncing
- Current: 500ms polling
- Needed: Debounce rapid updates
- Implement efficient diff checking

### 2. Search Performance
- Add search result caching
- Implement indexed search for large logs
- Binary search for navigation

### 3. Memory Management
- Implement proper log rotation
- Clean up old search results
- Monitor memory usage

## Configuration Features Missing

### 1. Key Binding Customization
- Allow users to customize shortcuts
- Save preferences to config file
- Import/export settings

### 2. UI Preferences
- Theme customization
- Status symbol preferences
- Scroll behavior options

## Testing Gaps

### 1. Cross-Platform Testing
- Windows terminal compatibility
- Linux terminal variations
- SSH session behavior

### 2. Edge Case Testing
- Very long agent names
- Rapid status changes
- Network disconnections
- File system errors

### 3. Performance Testing
- 100+ agents
- 100,000+ line logs
- Rapid spawn/terminate cycles
- Memory leak detection

## Implementation Priority

### Phase 1: Critical Features (1-2 days)
1. Help system (global and detail view)
2. External log viewer
3. Double-key shortcut fix (gg)
4. Force quit (Ctrl+C)

### Phase 2: Important Features (2-3 days)
1. Historical logs browser
2. Restart/cleanup shortcuts
3. Complete status indicators
4. Log file info display

### Phase 3: Enhancements (3-5 days)
1. Regex search support
2. Multi-line input improvements
3. Error handling enhancements
4. Terminal compatibility fixes

### Phase 4: Nice-to-Have (Future)
1. Configuration system
2. Key binding customization
3. Advanced performance optimizations
4. Theme support

## Quick Wins

These can be implemented quickly for immediate improvement:

1. **Add missing status symbols**: Just update the status mapping
2. **Fix single 'g' triggering**: Add proper double-key detection
3. **Show log file path**: Add to DetailView header
4. **Add Ctrl+C handler**: Simple process.exit handler

## Technical Considerations

### For Help System
```javascript
// Use Box with absolute positioning
// Modal overlay with semi-transparent background
// useInput with 'h' key handler
// Context prop to show relevant help
```

### For External Viewer
```javascript
// Use child_process.spawn
// Platform detection with os.platform()
// Non-blocking with detached: true
```

### For Historical Logs
```javascript
// Read directory with fs.readdir
// Sort by modification time
// Show in modal list component
```

## Conclusion

While the Ink UI has successfully implemented the core functionality, several important features are missing for complete feature parity with the Blessed UI. The help system and external log viewer are the most critical gaps that impact daily usability. With focused effort, these features can be implemented to achieve full feature parity and provide users with a seamless migration experience.