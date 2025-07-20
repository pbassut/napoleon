# Napoleon UI Feature Parity Testing Protocol

This document outlines the systematic approach for validating feature parity between the Blessed and Ink UI implementations.

## Testing Methodology

### 1. Side-by-Side Comparison
Run both UIs simultaneously in split terminal windows to directly compare behaviors.

```bash
# Terminal 1 - Blessed UI
FORCE_BLESSED_UI=1 npm run dev

# Terminal 2 - Ink UI  
FORCE_INK_UI=1 npm run dev
```

### 2. Automated Test Sequences

#### Test Sequence 1: Basic Agent Lifecycle
1. Press `n` to open spawn dialog
2. Type "Test agent for parity validation"
3. Press `Ctrl+Enter` to spawn
4. Wait for agent to start
5. Press `Enter` to view details
6. Press `Escape` to return to list
7. Press `d` to open termination dialog
8. Press `y` to confirm termination

**Expected Results:**
- Both UIs should show identical dialogs
- Agent status updates should appear at same time
- Navigation should feel identical
- Termination should complete successfully

#### Test Sequence 2: Keyboard Navigation
1. With multiple agents running:
   - Press `j`/`k` or arrow keys to navigate
   - Press `g` twice quickly (gg) to go to top
   - Press `G` to go to bottom
   - Press `Enter` on each agent

**Expected Results:**
- Selection movement should be smooth
- Double-key shortcuts should work
- No lag or missed keystrokes

#### Test Sequence 3: Dialog Interactions
1. Spawn Dialog:
   - Press `n`
   - Type multi-line instructions (Shift+Enter)
   - Press `Tab` for indentation
   - Press `Escape` to cancel
   - Press `n` again and spawn

2. Termination Dialog:
   - Press `d`
   - Use arrow keys to switch Yes/No
   - Press `Escape` to cancel
   - Press `d` again
   - Press `y` to confirm

**Expected Results:**
- Multi-line input should work
- Tab navigation between buttons
- Escape consistently cancels
- Focus returns to list properly

### 3. Feature-by-Feature Checklist

#### Global Features
- [ ] `q` - Quit application (both UIs exit cleanly)
- [ ] `Ctrl+C` - Force quit (immediate exit)
- [ ] `h` - Help overlay appears/disappears
- [ ] Window resize - UI adapts properly

#### Agent List View
- [ ] `n` - Spawn dialog opens centered
- [ ] `d` - Termination dialog for selected agent
- [ ] `Enter`/`i` - Detail view opens
- [ ] `↑`/`↓`/`j`/`k` - Navigation works
- [ ] Empty state - "No agents" message
- [ ] Agent status colors match
- [ ] Runtime format consistent

#### Detail View
- [ ] `Escape`/`q` - Returns to list
- [ ] `/` - Search mode activates
- [ ] `n`/`N` - Next/previous search result
- [ ] `j`/`k` - Line scrolling
- [ ] `PageUp`/`PageDown` - Page scrolling
- [ ] `G` - Jump to bottom
- [ ] `gg` - Jump to top
- [ ] `a` - Auto-scroll toggle
- [ ] `l` - External viewer launch
- [ ] `h` - Historical logs
- [ ] `?` - Context help

#### Edge Cases
- [ ] Rapid key presses don't cause issues
- [ ] Very long agent names display correctly
- [ ] Error messages appear identically
- [ ] Loading states show consistently
- [ ] Focus management after errors

### 4. Performance Comparison

#### Startup Time
```bash
time FORCE_BLESSED_UI=1 npm run dev -- --version
time FORCE_INK_UI=1 npm run dev -- --version
```

#### Memory Usage
```bash
# Monitor both UIs with multiple agents
ps aux | grep napoleon
```

#### UI Responsiveness
- Measure key press to visual feedback time
- Check animation smoothness
- Verify no UI freezes during operations

### 5. Missing Feature Tracking

Document any features that work in Blessed but not in Ink:

| Feature | Blessed | Ink | Priority | Notes |
|---------|---------|-----|----------|-------|
| Help overlay (h) | ✅ | ❌ | HIGH | No help component |
| External viewer (l) | ✅ | ❌ | HIGH | Needs system integration |
| Historical logs (h in detail) | ✅ | ❌ | MEDIUM | Requires log browser |
| Search highlighting | ✅ | ⚠️ | MEDIUM | Basic search only |
| Double-key shortcuts | ✅ | ❌ | LOW | gg, etc. |

### 6. Regression Testing

After implementing missing features:
1. Re-run all test sequences
2. Verify no existing features broke
3. Check performance hasn't degraded
4. Ensure new features match Blessed exactly

### 7. User Acceptance Criteria

The Ink UI is ready when:
- [ ] All keyboard shortcuts work identically
- [ ] Visual appearance is consistent
- [ ] Performance is comparable or better
- [ ] No features are missing
- [ ] Edge cases handled identically
- [ ] User feedback is positive

## Test Execution Log

Record test results here:

| Date | Tester | Test Type | Results | Issues Found |
|------|--------|-----------|---------|--------------|
| | | | | |

## Known Differences

Document any intentional differences between UIs:

| Feature | Blessed Behavior | Ink Behavior | Reason |
|---------|------------------|--------------|---------|
| | | | |